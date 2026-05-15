// ODIN Pipeline Dataset — North America gas & oil infrastructure
// ~80 corridors. Data is SYNTHETIC.

const gp = (id, name, op, status, coords) => ({
  type: 'Feature',
  properties: { asset_id: id, name, asset_type: 'GAS_PIPELINE', operator: op, status },
  geometry: { type: 'LineString', coordinates: coords },
})

const op = (id, name, operator, status, coords) => ({
  type: 'Feature',
  properties: { asset_id: id, name, asset_type: 'OIL_PIPELINE', operator, status },
  geometry: { type: 'LineString', coordinates: coords },
})

// ── GAS PIPELINES — US INTERSTATE ─────────────────────────────────────────
export const GAS_PIPELINES = { type: 'FeatureCollection', features: [

  // Transcontinental (Transco) — Gulf Coast to NYC
  gp('GP-001','Transcontinental Pipeline','Williams','OPERATIONAL',
    [[-95.4,29.7],[-91.5,30.5],[-88.0,30.2],[-85.2,31.5],[-82.0,33.8],[-79.0,35.9],[-77.0,38.9],[-75.0,39.9],[-73.5,40.9]]),

  // Tennessee Gas Pipeline — Gulf to New England
  gp('GP-002','Tennessee Gas Pipeline','TC Energy','OPERATIONAL',
    [[-95.0,30.0],[-91.0,31.0],[-88.5,34.0],[-86.0,36.5],[-83.5,38.5],[-79.0,40.4],[-75.5,41.0],[-73.5,41.8],[-71.5,42.5]]),

  // Columbia Gas Transmission — Appalachian
  gp('GP-003','Columbia Gas Transmission','TC Energy','OPERATIONAL',
    [[-82.5,37.5],[-80.5,39.0],[-78.5,40.5],[-76.0,41.0],[-74.5,41.5]]),

  // Rockies Express — Colorado to Ohio
  gp('GP-004','Rockies Express Pipeline','Tallgrass Energy','OPERATIONAL',
    [[-108.0,39.5],[-105.0,40.0],[-102.0,40.5],[-98.0,41.0],[-95.0,41.5],[-91.0,41.5],[-87.5,41.8],[-83.0,40.5]]),

  // Alliance Pipeline — Canada to Chicago
  gp('GP-005','Alliance Pipeline','Enbridge','OPERATIONAL',
    [[-110.0,50.0],[-104.0,48.0],[-100.0,46.0],[-96.0,44.5],[-93.0,43.5],[-91.0,42.0],[-87.5,41.8]]),

  // Iroquois Gas — New England
  gp('GP-006','Iroquois Gas Transmission','Iroquois Gas','OPERATIONAL',
    [[-73.8,43.5],[-73.0,42.5],[-72.5,41.8],[-71.5,41.5],[-70.5,41.7]]),

  // Southern Union / Panhandle Eastern
  gp('GP-007','Panhandle Eastern Pipeline','Southern Union','OPERATIONAL',
    [[-101.0,36.0],[-97.5,37.0],[-95.5,39.0],[-93.0,41.0],[-89.5,41.5],[-87.5,41.8]]),

  // El Paso Natural Gas — Texas to California
  gp('GP-008','El Paso Natural Gas','El Paso Corp','OPERATIONAL',
    [[-97.5,25.9],[-101.0,29.5],[-105.0,31.0],[-109.5,32.5],[-112.5,33.5],[-116.5,33.9],[-118.5,34.1]]),

  // Kern River Gas Transmission — Wyoming to California
  gp('GP-009','Kern River Gas Transmission','Berkshire Hathaway','OPERATIONAL',
    [[-108.5,42.0],[-110.0,39.5],[-112.0,37.5],[-114.5,36.0],[-116.5,35.5],[-118.5,34.1]]),

  // Colorado Interstate Gas
  gp('GP-010','Colorado Interstate Gas','Southern Natural Gas','OPERATIONAL',
    [[-105.0,40.0],[-103.0,38.5],[-100.0,37.0],[-97.5,37.5],[-95.0,39.0]]),

  // Florida Gas Transmission
  gp('GP-011','Florida Gas Transmission','Boardwalk Pipeline','OPERATIONAL',
    [[-84.4,33.7],[-83.5,31.5],[-82.0,30.5],[-80.5,28.5],[-80.2,26.5],[-80.2,25.8]]),

  // Maritimes & Northeast — New England to Maritime Canada
  gp('GP-012','Maritimes & Northeast','Spectra Energy','OPERATIONAL',
    [[-71.5,42.5],[-70.5,43.5],[-70.0,44.0],[-68.5,44.5],[-67.0,45.0],[-65.5,45.5],[-63.5,44.8]]),

  // Southern Natural Gas — Gulf to Southeast
  gp('GP-013','Southern Natural Gas','Berkshire Hathaway','OPERATIONAL',
    [[-90.1,29.5],[-88.0,31.5],[-85.5,33.5],[-83.0,35.0],[-81.5,36.5],[-79.5,37.5]]),

  // Texas Eastern — Gulf to New York
  gp('GP-014','Texas Eastern Transmission','Boardwalk Pipeline','OPERATIONAL',
    [[-94.0,30.0],[-91.5,32.5],[-89.0,35.5],[-87.0,37.5],[-84.5,39.5],[-81.5,40.5],[-79.0,40.4],[-75.0,39.9],[-74.0,40.7]]),

  // PEPL (Panhandle Eastern Pipe Line) — Texas to Michigan
  gp('GP-015','Panhandle Eastern Pipe Line','Southern Union','OPERATIONAL',
    [[-101.0,36.5],[-98.0,38.0],[-95.0,40.0],[-92.0,41.5],[-89.0,42.0],[-86.5,42.0],[-84.5,42.5]]),

  // Northwest Pipeline — Canadian border to Arizona
  gp('GP-016','Northwest Pipeline','Williams','OPERATIONAL',
    [[-122.8,49.0],[-122.4,47.5],[-120.5,45.5],[-119.0,43.0],[-116.5,40.5],[-114.0,38.0],[-112.0,34.0]]),

  // Questar Pipeline — Utah and Wyoming
  gp('GP-017','Questar Pipeline','Dominion','OPERATIONAL',
    [[-111.0,42.5],[-111.5,40.5],[-112.0,38.5],[-113.0,37.0]]),

  // Boardwalk Gulf South — Texas to Midwest
  gp('GP-018','Gulf South Pipeline','Boardwalk Pipeline','OPERATIONAL',
    [[-95.0,29.5],[-93.0,31.0],[-90.5,32.5],[-88.5,35.0],[-87.5,37.0],[-87.5,41.8]]),

  // ERCOT Intrastate — Texas (VULNERABLE)
  gp('GP-019','Lone Star Gas Texas','Atmos Energy','VULNERABLE',
    [[-101.0,31.5],[-99.0,32.0],[-97.0,32.5],[-95.5,30.0],[-94.5,29.5]]),

  // Southern Union Permian Basin
  gp('GP-020','Trans-Pecos Pipeline','Energy Transfer','OPERATIONAL',
    [[-104.0,30.5],[-102.5,31.5],[-100.0,31.0],[-98.0,29.5],[-97.0,27.5]]),

  // ── CANADA GAS PIPELINES ──────────────────────────────────────────────────

  // TransCanada Mainline — Alberta to Quebec
  gp('GP-CAN01','TransCanada Mainline','TC Energy','OPERATIONAL',
    [[-114.0,51.0],[-110.0,50.5],[-105.0,50.0],[-100.0,50.5],[-97.0,49.5],[-93.0,48.0],[-90.0,48.5],[-84.0,46.0],[-79.5,43.5],[-73.5,45.5]]),

  // NOVA Gas — Alberta
  gp('GP-CAN02','NOVA Gas Transmission','TC Energy','OPERATIONAL',
    [[-115.0,49.5],[-114.5,51.5],[-113.5,53.5],[-112.5,55.0],[-110.5,56.0]]),

  // Enbridge BC Mainland
  gp('GP-CAN03','Enbridge BC Pipeline','Enbridge','OPERATIONAL',
    [[-123.0,49.5],[-121.5,50.5],[-120.0,52.0],[-118.5,53.5],[-116.0,55.0]]),

  // Union Gas — Ontario
  gp('GP-CAN04','Union Gas Ontario','TC Energy','OPERATIONAL',
    [[-83.0,44.0],[-81.0,43.5],[-79.5,43.7],[-78.5,44.5],[-76.5,44.5]]),

  // TQM — Quebec/Ontario
  gp('GP-CAN05','TQM Pipeline','TC Energy/Énergir','OPERATIONAL',
    [[-79.5,43.7],[-75.5,45.0],[-73.5,45.5],[-71.5,46.0],[-70.0,47.5]]),
]}

