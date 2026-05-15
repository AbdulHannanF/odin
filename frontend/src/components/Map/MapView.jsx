import React, { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getGridState, getWindVectors, getMineralsOverlay } from '../../api/odinApi.js'
import { EXTENDED_INFRASTRUCTURE } from '../../data/infrastructure.js'
import { EXTENDED_TRANSMISSION } from '../../data/transmission.js'
import { SUBMARINE_CABLES, CABLE_LANDING_POINTS } from '../../data/submarine_cables.js'
import { GAS_PIPELINES, OIL_PIPELINES } from '../../data/pipelines.js'
import { OFFSHORE_PLATFORMS } from '../../data/offshore.js'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const STATUS_COLORS = {
  OPERATIONAL: '#00e676', VULNERABLE: '#ff6d00', REROUTED: '#00e5ff',
  OFFLINE: '#6b7280', DEGRADED: '#ffd740', CRITICAL: '#ff1744',
}

// 90 point assets + 20 transmission corridors embedded for offline demo
const pt = (id, name, type, tech, status, risk, score, mw, kv, country, region, lng, lat) => ({
  type: 'Feature',
  properties: { asset_id: id, name, asset_type: type, technology: tech, status, risk_level: risk, risk_score: score, capacity_mw: mw, voltage_kv: kv, country, region },
  geometry: { type: 'Point', coordinates: [lng, lat] },
})

