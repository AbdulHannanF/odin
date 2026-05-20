/**
 * SatellitesLayer — GPU-instanced satellite points with optional orbit lines.
 *
 * Two ingest modes:
 *   "backend" : items come from /ws/realtime satellites snapshot (lat,lon,alt km)
 *   "worker"  : items come from the satellite.js TLE Web Worker
 */
import * as Cesium from 'cesium'
import { satelliteCanvas } from '../components/Globe/cesiumUtils.js'

const COLOR_BY_GROUP = {
  starlink: Cesium.Color.fromCssColorString('#ffffff').withAlpha(0.95),
  gps: Cesium.Color.fromCssColorString('#a3e635').withAlpha(0.95),
  iss: Cesium.Color.fromCssColorString('#ffb300').withAlpha(1.0),
  geo: Cesium.Color.fromCssColorString('#a78bfa').withAlpha(0.95),
  weather: Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.95),
  active: Cesium.Color.fromCssColorString('#00ffe5').withAlpha(0.85),
}

export function initSatellites(viewer) {
  const points = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection())
  const billboards = viewer.scene.primitives.add(new Cesium.BillboardCollection({ scene: viewer.scene }))
  const polylines = viewer.scene.primitives.add(new Cesium.PolylineCollection())
  return {
    type: 'satellites',
    visible: true,
    points,
    billboards,
    polylines,
    issBillboard: null,
    issTrail: null,
    issHistory: [],
    byNorad: new Map(),
    viewer,
    destroyed: false,
  }
}

function categorize(item) {
  const n = (item.name || '').toUpperCase()
  if (n.includes('STARLINK')) return 'starlink'
  if (n.includes('GPS') || n.includes('NAVSTAR')) return 'gps'
  if (n.includes('ISS') || n.includes('ZARYA')) return 'iss'
  if (n.includes('GOES') || n.includes('METEOSAT') || n.includes('NOAA') || n.includes('HIMAWARI')) return 'weather'
  // crude geo detection — orbital altitude > 30,000 km
  if ((+item.alt_km || +item.altitude_km) > 30000) return 'geo'
  return 'active'
}

export function updateSatellites(layer, items, { mode = 'backend' } = {}) {
  if (!layer || !layer.visible || layer.destroyed) return
  const seen = new Set()
  const cap = Math.min(items.length, 3000)

  for (let i = 0; i < cap; i++) {
    if (layer.destroyed) return
    const it = items[i]
    if (!it) continue
    const lat = +(it.lat ?? it.latitude)
    const lon = +(it.lon ?? it.longitude)
    const altKm = +(it.alt_km ?? it.altitude_km ?? (it.alt_m ? it.alt_m / 1000 : 0))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    if (!Number.isFinite(altKm) || altKm < 100) continue
    const altM = altKm * 1000

    const key = it.norad_id || it.id || it.name || `${i}`
    seen.add(key)
    const cat = categorize(it)

    if (cat === 'iss') {
      // Special ISS rendering
      if (layer.destroyed) return
      if (!layer.issBillboard) {
        layer.issBillboard = layer.billboards.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, altM),
          image: satelliteCanvas('#ffb300', 16),
          scale: 1.5,
          color: Cesium.Color.WHITE,
        })
        layer.issBillboard.assetData = {
          asset_type: 'iss', name: it.name || 'ISS',
          altitude_km: altKm, status: 'OPERATIONAL',
        }
      } else {
        layer.issBillboard.position = Cesium.Cartesian3.fromDegrees(lon, lat, altM)
        layer.issBillboard.assetData.altitude_km = altKm
      }
      layer.issHistory.push({ lon, lat, alt: altM })
      if (layer.issHistory.length > 200) layer.issHistory.shift()
      if (layer.issHistory.length >= 2) {
        if (layer.destroyed) return
        const positions = layer.issHistory.map(p =>
          Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt))
        if (layer.issTrail) {
          layer.issTrail.positions = positions
        } else {
          layer.issTrail = layer.polylines.add({
            positions,
            width: 1.2,
            material: Cesium.Material.fromType('Color', {
              color: Cesium.Color.fromCssColorString('#ffb300').withAlpha(0.5),
            }),
          })
        }
      }
      continue
    }

    let p = layer.byNorad.get(key)
    if (!p) {
      const color = COLOR_BY_GROUP[cat] || COLOR_BY_GROUP.active
      const point = layer.points.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, altM),
        color,
        pixelSize: cat === 'starlink' ? 2.2 : cat === 'geo' ? 4.5 : 2.6,
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
      })
      point.assetData = {
        asset_type: 'satellite',
        name: it.name || `NORAD ${it.norad_id || ''}`,
        norad_id: it.norad_id,
        altitude_km: altKm,
        category: cat,
        velocity_kmps: it.velocity_kmps,
        status: 'OPERATIONAL',
      }
      p = { point, cat }
      layer.byNorad.set(key, p)
    } else {
      p.point.position = Cesium.Cartesian3.fromDegrees(lon, lat, altM)
      p.point.assetData.altitude_km = altKm
    }
  }

  // Reap stale satellites if streaming backend (worker is whole-snapshot, won't reap)
  if (mode === 'backend' && layer.byNorad.size > 1.5 * cap) {
    layer.byNorad.forEach((p, key) => {
      if (layer.destroyed) return
      if (!seen.has(key)) {
        try { layer.points.remove(p.point) } catch (e) {}
        layer.byNorad.delete(key)
      }
    })
  }
}

export function destroySatellites(layer) {
  if (!layer) return
  layer.destroyed = true
  try { layer.points.removeAll() } catch (e) {}
  try { layer.billboards.removeAll() } catch (e) {}
  try { layer.polylines.removeAll() } catch (e) {}
  layer.byNorad.clear()
}
