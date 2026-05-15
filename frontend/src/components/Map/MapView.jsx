import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getGridState, getWindVectors, getMineralsOverlay } from '../../api/odinApi.js'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: null, iconUrl: null, shadowUrl: null })

const ASSET_COLORS = {
  POWER_PLANT:      '#f59e0b',
  SUBSTATION:       '#22d3ee',
  DATACENTER:       '#a78bfa',
  HOSPITAL:         '#34d399',
  TELECOM_TOWER:    '#818cf8',
  WATER_TREATMENT:  '#38bdf8',
  WIND_TURBINE:     '#86efac',
  MINERAL_SITE:     '#fb923c',
}

const STATUS_COLORS = {
  OPERATIONAL: '#10b981',
  VULNERABLE:  '#f97316',
  REROUTED:    '#22d3ee',
  OFFLINE:     '#6b7280',
  DEGRADED:    '#fbbf24',
  CRITICAL:    '#ef4444',
}

const ASSET_ICONS = {
  POWER_PLANT:      '⚡',
  SUBSTATION:       '🔌',
  DATACENTER:       '🖥',
  HOSPITAL:         '🏥',
  TELECOM_TOWER:    '📡',
  WATER_TREATMENT:  '💧',
  WIND_TURBINE:     '🌬',
  MINERAL_SITE:     '⛏',
}

function makeMarker(feature, onAssetClick) {
  const props = feature.properties
  const [lng, lat] = feature.geometry.coordinates
  const statusColor = STATUS_COLORS[props.status] || '#10b981'
  const assetColor  = ASSET_COLORS[props.asset_type] || '#94a3b8'
  const isPulsing = props.status === 'VULNERABLE' || props.status === 'DEGRADED' || props.status === 'CRITICAL'
  const icon = ASSET_ICONS[props.asset_type] || '●'

  const html = `
    <div class="odin-marker ${isPulsing ? 'odin-marker--pulse' : ''}" style="--status-clr:${statusColor};--asset-clr:${assetColor}">
      <div class="odin-marker__ring"></div>
      <div class="odin-marker__core">${icon}</div>
    </div>`

  const divIcon = L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
  const marker = L.marker([lat, lng], { icon: divIcon })

  const popupHtml = `
    <div class="odin-popup">
      <div class="odin-popup__type">${props.asset_type?.replace(/_/g,' ')}</div>
      <div class="odin-popup__name">${props.name}</div>
      <div class="odin-popup__row">
        <span class="odin-popup__status" style="color:${statusColor}">${props.status}</span>
        ${props.capacity_mw ? `<span class="odin-popup__cap">${props.capacity_mw} MW</span>` : ''}
      </div>
      <div class="odin-popup__meta">${props.country}${props.region ? ' · ' + props.region : ''}</div>
      ${props.risk_level && props.risk_level !== 'NONE' ? `<div class="odin-popup__risk">Risk: <b>${props.risk_level}</b></div>` : ''}
    </div>`

  marker.bindPopup(L.popup({ className: 'odin-leaflet-popup', maxWidth: 240 }).setContent(popupHtml))
  marker.on('click', () => { if (onAssetClick) onAssetClick(props) })
  return marker
}

