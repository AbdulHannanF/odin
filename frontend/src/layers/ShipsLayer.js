/**
 * ShipsLayer — billboard chevrons for AIS vessels.
 */
import * as Cesium from 'cesium'
import { shipCanvas } from '../components/Globe/cesiumUtils.js'

export function initShips(viewer) {
  const billboards = viewer.scene.primitives.add(new Cesium.BillboardCollection({ scene: viewer.scene }))
  const texture = shipCanvas('#00ffea', 22)
  return {
    type: 'ships', visible: true,
    billboards, texture,
    byId: new Map(),
    viewer,
    destroyed: false,
  }
}

export function updateShips(layer, items) {
  if (!layer || !layer.visible || layer.destroyed) return
  const seen = new Set()
  const now = Date.now()
  const cap = Math.min(items.length, 1500)

  for (let i = 0; i < cap; i++) {
    if (layer.destroyed) return
    const it = items[i]
    if (!it) continue
    const lat = +it.lat, lon = +it.lon
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const heading = +(it.heading_deg || it.course_deg || 0)
    const id = it.mmsi || it.id || `${i}-${lat.toFixed(2)},${lon.toFixed(2)}`
    seen.add(id)

    let s = layer.byId.get(id)
    if (!s) {
      const bb = layer.billboards.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        image: layer.texture,
        scale: 0.6,
        color: Cesium.Color.fromCssColorString('#00ffea').withAlpha(0.95),
      })
      bb.assetData = {
        asset_type: 'ship',
        name: it.name || it.callsign || `MMSI ${it.mmsi || ''}`,
        mmsi: it.mmsi,
        type: it.ship_type,
        heading,
        status: 'OPERATIONAL',
      }
      s = { bb, lastUpdate: now }
      layer.byId.set(id, s)
    }
    s.bb.position = Cesium.Cartesian3.fromDegrees(lon, lat, 0)
    s.bb.rotation = Cesium.Math.toRadians(-heading)
    s.lastUpdate = now
  }

  // Stale
  const stale = []
  layer.byId.forEach((s, id) => {
    if (!seen.has(id) && now - s.lastUpdate > 5 * 60 * 1000) stale.push(id)
  })
  for (const id of stale) {
    if (layer.destroyed) return
    const s = layer.byId.get(id)
    try { layer.billboards.remove(s.bb) } catch (e) {}
    layer.byId.delete(id)
  }
}

export function destroyShips(layer) {
  if (!layer) return
  layer.destroyed = true
  try { layer.billboards.removeAll() } catch (e) {}
  layer.byId.clear()
}
