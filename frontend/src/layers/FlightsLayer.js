/**
 * FlightsLayer — renders live aircraft as oriented billboard icons with
 * fading amber trails (history polylines). Subscribes to /ws/realtime flight
 * snapshots and uses dead-reckoning between updates.
 *
 * Each flight item shape (from backend OpenSky ingest):
 *   { id, icao24, callsign, lat, lon, alt_m, heading_deg, velocity_mps,
 *     origin_country, on_ground }
 */
import * as Cesium from 'cesium'
import { airplaneCanvas } from '../components/Globe/cesiumUtils.js'

const HISTORY = 10                  // points kept per flight for trail
const TRAIL_MAX_SEG = 10            // segments
const MAX_FLIGHTS_RENDERED = 2000   // cap for perf

export function initFlights(viewer) {
  const billboards = viewer.scene.primitives.add(new Cesium.BillboardCollection({
    scene: viewer.scene,
  }))
  const polylines = viewer.scene.primitives.add(new Cesium.PolylineCollection())

  const planeTexture = airplaneCanvas('#ffd866', 36)

  return {
    type: 'flights',
    visible: true,
    billboards,
    polylines,
    planeTexture,
    byId: new Map(),         // id → { billboard, history: [{lon,lat,alt}], lastUpdate, polyline }
    viewer,
    destroyed: false,
  }
}

export function updateFlights(layer, items) {
  if (!layer || !layer.visible || layer.destroyed) return
  const seen = new Set()
  const now = Date.now()
  const limit = Math.min(items.length, MAX_FLIGHTS_RENDERED)

  for (let i = 0; i < limit; i++) {
    if (layer.destroyed) return
    const it = items[i]
    if (!it) continue
    const lat = +it.lat, lon = +it.lon
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (Math.abs(lat) > 89.99) continue
    const alt = Math.max(0, +(it.alt_m || it.geo_altitude || 0))
    const heading = +((it.heading_deg ?? it.true_track) || 0)

    const id = it.id || it.icao24 || `${i}`
    seen.add(id)
    let f = layer.byId.get(id)
    if (!f) {
      const bb = layer.billboards.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
        image: layer.planeTexture,
        scale: 0.55,
        rotation: 0,
        alignedAxis: Cesium.Cartesian3.UNIT_Z,
        color: Cesium.Color.WHITE,
        sizeInMeters: false,
        eyeOffset: new Cesium.Cartesian3(0, 0, -100),
      })
      bb.assetData = {
        asset_type: 'aircraft',
        name: (it.callsign || it.icao24 || 'AIRCRAFT').trim(),
        callsign: it.callsign,
        icao24: it.icao24,
        country: it.origin_country,
        altitude_m: alt,
        velocity_mps: it.velocity_mps,
        heading: heading,
        status: 'OPERATIONAL',
      }
      f = { bb, history: [], polyline: null, lastUpdate: now, heading }
      layer.byId.set(id, f)
    }
    // Heading → billboard rotation (Cesium: 0 north, CW positive radians but
    // for rotation about screen, we apply -heading)
    f.bb.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt)
    f.bb.rotation = Cesium.Math.toRadians(-heading)
    f.bb.assetData.altitude_m = alt
    f.bb.assetData.heading = heading

    // Update history
    f.history.push({ lon, lat, alt })
    if (f.history.length > HISTORY) f.history.shift()

    if (f.history.length >= 2) {
      if (layer.destroyed) return
      const positions = f.history.map(h => Cesium.Cartesian3.fromDegrees(h.lon, h.lat, h.alt))
      const colors = []
      for (let k = 0; k < positions.length; k++) {
        const a = (k / (positions.length - 1)) * 0.7
        colors.push(Cesium.Color.fromCssColorString('#ffb300').withAlpha(a))
      }
      if (f.polyline) {
        f.polyline.positions = positions
      } else {
        f.polyline = layer.polylines.add({
          positions,
          width: 1.4,
          material: Cesium.Material.fromType('Color', {
            color: Cesium.Color.fromCssColorString('#ffb300').withAlpha(0.55),
          }),
        })
      }
    }
    f.lastUpdate = now
  }

  // Stale flights (not seen for > 90s) → remove
  const stale = []
  layer.byId.forEach((f, id) => {
    if (!seen.has(id) && now - f.lastUpdate > 90_000) stale.push(id)
  })
  for (const id of stale) {
    if (layer.destroyed) return
    const f = layer.byId.get(id)
    try { layer.billboards.remove(f.bb) } catch (e) {}
    if (f.polyline) try { layer.polylines.remove(f.polyline) } catch (e) {}
    layer.byId.delete(id)
  }
}

export function destroyFlights(layer) {
  if (!layer) return
  layer.destroyed = true
  try { layer.billboards.removeAll() } catch (e) {}
  try { layer.polylines.removeAll() } catch (e) {}
  layer.byId.clear()
}
