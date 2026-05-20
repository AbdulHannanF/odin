/**
 * SubstationsLayer — OpenGridWorks-style glowing substation circles.
 * Features built-in GPU-driven LOD (DistanceDisplayCondition) matching the transmission lines
 * and progressive chunked loading of major substations (>= 230 kV) at 60 FPS.
 */
import * as Cesium from 'cesium'
import { glowCircleCanvas } from '../components/Globe/cesiumUtils.js'
import { SUBSTATION_COLORS, voltageToKey } from '../config/layerColors.js'

// Pre-bake textures per voltage group
const TEXTURE_CACHE = {}
function getTexture(voltageKey) {
  if (TEXTURE_CACHE[voltageKey]) return TEXTURE_CACHE[voltageKey]
  const style = SUBSTATION_COLORS[voltageKey] || SUBSTATION_COLORS[0]
  const canvas = glowCircleCanvas(style.fill, 24, 0.9)
  TEXTURE_CACHE[voltageKey] = canvas
  return canvas
}

export function initSubstations(viewer) {
  const billboards = viewer.scene.primitives.add(new Cesium.BillboardCollection({ scene: viewer.scene }))
  const layer = {
    type: 'substations',
    visible: true,
    billboards,
    viewer,
    loaded: false,
    destroyed: false,
  }
  load(layer).catch(() => {})
  return layer
}

async function load(layer) {
  try {
    const resp = await fetch('/api/v1/layers/substations')
    if (!resp.ok) return
    const data = await resp.json()
    if (!data?.features) return

    if (layer.destroyed) return

    // Filter to major substations >= 230 kV for top performance and compatibility
    const features = data.features.filter(f => {
      const props = f.properties || {}
      const voltage = +(props.voltage ?? 0)
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
        if (!g || g.type !== 'Point') continue
        
        const [lon, lat] = g.coordinates
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue

        const props = f.properties || {}
        const voltage = +(props.voltage || 230)
        const key = voltageToKey(voltage)
        const style = SUBSTATION_COLORS[key] || SUBSTATION_COLORS[0]
        
        // GPU-driven Distance Display Condition (LOD)
        // High voltage (>= 345 kV) is visible globally; mid-voltage (230 - 344 kV) appears closer
        let maxDist = 5_000_000.0 // Mid voltage: visible < 5,000 km
        if (voltage >= 345) {
          maxDist = 15_000_000.0 // High voltage: visible globally
        }

        const scale = style.size / 12.0 // normalized against baseline canvas size
        const tex = getTexture(key)

        const bb = layer.billboards.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 50),
          image: tex,
          scale: Math.max(0.3, Math.min(1.5, scale)),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, maxDist),
        })

        bb.assetData = {
          asset_type: 'substation',
          name: props.name || `Substation (${voltage} kV)`,
          voltage_kv: voltage,
          operator: props.operator || 'UNKNOWN',
          status: 'OPERATIONAL',
          ...props,
        }
      }

      offset = end
      if (offset < total) {
        setTimeout(loadChunk, 16) // queue next chunk in the next frame
      } else {
        layer.loaded = true
      }
    }

    loadChunk()
  } catch (e) {
    console.warn('substations progressive load failed', e)
  }
}

export function destroySubstations(layer) {
  if (!layer) return
  layer.destroyed = true
  try { layer.billboards.removeAll() } catch (e) {}
}
