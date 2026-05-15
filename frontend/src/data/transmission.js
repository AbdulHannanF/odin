// ODIN Transmission Line Dataset — North America
// ~65 synthetic corridors. Data is SYNTHETIC.

const ln = (id, name, vc, kv, status, coords) => ({
  type: 'Feature',
  properties: { asset_id: id, name, asset_type: 'TRANSMISSION_LINE', voltage_class: vc, voltage_kv: kv, status },
  geometry: { type: 'LineString', coordinates: coords },
})

export const EXTENDED_TRANSMISSION = { type: 'FeatureCollection', features: [
  // ── US PACIFIC NORTHWEST / WEST ────────────────────────────────────────
  ln('TL-W01','Pacific Intertie 500kV','500',500,'OPERATIONAL',[[-122.3,47.6],[-122.7,45.5],[-121.5,38.6],[-118.2,34.1]]),
  ln('TL-W02','Pacific Gas Backbone 230kV','230',230,'OPERATIONAL',[[-123.1,44.1],[-122.9,42.3],[-121.9,37.3],[-122.3,37.7]]),
  ln('TL-W03','Northern Tier BPA 345kV','345',345,'OPERATIONAL',[[-122.3,47.6],[-117.4,47.7],[-114.0,46.9],[-111.9,40.7]]),
  ln('TL-W04','California ISO 500kV North','500',500,'OPERATIONAL',[[-122.4,40.7],[-121.5,38.5],[-120.9,35.7],[-118.3,34.0]]),
  ln('TL-W05','Desert SW Corridor 345kV','345',345,'OPERATIONAL',[[-118.2,34.1],[-115.1,36.2],[-112.1,33.4],[-110.9,32.2]]),
  ln('TL-W06','Columbia River 500kV','500',500,'OPERATIONAL',[[-119.4,47.6],[-119.5,45.7],[-121.6,45.6],[-122.6,45.5]]),
  ln('TL-W07','California East-West 230kV','230',230,'OPERATIONAL',[[-120.9,35.7],[-119.5,35.5],[-117.6,33.5]]),
  ln('TL-W08','Utah-Nevada 345kV','345',345,'OPERATIONAL',[[-111.9,40.7],[-113.0,37.6],[-115.1,36.2],[-117.2,36.8]]),
  ln('TL-W09','Colorado-Wyoming 345kV','345',345,'OPERATIONAL',[[-104.9,39.7],[-105.5,43.0],[-108.0,43.5]]),
  ln('TL-W10','AZ-CA Link 500kV','500',500,'OPERATIONAL',[[-112.1,33.4],[-116.5,33.9],[-118.1,33.8]]),

  // ── US MOUNTAIN / GREAT PLAINS ────────────────────────────────────────
  ln('TL-M01','Montana-Midwest 345kV','345',345,'OPERATIONAL',[[-108.5,45.8],[-103.2,44.1],[-96.7,43.6],[-93.3,44.9]]),
  ln('TL-M02','Denali 735kV HVDC','735+',735,'OPERATIONAL',[[-104.9,39.7],[-98.5,38.7],[-96.8,32.8],[-95.4,29.7]]),
  ln('TL-M03','Plains 345kV N-S','345',345,'OPERATIONAL',[[-95.9,41.3],[-97.3,37.7],[-97.5,35.5],[-98.5,29.7]]),
  ln('TL-M04','Midwest Spine 230kV','230',230,'OPERATIONAL',[[-93.3,44.9],[-93.6,41.6],[-94.6,39.1],[-97.5,35.5]]),
  ln('TL-M05','Dakota-Minnesota 230kV','230',230,'OPERATIONAL',[[-100.3,44.3],[-96.7,43.6],[-93.3,44.9]]),
  ln('TL-M06','Omaha-Kansas City 138kV','138',138,'OPERATIONAL',[[-95.9,41.3],[-94.6,39.1]]),
  ln('TL-M07','Oklahoma-Texas 345kV','345',345,'OPERATIONAL',[[-97.5,35.5],[-97.6,32.8],[-95.4,29.7]]),
  ln('TL-M08','High Plains Wind Collector 230kV','230',230,'OPERATIONAL',[[-100.4,41.1],[-100.0,37.7],[-102.4,35.2]]),

  // ── US TEXAS (ERCOT) ──────────────────────────────────────────────────
  ln('TL-T01','ERCOT West 345kV','345',345,'VULNERABLE',[[-106.5,31.8],[-102.1,32.0],[-99.7,32.4],[-96.8,32.8]]),
  ln('TL-T02','ERCOT Gulf Coast 230kV','230',230,'VULNERABLE',[[-97.4,27.8],[-95.4,29.8],[-94.1,30.1],[-90.1,30.0]]),
  ln('TL-T03','ERCOT NTX 345kV','345',345,'OPERATIONAL',[[-96.8,32.8],[-97.2,30.1],[-97.8,26.4]]),
  ln('TL-T04','ERCOT Wind Collector 345kV','345',345,'OPERATIONAL',[[-101.8,33.8],[-100.1,31.3],[-97.6,32.8]]),
  ln('TL-T05','Texas Panhandle 230kV','230',230,'OPERATIONAL',[[-102.4,35.2],[-101.8,35.2],[-100.5,29.5]]),

  // ── US SOUTHEAST ──────────────────────────────────────────────────────
  ln('TL-SE01','SERC 500kV Spine','500',500,'OPERATIONAL',[[-84.4,33.7],[-80.8,35.2],[-78.6,35.8],[-77.0,38.9]]),
  ln('TL-SE02','Florida Spine 230kV','230',230,'OPERATIONAL',[[-80.2,25.8],[-81.4,28.5],[-81.7,30.3],[-84.4,33.7]]),
  ln('TL-SE03','Gulf Coast 345kV','345',345,'VULNERABLE',[[-90.1,30.0],[-88.0,30.7],[-87.0,30.4],[-82.5,28.0]]),
  ln('TL-SE04','Appalachian 230kV','230',230,'DEGRADED',[[-79.9,40.4],[-81.6,38.4],[-83.9,35.9],[-86.8,33.5]]),
  ln('TL-SE05','Heartland 230kV','230',230,'OPERATIONAL',[[-90.1,35.1],[-86.8,36.2],[-85.8,38.2],[-84.5,39.1]]),
  ln('TL-SE06','Carolina Corridor 230kV','230',230,'OPERATIONAL',[[-80.8,35.2],[-78.6,35.8],[-76.3,36.9]]),
  ln('TL-SE07','TVA Grid 500kV','500',500,'OPERATIONAL',[[-88.0,35.6],[-86.8,36.2],[-84.7,35.5],[-84.4,36.0]]),
  ln('TL-SE08','SC-VA Corridor 230kV','230',230,'OPERATIONAL',[[-81.3,33.8],[-80.4,33.5],[-78.6,35.8],[-77.3,37.6]]),

  // ── US NORTHEAST / MID-ATLANTIC ───────────────────────────────────────
  ln('TL-NE01','NEC 345kV','345',345,'OPERATIONAL',[[-77.0,38.9],[-76.6,39.3],[-75.2,39.9],[-74.0,40.7],[-71.1,42.4]]),
  ln('TL-NE02','New England 138kV','138',138,'OPERATIONAL',[[-71.1,42.4],[-72.7,41.8],[-72.2,41.3],[-71.4,41.8]]),
  ln('TL-NE03','PJM West 500kV','500',500,'OPERATIONAL',[[-79.9,40.4],[-78.5,40.5],[-76.3,39.8],[-75.2,39.9]]),
  ln('TL-NE04','Upstate NY 230kV','230',230,'OPERATIONAL',[[-73.8,43.3],[-76.8,43.5],[-74.9,44.5],[-71.1,42.4]]),
  ln('TL-NE05','Hudson Valley 230kV','230',230,'OPERATIONAL',[[-74.0,40.7],[-73.8,43.3],[-73.5,41.2]]),

  // ── US MIDWEST ────────────────────────────────────────────────────────
  ln('TL-MW01','Ohio Valley 500kV','500',500,'OPERATIONAL',[[-87.6,41.8],[-83.0,42.3],[-81.7,41.5],[-79.9,40.4],[-75.2,39.9]]),
  ln('TL-MW02','MISO North 345kV','345',345,'OPERATIONAL',[[-87.6,41.8],[-87.8,44.0],[-89.3,44.8],[-93.3,44.9]]),
  ln('TL-MW03','MISO Central 345kV','345',345,'OPERATIONAL',[[-87.6,41.8],[-89.0,40.0],[-90.2,38.4],[-90.5,38.6]]),
  ln('TL-MW04','Iowa Wind Collector 230kV','230',230,'OPERATIONAL',[[-95.0,42.5],[-93.6,41.6],[-91.5,41.5]]),
  ln('TL-MW05','Michigan 230kV','230',230,'OPERATIONAL',[[-87.6,41.8],[-84.4,42.7],[-82.7,43.5],[-82.6,41.5]]),
  ln('TL-MW06','PJM-MISO Seam 345kV','345',345,'OPERATIONAL',[[-87.6,41.8],[-86.3,40.0],[-84.5,39.6],[-82.9,40.2]]),

  // ── US-CANADA INTERCONNECTS ───────────────────────────────────────────
  ln('TL-CA01','Blaine WA-BC Tie 500kV','500',500,'OPERATIONAL',[[-122.3,47.6],[-122.8,49.0],[-123.1,49.3]]),
  ln('TL-CA02','Spokane-BC Tie 230kV','230',230,'OPERATIONAL',[[-117.4,47.7],[-117.0,49.0],[-116.5,49.5]]),
  ln('TL-CA03','Montana-Alberta Tie 230kV','230',230,'OPERATIONAL',[[-110.5,46.5],[-111.0,49.0],[-114.1,51.0]]),
  ln('TL-CA04','Minot ND-Manitoba Tie 230kV','230',230,'OPERATIONAL',[[-100.5,47.0],[-99.5,49.0],[-97.1,50.1]]),
  ln('TL-CA05','Minnesota-Manitoba 345kV','345',345,'OPERATIONAL',[[-93.3,44.9],[-93.5,49.0],[-97.1,50.1]]),
  ln('TL-CA06','Niagara NY-ON Tie 345kV','345',345,'OPERATIONAL',[[-79.1,43.2],[-79.0,43.6],[-79.5,44.5]]),
  ln('TL-CA07','NY-Quebec Tie 450kV DC','500',450,'OPERATIONAL',[[-73.8,43.3],[-73.5,45.0],[-73.8,53.8]]),
  ln('TL-CA08','Maine-NB Tie 138kV','138',138,'OPERATIONAL',[[-70.2,44.9],[-68.0,45.8],[-65.5,47.3]]),

  // ── CANADA INTERNAL ───────────────────────────────────────────────────
  ln('TL-CAN01','BC Hydro 500kV South','500',500,'OPERATIONAL',[[-121.9,51.0],[-123.4,49.2],[-123.1,49.3]]),
  ln('TL-CAN02','Alberta Grid 240kV','230',240,'OPERATIONAL',[[-114.0,51.0],[-114.5,52.0],[-113.5,53.5]]),
  ln('TL-CAN03','Ontario Bruce-Toronto 500kV','500',500,'OPERATIONAL',[[-81.5,44.5],[-80.0,43.7],[-79.0,43.6]]),
  ln('TL-CAN04','Hydro-Quebec 735kV','735+',735,'OPERATIONAL',[[-76.5,50.6],[-73.8,53.8],[-71.3,47.5],[-73.5,46.4]]),
  ln('TL-CAN05','Nelson River DC MB','500',500,'OPERATIONAL',[[-98.5,54.8],[-97.1,50.1]]),

  // ── US-MEXICO INTERCONNECTS ───────────────────────────────────────────
  ln('TL-MX01','El Paso TX-Chihuahua MX Tie','230',230,'OPERATIONAL',[[-106.5,31.8],[-106.5,31.0],[-106.1,28.6]]),
  ln('TL-MX02','Laredo TX-Nuevo Leon MX Tie','138',138,'VULNERABLE',[[-99.5,27.5],[-99.5,27.0],[-99.7,26.5]]),
  ln('TL-MX03','San Diego CA-Baja MX Tie','230',230,'OPERATIONAL',[[-117.2,32.7],[-116.6,31.9]]),
  ln('TL-MX04','AZ-Sonora MX Tie','138',138,'OPERATIONAL',[[-111.0,31.5],[-110.9,30.5],[-110.0,29.1]]),
  ln('TL-MX05','Mexicali Tie 230kV','230',230,'OPERATIONAL',[[-115.5,32.5],[-115.5,31.5],[-115.5,30.5]]),
  ln('TL-MX06','Tamaulipas-Texas Wind 345kV','345',345,'OPERATIONAL',[[-97.5,25.9],[-97.4,27.8],[-98.3,26.1]]),

  // ── MEXICO INTERNAL ───────────────────────────────────────────────────
  ln('TL-MEX01','CFE Western 230kV','230',230,'OPERATIONAL',[[-116.6,31.9],[-110.0,29.1],[-105.3,20.7],[-103.4,20.7]]),
  ln('TL-MEX02','CFE Central 230kV','230',230,'OPERATIONAL',[[-99.0,17.6],[-99.4,23.5],[-98.2,19.4],[-99.1,19.4]]),
  ln('TL-MEX03','CFE Gulf 230kV','230',230,'OPERATIONAL',[[-97.0,26.5],[-96.1,19.2],[-86.8,21.2]]),
  ln('TL-MEX04','Oaxaca Wind Collector 230kV','230',230,'OPERATIONAL',[[-96.5,16.9],[-95.9,17.1],[-96.1,19.2]]),
]}
