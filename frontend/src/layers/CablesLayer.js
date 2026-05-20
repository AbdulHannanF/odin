/**
 * CablesLayer — animated dashed submarine cable polylines + landing points.
 * Fetches /api/v1/layers/submarine_cables and /api/v1/layers/cable_landing_points.
 */
import * as Cesium from 'cesium'
import { diamondCanvas } from '../components/Globe/cesiumUtils.js'

export function initCables(viewer) {
  const polylines = viewer.scene.primitives.add(new Cesium.PolylineCollection())
  const landingBillboards = viewer.scene.primitives.add(new Cesium.BillboardCollection({ scene: viewer.scene }))
  const texture = diamondCanvas('#e879f9', 14)

  const layer = {
    type: 'cables',
    visible: true,
    polylines,
    landingBillboards,
    texture,
    loaded: false,
    viewer,
  }
  loadCables(layer).catch(() => {})
  return layer
}

async function loadCables(layer) {
  try {
    const [cablesResp, landingsResp] = await Promise.all([
      fetch('/api/v1/layers/submarine_cables').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/v1/layers/cable_landing_points').then(r => r.ok ? r.json() : null).catch(() => null),
    ])

    if (layer.destroyed) return

    if (cablesResp?.features?.length) {
      const dashColor = Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.65)
      const gapColor = Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.15)
      for (const f of cablesResp.features) {
        if (layer.destroyed) return
        const g = f.geometry
        if (!g) continue
        if (g.type === 'LineString') addLine(layer, g.coordinates, dashColor, gapColor, f.properties)
        else if (g.type === 'MultiLineString') {
          for (const line of g.coordinates) {
            if (layer.destroyed) return
            addLine(layer, line, dashColor, gapColor, f.properties)
          }
        }
      }
    }
    if (landingsResp?.features?.length) {
      for (const f of landingsResp.features) {
        if (layer.destroyed) return
        if (f.geometry?.type !== 'Point') continue
        const [lon, lat] = f.geometry.coordinates
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
        const bb = layer.landingBillboards.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          image: layer.texture,
          scale: 0.7,
        })
        bb.assetData = {
          asset_type: 'cable_landing',
          name: f.properties?.name || 'Landing Point',
          ...(f.properties || {}),
          status: 'OPERATIONAL',
        }
      }
    }
    layer.loaded = true
  } catch (e) {
    console.warn('cables layer load failed', e)
  }
}

function addLine(layer, coords, dashColor, gapColor, props = {}) {
  if (layer.destroyed) return
  if (!coords || coords.length < 2) return
  const positions = []
  for (const c of coords) {
    if (!c || c.length < 2) continue
    const lon = +c[0], lat = +c[1]
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, 5000))
  }
  if (positions.length < 2) return
  const polyline = layer.polylines.add({
    positions,
    width: 1.6,
    material: new Cesium.Material({
      fabric: {
        type: 'PolylineDash',
        uniforms: {
          color: dashColor,
          gapColor: gapColor,
          dashLength: 18.0,
          dashPattern: 255.0,
        },
      },
    }),
  })
  polyline.assetData = {
    asset_type: 'submarine_cable',
    name: props.name || 'Submarine Cable',
    ...props,
    status: 'OPERATIONAL',
  }
}

export function destroyCables(layer) {
  if (!layer) return
  layer.destroyed = true
  try { layer.polylines.removeAll() } catch (e) {}
  try { layer.landingBillboards.removeAll() } catch (e) {}
}
