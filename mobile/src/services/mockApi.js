// Mock backend — returns realistic demo data when real backend (62.84.187.126:4005) is unreachable.

const NL_RESPONSES = {
  default: { answer: 'ODIN running in offline demo mode. Backend unavailable — showing cached scenario data.', confidence: 0.72, data_sources: ['DEMO'] },
  grid:    { answer: 'North American grid status: 94.2% nominal. 3 substations showing elevated load (TX-44, IL-07, NY-03). No critical failures detected.', confidence: 0.88, data_sources: ['GRID', 'DEMO'] },
  flight:  { answer: 'Currently tracking 1,247 commercial flights over North America. Busiest corridors: JFK–LAX, ORD–DFW, SFO–SEA. No major delays.', confidence: 0.91, data_sources: ['ADS-B', 'DEMO'] },
  ship:    { answer: '542 vessels active in the Gulf of Mexico region. 18 tankers, 124 container ships, 400 misc. No distress signals active.', confidence: 0.85, data_sources: ['AIS', 'DEMO'] },
  iss:     { answer: 'ISS currently at 51.6° inclination, altitude 408 km, groundspeed 27,600 km/h. Next North America pass in 47 minutes.', confidence: 0.99, data_sources: ['TLE', 'DEMO'] },
  lithium: { answer: 'Lithium supply chain risk: ELEVATED. DRC (65% global supply) showing export restrictions. Chile operations nominal. Bolivia developments pending.', confidence: 0.79, data_sources: ['SUPPLY', 'DEMO'] },
  houston: { answer: 'Houston area vulnerable infrastructure: 3 major substations in Cat-4 flood zone, 2 data centers on coastal plain. Recommend pre-positioning backup power.', confidence: 0.83, data_sources: ['GEO', 'DEMO'] },
  wind:    { answer: 'Top offshore wind expansion candidates: Gulf of Maine (22 GW potential), NY Bight (7 GW), Carolinas OCS (14 GW). Permitting status varies.', confidence: 0.76, data_sources: ['ENERGY', 'DEMO'] },
}

function nlMatch(query) {
  const q = query.toLowerCase()
  if (q.includes('grid') || q.includes('power') || q.includes('substation')) return NL_RESPONSES.grid
  if (q.includes('flight') || q.includes('air') || q.includes('corridor')) return NL_RESPONSES.flight
  if (q.includes('ship') || q.includes('vessel') || q.includes('maritime')) return NL_RESPONSES.ship
  if (q.includes('iss') || q.includes('satellite') || q.includes('space')) return NL_RESPONSES.iss
  if (q.includes('lithium') || q.includes('supply')) return NL_RESPONSES.lithium
  if (q.includes('houston') || q.includes('vulnerable')) return NL_RESPONSES.houston
  if (q.includes('wind') || q.includes('offshore')) return NL_RESPONSES.wind
  return NL_RESPONSES.default
}

const REALTIME_SNAPSHOT = {
  flights:    { count: 1247, items: [] },
  ships:      { count: 542,  items: [] },
  satellites: { count: 8912, items: [] },
  earthquakes:{ count: 7,    items: [] },
  incidents:  { count: 3,    items: [] },
}

const POWER_PLANTS = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Comanche Peak', technology: 'Nuclear', capacity_mw: 2430, country: 'US' }, geometry: { type: 'Point', coordinates: [-97.79, 32.30] } },
    { type: 'Feature', properties: { name: 'Palo Verde', technology: 'Nuclear', capacity_mw: 3942, country: 'US' }, geometry: { type: 'Point', coordinates: [-112.86, 33.39] } },
    { type: 'Feature', properties: { name: 'Grand Coulee', technology: 'Hydro', capacity_mw: 6809, country: 'US' }, geometry: { type: 'Point', coordinates: [-118.98, 47.96] } },
    { type: 'Feature', properties: { name: 'Robert Moses', technology: 'Hydro', capacity_mw: 912, country: 'US' }, geometry: { type: 'Point', coordinates: [-78.97, 43.11] } },
    { type: 'Feature', properties: { name: 'Freeport LNG', technology: 'Gas', capacity_mw: 2200, country: 'US' }, geometry: { type: 'Point', coordinates: [-95.36, 28.94] } },
    { type: 'Feature', properties: { name: 'Ivanpah Solar', technology: 'Solar', capacity_mw: 392, country: 'US' }, geometry: { type: 'Point', coordinates: [-115.47, 35.56] } },
    { type: 'Feature', properties: { name: 'Alta Wind', technology: 'Wind', capacity_mw: 1548, country: 'US' }, geometry: { type: 'Point', coordinates: [-118.44, 34.91] } },
  ],
}

