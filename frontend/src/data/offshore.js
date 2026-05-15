// ODIN Offshore Platform Dataset — Global oil & gas platforms
// ~80 synthetic platforms. Data is SYNTHETIC.

const plt = (id, name, type, op, status, mw, country, lng, lat) => ({
  type: 'Feature',
  properties: { asset_id: id, name, asset_type: 'OFFSHORE_PLATFORM', platform_type: type, operator: op, status, capacity_mw: mw, country },
  geometry: { type: 'Point', coordinates: [lng, lat] },
})

export const OFFSHORE_PLATFORMS = { type: 'FeatureCollection', features: [

  // ── GULF OF MEXICO — US ───────────────────────────────────────────────────
  plt('OFF-GOM-01','Mars Platform','OIL_GAS','Shell','OPERATIONAL',null,'USA',-90.6,28.2),
  plt('OFF-GOM-02','Thunder Horse PDQ','OIL_GAS','BP','OPERATIONAL',null,'USA',-88.5,28.2),
  plt('OFF-GOM-03','Atlantis Platform','OIL_GAS','BP','OPERATIONAL',null,'USA',-90.1,27.2),
  plt('OFF-GOM-04','Na Kika Facility','OIL_GAS','Shell/BP','OPERATIONAL',null,'USA',-89.0,27.5),
  plt('OFF-GOM-05','Holstein Platform','OIL_GAS','Shell','OPERATIONAL',null,'USA',-90.5,27.0),
  plt('OFF-GOM-06','Magnolia TLP','OIL_GAS','ConocoPhillips','OPERATIONAL',null,'USA',-87.8,27.0),
  plt('OFF-GOM-07','Ursa Platform','OIL_GAS','Shell','OPERATIONAL',null,'USA',-89.2,28.5),
  plt('OFF-GOM-08','Ram Powell TLP','OIL_GAS','Shell','OPERATIONAL',null,'USA',-88.8,28.0),
  plt('OFF-GOM-09','Baldpate Platform','OIL_GAS','Murphy Oil','OPERATIONAL',null,'USA',-88.2,29.0),
  plt('OFF-GOM-10','Typhoon TLP','OIL_GAS','ConocoPhillips','DEGRADED',null,'USA',-90.0,28.8),
  plt('OFF-GOM-11','Troika System','OIL_GAS','BP','OPERATIONAL',null,'USA',-88.5,27.5),
  plt('OFF-GOM-12','Brutus TLP','OIL_GAS','Shell','OPERATIONAL',null,'USA',-90.8,28.0),
  plt('OFF-GOM-13','Constitution Spar','OIL_GAS','Anadarko','OPERATIONAL',null,'USA',-87.5,28.5),
  plt('OFF-GOM-14','Nansen/Boomvang TLP','OIL_GAS','Kerr-McGee','OPERATIONAL',null,'USA',-88.0,28.2),
  plt('OFF-GOM-15','Pompano Platform','OIL_GAS','BP','OPERATIONAL',null,'USA',-90.4,28.9),
  plt('OFF-GOM-16','Eni Mississippi Canyon','OIL_GAS','Eni','OPERATIONAL',null,'USA',-88.9,29.1),
  plt('OFF-GOM-17','Cognac Platform','OIL_GAS','Shell','OPERATIONAL',null,'USA',-90.5,29.2),
  plt('OFF-GOM-18','ExxonMobil Hoover','OIL_GAS','ExxonMobil','OPERATIONAL',null,'USA',-89.7,26.5),
  plt('OFF-GOM-19','Tahiti Spar','OIL_GAS','Chevron','OPERATIONAL',null,'USA',-90.3,27.7),
  plt('OFF-GOM-20','Perdido Spar','OIL_GAS','Shell','OPERATIONAL',null,'USA',-94.9,26.1),
  plt('OFF-GOM-21','Stones FPSO','OIL_GAS','Shell','VULNERABLE',null,'USA',-95.2,27.0),
  plt('OFF-GOM-22','Buckskin-Moccasin','OIL_GAS','Chevron','OPERATIONAL',null,'USA',-95.5,26.5),
  plt('OFF-GOM-23','Anchor Spar','OIL_GAS','Chevron','OPERATIONAL',null,'USA',-94.0,26.0),

  // ── GULF OF MEXICO — MEXICO ───────────────────────────────────────────────
  plt('OFF-MEX-01','Cantarell Complex','OIL_GAS','PEMEX','DEGRADED',null,'Mexico',-92.0,19.8),
  plt('OFF-MEX-02','Ku-Maloob-Zaap','OIL_GAS','PEMEX','OPERATIONAL',null,'Mexico',-92.5,20.5),
  plt('OFF-MEX-03','Litoral de Tabasco','OIL_GAS','PEMEX','OPERATIONAL',null,'Mexico',-93.5,19.5),
  plt('OFF-MEX-04','Abkatun-Pol-Chuc','OIL_GAS','PEMEX','OPERATIONAL',null,'Mexico',-91.5,20.0),
  plt('OFF-MEX-05','Zaap Platform','OIL_GAS','PEMEX','OPERATIONAL',null,'Mexico',-92.0,20.8),

  // ── NORTH SEA — NORWAY ────────────────────────────────────────────────────
  plt('OFF-NOR-01','Ekofisk Complex','OIL_GAS','ConocoPhillips','OPERATIONAL',null,'Norway',3.2,56.5),
  plt('OFF-NOR-02','Statfjord Platform','OIL_GAS','Equinor','OPERATIONAL',null,'Norway',1.9,61.2),
  plt('OFF-NOR-03','Oseberg Field Centre','OIL_GAS','Equinor','OPERATIONAL',null,'Norway',2.8,60.5),
  plt('OFF-NOR-04','Gullfaks A/B/C','OIL_GAS','Equinor','OPERATIONAL',null,'Norway',2.2,61.2),
  plt('OFF-NOR-05','Troll A/B/C','OIL_GAS','Equinor','OPERATIONAL',null,'Norway',3.7,60.6),
  plt('OFF-NOR-06','Heidrun TLP','OIL_GAS','Equinor','OPERATIONAL',null,'Norway',7.3,65.3),
  plt('OFF-NOR-07','Åsgard A FPSO','OIL_GAS','Equinor','OPERATIONAL',null,'Norway',6.8,65.1),
  plt('OFF-NOR-08','Snøhvit LNG Facility','LNG','Equinor','OPERATIONAL',null,'Norway',16.8,71.0),
  plt('OFF-NOR-09','Johan Sverdrup Field','OIL_GAS','Equinor','OPERATIONAL',null,'Norway',2.5,58.9),
  plt('OFF-NOR-10','Kristin Platform','OIL_GAS','Equinor','OPERATIONAL',null,'Norway',7.0,65.1),

  // ── NORTH SEA — UK ────────────────────────────────────────────────────────
  plt('OFF-UK-01','Forties Field','OIL_GAS','Apache Corp','OPERATIONAL',null,'UK',-1.2,57.7),
  plt('OFF-UK-02','Brent Field','OIL_GAS','Shell','DECOMMISSIONING',null,'UK',1.8,61.1),
  plt('OFF-UK-03','Buzzard Platform','OIL_GAS','Enquest','OPERATIONAL',null,'UK',-1.5,57.9),
  plt('OFF-UK-04','Clair Platform','OIL_GAS','BP','OPERATIONAL',null,'UK',-7.0,60.2),
  plt('OFF-UK-05','Magnus Platform','OIL_GAS','EnQuest','OPERATIONAL',null,'UK',1.5,61.7),
  plt('OFF-UK-06','Pierce Platform','OIL_GAS','Repsol','OPERATIONAL',null,'UK',0.5,57.8),
  plt('OFF-UK-07','Shearwater Platform','OIL_GAS','Shell','OPERATIONAL',null,'UK',2.0,57.5),
  plt('OFF-UK-08','Elgin-Franklin PUQ','OIL_GAS','TotalEnergies','OPERATIONAL',null,'UK',1.7,57.6),

  // ── OFFSHORE WIND — US ATLANTIC ───────────────────────────────────────────
  plt('OFF-WIND-01','Vineyard Wind Hub','OFFSHORE_WIND','Avangrid/CIP','OPERATIONAL',800,'USA',-70.4,41.3),
  plt('OFF-WIND-02','South Fork Wind','OFFSHORE_WIND','Ørsted/Eversource','OPERATIONAL',132,'USA',-71.8,40.9),
  plt('OFF-WIND-03','Revolution Wind','OFFSHORE_WIND','Ørsted/Eversource','OPERATIONAL',704,'USA',-70.2,41.5),
  plt('OFF-WIND-04','Sunrise Wind','OFFSHORE_WIND','Ørsted','OPERATIONAL',924,'USA',-72.0,40.8),
  plt('OFF-WIND-05','Empire Wind 1','OFFSHORE_WIND','Equinor','OPERATIONAL',816,'USA',-73.5,40.5),
  plt('OFF-WIND-06','Atlantic Shores','OFFSHORE_WIND','EDF/Shell','OPERATIONAL',1510,'USA',-74.5,39.0),
  plt('OFF-WIND-07','Coastal Virginia Offshore Wind','OFFSHORE_WIND','Dominion','OPERATIONAL',2600,'USA',-75.5,36.8),

  // ── OFFSHORE WIND — EUROPE ────────────────────────────────────────────────
  plt('OFF-WIND-EU-01','Hornsea 1','OFFSHORE_WIND','Ørsted','OPERATIONAL',1218,'UK',1.6,53.9),
  plt('OFF-WIND-EU-02','Hornsea 2','OFFSHORE_WIND','Ørsted','OPERATIONAL',1386,'UK',1.9,53.9),
  plt('OFF-WIND-EU-03','Dogger Bank A','OFFSHORE_WIND','SSE/Equinor','OPERATIONAL',1200,'UK',1.5,55.0),
  plt('OFF-WIND-EU-04','Gemini Wind Park','OFFSHORE_WIND','Northland Power','OPERATIONAL',600,'Netherlands',5.5,54.0),
  plt('OFF-WIND-EU-05','Borssele 1+2','OFFSHORE_WIND','Ørsted','OPERATIONAL',752,'Netherlands',3.7,51.8),
  plt('OFF-WIND-EU-06','Gode Wind 1+2','OFFSHORE_WIND','Ørsted','OPERATIONAL',582,'Germany',7.5,55.0),
  plt('OFF-WIND-EU-07','Triton Knoll','OFFSHORE_WIND','RWE','OPERATIONAL',857,'UK',0.8,53.3),
  plt('OFF-WIND-EU-08','Borkum Riffgrund 2','OFFSHORE_WIND','Ørsted','OPERATIONAL',450,'Germany',6.7,54.0),
  plt('OFF-WIND-EU-09','Arkona Basin','OFFSHORE_WIND','E.ON/Equinor','OPERATIONAL',385,'Germany',13.8,54.7),
  plt('OFF-WIND-EU-10','Wikinger','OFFSHORE_WIND','Iberdrola','OPERATIONAL',350,'Germany',14.1,54.8),

  // ── PERSIAN GULF ──────────────────────────────────────────────────────────
  plt('OFF-PG-01','North Field Platform','LNG','QatarEnergy','OPERATIONAL',null,'Qatar',51.5,25.5),
  plt('OFF-PG-02','Safaniya Field','OIL_GAS','Saudi Aramco','OPERATIONAL',null,'Saudi Arabia',48.5,28.0),
  plt('OFF-PG-03','Manifa Causeway Platform','OIL_GAS','Saudi Aramco','OPERATIONAL',null,'Saudi Arabia',48.7,27.8),
  plt('OFF-PG-04','Zakum Field','OIL_GAS','ADNOC','OPERATIONAL',null,'UAE',53.3,24.9),
  plt('OFF-PG-05','Khafji Offshore Field','OIL_GAS','Aramco Gulf Ops','OPERATIONAL',null,'Kuwait',48.5,28.5),

  // ── SOUTHEAST ASIA ────────────────────────────────────────────────────────
  plt('OFF-SEA-01','Petronas Kikeh Platform','OIL_GAS','Petronas','OPERATIONAL',null,'Malaysia',117.5,7.6),
  plt('OFF-SEA-02','Petronas Gumusut-Kakap','OIL_GAS','Petronas','OPERATIONAL',null,'Malaysia',118.5,6.5),
  plt('OFF-SEA-03','Total Offshore Timor','OIL_GAS','TotalEnergies','OPERATIONAL',null,'Timor-Leste',124.5,-9.5),
  plt('OFF-SEA-04','Ichthys LNG Field','LNG','INPEX/TotalEnergies','OPERATIONAL',null,'Australia',124.1,-13.3),
  plt('OFF-SEA-05','Prelude FLNG','LNG','Shell','OPERATIONAL',null,'Australia',127.3,-14.2),
]}