const INFRASTRUCTURE_POINTS = { type: 'FeatureCollection', features: [
  // ── SOLAR ──────────────────────────────────────────────────────────
  pt('SOL-001','Mojave Desert Solar Farm','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,280,230,'USA','California',-116.5,34.5),
  pt('SOL-002','Desert Sunlight Solar','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,550,230,'USA','California',-115.4,33.6),
  pt('SOL-003','Copper Mountain Solar','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,816,230,'USA','Nevada',-115.5,35.8),
  pt('SOL-004','Solar Star Alpha','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,579,230,'USA','California',-118.8,34.7),
  pt('SOL-005','Genesis Solar Farm','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,250,138,'USA','California',-114.9,33.7),
  pt('SOL-006','Ivanpah Solar','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,392,230,'USA','California',-115.4,35.6),
  pt('SOL-007','Agua Caliente Solar','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,290,230,'USA','Arizona',-113.6,33.1),
  pt('SOL-008','Mesquite Solar','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,150,138,'USA','Arizona',-113.0,33.1),
  pt('SOL-009','Alamo Solar TX','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,110,138,'USA','Texas',-98.5,29.2),
  pt('SOL-010','Barilla Solar TX','POWER_PLANT','SOLAR','OPERATIONAL','LOW',0.12,260,230,'USA','Texas',-103.9,30.5),
  pt('SOL-011','Kay Solar Farm OK','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,180,138,'USA','Oklahoma',-97.2,36.7),
  pt('SOL-012','Antelope Valley Solar','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,579,230,'USA','California',-118.4,34.8),
  pt('SOL-013','McCoy Solar','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,750,230,'USA','California',-114.7,33.8),
  pt('SOL-014','Blythe Solar','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,485,230,'USA','California',-114.6,33.6),
  pt('SOL-015','Silver State North','POWER_PLANT','SOLAR','OPERATIONAL','NONE',0.0,250,138,'USA','Nevada',-114.9,35.2),
  // ── WIND ───────────────────────────────────────────────────────────
  pt('WND-001','Alta Wind Energy Center','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,1320,345,'USA','California',-118.4,34.9),
  pt('WND-002','Capricorn Ridge Wind','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,663,345,'USA','Texas',-100.9,31.4),
  pt('WND-003','Horse Hollow Wind','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,735,345,'USA','Texas',-99.8,32.0),
  pt('WND-004','Roscoe Wind Farm','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,781,345,'USA','Texas',-100.5,32.4),
  pt('WND-005','Smoky Hills Wind','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,250,138,'USA','Kansas',-97.4,38.8),
  pt('WND-006','Flat Rock Wind','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,280,138,'USA','Nebraska',-96.2,42.6),
  pt('WND-007','Tatanka Wind','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,155,138,'USA','South Dakota',-101.2,45.7),
  pt('WND-008','Badger-Coulee Wind','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,300,230,'USA','Wisconsin',-91.5,44.5),
  pt('WND-009','Wild Horse Wind','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,229,138,'USA','Washington',-120.1,46.9),
  pt('WND-010','Klondike Wind','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,300,230,'USA','Oregon',-120.5,45.5),
  pt('WND-011','Mill Creek Wind OK','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,120,138,'USA','Oklahoma',-96.8,34.5),
  pt('WND-012','Grand Ridge Wind IL','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,400,230,'USA','Illinois',-89.2,41.2),
  pt('WND-013','Blue Creek Wind OH','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,304,230,'USA','Ohio',-84.0,41.3),
  pt('WND-014','Meadow Lake Wind IN','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,500,230,'USA','Indiana',-87.0,40.8),
  pt('WND-015','Sherbino Wind TX','POWER_PLANT','WIND','OPERATIONAL','NONE',0.0,150,138,'USA','Texas',-101.6,31.1),
  // ── OFFSHORE WIND ──────────────────────────────────────────────────
  pt('OFW-001','Vineyard Wind','POWER_PLANT','OFFSHORE_WIND','OPERATIONAL','NONE',0.0,800,345,'USA','Massachusetts',-70.5,41.4),
  pt('OFW-002','Ocean Wind NJ','POWER_PLANT','OFFSHORE_WIND','OPERATIONAL','NONE',0.0,1100,345,'USA','New Jersey',-74.2,39.5),
  // ── GAS ────────────────────────────────────────────────────────────
  pt('GAS-001','Cricket Valley Energy','POWER_PLANT','GAS','OPERATIONAL','NONE',0.0,1100,345,'USA','New York',-73.6,41.5),
  pt('GAS-002','Calpine Pastoria','POWER_PLANT','GAS','OPERATIONAL','NONE',0.0,750,230,'USA','California',-118.9,34.9),
  pt('GAS-003','Riverside Combined Cycle','POWER_PLANT','GAS','OPERATIONAL','LOW',0.1,2500,500,'USA','Illinois',-88.1,41.7),
  pt('GAS-004','GE Dania Beach CCGT','POWER_PLANT','GAS','OPERATIONAL','NONE',0.0,1300,345,'USA','Florida',-80.1,25.9),
  pt('GAS-005','Wolf Creek Gas TX','POWER_PLANT','GAS','OPERATIONAL','MEDIUM',0.35,800,230,'USA','Texas',-97.2,29.8),
  pt('GAS-006','Guadalupe Power TX','POWER_PLANT','GAS','OPERATIONAL','NONE',0.0,1000,345,'USA','Texas',-98.4,29.9),
  pt('GAS-007','Magnolia Power MS','POWER_PLANT','GAS','OPERATIONAL','NONE',0.0,810,230,'USA','Mississippi',-89.2,32.7),
  pt('GAS-008','Decatur Energy AL','POWER_PLANT','GAS','OPERATIONAL','NONE',0.0,750,230,'USA','Alabama',-86.9,34.6),
  pt('GAS-009','Elgin Energy Center IL','POWER_PLANT','GAS','OPERATIONAL','NONE',0.0,1374,345,'USA','Illinois',-88.1,42.1),
  pt('GAS-010','Midland Cogen MI','POWER_PLANT','GAS','OPERATIONAL','NONE',0.0,1632,345,'USA','Michigan',-84.3,43.6),
  // ── NUCLEAR ────────────────────────────────────────────────────────
  pt('NUC-001','Dresden Nuclear Station','POWER_PLANT','NUCLEAR','OPERATIONAL','NONE',0.0,1845,500,'USA','Illinois',-88.1,41.4),
  pt('NUC-002','Peach Bottom Atomic','POWER_PLANT','NUCLEAR','OPERATIONAL','NONE',0.0,2773,500,'USA','Pennsylvania',-76.3,39.8),
  pt('NUC-003','Vogtle Nuclear Plant','POWER_PLANT','NUCLEAR','OPERATIONAL','NONE',0.0,4000,500,'USA','Georgia',-81.6,33.1),
  pt('NUC-004','South Texas Project','POWER_PLANT','NUCLEAR','OPERATIONAL','LOW',0.15,2700,500,'USA','Texas',-96.0,28.8),
  pt('NUC-005','Palo Verde Nuclear','POWER_PLANT','NUCLEAR','OPERATIONAL','NONE',0.0,4000,500,'USA','Arizona',-112.9,33.4),
  pt('NUC-006','Millstone Nuclear','POWER_PLANT','NUCLEAR','OPERATIONAL','NONE',0.0,2000,345,'USA','Connecticut',-72.2,41.3),
  // ── COAL ───────────────────────────────────────────────────────────
  pt('COL-001','James River Power','POWER_PLANT','COAL','OPERATIONAL','MEDIUM',0.4,1000,345,'USA','Kentucky',-83.5,38.0),
  pt('COL-002','Cardinal Plant OH','POWER_PLANT','COAL','DEGRADED','HIGH',0.65,1800,500,'USA','Ohio',-81.1,39.5),
  pt('COL-003','Jim Bridger WY','POWER_PLANT','COAL','OPERATIONAL','LOW',0.2,2120,500,'USA','Wyoming',-109.5,42.2),
  pt('COL-004','Gibson Station IN','POWER_PLANT','COAL','OPERATIONAL','MEDIUM',0.38,3340,500,'USA','Indiana',-87.4,38.3),
  pt('COL-005','Navajo Generating AZ','POWER_PLANT','COAL','OFFLINE','HIGH',0.72,0,345,'USA','Arizona',-111.1,36.9),
  // ── HYDRO ──────────────────────────────────────────────────────────
  pt('HYD-001','Grand Coulee Dam','POWER_PLANT','HYDRO','OPERATIONAL','NONE',0.0,7079,500,'USA','Washington',-118.9,47.9),
  pt('HYD-002','Hoover Dam','POWER_PLANT','HYDRO','OPERATIONAL','NONE',0.0,2080,345,'USA','Nevada',-114.7,36.0),
  pt('HYD-003','Glen Canyon Dam','POWER_PLANT','HYDRO','OPERATIONAL','LOW',0.18,1320,230,'USA','Arizona',-111.5,37.0),
  pt('HYD-004','Robert Moses Niagara','POWER_PLANT','HYDRO','OPERATIONAL','NONE',0.0,2675,345,'USA','New York',-79.1,43.2),
  pt('HYD-005','Shasta Dam CA','POWER_PLANT','HYDRO','OPERATIONAL','NONE',0.0,710,230,'USA','California',-122.4,40.7),
  // ── STORAGE ────────────────────────────────────────────────────────
  pt('STO-001','Moss Landing Battery','POWER_PLANT','STORAGE','OPERATIONAL','NONE',0.0,400,138,'USA','California',-121.8,36.8),
  pt('STO-002','Edwards Battery CA','POWER_PLANT','STORAGE','OPERATIONAL','NONE',0.0,300,138,'USA','California',-117.9,34.1),
  pt('STO-003','Vistra Zimmer Battery','POWER_PLANT','STORAGE','OPERATIONAL','NONE',0.0,200,138,'USA','Ohio',-84.4,38.8),
  pt('STO-004','NextEra Battery TX','POWER_PLANT','STORAGE','OPERATIONAL','NONE',0.0,150,138,'USA','Texas',-98.4,29.7),
  pt('STO-005','AES Alamitos Battery','POWER_PLANT','STORAGE','OPERATIONAL','NONE',0.0,400,138,'USA','California',-118.1,33.8),
  // ── GEOTHERMAL ─────────────────────────────────────────────────────
  pt('GEO-001','The Geysers CA','POWER_PLANT','GEOTHERMAL','OPERATIONAL','NONE',0.0,725,230,'USA','California',-122.7,38.8),
  pt('GEO-002','Salton Sea Geothermal','POWER_PLANT','GEOTHERMAL','OPERATIONAL','NONE',0.0,300,138,'USA','California',-115.7,33.2),
  pt('GEO-003','Steamboat Hills NV','POWER_PLANT','GEOTHERMAL','OPERATIONAL','NONE',0.0,32,69,'USA','Nevada',-119.7,39.4),
  // ── SUBSTATIONS ────────────────────────────────────────────────────
  pt('SUB-001','NYC Metropolitan Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,500,345,'USA','New York',-73.9,40.7),
  pt('SUB-002','Boston Grid Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,350,230,'USA','Massachusetts',-71.2,42.4),
  pt('SUB-003','PJM DC-VA Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,800,500,'USA','Virginia',-77.1,38.8),
  pt('SUB-004','Charlotte Interchange','SUBSTATION',null,'OPERATIONAL','NONE',0.0,400,345,'USA','North Carolina',-80.9,35.3),
  pt('SUB-005','Atlanta Grid Hub','SUBSTATION',null,'VULNERABLE','HIGH',0.68,600,500,'USA','Georgia',-84.5,33.6),
  pt('SUB-006','Miami South Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,300,345,'USA','Florida',-80.3,25.7),
  pt('SUB-007','New Orleans Hub','SUBSTATION',null,'VULNERABLE','HIGH',0.72,400,345,'USA','Louisiana',-90.1,30.0),
  pt('SUB-008','Houston ERCOT Hub','SUBSTATION',null,'OPERATIONAL','MEDIUM',0.35,1000,500,'USA','Texas',-95.4,29.7),
  pt('SUB-009','Dallas Grid Interchange','SUBSTATION',null,'OPERATIONAL','NONE',0.0,700,500,'USA','Texas',-96.9,32.7),
  pt('SUB-010','Oklahoma City Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,350,345,'USA','Oklahoma',-97.6,35.4),
  pt('SUB-011','Chicago MISO Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,900,500,'USA','Illinois',-87.7,41.7),
  pt('SUB-012','Detroit PJM Node','SUBSTATION',null,'OPERATIONAL','NONE',0.0,500,345,'USA','Michigan',-83.1,42.2),
  pt('SUB-013','Minneapolis MISO North','SUBSTATION',null,'OPERATIONAL','NONE',0.0,400,345,'USA','Minnesota',-93.4,44.9),
  pt('SUB-014','Denver WECC Hub','SUBSTATION',null,'OPERATIONAL','LOW',0.15,600,345,'USA','Colorado',-105.0,39.7),
  pt('SUB-015','Salt Lake Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,500,345,'USA','Utah',-112.0,40.7),
  pt('SUB-016','Phoenix APS Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,800,500,'USA','Arizona',-112.2,33.3),
  pt('SUB-017','Las Vegas NV Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,400,230,'USA','Nevada',-115.2,36.1),
  pt('SUB-018','LA CAISO Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,1200,500,'USA','California',-118.3,34.0),
  pt('SUB-019','SF Bay Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,700,345,'USA','California',-122.3,37.7),
  pt('SUB-020','Seattle BPA Hub','SUBSTATION',null,'OPERATIONAL','NONE',0.0,800,500,'USA','Washington',-122.4,47.5),
  // ── DATA CENTERS ───────────────────────────────────────────────────
  pt('DC-001','Ashburn Cloud Campus','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Virginia',-77.5,39.0),
  pt('DC-002','Portland Data Hub','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Oregon',-122.7,45.5),
  pt('DC-003','Dallas Data Center','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Texas',-96.9,32.8),
  pt('DC-004','Atlanta Cloud Campus','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Georgia',-84.4,33.7),
  pt('DC-005','Chicago Data Hub','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Illinois',-87.6,41.8),
  pt('DC-006','Phoenix Data Center','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Arizona',-112.0,33.4),
  pt('DC-007','Seattle Cloud Hub','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Washington',-122.3,47.6),
  pt('DC-008','Denver Data Campus','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Colorado',-104.9,39.7),
  pt('DC-009','NYC Metro DC','DATACENTER',null,'VULNERABLE','HIGH',0.65,null,null,'USA','New York',-73.9,40.7),
  pt('DC-010','Columbus Cloud Hub','DATACENTER',null,'OPERATIONAL','NONE',0.0,null,null,'USA','Ohio',-83.0,40.0),
  // ── HOSPITALS ──────────────────────────────────────────────────────
  pt('HOSP-001','Metro General Hospital NYC','HOSPITAL',null,'OPERATIONAL','NONE',0.0,null,null,'USA','New York',-74.0,40.74),
  pt('HOSP-002','Houston Medical Center','HOSPITAL',null,'OPERATIONAL','LOW',0.1,null,null,'USA','Texas',-95.4,29.7),
  pt('HOSP-003','Cedar Sinai Complex','HOSPITAL',null,'OPERATIONAL','NONE',0.0,null,null,'USA','California',-118.4,34.1),
]}

const ln = (id, name, voltageClass, kv, status, coords) => ({
  type: 'Feature',
  properties: { asset_id: id, name, asset_type: 'TRANSMISSION_LINE', voltage_class: voltageClass, voltage_kv: kv, status },
  geometry: { type: 'LineString', coordinates: coords },
})

const TRANSMISSION_LINES = { type: 'FeatureCollection', features: [
  ln('TL-001','Pacific Intertie 500kV','500',500,'OPERATIONAL',[[-122.3,47.6],[-122.7,45.5],[-121.5,38.6],[-118.2,34.1]]),
  ln('TL-002','Pacific Gas 230kV','230',230,'OPERATIONAL',[[-123.1,44.1],[-122.9,42.3],[-121.9,37.3],[-122.3,37.7]]),
  ln('TL-003','Northern Tier 345kV','345',345,'OPERATIONAL',[[-122.3,47.6],[-117.4,47.7],[-114.0,46.9]]),
  ln('TL-004','Montana-Midwest 345kV','345',345,'OPERATIONAL',[[-108.5,45.8],[-103.2,44.1],[-96.7,43.6],[-93.3,44.9]]),
  ln('TL-005','Desert SW 500kV','500',500,'OPERATIONAL',[[-118.2,34.1],[-115.1,36.2],[-112.1,33.4],[-110.9,32.2]]),
  ln('TL-006','Texas Interior 345kV','345',345,'VULNERABLE',[[-106.5,31.8],[-102.1,32.0],[-99.7,32.4],[-96.8,32.8]]),
  ln('TL-007','Texas Gulf Coast 230kV','230',230,'VULNERABLE',[[-97.4,27.8],[-95.4,29.8],[-94.1,30.1],[-90.1,30.0]]),
  ln('TL-008','SERC Southeast 500kV','500',500,'OPERATIONAL',[[-84.4,33.7],[-80.8,35.2],[-78.6,35.8],[-77.0,38.9]]),
  ln('TL-009','Midwest Spine 345kV','345',345,'OPERATIONAL',[[-93.3,44.9],[-93.6,41.6],[-94.6,39.1],[-97.5,35.5]]),
  ln('TL-010','Ohio Valley 500kV','500',500,'OPERATIONAL',[[-87.6,41.8],[-83.0,42.3],[-81.7,41.5],[-79.9,40.4],[-75.2,39.9]]),
  ln('TL-011','NEC 345kV','345',345,'OPERATIONAL',[[-77.0,38.9],[-76.6,39.3],[-75.2,39.9],[-74.0,40.7],[-71.1,42.4]]),
  ln('TL-012','Florida Spine 230kV','230',230,'OPERATIONAL',[[-80.2,25.8],[-81.4,28.5],[-81.7,30.3],[-84.4,33.7]]),
  ln('TL-013','Mountain West 345kV','345',345,'OPERATIONAL',[[-104.9,39.7],[-111.9,40.7],[-116.2,43.6]]),
  ln('TL-014','Appalachian 230kV','230',230,'DEGRADED',[[-79.9,40.4],[-81.6,38.4],[-83.9,35.9],[-86.8,33.5]]),
  ln('TL-015','New England 138kV','138',138,'OPERATIONAL',[[-71.1,42.4],[-72.7,41.8],[-71.4,41.8]]),
  ln('TL-016','Gulf Coast 230kV','230',230,'VULNERABLE',[[-90.1,30.0],[-88.0,30.7],[-82.5,28.0]]),
  ln('TL-017','Heartland 230kV','230',230,'OPERATIONAL',[[-90.1,35.1],[-86.8,36.2],[-85.8,38.2],[-84.5,39.1]]),
  ln('TL-018','Plains 345kV','345',345,'OPERATIONAL',[[-95.9,41.3],[-97.3,37.7],[-97.5,35.5]]),
  ln('TL-019','Carolina Corridor 230kV','230',230,'OPERATIONAL',[[-80.8,35.2],[-78.6,35.8],[-76.3,36.9]]),
  ln('TL-020','Denali 735kV','735+',735,'OPERATIONAL',[[-104.9,39.7],[-96.8,32.8],[-95.4,29.7]]),
]}

const TECH_COLOR = {
  SOLAR:'#f59e0b', WIND:'#84cc16', OFFSHORE_WIND:'#06b6d4', NUCLEAR:'#22d3ee',
  GAS:'#c084fc', COAL:'#78716c', HYDRO:'#38bdf8', STORAGE:'#ec4899',
  GEOTHERMAL:'#fb923c', BIOMASS:'#a3e635',
}

// Merge embedded seed data with extended continental dataset
const ALL_INFRA = {
  type: 'FeatureCollection',
  features: [...INFRASTRUCTURE_POINTS.features, ...EXTENDED_INFRASTRUCTURE.features],
}
const ALL_TRANSMISSION = {
  type: 'FeatureCollection',
  features: [...TRANSMISSION_LINES.features, ...EXTENDED_TRANSMISSION.features],
}

export default function MapView({ activeLayers, onAssetClick }) {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const popupRef     = useRef(null)
  const rafRef       = useRef(null)
  const [mapReady, setMapReady]     = useState(false)
  const [assetCount, setAssetCount] = useState(0)
  const [status, setStatus]         = useState('Initializing map…')

  useEffect(() => {
    if (mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [-96, 38],
      zoom: 4,
      attributionControl: false,
      pitchWithRotate: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      maxWidth: '280px',
      className: 'odin-ml-popup',
    })

    map.on('load', () => {
      // ── Submarine cables ───────────────────────────────────────────
      map.addSource('sub-cables', { type: 'geojson', data: SUBMARINE_CABLES })
      map.addLayer({
        id: 'sub-cables-glow',
        type: 'line',
        source: 'sub-cables',
        paint: {
          'line-color': '#e879f9',
          'line-width': 4,
          'line-opacity': 0.08,
          'line-blur': 6,
        },
      })
      map.addLayer({
        id: 'sub-cables-line',
        type: 'line',
        source: 'sub-cables',
        paint: {
          'line-color': '#e879f9',
          'line-width': 1.2,
          'line-opacity': 0.55,
          'line-dasharray': [4, 2],
        },
      })

      // Cable landing points
      map.addSource('cable-landings', { type: 'geojson', data: CABLE_LANDING_POINTS })
      map.addLayer({
        id: 'cable-landings',
        type: 'circle',
        source: 'cable-landings',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2.5, 6, 4, 10, 6],
          'circle-color': '#e879f9',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 0.8,
          'circle-opacity': 0.85,
        },
      })

      // ── Gas pipelines ──────────────────────────────────────────────
      map.addSource('gas-pipes', { type: 'geojson', data: GAS_PIPELINES })
      map.addLayer({
        id: 'gas-pipes-glow',
        type: 'line',
        source: 'gas-pipes',
        paint: {
          'line-color': '#f97316',
          'line-width': 5,
          'line-opacity': 0.08,
          'line-blur': 5,
        },
      })
      map.addLayer({
        id: 'gas-pipes-line',
        type: 'line',
        source: 'gas-pipes',
        paint: {
          'line-color': ['match', ['get', 'status'],
            'VULNERABLE', '#ff4500', 'DEGRADED', '#ffd740', '#f97316'],
          'line-width': 1,
          'line-opacity': 0.6,
          'line-dasharray': [6, 3],
        },
      })

      // ── Oil pipelines ──────────────────────────────────────────────
      map.addSource('oil-pipes', { type: 'geojson', data: OIL_PIPELINES })
      map.addLayer({
        id: 'oil-pipes-glow',
        type: 'line',
        source: 'oil-pipes',
        paint: {
          'line-color': '#dc2626',
          'line-width': 5,
          'line-opacity': 0.08,
          'line-blur': 5,
        },
      })
      map.addLayer({
        id: 'oil-pipes-line',
        type: 'line',
        source: 'oil-pipes',
        paint: {
          'line-color': ['match', ['get', 'status'],
            'VULNERABLE', '#ff1744', 'DEGRADED', '#ffd740', '#ef4444'],
          'line-width': 1,
          'line-opacity': 0.55,
        },
      })

      // ── Offshore platforms ─────────────────────────────────────────
      map.addSource('offshore', { type: 'geojson', data: OFFSHORE_PLATFORMS })
      map.addLayer({
        id: 'offshore-platforms',
        type: 'circle',
        source: 'offshore',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            2, ['match', ['get', 'platform_type'], 'OFFSHORE_WIND', 3, 2],
            6, ['match', ['get', 'platform_type'], 'OFFSHORE_WIND', 6, 4],
            10, ['match', ['get', 'platform_type'], 'OFFSHORE_WIND', 9, 6],
          ],
          'circle-color': ['match', ['get', 'platform_type'],
            'OFFSHORE_WIND', '#06b6d4',
            'LNG', '#fb923c',
            '#f59e0b'],
          'circle-stroke-color': ['match', ['get', 'status'],
            'DEGRADED', '#ffd740', 'VULNERABLE', '#ff6d00', 'rgba(255,255,255,0.3)'],
          'circle-stroke-width': ['match', ['get', 'status'],
            'DEGRADED', 1.5, 'VULNERABLE', 1.5, 0.8],
          'circle-opacity': ['match', ['get', 'status'], 'DECOMMISSIONING', 0.35, 0.82],
        },
      })

      // Hover/click for new layers
      for (const layerId of ['sub-cables-line', 'cable-landings', 'gas-pipes-line', 'oil-pipes-line', 'offshore-platforms']) {
        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = '' })
      }

      map.on('click', 'offshore-platforms', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties
        const typeColor = p.platform_type === 'OFFSHORE_WIND' ? '#06b6d4' : p.platform_type === 'LNG' ? '#fb923c' : '#f59e0b'
        popupRef.current.setLngLat(e.lngLat).setHTML(`
          <div style="font-family:'IBM Plex Mono',monospace;padding:12px;min-width:180px">
            <div style="font-size:9px;font-weight:700;color:${typeColor};letter-spacing:.15em;text-transform:uppercase;margin-bottom:5px">${p.platform_type?.replace(/_/g,' ')}</div>
            <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:6px">${p.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5)">${p.operator} · ${p.country}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.4);margin-top:4px">${p.status}</div>
          </div>`).addTo(map)
      })

      map.on('click', 'cable-landings', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties
        popupRef.current.setLngLat(e.lngLat).setHTML(`
          <div style="font-family:'IBM Plex Mono',monospace;padding:12px;min-width:180px">
            <div style="font-size:9px;font-weight:700;color:#e879f9;letter-spacing:.15em;margin-bottom:5px">CABLE LANDING POINT</div>
            <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:6px">${p.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5)">${p.country}</div>
          </div>`).addTo(map)
      })

      map.on('click', 'gas-pipes-line', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties
        popupRef.current.setLngLat(e.lngLat).setHTML(`
          <div style="font-family:'IBM Plex Mono',monospace;padding:12px;min-width:180px">
            <div style="font-size:9px;font-weight:700;color:#f97316;letter-spacing:.15em;margin-bottom:5px">GAS PIPELINE</div>
            <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:6px">${p.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5)">${p.operator} · ${p.status}</div>
          </div>`).addTo(map)
      })

      map.on('click', 'oil-pipes-line', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties
        popupRef.current.setLngLat(e.lngLat).setHTML(`
          <div style="font-family:'IBM Plex Mono',monospace;padding:12px;min-width:180px">
            <div style="font-size:9px;font-weight:700;color:#ef4444;letter-spacing:.15em;margin-bottom:5px">OIL PIPELINE</div>
            <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:6px">${p.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5)">${p.operator} · ${p.status}</div>
          </div>`).addTo(map)
      })

      // ── Transmission lines ─────────────────────────────────────────
      map.addSource('tx-lines', { type: 'geojson', data: ALL_TRANSMISSION })
      map.addLayer({
        id: 'tx-glow',
        type: 'line',
        source: 'tx-lines',
        paint: {
          'line-color': ['match', ['get', 'voltage_class'],
            '735+','#00e5ff', '500','#22d3ee', '345','#38bdf8', '230','#818cf8', '138','#a78bfa', '#22d3ee'],
          'line-width': ['match', ['get', 'voltage_class'],
            '735+',6, '500',4, '345',3, '230',2.5, '138',1.5, 2],
          'line-opacity': 0.12,
          'line-blur': 4,
        },
      })
      map.addLayer({
        id: 'tx-lines',
        type: 'line',
        source: 'tx-lines',
        paint: {
          'line-color': ['match', ['get', 'voltage_class'],
            '735+','#00e5ff', '500','#22d3ee', '345','#38bdf8', '230','#818cf8', '138','#a78bfa', '#22d3ee'],
          'line-width': ['match', ['get', 'voltage_class'],
            '735+',2.5, '500',2, '345',1.5, '230',1, '138',0.75, 1],
          'line-opacity': ['match', ['get', 'status'],
            'VULNERABLE',0.9, 'DEGRADED',0.7, 0.55],
        },
      })

      // ── Infrastructure points ──────────────────────────────────────
      map.addSource('infra', { type: 'geojson', data: ALL_INFRA, generateId: true })

      // Pulse halo for at-risk assets
      map.addLayer({
        id: 'infra-halo',
        type: 'circle',
        source: 'infra',
        filter: ['in', ['get', 'status'], ['literal', ['VULNERABLE','CRITICAL','DEGRADED']]],
        paint: {
          'circle-radius': ['interpolate',['linear'],['get','capacity_mw'], 0,14, 500,18, 5000,26, 20000,36],
          'circle-color': 'transparent',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['match',['get','status'],
            'VULNERABLE','#ff6d00', 'CRITICAL','#ff1744', 'DEGRADED','#ffd740', '#ff6d00'],
          'circle-opacity': 0,
          'circle-stroke-opacity': 0.7,
        },
      })

      // Main asset circles
      map.addLayer({
        id: 'infra-circles',
        type: 'circle',
        source: 'infra',
        paint: {
          'circle-radius': ['interpolate',['linear'],['zoom'],
            2, ['interpolate',['linear'],['get','capacity_mw'], 0,1.5, 500,3, 5000,5, 20000,8],
            6, ['interpolate',['linear'],['get','capacity_mw'], 0,3,  500,6, 5000,10,20000,16],
            10,['interpolate',['linear'],['get','capacity_mw'], 0,5,  500,9, 5000,15,20000,24],
          ],
          'circle-color': ['match',['get','technology'],
            'SOLAR','#f59e0b', 'WIND','#84cc16', 'OFFSHORE_WIND','#06b6d4',
            'NUCLEAR','#22d3ee', 'GAS','#c084fc', 'COAL','#78716c',
            'HYDRO','#38bdf8', 'STORAGE','#ec4899', 'GEOTHERMAL','#fb923c',
            'BIOMASS','#a3e635',
            ['match',['get','asset_type'],
              'SUBSTATION','#22d3ee', 'DATACENTER','#818cf8',
              'HOSPITAL','#34d399', 'WIND_TURBINE','#84cc16',
              'TELECOM_TOWER','#a78bfa', 'WATER_TREATMENT','#60a5fa',
              '#94a3b8'],
          ],
          'circle-stroke-color': ['match',['get','status'],
            'OPERATIONAL','rgba(255,255,255,0.15)',
            'VULNERABLE','#ff6d00', 'REROUTED','#00e5ff',
            'OFFLINE','#374151', 'DEGRADED','#ffd740', 'CRITICAL','#ff1744',
            'rgba(255,255,255,0.15)'],
          'circle-stroke-width': ['match',['get','status'],
            'VULNERABLE',2, 'REROUTED',2, 'DEGRADED',2, 'CRITICAL',2.5, 1],
          'circle-opacity': ['match',['get','status'], 'OFFLINE',0.4, 0.88],
          'circle-pitch-alignment': 'map',
        },
      })

      // Hover cursor
      map.on('mouseenter','infra-circles', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave','infra-circles', () => { map.getCanvas().style.cursor = '' })

      // Click popup
      map.on('click','infra-circles', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties
        const statusColor = STATUS_COLORS[p.status] || '#10b981'
        const techColor = p.technology ? (TECH_COLOR[p.technology] || '#94a3b8') : '#22d3ee'
        const capStr = p.capacity_mw
          ? (p.capacity_mw >= 1000 ? `${(p.capacity_mw/1000).toFixed(1)} GW` : `${p.capacity_mw} MW`)
          : null

        popupRef.current.setLngLat(e.lngLat).setHTML(`
          <div style="font-family:'IBM Plex Mono',monospace;padding:14px;min-width:200px">
            <div style="font-size:9px;font-weight:700;color:${techColor};letter-spacing:.15em;text-transform:uppercase;margin-bottom:5px">
              ${p.technology || (p.asset_type||'').replace(/_/g,' ')}
            </div>
            <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:8px;font-family:'Syne',sans-serif">${p.name}</div>
            <div style="display:flex;gap:10px;margin-bottom:6px">
              <span style="font-size:10px;font-weight:700;color:${statusColor};letter-spacing:.08em">${p.status}</span>
              ${capStr ? `<span style="font-size:10px;color:rgba(255,255,255,.5)">${capStr}</span>` : ''}
            </div>
            <div style="font-size:10px;color:rgba(255,255,255,.4)">${p.country}${p.region ? ' · '+p.region : ''}</div>
            ${p.risk_level && p.risk_level !== 'NONE' ? `<div style="font-size:10px;color:#ff6d00;margin-top:6px">Risk: <b>${p.risk_level}</b> (${(p.risk_score*100).toFixed(0)}%)</div>` : ''}
          </div>`).addTo(map)

        if (onAssetClick) onAssetClick(p)
      })

      map.on('click','tx-lines', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties
        popupRef.current.setLngLat(e.lngLat).setHTML(`
          <div style="font-family:'IBM Plex Mono',monospace;padding:12px;min-width:180px">
            <div style="font-size:9px;font-weight:700;color:#22d3ee;letter-spacing:.15em;text-transform:uppercase;margin-bottom:5px">TRANSMISSION LINE</div>
            <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:6px">${p.name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5)">${p.voltage_class} kV Class · ${p.status}</div>
          </div>`).addTo(map)
      })

      map.on('mouseenter','tx-lines', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave','tx-lines', () => { map.getCanvas().style.cursor = '' })

      const pointCount = ALL_INFRA.features.length
      setAssetCount(pointCount)
      setStatus(`${pointCount} nodes loaded`)
      setMapReady(true)
    })

    mapRef.current = map
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      map.remove()
      mapRef.current = null
    }
  }, [onAssetClick])

  // Pulse animation for vulnerable assets
  useEffect(() => {
    if (!mapReady) return
    let t = 0
    const animate = () => {
      t += 0.04
      const opacity = 0.25 + 0.45 * Math.abs(Math.sin(t))
      if (mapRef.current?.getLayer('infra-halo')) {
        mapRef.current.setPaintProperty('infra-halo', 'circle-stroke-opacity', opacity)
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [mapReady])

  // Merge API data when backend is available
  useEffect(() => {
    if (!mapReady) return
    const load = async () => {
      try {
        const { geojson } = await getGridState()
        if (!geojson?.features?.length) return
        const src = mapRef.current?.getSource('infra')
        if (!src) return
        const merged = {
          type: 'FeatureCollection',
          features: [...ALL_INFRA.features, ...geojson.features],
        }
        src.setData(merged)
        setAssetCount(merged.features.length)
        setStatus(`${merged.features.length} nodes live`)
      } catch { /* offline – fallback data already showing */ }
    }
    load()
  }, [mapReady])

  // Toggle layer visibility
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const vis = (id, show) => {
      if (mapRef.current.getLayer(id))
        mapRef.current.setLayoutProperty(id, 'visibility', show ? 'visible' : 'none')
    }
    vis('infra-circles',     activeLayers.infrastructure)
    vis('infra-halo',        activeLayers.infrastructure)
    vis('tx-lines',          activeLayers.transmission !== false)
    vis('tx-glow',           activeLayers.transmission !== false)
    vis('sub-cables-line',   activeLayers.cables !== false)
    vis('sub-cables-glow',   activeLayers.cables !== false)
    vis('cable-landings',    activeLayers.cables !== false)
    vis('gas-pipes-line',    activeLayers.gas !== false)
    vis('gas-pipes-glow',    activeLayers.gas !== false)
    vis('oil-pipes-line',    activeLayers.oil !== false)
    vis('oil-pipes-glow',    activeLayers.oil !== false)
    vis('offshore-platforms',activeLayers.offshore !== false)
  }, [activeLayers, mapReady])

  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <div ref={mapContainer} style={{ width:'100%', height:'100%' }} />
      <div className="map-status-bar">
        <span className="map-status-dot" />
        {status}
        {assetCount > 0 && <span className="map-status-count">{assetCount} nodes</span>}
      </div>
    </div>
  )
}
