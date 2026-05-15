// ODIN Submarine Cable Dataset — Global fiber optic undersea cables
// Coordinates approximate great-circle routes. Data is SYNTHETIC.

// Helper for cable features
const cable = (id, name, rfs, owners, coords) => ({
  type: 'Feature',
  properties: { asset_id: id, name, asset_type: 'SUBMARINE_CABLE', rfs_year: rfs, owners, status: 'OPERATIONAL' },
  geometry: { type: 'LineString', coordinates: coords },
})

const lp = (id, name, lng, lat, country) => ({
  type: 'Feature',
  properties: { asset_id: id, name, asset_type: 'CABLE_LANDING_POINT', country, status: 'OPERATIONAL' },
  geometry: { type: 'Point', coordinates: [lng, lat] },
})

// ── TRANS-ATLANTIC CABLES ─────────────────────────────────────────────────
export const SUBMARINE_CABLES = { type: 'FeatureCollection', features: [
  // Marea — Virginia Beach → Bilbao, Spain
  cable('SC-ATL-01','Marea',2017,'Microsoft/Facebook/Telefonica',
    [[-75.9,36.8],[-60.0,42.0],[-40.0,48.0],[-20.0,50.0],[-5.0,43.5],[-2.9,43.3]]),

  // AEConnect — Shirley NY → Killala, Ireland
  cable('SC-ATL-02','AEConnect-1',2016,'Aqua Comms',
    [[-72.5,40.9],[-55.0,47.5],[-35.0,53.0],[-18.0,54.5],[-9.2,54.2]]),

  // TAT-14 — New Jersey → France/Germany/UK
  cable('SC-ATL-03','TAT-14',2001,'Consortium',
    [[-74.3,39.6],[-50.0,46.0],[-30.0,50.0],[-10.0,50.5],[-5.7,50.1]]),

  // HAVFRUE/AEC-2 — New Jersey → Denmark/Ireland
  cable('SC-ATL-04','HAVFRUE/AEC-2',2020,'Google/Facebook',
    [[-74.0,40.1],[-50.0,52.0],[-30.0,58.0],[-10.0,56.0],[-5.5,55.0],[8.0,55.8]]),

  // Dunant — Virginia Beach → Saint-Hilaire-de-Riez, France
  cable('SC-ATL-05','Dunant',2021,'Google',
    [[-75.9,36.8],[-55.0,44.0],[-35.0,48.0],[-15.0,48.0],[-1.5,47.0]]),

  // SHEFA-2 — Faroe Islands → Scotland → Ireland (short North Atlantic)
  cable('SC-ATL-06','Nuvem',2023,'Google',
    [[-75.9,36.8],[-50.0,44.0],[-35.0,46.0],[-20.0,46.0],[-8.5,38.7]]),

  // SAEx1 — Brazil → Namibia/South Africa (South Atlantic)
  cable('SC-ATL-07','SAEx1',2025,'SAEx International',
    [[-43.2,-22.9],[-15.0,-15.0],[5.0,-10.0],[17.1,-29.0],[18.4,-33.9]]),

  // BRUSA — Brazil → US Virgin Islands → Puerto Rico → US
  cable('SC-ATL-08','BRUSA',2016,'Antel/GlobeNet',
    [[-43.2,-22.9],[-35.0,-10.0],[-65.0,17.0],[-66.1,18.5],[-64.8,32.3],[-75.0,38.0]]),

  // Monet — Florida → Brazil
  cable('SC-ATL-09','Monet',2017,'Google/Antel',
    [[-80.2,25.5],[-70.0,20.0],[-55.0,5.0],[-43.2,-22.9]]),

  // ARCOS — Florida → Mexico/Central America/Caribbean
  cable('SC-ATL-10','ARCOS',2001,'Consortium',
    [[-80.2,26.0],[-83.0,23.0],[-86.8,21.0],[-90.5,16.0],[-83.5,10.0],[-77.2,8.0]]),

  // SAT-3/WASC — Europe → West Africa → South Africa
  cable('SC-ATL-11','SAT-3/WASC/SAFE',2002,'Consortium',
    [[-8.5,38.7],[-17.0,15.0],[-13.7,9.7],[-13.7,9.7],[0.0,5.0],[6.4,3.4],[14.5,0.5],[18.4,-33.9]]),

  // ── TRANS-PACIFIC CABLES (using extended longitudes to avoid antimeridian issues) ──

  // FASTER — Oregon → Japan (north Pacific great circle)
  cable('SC-PAC-01','FASTER',2016,'Google/Consortium',
    [[-124.0,43.5],[-145.0,48.5],[-165.0,47.0],[-180.0,42.0],[-200.0,38.0],[-215.0,35.0],[-220.0,35.5]]),

  // Unity — Los Angeles → Chikura, Japan (via Hawaii)
  cable('SC-PAC-02','Unity/EAC-Pacific',2010,'Google/Consortium',
    [[-118.2,33.8],[-145.0,32.0],[-157.8,21.3],[-175.0,24.0],[-200.0,30.0],[-220.0,35.0]]),

  // TGN-Pacific — Oregon → Guam → Japan/Philippines
  cable('SC-PAC-03','TGN-Pacific',2003,'Tata Communications',
    [[-123.9,45.9],[-145.0,42.0],[-175.0,35.0],[-210.0,20.0],[-215.0,14.0],[-216.0,13.5]]),

  // JUPITER — US/Guam/Japan
  cable('SC-PAC-04','JUPITER',2020,'Amazon/Facebook/SoftBank',
    [[-118.4,33.9],[-145.0,35.0],[-165.0,30.0],[-190.0,20.0],[-208.0,15.0],[-215.0,13.0]]),

  // Trans-Pacific Express — US West Coast → China/Korea/Japan
  cable('SC-PAC-05','Trans-Pacific Express',2009,'Consortium',
    [[-122.4,37.8],[-145.0,38.0],[-172.0,38.0],[-200.0,37.0],[-218.0,37.5],[-222.0,36.6]]),

  // Southern Cross NEXT — Australia → Hawaii → US West Coast
  cable('SC-PAC-06','Southern Cross NEXT',2022,'Spark NZ/Optus',
    [[151.2,-33.9],[163.0,-28.0],[178.0,-22.0],[-185.0,-15.0],[-205.0,5.0],[-210.0,21.3],[-220.0,34.0]]),

  // Hawaiki — Australia/NZ → Hawaii → US West Coast
  cable('SC-PAC-07','Hawaiki',2018,'Consortium',
    [[174.8,-37.0],[180.0,-30.0],[-185.0,-20.0],[-200.0,0.0],[-212.0,21.3],[-224.0,37.0]]),

  // ── EUROPE → ASIA (SEA-ME-WE + Indian Ocean) ─────────────────────────

  // SEA-ME-WE-5 — France → Malaysia → Australia
  cable('SC-IOC-01','SEA-ME-WE-5',2016,'Consortium',
    [[-4.5,48.4],[10.0,38.0],[30.0,28.0],[44.0,15.0],[54.0,23.0],[72.8,18.9],[80.3,6.1],[103.8,1.3],[113.9,22.3]]),

  // FALCON — Middle East → India → Singapore
  cable('SC-IOC-02','FALCON',2006,'FLAG Telecom',
    [[54.0,24.0],[64.0,22.0],[72.8,18.9],[80.0,12.0],[80.3,6.1],[103.8,1.3]]),

  // EIG — Europe → India via Middle East
  cable('SC-IOC-03','EIG',2012,'Consortium',
    [[-4.5,48.4],[2.0,38.0],[30.0,28.0],[32.5,28.5],[37.0,21.0],[44.0,15.0],[55.0,23.0],[72.8,18.9]]),

  // DARE1 — Middle East → Horn of Africa
  cable('SC-IOC-04','DARE1',2019,'Consortium',
    [[54.0,24.0],[55.0,23.0],[50.0,12.0],[44.0,11.5],[41.8,12.0],[43.1,11.6]]),

  // AAE-1 — Asia → Africa → Europe (long cable)
  cable('SC-IOC-05','AAE-1',2017,'Consortium',
    [[103.8,1.3],[100.0,5.0],[80.3,6.1],[72.8,18.9],[55.0,23.0],[44.0,15.0],[37.0,21.0],[32.5,28.5],[30.0,28.0],[18.4,-33.9]]),

  // ── ASIA-PACIFIC SHORT HAUL ────────────────────────────────────────────

  // JGA North — Japan → Guam
  cable('SC-AP-01','JGA-North',2020,'Google',
    [[140.0,35.0],[140.0,25.0],[145.0,13.5]]),

  // SJC — Japan → China → Singapore
  cable('SC-AP-02','SJC',2013,'Consortium',
    [[140.0,35.0],[122.0,30.5],[120.0,22.0],[110.0,18.0],[103.8,1.3]]),

  // APCN-2 — Japan/Korea → Singapore
  cable('SC-AP-03','APCN-2',2001,'Consortium',
    [[140.0,35.0],[126.5,37.5],[122.0,30.5],[114.1,22.3],[108.0,15.0],[103.8,1.3]]),

  // INDIGO-Central — Australia → Singapore
  cable('SC-AP-04','INDIGO-Central',2019,'Google/Telstra',
    [[115.9,-32.0],[105.0,-15.0],[96.0,-5.0],[103.8,1.3]]),

  // APX-East — Australia → SE Asia
  cable('SC-AP-05','APX-East',2019,'Consortium',
    [[153.0,-27.5],[148.0,-20.0],[145.0,-14.0],[145.0,13.5],[120.9,14.6],[103.8,1.3]]),

  // ── NORTH SEA / EUROPE SHORT ──────────────────────────────────────────

  // Viking — UK → Norway
  cable('SC-EU-01','Viking',2004,'Bulk Infrastructure',
    [[-3.5,55.0],[2.0,57.5],[5.0,58.5],[8.0,58.3]]),

  // NSN Link — UK → Norway
  cable('SC-EU-02','NSN Link',2021,'NSN',
    [[-4.5,50.8],[2.0,52.0],[5.0,55.0],[8.0,58.0]]),

  // BtB — Baltic Sea cables (Sweden-Lithuania)
  cable('SC-EU-03','BCS East-West Interlink',2009,'TeliaSonera/RETN',
    [[10.0,55.5],[14.0,55.8],[20.9,55.7],[24.0,56.9],[24.7,59.4]]),

  // Mediterranean: Spain → Italy
  cable('SC-EU-04','Med Cable',2010,'Telecom Italia',
    [[-2.9,43.3],[3.0,40.0],[9.0,38.5],[12.5,37.5],[15.0,38.0]]),
]}