export default function MapView({ activeLayers, onAssetClick }) {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const layers       = useRef({ infrastructure: null, wind: null, minerals: null })
  const [mapReady, setMapReady]   = useState(false)
  const [assetCount, setAssetCount] = useState(0)
  const [status, setStatus]       = useState('Initializing…')

  // ── Boot Leaflet ────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return

    const map = L.map(mapContainer.current, {
      center: [30, -20],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
    })

    // Dark tile layer — free, no token needed
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO © OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)

    mapRef.current = map
    setMapReady(true)

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Load infrastructure ────────────────────────────────────────
  const loadInfrastructure = useCallback(async () => {
    if (!mapRef.current) return
    try {
      setStatus('Loading assets…')
      const { geojson } = await getGridState()
      if (layers.current.infrastructure) {
        mapRef.current.removeLayer(layers.current.infrastructure)
      }
      const group = L.layerGroup()
      let count = 0
      geojson.features?.forEach(f => {
        if (!f.geometry?.coordinates) return
        const m = makeMarker(f, onAssetClick)
        m.addTo(group)
        count++
      })
      group.addTo(mapRef.current)
      layers.current.infrastructure = group
      setAssetCount(count)
      setStatus(`${count} assets loaded`)
    } catch (e) {
      setStatus('Seed data unavailable')
      console.warn('Infrastructure load failed:', e)
    }
  }, [onAssetClick])

  // ── Load wind ──────────────────────────────────────────────────
  const loadWind = useCallback(async () => {
    if (!mapRef.current) return
    try {
      const { vectors } = await getWindVectors({ min_lat: 30, max_lat: 65, min_lon: -15, max_lon: 40 })
      if (layers.current.wind) mapRef.current.removeLayer(layers.current.wind)
      const group = L.layerGroup()
      vectors?.forEach(v => {
        const speed = v.speed_ms || 0
        const opacity = Math.min(0.8, 0.2 + speed / 25)
        const circle = L.circleMarker([v.lat, v.lon], {
          radius: 4 + speed / 4,
          fillColor: `hsl(${200 - speed * 5},100%,60%)`,
          fillOpacity: opacity,
          stroke: false,
        })
        circle.bindTooltip(`Wind: ${speed.toFixed(1)} m/s`, { className: 'odin-tooltip' })
        circle.addTo(group)
      })
      group.addTo(mapRef.current)
      layers.current.wind = group
    } catch (e) { console.warn('Wind load failed:', e) }
  }, [])

  // ── Load minerals ──────────────────────────────────────────────
  const loadMinerals = useCallback(async () => {
    if (!mapRef.current) return
    try {
      const { geojson } = await getMineralsOverlay()
      if (!geojson) return
      if (layers.current.minerals) mapRef.current.removeLayer(layers.current.minerals)
      const group = L.layerGroup()
      geojson.features?.forEach(f => {
        const [lng, lat] = f.geometry.coordinates
        const p = f.properties
        const riskColor = { CRITICAL:'#ef4444', HIGH:'#f97316', MEDIUM:'#f59e0b', LOW:'#84cc16' }[p.geopolitical_risk] || '#10b981'
        const radius = Math.max(6, Math.min(20, (p.reserves_mt || 1000000) / 2000000))
        const m = L.circleMarker([lat, lng], {
          radius,
          fillColor: riskColor,
          fillOpacity: 0.7,
          color: riskColor,
          weight: 1.5,
          opacity: 0.9,
        })
        m.bindTooltip(`${p.mineral_type || 'Mineral'} — ${p.country}<br>Risk: ${p.geopolitical_risk}`, { className: 'odin-tooltip' })
        m.addTo(group)
      })
      group.addTo(mapRef.current)
      layers.current.minerals = group
    } catch (e) { console.warn('Minerals load failed:', e) }
  }, [])

  useEffect(() => { if (mapReady) loadInfrastructure() }, [mapReady, loadInfrastructure])
  useEffect(() => { if (mapReady && activeLayers.wind) loadWind() }, [mapReady, activeLayers.wind, loadWind])
  useEffect(() => { if (mapReady && activeLayers.minerals) loadMinerals() }, [mapReady, activeLayers.minerals, loadMinerals])

  // ── Toggle layer visibility ────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    Object.entries(activeLayers).forEach(([key, visible]) => {
      const layer = layers.current[key]
      if (!layer) return
      if (visible) { mapRef.current.addLayer(layer) }
      else { mapRef.current.removeLayer(layer) }
    })
  }, [activeLayers])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} id="odin-map" />
      <div className="map-status-bar">
        <span className="map-status-dot" />
        {status}
        {assetCount > 0 && <span className="map-status-count">{assetCount} nodes</span>}
      </div>
    </div>
  )
}
