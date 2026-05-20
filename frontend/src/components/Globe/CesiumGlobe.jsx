/**
 * CesiumGlobe — true 3D WebGL globe replacing the old flat MapLibre MapView.
 *
 * Surfaces (via imperative ref API):
 *   ref.current.flyTo(lon, lat, alt)
 *   ref.current.flyToBounds(geojson)
 *   ref.current.setLayerVisible(name, bool)
 *   ref.current.highlightAsset(id)
 *
 * Props:
 *   activeLayers     — { flights, ships, satellites, earthquakes, wildfires,
 *                         cables, infrastructure, transmission, datacenters, oil, gas, offshore }
 *   onAssetClick(asset)
 *   realtime         — { flights, ships, satellites, earthquakes, weather } (from /ws/realtime)
 *   satellite        — bool, toggle imagery (sat vs dark)
 */
import React, {
  useEffect, useRef, useImperativeHandle, forwardRef, useState,
} from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import {
  glowCircleCanvas, diamondCanvas, triangleCanvas,
  airplaneCanvas, shipCanvas, satelliteCanvas, toCesiumColor,
} from './cesiumUtils.js'
import { initFlights, updateFlights, destroyFlights } from '../../layers/FlightsLayer.js'
import { initSatellites, updateSatellites as updateSatellitesFn, destroySatellites } from '../../layers/SatellitesLayer.js'
import { initShips, updateShips, destroyShips } from '../../layers/ShipsLayer.js'
import { initCables, destroyCables } from '../../layers/CablesLayer.js'
import { initPowerPlants, destroyPowerPlants } from '../../layers/PowerPlantsLayer.js'
import { initTransmission, destroyTransmission } from '../../layers/TransmissionLayer.js'
import { initSubstations, destroySubstations } from '../../layers/SubstationsLayer.js'
import { initEarthquakes, destroyEarthquakes, updateEarthquakes } from '../../layers/EarthquakesLayer.js'
import { initWildfires, destroyWildfires } from '../../layers/WildfiresLayer.js'
import { initDatacenters, destroyDatacenters } from '../../layers/DatacentersLayer.js'

