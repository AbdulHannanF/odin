/**
 * TransmissionLayer — OpenGridWorks-style high-density power grids.
 * Utilizes a multi-tier lod setup (global vs local collections) with zero-cost camera height listeners
 * to achieve 60 FPS rendering under heavy transmission load.
 */
import * as Cesium from 'cesium'
import { TRANSMISSION_COLORS, voltageToKey } from '../config/layerColors.js'

export function initTransmission(viewer) {
  const scene = viewer.scene
  const polylinesGlobal = scene.primitives.add(new Cesium.PolylineCollection())
  const polylinesLocal = scene.primitives.add(new Cesium.PolylineCollection())
  
  // Set initial visibility
  polylinesGlobal.show = true
  polylinesLocal.show = false

  const layer = {
    type: 'transmission',
    visible: true,
    polylinesGlobal,
    polylinesLocal,
    viewer,
    loaded: false,
    destroyed: false,
    removeListener: null,
  }

  // Blazing-fast camera height listener to toggle the local collection
  const checkLOD = () => {
    if (layer.destroyed) return
    const height = viewer.camera.positionCartographic.height
    const showLocal = height < 5_000_000.0 // Only show mid-voltage lines when closer than 5,000 km
    if (layer.visible && polylinesLocal.show !== showLocal) {
      polylinesLocal.show = showLocal
    }
  }

  // Run initial check and register listener
  checkLOD()
  layer.removeListener = viewer.camera.changed.addEventListener(checkLOD)

  load(layer).catch(() => {})
  return layer
}

async function load(layer) {
  try {
    const resp = await fetch('/api/v1/layers/transmission_lines')
    if (!resp.ok) return
    const data = await resp.json()
    if (!data?.features) return

    if (layer.destroyed) return

    // Filter to major transmission lines >= 230 kV for top performance & density balance
    const features = data.features.filter(f => {
      const props = f.properties || {}
      const voltage = +(props.voltage_kv ?? props.voltage ?? props.VOLTAGE ?? 0)
      return voltage >= 230
    })
    
    const total = features.length
    let offset = 0
    const CHUNK_SIZE = 1000

    function loadChunk() {
      if (layer.destroyed) return
      
      const end = Math.min(offset + CHUNK_SIZE, total)
      for (let i = offset; i < end; i++) {
        if (layer.destroyed) return
        const f = features[i]
        const g = f.geometry
        if (!g) continue
        
        const props = f.properties || {}
        const voltage = +(props.voltage_kv ?? props.voltage ?? props.VOLTAGE ?? 230)
        const key = voltageToKey(voltage)
        const style = TRANSMISSION_COLORS[key] || TRANSMISSION_COLORS[0]
        
        // lines >= 345kV are global (always visible), 230kV are local (visible only at mid-zoom)
        const isGlobal = voltage >= 345
        
        if (g.type === 'LineString') {
          addLine(layer, g.coordinates, style, props, isGlobal)
        } else if (g.type === 'MultiLineString') {
          for (const line of g.coordinates) {
            if (layer.destroyed) return
            addLine(layer, line, style, props, isGlobal)
          }
        }
      }
      
      offset = end
      if (offset < total) {
        setTimeout(loadChunk, 16) // Queue next chunk in the next frame
      } else {
        layer.loaded = true
      }
    }

    loadChunk()
  } catch (e) {
    console.warn('transmission progressive load failed', e)
  }
}

function addLine(layer, coords, style, props, isGlobal) {
  if (layer.destroyed) return
  if (!coords || coords.length < 2) return
  
  const positions = []
  for (const c of coords) {
    if (!c || c.length < 2) continue
    const lon = +c[0], lat = +c[1]
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, 100)) // slight elevation to overlay nicely
  }
  
  if (positions.length < 2) return
  
  const targetCollection = isGlobal ? layer.polylinesGlobal : layer.polylinesLocal
  const pl = targetCollection.add({
    positions,
    width: style.width * 1.3,
    material: Cesium.Material.fromType('Color', {
      color: Cesium.Color.fromCssColorString(style.stroke).withAlpha(style.opacity || 0.8),
    }),
  })
  
  pl.assetData = {
    asset_type: 'transmission_line',
    name: props.name || `Transmission Line (${props.voltage_kv || props.VOLTAGE || ''} kV)`,
    voltage_kv: props.voltage_kv || props.VOLTAGE || 230,
    operator: props.operator || props.OWNER || 'UNKNOWN',
    status: 'OPERATIONAL',
    ...props,
  }
}

export function destroyTransmission(layer) {
  if (!layer) return
  layer.destroyed = true
  try {
    if (layer.removeListener) {
      layer.removeListener()
    }
  } catch (e) {}
  try {
    layer.polylinesGlobal.removeAll()
    layer.polylinesLocal.removeAll()
  } catch (e) {}
}