// ── OIL PIPELINES — US INTERSTATE ─────────────────────────────────────────
export const OIL_PIPELINES = { type: 'FeatureCollection', features: [

  // Colonial Pipeline — Gulf Coast to New York Harbor
  op('OP-001','Colonial Pipeline','Colonial Pipeline Co','OPERATIONAL',
    [[-95.0,29.8],[-91.5,30.2],[-87.5,32.5],[-85.0,33.8],[-83.0,33.6],[-81.0,34.5],[-79.0,36.0],[-77.0,38.5],[-75.0,39.8],[-73.9,40.7]]),

  // Keystone Pipeline — Canada to Gulf Coast
  op('OP-002','Keystone Pipeline','TC Energy','OPERATIONAL',
    [[-110.0,49.5],[-104.5,47.0],[-100.0,44.0],[-97.0,40.5],[-96.5,37.0],[-95.0,35.0],[-95.4,29.7]]),

  // Lakehead Pipeline — Minnesota to Superior WI
  op('OP-003','Lakehead Pipeline','Enbridge','OPERATIONAL',
    [[-97.0,48.5],[-95.0,47.5],[-93.5,46.5],[-92.0,46.5],[-91.5,46.8]]),

  // Explorer Pipeline — Louisiana to Chicago
  op('OP-004','Explorer Pipeline','Explorer Pipeline Co','OPERATIONAL',
    [[-90.1,30.0],[-89.5,32.0],[-88.0,35.5],[-87.0,38.0],[-87.5,41.8]]),

  // Mid-Valley Pipeline — Texas to Michigan
  op('OP-005','Mid-Valley Pipeline','Centurion Pipeline','OPERATIONAL',
    [[-95.4,29.7],[-93.5,32.0],[-91.0,34.5],[-88.5,37.5],[-86.5,39.5],[-84.5,41.0],[-83.5,42.5]]),

  // Buckeye Pipeline — Ohio to NJ
  op('OP-006','Buckeye Pipeline','Buckeye Partners','OPERATIONAL',
    [[-83.0,40.5],[-81.0,40.5],[-79.0,40.4],[-76.0,40.5],[-74.0,40.7]]),

  // Dixie Pipeline — NGL liquid line Gulf to Southeast
  op('OP-007','Dixie Pipeline','Williams','OPERATIONAL',
    [[-95.0,29.8],[-91.0,31.0],[-88.0,33.0],[-85.5,35.0],[-83.5,35.5],[-82.0,35.0]]),

  // Trans-Alaska Pipeline System
  op('OP-008','Trans-Alaska Pipeline','Alyeska Pipeline','OPERATIONAL',
    [[-148.5,70.3],[-147.0,67.0],[-145.5,64.0],[-143.0,62.0],[-145.7,60.5]]),

  // Longhorn Partners — Texas
  op('OP-009','Longhorn Pipeline','Holly Frontier','OPERATIONAL',
    [[-106.5,31.8],[-102.5,30.5],[-100.0,30.0],[-98.0,30.0],[-95.5,29.8]]),

  // Seaway Pipeline — Texas to Illinois
  op('OP-010','Seaway Pipeline','Enterprise/Enbridge','OPERATIONAL',
    [[-95.5,29.8],[-97.0,32.0],[-96.5,34.0],[-95.5,36.0],[-95.0,38.0],[-95.5,40.0],[-87.5,41.8]]),

  // Express Pipeline — Wyoming to Montana → Canada
  op('OP-011','Express Pipeline','Spectra Energy','OPERATIONAL',
    [[-104.5,47.5],[-106.0,44.0],[-108.0,41.5],[-110.0,41.5]]),

  // Capline — Louisiana to Chicago
  op('OP-012','Capline Pipeline','Shell/Marathon/BPX','OPERATIONAL',
    [[-91.0,30.5],[-89.5,33.0],[-88.0,35.5],[-88.0,38.5],[-87.5,41.8]]),

  // Plantation Pipeline — Alabama to Virginia
  op('OP-013','Plantation Pipe Line','Kinder Morgan','OPERATIONAL',
    [[-86.5,32.5],[-85.0,33.8],[-83.5,35.0],[-81.0,37.0],[-79.0,37.5],[-77.5,38.5]]),

  // Portland Pipeline — Maine to Quebec
  op('OP-014','Portland Pipeline','Various','OPERATIONAL',
    [[-70.3,43.7],[-70.5,44.5],[-71.0,45.5],[-72.0,46.0],[-73.5,45.5]]),

  // West Texas pipeline network
  op('OP-015','Permian Basin Pipeline Network','Magellan','OPERATIONAL',
    [[-102.0,31.5],[-101.0,32.5],[-100.0,33.0],[-99.0,33.5],[-98.0,34.0],[-97.5,35.0]]),

  // Dakota Access Pipeline — North Dakota to Illinois
  op('OP-016','Dakota Access Pipeline','Energy Transfer','VULNERABLE',
    [[-103.5,47.5],[-100.0,46.0],[-96.5,44.0],[-94.0,42.5],[-91.5,42.0],[-89.5,41.5],[-87.5,41.8]]),

  // Line 3 Replacement — Minnesota
  op('OP-017','Line 3 Replacement','Enbridge','OPERATIONAL',
    [[-95.0,48.5],[-93.5,47.0],[-92.5,47.0],[-91.5,46.8]]),

  // ── CANADA OIL PIPELINES ──────────────────────────────────────────────────

  // Enbridge Mainline — Alberta to Ontario
  op('OP-CAN01','Enbridge Mainline','Enbridge','OPERATIONAL',
    [[-114.0,51.0],[-110.0,50.0],[-105.0,50.5],[-100.0,50.0],[-96.5,49.5],[-93.0,48.0],[-90.0,48.5],[-85.0,46.5],[-83.5,43.7],[-80.5,43.5]]),

  // Transmountain — Edmonton to Burnaby
  op('OP-CAN02','Trans Mountain Pipeline','Trans Mountain Corp','OPERATIONAL',
    [[-113.5,53.5],[-118.5,52.5],[-120.5,51.5],[-122.5,50.0],[-122.9,49.3]]),

  // Lakehead Canadian — Ontario
  op('OP-CAN03','Lakehead Pipeline Canada','Enbridge','OPERATIONAL',
    [[-80.5,43.5],[-83.0,43.0],[-84.5,43.5],[-84.0,45.0],[-84.0,46.0]]),

  // ── MEXICO OIL/GAS ────────────────────────────────────────────────────────

  // PEMEX North Pipeline — Tamaulipas to Monterrey
  op('OP-MEX01','PEMEX Norte Ducto','PEMEX','OPERATIONAL',
    [[-97.5,26.0],[-98.0,25.5],[-100.3,25.7],[-100.5,26.5]]),

  // PEMEX Veracruz Pipeline
  gp('GP-MEX01','PEMEX Veracruz Gas','PEMEX','OPERATIONAL',
    [[-96.1,19.2],[-95.0,20.5],[-94.0,21.5],[-92.5,22.0],[-91.5,20.5]]),
]}