const DATACENTERS = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'Ashburn DC Campus', type: 'Hyperscale', country: 'US' }, geometry: { type: 'Point', coordinates: [-77.48, 39.04] } },
    { type: 'Feature', properties: { name: 'Chicago NAP', type: 'Colocation', country: 'US' }, geometry: { type: 'Point', coordinates: [-87.63, 41.88] } },
    { type: 'Feature', properties: { name: 'Dallas Infomart', type: 'Colocation', country: 'US' }, geometry: { type: 'Point', coordinates: [-96.80, 32.77] } },
    { type: 'Feature', properties: { name: 'San Jose Campus', type: 'Hyperscale', country: 'US' }, geometry: { type: 'Point', coordinates: [-121.89, 37.33] } },
    { type: 'Feature', properties: { name: 'Phoenix Mesa', type: 'Hyperscale', country: 'US' }, geometry: { type: 'Point', coordinates: [-111.83, 33.42] } },
  ],
}

const SUBSTATIONS = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: 'TX-44 Hub', v: 345, country: 'US' }, geometry: { type: 'Point', coordinates: [-95.37, 29.76] } },
    { type: 'Feature', properties: { name: 'IL-07 Grid Node', v: 500, country: 'US' }, geometry: { type: 'Point', coordinates: [-88.01, 41.74] } },
    { type: 'Feature', properties: { name: 'NY-03 Gateway', v: 230, country: 'US' }, geometry: { type: 'Point', coordinates: [-73.93, 40.73] } },
    { type: 'Feature', properties: { name: 'CA-Diablo', v: 500, country: 'US' }, geometry: { type: 'Point', coordinates: [-120.85, 35.21] } },
    { type: 'Feature', properties: { name: 'PNW Interchange', v: 500, country: 'US' }, geometry: { type: 'Point', coordinates: [-122.34, 47.60] } },
  ],
}

export async function mockFetch(url, options = {}) {
  await new Promise(r => setTimeout(r, 120)) // simulate latency

  const path = url.replace(/^https?:\/\/[^/]+/, '')

  const snapshotMatch = path.match(/\/api\/v1\/realtime\/snapshot\/(\w+)/)
  if (snapshotMatch) {
    const channel = snapshotMatch[1]
    return { data: REALTIME_SNAPSHOT[channel] || { count: 0, items: [] } }
  }

  if (path.includes('/api/query/nl') || path.includes('/api/v1/query')) {
    const body = options.body ? JSON.parse(options.body) : {}
    return nlMatch(body.query || '')
  }

  if (path.includes('power_plants')) return { type: 'FeatureCollection', features: POWER_PLANTS.features }
  if (path.includes('datacenters'))  return { type: 'FeatureCollection', features: DATACENTERS.features }
  if (path.includes('substations'))  return { type: 'FeatureCollection', features: SUBSTATIONS.features }

  if (path.includes('/api/ingest')) {
    return { incident_id: Date.now().toString(36), summary: 'Demo mode: pipeline simulation complete.', confidence: 0.73 }
  }

  return { demo: true, message: 'Mock backend — endpoint not mapped.' }
}

// Wraps an axios-compatible call with auto-fallback to mock
export async function apiFetch(axiosInstance, method, url, options = {}) {
  try {
    const res = method === 'post'
      ? await axiosInstance.post(url, options.data)
      : await axiosInstance.get(url)
    return res
  } catch {
    const data = await mockFetch(url, {
      body: options.data ? JSON.stringify(options.data) : undefined,
    })
    return { data }
  }
}
