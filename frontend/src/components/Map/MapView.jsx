import React, {
  useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle,
} from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// ── Constants ──────────────────────────────────────────────────────────────
const API  = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`
const L    = (n) => `${API}/api/v1/layers/${n}`
const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const CARTO_DARK_NOLABELS = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'
const SAT_TILES = ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']

// Dead-reckoning interval for smooth flight animation (ms)
const DR_INTERVAL = 100  // 10fps — halves GPU load vs 20fps, still smooth
// Flight trail history length
const TRAIL_LEN = 8
// OpenSky poll interval (s) — match backend
const OPENSKY_POLL_S = 12

// ── Canvas image helpers ───────────────────────────────────────────────────

/** White diamond for datacenter markers — SDF-tintable */
function makeDiamondImg(px = 32) {
  const c = document.createElement('canvas')
  c.width = c.height = px
  const ctx = c.getContext('2d')
  const h = px / 2, m = 1.5
  ctx.clearRect(0, 0, px, px)
  ctx.beginPath()
  ctx.moveTo(h, m); ctx.lineTo(px - m, h)
  ctx.lineTo(h, px - m); ctx.lineTo(m, h)
  ctx.closePath()
  ctx.fillStyle = 'white'
  ctx.fill()
  const d = ctx.getImageData(0, 0, px, px)
  return { width: px, height: px, data: new Uint8Array(d.data.buffer) }
}

/** White airplane silhouette facing up (heading=0 → north) — SDF-tintable */
function makeAirplaneImg(px = 40) {
  const c = document.createElement('canvas')
  c.width = c.height = px
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, px, px)
  const s = px / 40   // scale factor
  ctx.save()
  ctx.translate(px / 2, px / 2)
  ctx.fillStyle = 'white'

  // Fuselage
  ctx.beginPath()
  ctx.ellipse(0, -1 * s, 2.2 * s, 12 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  // Main wings
  ctx.beginPath()
  ctx.moveTo(-1.5 * s, -1 * s)
  ctx.lineTo(-16 * s,  5 * s)
  ctx.lineTo(-14 * s,  7 * s)
  ctx.lineTo(-1.5 * s,  3 * s)
  ctx.lineTo( 1.5 * s,  3 * s)
  ctx.lineTo( 14 * s,  7 * s)
  ctx.lineTo( 16 * s,  5 * s)
  ctx.lineTo( 1.5 * s, -1 * s)
  ctx.closePath()
  ctx.fill()

  // Tail fins
  ctx.beginPath()
  ctx.moveTo(-1.2 * s, 9 * s)
  ctx.lineTo(-7 * s,  15 * s)
  ctx.lineTo(-6 * s,  17 * s)
  ctx.lineTo(-1.2 * s, 13 * s)
  ctx.lineTo( 1.2 * s, 13 * s)
  ctx.lineTo( 6 * s,  17 * s)
  ctx.lineTo( 7 * s,  15 * s)
  ctx.lineTo( 1.2 * s,  9 * s)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
  const d = ctx.getImageData(0, 0, px, px)
  return { width: px, height: px, data: new Uint8Array(d.data.buffer) }
}

// ── Geo utils ──────────────────────────────────────────────────────────────
function pointsToFC(items = [], extraProps) {
  const features = []
  for (const it of items) {
    if (!it || it.lon == null || it.lat == null) continue
    features.push({
      type: 'Feature',
      id: it.id || it.norad_id || undefined,
      geometry: { type: 'Point', coordinates: [it.lon, it.lat] },
      properties: extraProps ? { ...it, ...extraProps(it) } : it,
    })
  }
  return { type: 'FeatureCollection', features }
}

/** Haversine dead-reckoning: move point by velocity (m/s) in heading (deg) over dt (s) */
function drPosition(lon, lat, heading_deg, velocity_ms, dt) {
  if (!velocity_ms || !heading_deg || !dt) return [lon, lat]
  const R = 6_371_000
  const dist = velocity_ms * dt
  const bear = (heading_deg * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lon1 = (lon * Math.PI) / 180
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist / R) + Math.cos(lat1) * Math.sin(dist / R) * Math.cos(bear))
  const lon2 = lon1 + Math.atan2(Math.sin(bear) * Math.sin(dist / R) * Math.cos(lat1), Math.cos(dist / R) - Math.sin(lat1) * Math.sin(lat2))
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]
}

// ── MapView ────────────────────────────────────────────────────────────────
const MapView = forwardRef(function MapView(
  { activeLayers = {}, onAssetClick, realtime = {}, satellite = false },
  ref,
) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const popupRef      = useRef(null)
  const rafRef        = useRef(null)
  const drRef         = useRef(null)   // dead-reckoning interval
  // Flight state for dead-reckoning
  const flightData    = useRef(new Map())  // id → {lon, lat, heading_deg, velocity_ms}
  const flightLastTs  = useRef(Date.now())
  const flightTrails  = useRef(new Map())  // id → [[lon,lat], ...]
  const trailTickRef  = useRef(0)

  const [mapReady, setMapReady] = useState(false)
  const [status, setStatus]     = useState('Loading basemap…')

  useImperativeHandle(ref, () => ({
    flyTo(lon, lat, alt) {
      if (!mapRef.current) return
      const zoom = Math.max(2, Math.min(12, 14 - Math.log2((alt || 1_500_000) / 1000)))
      mapRef.current.flyTo({ center: [lon, lat], zoom, duration: 1500 })
    },
    feedSatellites(items) {
      const src = mapRef.current?.getSource('rt-satellites')
      if (src) src.setData(pointsToFC(items))
    },
  }), [])

  // ── Map initialization ────────────────────────────────────────────────────
  // onAssetClick is stable (setState), but to be safe we capture it in a ref
  const onAssetClickRef = useRef(onAssetClick)
  useEffect(() => { onAssetClickRef.current = onAssetClick }, [onAssetClick])

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    let dead = false

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_DARK_NOLABELS,
      center: [-30, 25],
      zoom: 1.8,
      attributionControl: false,
      pitchWithRotate: true,
      maxPitch: 60,
      antialias: true,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    // Single shared popup used everywhere
    const popup = new maplibregl.Popup({
      closeButton: true, maxWidth: '300px', className: 'odin-ml-popup',
    })
    popupRef.current = popup

    map.on('load', async () => {
      if (dead) return

      // ── Pin the background to near-black (CARTO dark-matter is already very dark) ──
      const styleLayers = map.getStyle().layers || []
      for (const sl of styleLayers) {
        if (sl.type === 'background') {
          try { map.setPaintProperty(sl.id, 'background-color', '#060a0f') } catch (_) {}
        }
      }

      // ── Custom images ────────────────────────────────────────────────
      map.addImage('dc-diamond',  makeDiamondImg(32),   { sdf: true })
      map.addImage('rt-airplane', makeAirplaneImg(40),  { sdf: true })

      // ── Satellite imagery underlay ───────────────────────────────────
      map.addSource('sat-img', {
        type: 'raster', tiles: SAT_TILES, tileSize: 256, maxzoom: 19,
        attribution: 'Imagery © Esri/Maxar',
      })
      map.addLayer({
        id: 'sat-layer', type: 'raster', source: 'sat-img',
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': 0.72, 'raster-fade-duration': 300 },
      })

      // ══════════════════════════════════════════════════════════════════
      //  LAYER ORDER: cables → tx → subs → plants → DCs → events → RT
      // ══════════════════════════════════════════════════════════════════

      // ── 1. Submarine cables ──────────────────────────────────────────
      map.addSource('cables', { type: 'geojson', data: L('submarine_cables') })
      map.addLayer({ id: 'cables-glow', type: 'line', source: 'cables',
        paint: { 'line-color': '#e879f9', 'line-width': 5, 'line-opacity': 0.10, 'line-blur': 5 } })
      map.addLayer({ id: 'cables-line', type: 'line', source: 'cables',
        paint: { 'line-color': '#e879f9', 'line-width': 1.4, 'line-opacity': 0.62, 'line-dasharray': [4, 2] },
        layout: { 'line-cap': 'round' } })

      map.addSource('cable-ldg', { type: 'geojson', data: L('cable_landing_points') })
      map.addLayer({ id: 'cable-ldg-glow', type: 'circle', source: 'cable-ldg',
        paint: { 'circle-radius': 9, 'circle-color': '#e879f9', 'circle-opacity': 0.20, 'circle-blur': 0.8 } })
      map.addLayer({ id: 'cable-ldg-core', type: 'circle', source: 'cable-ldg',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2.5, 6, 4, 10, 6],
          'circle-color': '#e879f9', 'circle-opacity': 0.92,
          'circle-stroke-color': '#fff', 'circle-stroke-width': 1.0,
        } })
      mkPopup(map, popup, 'cable-ldg-core', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:#e879f9">CABLE LANDING POINT</div>
          <div class="odin-popup-name">${p.name || '—'}</div>
        </div>`))

      // ── 2. Transmission lines (global if available, else US-only) ────
      // transmission_global_styled.geojson is generated by etl/fetch_global_tx.py
      const txLayer = await fetch(L('transmission_global_styled'), { method: 'HEAD' })
        .then(r => r.ok ? 'transmission_global_styled' : 'transmission_styled')
        .catch(() => 'transmission_styled')
      map.addSource('tx', {
        type: 'geojson', data: L(txLayer), tolerance: 0.5, buffer: 32,
      })
      map.addLayer({ id: 'tx-glow', type: 'line', source: 'tx',
        paint: {
          'line-color': ['get', 'c'],
          'line-width': ['interpolate', ['linear'], ['zoom'],
            1, ['*', ['get', 'w'], 4.0],
            5, ['*', ['get', 'w'], 6.0],
            10, ['*', ['get', 'w'], 9.0]],
          'line-opacity': 0.38, 'line-blur': 3.5,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' } })
      map.addLayer({ id: 'tx-core', type: 'line', source: 'tx',
        paint: {
          'line-color': ['get', 'c'],
          'line-width': ['interpolate', ['linear'], ['zoom'],
            1, ['*', ['get', 'w'], 1.6],
            4, ['*', ['get', 'w'], 2.0],
            7, ['*', ['get', 'w'], 2.8],
            11, ['*', ['get', 'w'], 3.6]],
          'line-opacity': ['interpolate', ['linear'], ['zoom'],
            1, ['*', ['get', 'o'], 1.15],
            5, ['get', 'o'],
            10, ['get', 'o']],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' } })
      mkPopup(map, popup, 'tx-core', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:${p.c || '#22d3ee'}">TRANSMISSION LINE</div>
          <div class="odin-popup-name">${p.v ? p.v + ' kV' : '—'}</div>
        </div>`))

      // ── 3. Substations ───────────────────────────────────────────────
      map.addSource('subs', { type: 'geojson', data: L('substations_styled'), generateId: true })
      map.addLayer({ id: 'sub-glow', type: 'circle', source: 'subs', minzoom: 4,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, ['*', ['get', 's'], 1.0], 9, ['*', ['get', 's'], 2.0]],
          'circle-color': ['get', 'c'], 'circle-opacity': 0.18, 'circle-blur': 0.8,
        } })
      map.addLayer({ id: 'sub-core', type: 'circle', source: 'subs', minzoom: 3,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            3, ['*', ['get', 's'], 0.35],
            6, ['*', ['get', 's'], 0.60],
            10, ['get', 's'],
            13, ['*', ['get', 's'], 1.4]],
          'circle-color': ['get', 'c'], 'circle-opacity': 0.90,
          'circle-stroke-color': 'rgba(255,255,255,0.55)', 'circle-stroke-width': 0.8,
          'circle-pitch-alignment': 'map',
        } })
      mkPopup(map, popup, 'sub-core', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:${p.c || '#22d3ee'}">SUBSTATION</div>
          <div class="odin-popup-name">${p.name || '—'}</div>
          <div class="odin-popup-meta">${p.v ? p.v + ' kV' : ''}</div>
        </div>`))

      // ── 4. Power plants (3-layer glow) ───────────────────────────────
      map.addSource('plants', { type: 'geojson', data: L('power_plants_styled'), generateId: true })
      // outer glow — only appears at zoom ≥ 4 to avoid blobs at world view
      map.addLayer({ id: 'plants-glow', type: 'circle', source: 'plants', minzoom: 4,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            4, ['*', ['get', '_r'], 1.2], 8, ['*', ['get', '_r'], 2.2], 12, ['*', ['get', '_r'], 3.5]],
          'circle-color': ['get', '_c'], 'circle-opacity': 0.15, 'circle-blur': 1.2,
        } })
      // mid glow — tighter radii at low zoom
      map.addLayer({ id: 'plants-mid', type: 'circle', source: 'plants',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            1, ['*', ['get', '_r'], 0.70],
            5, ['*', ['get', '_r'], 1.10],
            9, ['*', ['get', '_r'], 1.80]],
          'circle-color': ['get', '_c'], 'circle-opacity': 0.28, 'circle-blur': 0.5,
        } })
      // sharp core
      map.addLayer({ id: 'plants-core', type: 'circle', source: 'plants',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            1, ['*', ['get', '_r'], 0.32],
            4, ['*', ['get', '_r'], 0.50],
            7, ['*', ['get', '_r'], 0.80],
            11, ['*', ['get', '_r'], 1.30]],
          'circle-color': ['get', '_c'], 'circle-opacity': 0.95,
          'circle-stroke-color': 'rgba(255,255,255,0.40)', 'circle-stroke-width': 0.9,
          'circle-pitch-alignment': 'map',
        } })
      map.on('mouseenter', 'plants-core', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'plants-core', () => { map.getCanvas().style.cursor = '' })
      map.on('click', 'plants-core', (e) => {
        const f = e.features?.[0]; if (!f) return
        const p = f.properties
        popup.setLngLat(e.lngLat).setHTML(`
          <div class="odin-popup">
            <div class="odin-popup-type" style="color:${p._c || '#94a3b8'}">${p.technology || 'POWER PLANT'}</div>
            <div class="odin-popup-name">${p.name || '—'}</div>
            <div class="odin-popup-meta">${p.country || ''}${p.capacity_mw ? ' · ' + fmtMW(p.capacity_mw) : ''}</div>
          </div>`).addTo(map)
        onAssetClickRef.current?.({ ...p, asset_type: 'POWER_PLANT', status: 'OPERATIONAL' })
      })

      // ── 5. Datacenters (diamond SDF) ─────────────────────────────────
      map.addSource('dcs', { type: 'geojson', data: L('datacenters_styled') })
      map.addLayer({ id: 'dc-halo', type: 'circle', source: 'dcs', minzoom: 2,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, ['*', ['get', 's'], 2.0], 9, ['*', ['get', 's'], 3.5]],
          'circle-color': '#818cf8', 'circle-opacity': 0.22, 'circle-blur': 0.8,
        } })
      map.addLayer({ id: 'dc-diamond', type: 'symbol', source: 'dcs', minzoom: 2,
        layout: {
          'icon-image': 'dc-diamond',
          'icon-size': ['interpolate', ['linear'], ['zoom'],
            2, ['/', ['get', 's'], 18], 6, ['/', ['get', 's'], 12], 10, ['/', ['get', 's'], 8]],
          'icon-allow-overlap': true, 'icon-ignore-placement': true,
        },
        paint: { 'icon-color': '#818cf8', 'icon-halo-color': '#a5b4fc', 'icon-halo-width': 2, 'icon-opacity': 0.97 } })
      mkPopup(map, popup, 'dc-diamond', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:#818cf8">DATA CENTER</div>
          <div class="odin-popup-name">${p.name || '—'}</div>
          <div class="odin-popup-meta">${p.operator || ''}${p.sqft ? ' · ' + Number(p.sqft).toLocaleString() + ' ft²' : ''}</div>
        </div>`))

      // ── 6. Wildfires ─────────────────────────────────────────────────
      map.addSource('wildfires', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({ id: 'fires-glow', type: 'circle', source: 'wildfires',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.5, 10, 6, 16, 9, 24],
          'circle-color': '#FF4500', 'circle-opacity': 0.20, 'circle-blur': 0.9,
        } })
      map.addLayer({ id: 'fires-core', type: 'circle', source: 'wildfires',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.5, 2.2, 5, 3.8, 9, 5.5],
          'circle-color': '#FF7700',
          'circle-stroke-color': '#FFD54A', 'circle-stroke-width': 0.8, 'circle-opacity': 0.94,
        } })
      mkPopup(map, popup, 'fires-core', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:#FF7700">WILDFIRE · NASA EONET</div>
          <div class="odin-popup-name">${p.title || 'Active fire'}</div>
          <div class="odin-popup-meta">${p.date || ''}</div>
        </div>`))
      fetch(L('wildfires')).then(r => r.ok ? r.json() : null).then(fc => {
        if (fc && !dead) { const s = map.getSource('wildfires'); if (s) s.setData(fc) }
      }).catch(() => {})

      // ── 7. Real-time: earthquakes ─────────────────────────────────────
      map.addSource('rt-earthquakes', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({ id: 'quakes-pulse', type: 'circle', source: 'rt-earthquakes',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 2, 8, 4, 18, 6, 32, 8, 50],
          'circle-color': '#ff1744', 'circle-opacity': 0,
          'circle-stroke-color': '#ff1744', 'circle-stroke-opacity': 0.60, 'circle-stroke-width': 1.5,
        } })
      map.addLayer({ id: 'quakes-core', type: 'circle', source: 'rt-earthquakes',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 2, 2.5, 5, 5, 7, 8, 9, 12],
          'circle-color': ['interpolate', ['linear'], ['get', 'mag'],
            2, '#FFCC00', 4, '#FF9900', 6, '#FF3300', 8, '#FF0000'],
          'circle-stroke-color': '#fff', 'circle-stroke-width': 0.7, 'circle-opacity': 0.95,
        } })
      mkPopup(map, popup, 'quakes-core', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:#ff5252">EARTHQUAKE · USGS</div>
          <div class="odin-popup-name">M${p.mag} — ${p.place || ''}</div>
          <div class="odin-popup-meta">Depth ${p.depth_km != null ? p.depth_km.toFixed(0) + ' km' : '—'}${p.tsunami ? ' · TSUNAMI RISK' : ''}</div>
        </div>`))

      // ── 8. Real-time: ships ───────────────────────────────────────────
      map.addSource('rt-ships', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({ id: 'ships-glow', type: 'circle', source: 'rt-ships',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.5, 3.5, 4, 5.5, 8, 9],
          'circle-color': '#00d4ff', 'circle-opacity': 0.18, 'circle-blur': 0.85,
        } })
      map.addLayer({ id: 'ships-core', type: 'circle', source: 'rt-ships',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.5, 1.6, 4, 2.4, 8, 4.0],
          'circle-color': '#00d4ff', 'circle-opacity': 0.96,
          'circle-stroke-color': '#cffaff', 'circle-stroke-width': 0.7,
          'circle-pitch-alignment': 'map',
        } })
      mkPopup(map, popup, 'ships-core', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:#00d4ff">VESSEL · AIS</div>
          <div class="odin-popup-name">${p.name || p.id || 'VESSEL'}</div>
          <div class="odin-popup-meta">${p.type || ''} · ${p.speed_kn != null ? p.speed_kn.toFixed(1) + ' kn' : '—'}</div>
        </div>`))

      // ── 9. Real-time: satellites ──────────────────────────────────────
      map.addSource('rt-satellites', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({ id: 'sats-glow', type: 'circle', source: 'rt-satellites',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.5, 2.5, 4, 4, 8, 6],
          'circle-color': '#a3e635', 'circle-opacity': 0.15, 'circle-blur': 0.8,
        } })
      map.addLayer({ id: 'sats-core', type: 'circle', source: 'rt-satellites',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1.5, 1.3, 4, 2.2, 8, 3.2],
          'circle-color': '#ffffff', 'circle-opacity': 0.85,
          'circle-stroke-color': '#a3e635', 'circle-stroke-width': 0.6,
        } })
      mkPopup(map, popup, 'sats-core', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:#a3e635">SATELLITE · TLE</div>
          <div class="odin-popup-name">${p.name || p.id || '—'}</div>
          <div class="odin-popup-meta">ALT ${p.alt_km != null ? Number(p.alt_km).toFixed(0) + ' km' : '—'}</div>
        </div>`))

      // ── 10. Real-time: flights (airplane icon + trail) ────────────────
      // Trail source — LineStrings per aircraft (lineMetrics required for line-gradient)
      map.addSource('rt-flight-trails', { type: 'geojson', data: EMPTY_FC, lineMetrics: true })
      map.addLayer({ id: 'flight-trails', type: 'line', source: 'rt-flight-trails',
        paint: {
          'line-color': '#60a5fa', 'line-opacity': 0.50,
          'line-width': 1.2,
          'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(96,165,250,0)', 1, '#60a5fa'],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' } })

      // Flight positions — airplane SDF icons rotated by heading
      map.addSource('rt-flights', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({ id: 'flights-core', type: 'symbol', source: 'rt-flights',
        layout: {
          'icon-image': 'rt-airplane',
          'icon-rotate': ['coalesce', ['get', 'heading_deg'], 0],
          'icon-rotation-alignment': 'map',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1.5, 0.30, 5, 0.42, 9, 0.58],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': '#ffffff',
          'icon-halo-color': '#60a5fa',
          'icon-halo-width': 1.5,
          'icon-opacity': 0.95,
        } })
      mkPopup(map, popup, 'flights-core', (p) => popup.setHTML(`
        <div class="odin-popup">
          <div class="odin-popup-type" style="color:#60a5fa">FLIGHT · ADS-B</div>
          <div class="odin-popup-name">${p.callsign || p.id || 'UNKNOWN'}</div>
          <div class="odin-popup-meta">${p.country || ''} · ALT ${p.alt_m ? Math.round(p.alt_m) + ' m' : '—'} · ${p.velocity_ms ? (p.velocity_ms * 1.944).toFixed(0) + ' kn' : '—'} · ${p.heading_deg != null ? Math.round(p.heading_deg) + '°' : ''}</div>
        </div>`))

      setStatus('Map ready — data loading…')
      setMapReady(true)
    })

    mapRef.current = map
    return () => {
      dead = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (drRef.current) clearInterval(drRef.current)
      map.remove()
      mapRef.current = null
      popupRef.current = null
    }
  }, []) // empty deps — onAssetClick captured via ref

  // ── Earthquake pulse animation (RAF) ────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return
    let raf, t = 0
    const tick = () => {
      t += 0.055
      const o = 0.2 + 0.5 * Math.abs(Math.sin(t))
      const r = 1 + 0.45 * Math.abs(Math.sin(t))
      const m = mapRef.current
      if (m?.getLayer('quakes-pulse')) {
        m.setPaintProperty('quakes-pulse', 'circle-stroke-opacity', o)
        m.setPaintProperty('quakes-pulse', 'circle-radius', [
          'interpolate', ['linear'], ['get', 'mag'],
          2, 8 * r, 4, 18 * r, 6, 32 * r, 8, 50 * r,
        ])
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    rafRef.current = raf
    return () => cancelAnimationFrame(raf)
  }, [mapReady])

  // ── Dead-reckoning flight interpolation ─────────────────────────────────
  useEffect(() => {
    if (!mapReady) return
    let lastTick = Date.now()

    const dr = setInterval(() => {
      const map = mapRef.current
      if (!map) return
      const now = Date.now()
      const dt  = (now - lastTick) / 1000  // seconds since last tick
      lastTick  = now

      const flightMap = flightData.current
      if (!flightMap.size) return

      const features = []
      const trailFeatures = []
      const trailNow = Math.floor(now / 1000)  // update trails every ~1s

      for (const [id, f] of flightMap) {
        if (f.on_ground) continue
        const [lon, lat] = drPosition(f.lon, f.lat, f.heading_deg, f.velocity_ms, dt)
        // update stored position
        f.lon = lon; f.lat = lat

        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lon, lat] },
          properties: f,
        })

        // Trails: append position every second
        if (trailNow !== trailTickRef.current) {
          const hist = flightTrails.current.get(id) || []
          hist.push([lon, lat])
          if (hist.length > TRAIL_LEN) hist.shift()
          flightTrails.current.set(id, hist)
        }
        const hist = flightTrails.current.get(id)
        if (hist && hist.length >= 2) {
          trailFeatures.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: hist },
            properties: {},
          })
        }
      }
      if (trailNow !== trailTickRef.current) trailTickRef.current = trailNow

      const flightSrc = map.getSource('rt-flights')
      if (flightSrc) flightSrc.setData({ type: 'FeatureCollection', features })

      const trailSrc = map.getSource('rt-flight-trails')
      if (trailSrc) trailSrc.setData({ type: 'FeatureCollection', features: trailFeatures })
    }, DR_INTERVAL)

    drRef.current = dr
    return () => clearInterval(dr)
  }, [mapReady])

  // ── Ingest new real-time data ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    const setSrc = (id, fc) => { const s = map.getSource(id); if (s) s.setData(fc) }

    // Flights: update the flightData map (dead-reckoning reads from it)
    if (realtime.flights?.items) {
      for (const f of realtime.flights.items) {
        if (!f?.id) continue
        const prev = flightData.current.get(f.id)
        if (prev) {
          // Keep dead-reckoned position if data is within plausible range
          const dist = Math.hypot((f.lon || 0) - prev.lon, (f.lat || 0) - prev.lat)
          // If server position has moved significantly, snap to it (avoid wild jumps)
          if (dist < 5) { f.lon = prev.lon; f.lat = prev.lat } // trust DR for small moves
        }
        flightData.current.set(f.id, { ...f })
      }
      // Remove flights no longer in the feed
      const ids = new Set(realtime.flights.items.map(f => f?.id).filter(Boolean))
      for (const id of flightData.current.keys()) {
        if (!ids.has(id)) { flightData.current.delete(id); flightTrails.current.delete(id) }
      }
      flightLastTs.current = Date.now()
    }

    // Ships, satellites, earthquakes — direct setData
    if (realtime.ships?.items)       setSrc('rt-ships',       pointsToFC(realtime.ships.items))
    if (realtime.satellites?.items)  setSrc('rt-satellites',  pointsToFC(realtime.satellites.items))
    if (realtime.earthquakes?.items) setSrc('rt-earthquakes', pointsToFC(realtime.earthquakes.items))
  }, [realtime, mapReady])

  // ── Layer visibility ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const vis = (id, show) => {
      if (mapRef.current.getLayer(id))
        mapRef.current.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none')
    }
    const on = (key, def = true) => activeLayers[key] !== false && (activeLayers[key] ?? def)

    const infra = on('infrastructure')
    for (const id of ['plants-glow', 'plants-mid', 'plants-core', 'sub-glow', 'sub-core']) vis(id, infra)
    const tx = on('transmission')
    for (const id of ['tx-glow', 'tx-core']) vis(id, tx)
    const dc = on('datacenters')
    for (const id of ['dc-halo', 'dc-diamond']) vis(id, dc)
    const cables = on('cables')
    for (const id of ['cables-glow', 'cables-line', 'cable-ldg-glow', 'cable-ldg-core']) vis(id, cables)

    const fl = on('flights')
    for (const id of ['flights-core', 'flight-trails']) vis(id, fl)
    for (const id of ['ships-glow', 'ships-core'])    vis(id, on('ships'))
    for (const id of ['sats-glow', 'sats-core'])      vis(id, on('satellites', false))
    for (const id of ['quakes-pulse', 'quakes-core']) vis(id, on('earthquakes'))
    for (const id of ['fires-glow', 'fires-core'])    vis(id, on('wildfires'))
  }, [activeLayers, mapReady])

  // ── Satellite imagery toggle ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const m = mapRef.current
    if (m.getLayer('sat-layer'))
      m.setLayoutProperty('sat-layer', 'visibility', satellite ? 'visible' : 'none')
  }, [satellite, mapReady])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div className="map-status-bar">
        <span className="map-status-dot" />
        {status}
      </div>
    </div>
  )
})

export default MapView

// ── Shared popup helper ───────────────────────────────────────────────────
function mkPopup(map, popup, layerId, setFn) {
  map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
  map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
  map.on('click', layerId, (e) => {
    if (!e.features?.[0]) return
    setFn(e.features[0].properties)
    popup.setLngLat(e.lngLat).addTo(map)
  })
}

// ── Formatting ────────────────────────────────────────────────────────────
function fmtMW(mw) {
  if (!mw) return '—'
  return mw >= 1000 ? `${(mw / 1000).toFixed(1)} GW` : `${Math.round(mw)} MW`
}
