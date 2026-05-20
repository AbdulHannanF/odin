/**
 * WildfiresLayer — pulsing orange glow circles for NASA EONET wildfires.
 */
import * as Cesium from 'cesium'
import { glowCircleCanvas } from '../components/Globe/cesiumUtils.js'

const FIRE_TEX = glowCircleCanvas('#ff4d00', 36, 1.0)
const VOLC_TEX = glowCircleCanvas('#ff8800', 36, 1.0)

export function initWildfires(viewer) {
  const billboards = viewer.scene.primitives.add(new Cesium.BillboardCollection({ scene: viewer.scene }))
  const layer = { type: 'wildfires', visible: true, billboards, viewer, loaded: false, pulsing: [], destroyed: false }
  load(layer).catch(() => {})
  startPulse(layer)
  return layer
}

async function load(layer) {
  try {
    const [firesResp, volcResp] = await Promise.all([
      fetch('/api/v1/layers/wildfires').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/v1/layers/volcanoes').then(r => r.ok ? r.json() : null).catch(() => null),
    ])

    if (layer.destroyed) return

    if (firesResp?.features) {
      for (const f of firesResp.features) {
        if (layer.destroyed) return
        if (f.geometry?.type !== 'Point') continue
        const [lon, lat] = f.geometry.coordinates
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
        const bb = layer.billboards.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          image: FIRE_TEX,
          scale: 1.0,
        })
        bb.assetData = {
          asset_type: 'wildfire',
          name: f.properties?.title || 'Wildfire',
          status: 'VULNERABLE',
          ...(f.properties || {}),
        }
        layer.pulsing.push({ bb, base: 1.0, phase: Math.random() * Math.PI * 2 })
      }
    }
    if (volcResp?.features) {
      for (const f of volcResp.features) {
        if (layer.destroyed) return
        if (f.geometry?.type !== 'Point') continue
        const [lon, lat] = f.geometry.coordinates
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
        const bb = layer.billboards.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          image: VOLC_TEX,
          scale: 1.1,
        })
        bb.assetData = {
          asset_type: 'volcano',
          name: f.properties?.title || f.properties?.name || 'Volcano',
          status: 'OPERATIONAL',
          ...(f.properties || {}),
        }
      }
    }
    layer.loaded = true
  } catch (e) {
    console.warn('wildfires load failed', e)
  }
}

function startPulse(layer) {
  const tick = () => {
    if (layer.destroyed || !layer.pulsing) return
    const t = Date.now() / 1000
    // Pulse a maximum of 100 active wildfires to ensure high main-thread responsiveness
    const limit = Math.min(layer.pulsing.length, 100)
    for (let i = 0; i < limit; i++) {
      const p = layer.pulsing[i]
      try { p.bb.scale = p.base * (1 + 0.18 * Math.sin(t * 1.8 + p.phase)) } catch (e) {}
    }
  }
  layer._pulseId = setInterval(tick, 150)
}

export function destroyWildfires(layer) {
  if (!layer) return
  layer.destroyed = true
  if (layer._pulseId) clearInterval(layer._pulseId)
  try { layer.billboards.removeAll() } catch (e) {}
  layer.pulsing = []
}