// We avoid requiring Cesium Ion. Use dark-themed OSM tiles instead.
// Don't set ION token (no token = the default Bing imagery is unavailable, that's OK)
Cesium.Ion.defaultAccessToken = ''

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const SAT_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const CesiumGlobe = forwardRef(function CesiumGlobe(
  { activeLayers = {}, onAssetClick, realtime = {}, satellite = false },
  ref,
) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const layersRef = useRef({})     // per-layer state (collections, primitives)
  const handlerRef = useRef(null)
  const rotateOnIdleRef = useRef(true)
  const lastInteractionTsRef = useRef(Date.now())
  const [ready, setReady] = useState(false)

  // ── Initialize the Cesium Viewer once ────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    if (viewerRef.current) return

    const tileProvider = new Cesium.UrlTemplateImageryProvider({
      url: satellite ? SAT_TILE_URL : DARK_TILE_URL,
      credit: satellite ? 'Esri World Imagery' : 'CARTO',
      maximumLevel: 19,
      subdomains: satellite ? ['server'] : ['a', 'b', 'c', 'd'],
    })

    const viewer = new Cesium.Viewer(containerRef.current, {
      imageryProvider: tileProvider,
      baseLayerPicker: false,
      sceneModePicker: false,
      animation: false,
      timeline: false,
      navigationHelpButton: false,
      homeButton: false,
      fullscreenButton: false,
      geocoder: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: true,
      contextOptions: {
        webgl: { alpha: true, preserveDrawingBuffer: false, antialias: true },
      },
      skyAtmosphere: new Cesium.SkyAtmosphere(),
    })
    viewerRef.current = viewer

    // Enable high-DPI scaling and subpixel antialiasing for maximum sharpness and clarity
    viewer.resolutionScale = Math.min(2.0, window.devicePixelRatio || 1.0)
    viewer.scene.postProcessStages.fxaa.enabled = true

    // Beautify: dark space, atmosphere, lighting
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#000005')
    viewer.scene.globe.enableLighting = true
    viewer.scene.globe.dynamicAtmosphereLighting = true
    viewer.scene.globe.dynamicAtmosphereLightingFromSun = true
    viewer.scene.globe.atmosphereLightIntensity = 5
    viewer.scene.skyAtmosphere.hueShift = -0.04
    viewer.scene.skyAtmosphere.saturationShift = -0.1
    viewer.scene.skyAtmosphere.brightnessShift = -0.15
    viewer.scene.fog.enabled = true
    viewer.scene.fog.density = 1.0e-4
    viewer.scene.globe.showGroundAtmosphere = true
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#04060c')
    viewer.scene.moon.show = false
    viewer.scene.sun.show = false

    // Stars
    try {
      viewer.scene.skyBox = new Cesium.SkyBox({
        sources: {
          positiveX: makeStarTexture(),
          negativeX: makeStarTexture(),
          positiveY: makeStarTexture(),
          negativeY: makeStarTexture(),
          positiveZ: makeStarTexture(),
          negativeZ: makeStarTexture(),
        },
      })
    } catch (e) {
      // optional; star skybox not critical
    }

    // Initial camera — overlooking NA
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-95.0, 38.0, 14_000_000),
      orientation: { heading: 0.0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0.0 },
      duration: 1.6,
    })

    // ── Idle auto-rotation ─────────────────────────────────────────────
    function bumpInteraction() {
      lastInteractionTsRef.current = Date.now()
    }
    viewer.scene.canvas.addEventListener('mousedown', bumpInteraction)
    viewer.scene.canvas.addEventListener('wheel', bumpInteraction)
    viewer.scene.canvas.addEventListener('touchstart', bumpInteraction)

    let lastTickMs = Date.now()
    viewer.scene.preRender.addEventListener(() => {
      const now = Date.now()
      const dt = (now - lastTickMs) / 1000
      lastTickMs = now
      if (!rotateOnIdleRef.current) return
      if (now - lastInteractionTsRef.current < 9000) return  // idle >9s
      const cam = viewer.camera
      // Rotate around globe center
      cam.rotate(Cesium.Cartesian3.UNIT_Z, -dt * 0.04)
    })

    // ── Click handler ──────────────────────────────────────────────────
    handlerRef.current = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handlerRef.current.setInputAction((click) => {
      bumpInteraction()
      const picked = viewer.scene.pick(click.position)
      if (Cesium.defined(picked)) {
        const id = picked.id   // Entity id (object or string)
        let asset = null
        if (id?.properties) {
          asset = id.properties.getValue?.(Cesium.JulianDate.now()) || {}
          asset.name = id.name || asset.name
        } else if (typeof id === 'object' && id?.assetData) {
          asset = id.assetData
        } else if (picked.primitive?.assetData) {
          asset = picked.primitive.assetData
        }
        if (asset) onAssetClick?.(asset)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // ── Initialize layer containers ────────────────────────────────────
    layersRef.current.flights = initFlights(viewer)
    layersRef.current.satellites = initSatellites(viewer)
    layersRef.current.ships = initShips(viewer)
    layersRef.current.cables = initCables(viewer)
    layersRef.current.powerPlants = initPowerPlants(viewer)
    layersRef.current.transmission = initTransmission(viewer)
    layersRef.current.substations = initSubstations(viewer)
    layersRef.current.earthquakes = initEarthquakes(viewer)
    layersRef.current.wildfires = initWildfires(viewer)
    layersRef.current.datacenters = initDatacenters(viewer)

    // Expose satellites layer for the TLE worker push path
    window.__odin_sat_layer = layersRef.current.satellites

    setReady(true)

    return () => {
      try { handlerRef.current?.destroy() } catch (e) {}
      try {
        destroyFlights(layersRef.current.flights)
        destroySatellites(layersRef.current.satellites)
        destroyShips(layersRef.current.ships)
        destroyCables(layersRef.current.cables)
        destroyPowerPlants(layersRef.current.powerPlants)
        destroyTransmission(layersRef.current.transmission)
        destroySubstations(layersRef.current.substations)
        destroyEarthquakes(layersRef.current.earthquakes)
        destroyWildfires(layersRef.current.wildfires)
        destroyDatacenters(layersRef.current.datacenters)
      } catch (e) {}
      try { viewerRef.current?.destroy() } catch (e) {}
      viewerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update imagery when "satellite" toggles ─────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !ready) return
    const layers = viewer.imageryLayers
    layers.removeAll()
    layers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: satellite ? SAT_TILE_URL : DARK_TILE_URL,
        credit: satellite ? 'Esri World Imagery' : 'CARTO',
        maximumLevel: 19,
        subdomains: satellite ? ['server'] : ['a', 'b', 'c', 'd'],
      }),
    )
  }, [satellite, ready])

  // ── Apply layer visibility ──────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return
    const L = layersRef.current
    const set = (obj, visible) => {
      if (!obj) return
      if (obj.collection) obj.collection.show = !!visible
      if (obj.points) obj.points.show = !!visible
      if (obj.lines) obj.lines.show = !!visible
      if (obj.billboards) obj.billboards.show = !!visible
      if (obj.entities) obj.entities.show = !!visible
      if (obj.dataSource) obj.dataSource.show = !!visible
      if (obj.polylinesGlobal) obj.polylinesGlobal.show = !!visible
      if (obj.polylinesLocal) {
        const height = viewerRef.current?.camera.positionCartographic.height || 0
        obj.polylinesLocal.show = !!visible && (height < 5_000_000.0)
      }
      obj.visible = !!visible
    }
    set(L.flights, activeLayers.flights !== false)
    set(L.satellites, activeLayers.satellites !== false)
    set(L.ships, activeLayers.ships !== false)
    set(L.cables, activeLayers.cables !== false)
    set(L.powerPlants, activeLayers.infrastructure !== false)
    set(L.transmission, activeLayers.transmission !== false)
    set(L.substations, activeLayers.transmission !== false)
    set(L.earthquakes, activeLayers.earthquakes !== false)
    set(L.wildfires, activeLayers.wildfires !== false)
    set(L.datacenters, activeLayers.datacenters !== false)
  }, [activeLayers, ready])

  // ── Push real-time data into layers ─────────────────────────────────────
  useEffect(() => {
    if (!ready) return
    const items = realtime.flights?.items || []
    if (items.length) updateFlights(layersRef.current.flights, items)
  }, [realtime.flights, ready])

  useEffect(() => {
    if (!ready) return
    const items = realtime.ships?.items || []
    if (items.length) updateShips(layersRef.current.ships, items)
  }, [realtime.ships, ready])

  useEffect(() => {
    if (!ready) return
    const items = realtime.earthquakes?.items || []
    if (items.length) updateEarthquakes(layersRef.current.earthquakes, items)
  }, [realtime.earthquakes, ready])

  useEffect(() => {
    if (!ready) return
    const items = realtime.satellites?.items || []
    if (items.length) updateSatellitesFn(layersRef.current.satellites, items, { mode: 'backend' })
  }, [realtime.satellites, ready])

  // ── Imperative API ──────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    flyTo: (lon, lat, alt = 800_000) => {
      const v = viewerRef.current
      if (!v) return
      lastInteractionTsRef.current = Date.now()
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        orientation: { heading: 0.0, pitch: -Cesium.Math.PI_OVER_FOUR },
        duration: 2,
      })
    },
    flyHome: () => {
      const v = viewerRef.current
      if (!v) return
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-95.0, 38.0, 14_000_000),
        orientation: { heading: 0.0, pitch: -Cesium.Math.PI_OVER_TWO },
        duration: 2,
      })
    },
    setLayerVisible: (name, visible) => {
      const obj = layersRef.current[name]
      if (!obj) return
      if (obj.collection) obj.collection.show = !!visible
      if (obj.points) obj.points.show = !!visible
      if (obj.lines) obj.lines.show = !!visible
      if (obj.billboards) obj.billboards.show = !!visible
      if (obj.dataSource) obj.dataSource.show = !!visible
      if (obj.polylinesGlobal) obj.polylinesGlobal.show = !!visible
      if (obj.polylinesLocal) {
        const height = viewerRef.current?.camera.positionCartographic.height || 0
        obj.polylinesLocal.show = !!visible && (height < 5_000_000.0)
      }
    },
    getViewer: () => viewerRef.current,
    getLayers: () => layersRef.current,
    feedSatellites: (items) => {
      if (layersRef.current.satellites) {
        updateSatellitesFn(layersRef.current.satellites, items, { mode: 'worker' })
      }
    },
  }), [])

  return (
    <div
      ref={containerRef}
      className="cesium-container"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#000',
      }}
    />
  )
})

export default CesiumGlobe

// ── Stars skybox texture (procedural) ───────────────────────────────────────
function makeStarTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000005'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const r = Math.random() * 1.2 + 0.1
    const a = Math.random() * 0.85 + 0.15
    ctx.fillStyle = `rgba(255,255,255,${a})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}
