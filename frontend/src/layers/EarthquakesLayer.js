/**
 * EarthquakesLayer — magnitude-sized triangle markers, depth-colored.
 * Loads initial USGS snapshot from /api/v1/layers/earthquakes (if present)
 * AND accepts live updates via updateEarthquakes(layer, items).
 */
import * as Cesium from 'cesium'
import { triangleCanvas } from '../components/Globe/cesiumUtils.js'

const TEX = {}
const colorForDepth = (d) => {
  if (d < 70) return '#ff4444'
  if (d < 300) return '#fb923c'
  return '#38bdf8'
}
function getTex(color) {
  if (!TEX[color]) TEX[color] = triangleCanvas(color, 18)
  return TEX[color]
}

export function initEarthquakes(viewer) {
  const billboards = viewer.scene.primitives.add(new Cesium.BillboardCollection({ scene: viewer.scene }))
  const layer = { type: 'earthquakes', visible: true, billboards, viewer, byId: new Map(), destroyed: false }
  loadInitial(layer).catch(() => {})
  return layer
}

async function loadInitial(layer) {
  try {
    const resp = await fetch('/api/v1/layers/earthquakes')
    if (!resp.ok) return
    const data = await resp.json()

    if (layer.destroyed) return

    if (data?.features) {
      const items = data.features.map(f => ({
        id: f.id || f.properties?.id || f.properties?.code,
        lon: f.geometry?.coordinates?.[0],
        lat: f.geometry?.coordinates?.[1],
        depth_km: f.geometry?.coordinates?.[2] || f.properties?.depth || 10,
        magnitude: f.properties?.mag,
        place: f.properties?.place,
        time: f.properties?.time,
      })).filter(it => Number.isFinite(it.lat) && Number.isFinite(it.lon))
      updateEarthquakes(layer, items)
    }
  } catch (e) {}
}

export function updateEarthquakes(layer, items) {
  if (!layer || !layer.visible || layer.destroyed) return
  for (const it of items) {
    if (layer.destroyed) return
    if (!Number.isFinite(it.lat) || !Number.isFinite(it.lon)) continue
    const id = it.id || `${it.lat},${it.lon},${it.time || ''}`
    if (layer.byId.has(id)) continue
    const mag = +it.magnitude || +it.mag || 0
    if (mag < 2.5) continue
    const depth = +it.depth_km || +it.depth || 10
    const color = colorForDepth(depth)
    const scale = Math.max(0.4, Math.min(2.2, 0.4 + (mag - 2.5) * 0.32))
    const bb = layer.billboards.add({
      position: Cesium.Cartesian3.fromDegrees(it.lon, it.lat, 0),
      image: getTex(color),
      scale,
    })
    bb.assetData = {
      asset_type: 'earthquake',
      name: it.place || `M${mag.toFixed(1)} earthquake`,
      magnitude: mag,
      depth_km: depth,
      time: it.time,
      status: mag > 5 ? 'CRITICAL' : 'OPERATIONAL',
    }
    layer.byId.set(id, bb)
    if (layer.byId.size > 1000) {
      // Trim oldest
      const firstKey = layer.byId.keys().next().value
      const oldBb = layer.byId.get(firstKey)
      try { layer.billboards.remove(oldBb) } catch (e) {}
      layer.byId.delete(firstKey)
    }
  }
}

export function destroyEarthquakes(layer) {
  if (!layer) return
  layer.destroyed = true
  try { layer.billboards.removeAll() } catch (e) {}
  layer.byId.clear()
}