// ── CABLE LANDING POINTS ─────────────────────────────────────────────────
export const CABLE_LANDING_POINTS = { type: 'FeatureCollection', features: [
  // North America — Atlantic Coast
  lp('CLP-001','Shirley Bay, NY',-72.5,40.9,'USA'),
  lp('CLP-002','Tuckerton, NJ',-74.3,39.6,'USA'),
  lp('CLP-003','Manasquan, NJ',-74.0,40.1,'USA'),
  lp('CLP-004','Virginia Beach, VA',-75.9,36.8,'USA'),
  lp('CLP-005','Boca Raton, FL',-80.1,26.4,'USA'),
  lp('CLP-006','Hollywood, FL',-80.2,26.0,'USA'),
  lp('CLP-007','Miramar Beach, FL',-86.4,30.4,'USA'),
  lp('CLP-008','Halifax, NS',-63.6,44.7,'Canada'),
  // North America — Pacific Coast
  lp('CLP-009','Hillsboro, OR',-123.0,45.5,'USA'),
  lp('CLP-010','Nedonna Beach, OR',-123.9,45.9,'USA'),
  lp('CLP-011','Pacific City, OR',-123.9,45.2,'USA'),
  lp('CLP-012','Manchester, WA',-122.5,47.5,'USA'),
  lp('CLP-013','Morro Bay, CA',-120.8,35.4,'USA'),
  lp('CLP-014','San Luis Obispo, CA',-121.0,35.3,'USA'),
  lp('CLP-015','Manhattan Beach, CA',-118.4,33.9,'USA'),
  lp('CLP-016','Hermosa Beach, CA',-118.4,33.8,'USA'),
  // Hawaii
  lp('CLP-017','Keawaula, HI',-158.3,21.5,'USA'),
  lp('CLP-018','Makaha, HI',-158.2,21.5,'USA'),
  lp('CLP-019','Kahe Point, HI',-158.1,21.4,'USA'),
  // Caribbean / Central America
  lp('CLP-020','Punta Cana, DR',-68.7,18.5,'Dominican Rep.'),
  lp('CLP-021','Cable Beach, Bahamas',-77.3,25.1,'Bahamas'),
  // Europe — Atlantic
  lp('CLP-022','Porthcurno, UK',-5.7,50.1,'UK'),
  lp('CLP-023','Bude, UK',-4.5,50.8,'UK'),
  lp('CLP-024','Southport, UK',-3.0,53.6,'UK'),
  lp('CLP-025','Brest, France',-4.5,48.4,'France'),
  lp('CLP-026','Saint-Hilaire, France',-1.5,47.0,'France'),
  lp('CLP-027','Marseille, France',5.4,43.3,'France'),
  lp('CLP-028','Bilbao, Spain',-2.9,43.3,'Spain'),
  lp('CLP-029','Carcavelos, Portugal',-9.3,38.7,'Portugal'),
  lp('CLP-030','Sesimbra, Portugal',-9.1,38.4,'Portugal'),
  lp('CLP-031','Alcácer do Sal, Portugal',-8.5,38.4,'Portugal'),
  lp('CLP-032','Tenerife, Spain',-16.3,28.1,'Spain'),
  // Europe — North Sea / Baltic
  lp('CLP-033','Vestmannaeyjar, Iceland',-21.0,63.4,'Iceland'),
  lp('CLP-034','Svelgen, Norway',5.3,61.8,'Norway'),
  lp('CLP-035','Gothenburg, Sweden',11.9,57.7,'Sweden'),
  // Africa
  lp('CLP-036','Yzerfontein, SA',18.2,-33.3,'South Africa'),
  lp('CLP-037','Melkbosstrand, SA',18.4,-33.7,'South Africa'),
  lp('CLP-038','Lagos, Nigeria',3.4,6.5,'Nigeria'),
  lp('CLP-039','Libreville, Gabon',9.5,0.4,'Gabon'),
  lp('CLP-040','Djibouti',43.1,11.6,'Djibouti'),
  // Middle East
  lp('CLP-041','Fujairah, UAE',56.3,25.1,'UAE'),
  lp('CLP-042','Mumbai, India',72.8,18.9,'India'),
  lp('CLP-043','Chennai, India',80.3,13.1,'India'),
  lp('CLP-044','Colombo, Sri Lanka',79.9,6.9,'Sri Lanka'),
  // SE Asia
  lp('CLP-045','Singapore',103.8,1.3,'Singapore'),
  lp('CLP-046','Changi, Singapore',104.0,1.4,'Singapore'),
  lp('CLP-047','Tuas, Singapore',103.6,1.3,'Singapore'),
  lp('CLP-048','Hong Kong',114.1,22.3,'Hong Kong'),
  lp('CLP-049','Manila, Philippines',120.9,14.6,'Philippines'),
  lp('CLP-050','Guam',144.7,13.4,'USA/Guam'),
  // Japan
  lp('CLP-051','Kitaibaraki, Japan',140.7,36.8,'Japan'),
  lp('CLP-052','Chikura, Japan',140.0,35.0,'Japan'),
  lp('CLP-053','Ajigaura, Japan',140.6,36.4,'Japan'),
  lp('CLP-054','Shima, Japan',136.9,34.3,'Japan'),
  lp('CLP-055','Maruyama, Japan',141.0,43.2,'Japan'),
  // Australia
  lp('CLP-056','Perth, Australia',115.9,-32.0,'Australia'),
  lp('CLP-057','Sydney, Australia',151.2,-33.9,'Australia'),
  lp('CLP-058','Brisbane, Australia',153.0,-27.5,'Australia'),
  lp('CLP-059','Darwin, Australia',130.8,-12.5,'Australia'),
  // New Zealand
  lp('CLP-060','Auckland, NZ',174.8,-37.0,'New Zealand'),
  // South America
  lp('CLP-061','Rio de Janeiro, Brazil',-43.2,-22.9,'Brazil'),
  lp('CLP-062','Fortaleza, Brazil',-38.5,-3.7,'Brazil'),
  lp('CLP-063','Santos, Brazil',-46.3,-23.9,'Brazil'),
  lp('CLP-064','Valparaíso, Chile',-71.6,-33.0,'Chile'),
  lp('CLP-065','Buenos Aires, Argentina',-58.4,-34.6,'Argentina'),
]}
