import React, { useRef, useEffect, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { getGridState, getWindVectors, getMineralsOverlay } from '../../api/odinApi.js'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.placeholder'

const ASSET_TYPE_COLORS = {
  POWER_PLANT: '#f59e0b',
  SUBSTATION: '#00d4ff',
  DATACENTER: '#7c3aed',
  HOSPITAL: '#10b981',
  TELECOM_TOWER: '#6366f1',
  WATER_TREATMENT: '#0ea5e9',
  WIND_TURBINE: '#84cc16',
  MINERAL_SITE: '#f97316',
}

const STATUS_COLORS = {
  OPERATIONAL: '#10b981',
  VULNERABLE: '#f97316',
  REROUTED: '#00d4ff',
  OFFLINE: '#6b7280',
  DEGRADED: '#fbbf24',
  CRITICAL: '#ef4444',
}

export default function MapView({ activeLayers, onAssetClick }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const animFrame = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  const [windData, setWindData] = useState([])
  const windParticles = useRef([])

  // ── Initialize Mapbox ─────────────────────────────────────────
  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-50, 30],
      zoom: 2.5,
      projection: 'globe',
      antialias: true,
    })

    map.current.on('load', () => {
      // Globe fog
      map.current.setFog({
        color: 'rgb(10, 14, 26)',
        'high-color': 'rgb(13, 21, 38)',
        'horizon-blend': 0.04,
        'space-color': 'rgb(4, 8, 16)',
        'star-intensity': 0.8,
      })
      setMapReady(true)
    })

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.current.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left')

    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current)
      map.current?.remove()
      map.current = null
    }
  }, [])

  // ── Load Infrastructure Layer ─────────────────────────────────
  useEffect(() => {
    if (!mapReady) return
    loadInfrastructureLayer()
  }, [mapReady])

  const loadInfrastructureLayer = useCallback(async () => {
    try {
      const { geojson } = await getGridState()

      if (map.current.getSource('infrastructure')) {
        map.current.getSource('infrastructure').setData(geojson)
        return
      }

      map.current.addSource('infrastructure', { type: 'geojson', data: geojson })

      // Asset circles
      map.current.addLayer({
        id: 'infrastructure-circles',
        type: 'circle',
        source: 'infrastructure',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            2, 4, 6, 10, 10, 16,
          ],
          'circle-color': [
            'match', ['get', 'status'],
            'OPERATIONAL', STATUS_COLORS.OPERATIONAL,
            'VULNERABLE',  STATUS_COLORS.VULNERABLE,
            'REROUTED',    STATUS_COLORS.REROUTED,
            'OFFLINE',     STATUS_COLORS.OFFLINE,
            'DEGRADED',    STATUS_COLORS.DEGRADED,
            STATUS_COLORS.OPERATIONAL,
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.2)',
          'circle-stroke-opacity': 0.6,
        },
      })

      // Pulse animation for vulnerable assets
      map.current.addLayer({
        id: 'infrastructure-pulse',
        type: 'circle',
        source: 'infrastructure',
        filter: ['in', ['get', 'status'], ['literal', ['VULNERABLE', 'DEGRADED']]],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 8, 6, 18, 10, 28],
          'circle-color': STATUS_COLORS.VULNERABLE,
          'circle-opacity': 0.2,
          'circle-stroke-width': 0,
        },
      })

      // Labels at zoom 5+
      map.current.addLayer({
        id: 'infrastructure-labels',
        type: 'symbol',
        source: 'infrastructure',
        minzoom: 4.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#e2e8f0',
          'text-halo-color': 'rgba(6,11,24,0.85)',
          'text-halo-width': 1.5,
          'text-opacity': 0.85,
        },
      })

      // Click handler
      map.current.on('click', 'infrastructure-circles', (e) => {
        const props = e.features[0]?.properties
        if (props && onAssetClick) onAssetClick(props)
        new mapboxgl.Popup({ closeButton: false, className: 'odin-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:'Inter',sans-serif;padding:8px;min-width:180px;background:#0d1526;border:1px solid rgba(0,212,255,0.2);border-radius:8px;">
              <div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">${props.asset_type}</div>
              <div style="font-size:13px;font-weight:600;color:#e2e8f0;margin-bottom:6px;">${props.name}</div>
              <div style="font-size:11px;color:rgba(226,232,240,.5);">${props.country} · ${props.region || ''}</div>
              <div style="margin-top:6px;display:flex;gap:6px;align-items:center;">
                <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(${props.status === 'OPERATIONAL' ? '16,185,129' : '249,115,22'},.15);color:${STATUS_COLORS[props.status] || '#10b981'};font-weight:700;">${props.status}</span>
                ${props.capacity_mw ? `<span style="font-size:10px;color:rgba(226,232,240,.4);">${props.capacity_mw} MW</span>` : ''}
              </div>
            </div>
          `)
          .addTo(map.current)
      })

      map.current.on('mouseenter', 'infrastructure-circles', () => {
        map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'infrastructure-circles', () => {
        map.current.getCanvas().style.cursor = ''
      })
    } catch (err) {
      console.warn('Infrastructure layer load failed:', err)
    }
  }, [mapReady, onAssetClick])

  // ── Wind Particles Layer ──────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !activeLayers.wind) return
    loadWindLayer()
  }, [mapReady, activeLayers.wind])

  const loadWindLayer = useCallback(async () => {
    try {
      const { vectors } = await getWindVectors({ min_lat: 30, max_lat: 65, min_lon: -15, max_lon: 40 })
      setWindData(vectors)

      // Create wind vector GeoJSON
      const geojson = {
        type: 'FeatureCollection',
        features: vectors.map(v => ({
          type: 'Feature',
          properties: { speed: v.speed_ms, direction: v.direction_deg, u: v.u, v: v.v },
          geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
        })),
      }

      if (map.current.getSource('wind-vectors')) {
        map.current.getSource('wind-vectors').setData(geojson)
      } else {
        map.current.addSource('wind-vectors', { type: 'geojson', data: geojson })
        map.current.addLayer({
          id: 'wind-heatmap',
          type: 'heatmap',
          source: 'wind-vectors',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'speed'], 0, 0, 20, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 6, 3],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,212,255,0)',
              0.3, 'rgba(0,150,255,0.5)',
              0.6, 'rgba(124,58,237,0.7)',
              1, 'rgba(239,68,68,0.9)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 30, 6, 60],
            'heatmap-opacity': 0.7,
          },
        })
      }
    } catch (err) {
      console.warn('Wind layer failed:', err)
    }
  }, [mapReady])

  // ── Minerals Layer ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !activeLayers.minerals) return
    loadMineralsLayer()
  }, [mapReady, activeLayers.minerals])

  const loadMineralsLayer = useCallback(async () => {
    try {
      const { geojson } = await getMineralsOverlay()
      if (!geojson) return

      if (map.current.getSource('minerals')) {
        map.current.getSource('minerals').setData(geojson)
        return
      }

      map.current.addSource('minerals', { type: 'geojson', data: geojson })
      map.current.addLayer({
        id: 'minerals-circles',
        type: 'circle',
        source: 'minerals',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'reserves_mt'],
            0, 6, 50000000, 24,
          ],
          'circle-color': [
            'match', ['get', 'geopolitical_risk'],
            'CRITICAL', '#ef4444',
            'HIGH', '#f97316',
            'MEDIUM', '#f59e0b',
            'LOW', '#84cc16',
            '#10b981',
          ],
          'circle-opacity': 0.75,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.3)',
        },
      })
    } catch (err) {
      console.warn('Minerals layer failed:', err)
    }
  }, [mapReady])

  // ── Toggle layer visibility ───────────────────────────────────
  useEffect(() => {
    if (!mapReady) return
    const layers = {
      wind: ['wind-heatmap'],
      minerals: ['minerals-circles'],
      infrastructure: ['infrastructure-circles', 'infrastructure-pulse', 'infrastructure-labels'],
    }
    Object.entries(layers).forEach(([key, ids]) => {
      ids.forEach(id => {
        if (map.current.getLayer(id)) {
          map.current.setLayoutProperty(id, 'visibility', activeLayers[key] ? 'visible' : 'none')
        }
      })
    })
  }, [activeLayers, mapReady])

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%' }}
      id="odin-map"
    />
  )
}
