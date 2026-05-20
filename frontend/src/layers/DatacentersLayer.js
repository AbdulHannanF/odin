/**
 * DatacentersLayer — diamond markers for US data centers from
 * PNNL IM3 Open Source Data Center Atlas.
 * Source: https://im3.pnnl.gov/datacenter-atlas
 *        (https://github.com/IMMM-SFA/datacenter-atlas — Open Database License)
 */
import * as Cesium from 'cesium'
import { diamondCanvas } from '../components/Globe/cesiumUtils.js'

const DC_TEX = diamondCanvas('#7dd3fc', 22)

export function initDatacenters(viewer) {
  const billboards = viewer.scene.primitives.add(new Cesium.BillboardCollection({ scene: viewer.scene }))
  const layer = {
    type: 'datacenters', visible: true,
    billboards, viewer, loaded: false,
  }
  load(layer).catch(() => {})
  return layer
}

async function load(layer) {
  try {
    const resp = await fetch('/api/v1/layers/datacenters')
    if (!resp.ok) return
    const data = await resp.json()
    if (!data?.features) return

    if (layer.destroyed) return

    for (const f of data.features) {
      if (layer.destroyed) return
      if (f.geometry?.type !== 'Point') continue
      const [lon, lat] = f.geometry.coordinates
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
      const props = f.properties || {}
      const bb = layer.billboards.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
        image: DC_TEX,
        scale: 0.7,
      })
      bb.assetData = {
        asset_type: 'datacenter',
        name: props.name || 'Data Center',
        operator: props.operator,
        county: props.county,
        state: props.state_abb,
        sqft: props.sqft,
        status: 'OPERATIONAL',
      }
    }
    layer.loaded = true
  } catch (e) {
    console.warn('datacenters load failed', e)
  }
}

export function destroyDatacenters(layer) {
  if (!layer) return
  layer.destroyed = true
  try { layer.billboards.removeAll() } catch (e) {}
}
