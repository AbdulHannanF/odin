/**
 * TransmissionLayer — viewport-driven HV transmission lines.
 * Fetches all >=230 kV lines once, then adds only those in the current camera
 * view. As the user pans/zooms, newly visible lines stream in. Lines already
 * added stay (Cesium frustum-culls them on the GPU for free).
 */
import * as Cesium from 'cesium'
import { TRANSMISSION_COLORS, voltageToKey } from '../config/layerColors.js'

// OSM stores voltage in V (e.g. 220000); US HIFLD stores in kV (e.g. 230).
const toKv = raw => { const v = +raw; return v >= 1000 ? v / 1000 : v }

export function initTransmission(viewer) {
  const polylines = viewer.scene.primitives.add(new Cesium.PolylineCollection())

  const layer = {
    type: 'transmission',
    visible: true,
    polylines,
    viewer,
    loaded: false,
    destroyed: false,
    allFeatures: null,
    addedSet: new Set(),
    removeListener: null,
    _debounce: null,
  }

  load(layer).catch(() => {})
  return layer
}

async function load(layer) {
  try {
    const resp = await fetch('/api/v1/layers/transmission_global_styled')
    if (!resp.ok || layer.destroyed) return
    const data = await resp.json()
    if (!data?.features || layer.destroyed) return

    layer.allFeatures = data.features.filter(f => {
      const p = f.properties || {}
      return toKv(p.voltage_kv ?? p.v ?? p.voltage ?? p.VOLTAGE ?? 0) >= 230
    })

    renderViewport(layer)

    layer.removeListener = layer.viewer.camera.changed.addEventListener(() => {
      clearTimeout(layer._debounce)
      layer._debounce = setTimeout(() => renderViewport(layer), 200)
    })
  } catch (e) {
    console.warn('transmission load failed', e)
  }
}

function getViewRect(viewer) {
  try {
    const r = viewer.camera.computeViewRectangle()
    if (!r) return null
    const W = Cesium.Math.toDegrees(r.west)
    const E = Cesium.Math.toDegrees(r.east)
    const S = Cesium.Math.toDegrees(r.south)
    const N = Cesium.Math.toDegrees(r.north)
    // If the rect spans nearly the whole globe, treat as "show all"
    if (E - W > 340 && N - S > 150) return 'all'
    const pad = 3
    return { W: W - pad, E: E + pad, S: S - pad, N: N + pad }
  } catch {
    return null
  }
}

function anyCoordInRect(coords, r) {
  for (const c of coords) {
    if (c[0] >= r.W && c[0] <= r.E && c[1] >= r.S && c[1] <= r.N) return true
  }
  return false
}

function renderViewport(layer) {
  if (layer.destroyed || !layer.allFeatures) return
  const rect = getViewRect(layer.viewer)
  if (!rect) return

  const toAdd = []
  for (let i = 0; i < layer.allFeatures.length; i++) {
    if (layer.addedSet.has(i)) continue
    const f = layer.allFeatures[i]
    const g = f.geometry
    if (!g) continue

    let inView = false
    if (rect === 'all') {
      inView = true
    } else if (g.type === 'LineString') {
      inView = anyCoordInRect(g.coordinates, rect)
    } else if (g.type === 'MultiLineString') {
      inView = g.coordinates.some(seg => anyCoordInRect(seg, rect))
    }

    if (inView) {
      layer.addedSet.add(i)
      toAdd.push(f)
    }
  }

  if (toAdd.length > 0) addChunked(layer, toAdd, 0)
}

function addChunked(layer, features, offset) {
  if (layer.destroyed) return
  const end = Math.min(offset + 600, features.length)
  for (let i = offset; i < end; i++) {
    const f = features[i]
    const props = f.properties || {}
    const voltage = toKv(props.voltage_kv ?? props.v ?? props.voltage ?? props.VOLTAGE ?? 230)
    const style = TRANSMISSION_COLORS[voltageToKey(voltage)] || TRANSMISSION_COLORS[0]
    const g = f.geometry
    if (g.type === 'LineString') {
      addLine(layer, g.coordinates, style, props, voltage)
    } else if (g.type === 'MultiLineString') {
      for (const seg of g.coordinates) addLine(layer, seg, style, props, voltage)
    }
  }
  if (end < features.length) setTimeout(() => addChunked(layer, features, end), 16)
  else if (offset === 0 && !layer.loaded) layer.loaded = true
}

function addLine(layer, coords, style, props, voltage) {
  if (layer.destroyed || !coords || coords.length < 2) return
  const positions = []
  for (const c of coords) {
    const lon = +c[0], lat = +c[1]
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, 100))
    }
  }
  if (positions.length < 2) return

  const pl = layer.polylines.add({
    positions,
    width: style.width * 1.3,
    material: Cesium.Material.fromType('Color', {
      color: Cesium.Color.fromCssColorString(style.stroke).withAlpha(style.opacity || 0.8),
    }),
  })

  pl.assetData = {
    asset_type: 'transmission_line',
    name: props.name || `Transmission Line (${voltage} kV)`,
    voltage_kv: voltage,
    operator: props.operator || props.OWNER || 'UNKNOWN',
    status: 'OPERATIONAL',
    ...props,
  }
}

export function destroyTransmission(layer) {
  if (!layer) return
  layer.destroyed = true
  clearTimeout(layer._debounce)
  try { layer.removeListener?.() } catch {}
  try { layer.polylines.removeAll() } catch {}
}
