// ODIN Infrastructure Dataset — North America (USA + Canada + Mexico)
// ~380 synthetic assets. Data is SYNTHETIC and does not represent real facilities.

// Compact row format: [lng, lat, tech, name, mw, country, region, status, riskScore]
// status defaults to 'OPERATIONAL', riskScore defaults to 0
const RAW = [
  // ══ USA — NORTHEAST ══════════════════════════════════════════════════════
  // Maine
  [-69.3,45.1,'WIND','Aroostook Wind Farm',150,'USA','Maine','OPERATIONAL',0],
  [-70.2,44.9,'WIND','Western Maine Wind',100,'USA','Maine','OPERATIONAL',0],
  [-69.8,45.5,'HYDRO','Penobscot River Hydro',250,'USA','Maine','OPERATIONAL',0],
  // New Hampshire
  [-71.6,43.7,'HYDRO','Merrimack River Hydro',100,'USA','New Hampshire','OPERATIONAL',0],
  [-71.5,43.0,'GAS','Merrimack CCGT',500,'USA','New Hampshire','OPERATIONAL',0],
  [-71.8,43.3,'SOLAR','Strafford Solar',80,'USA','New Hampshire','OPERATIONAL',0],
  // Vermont
  [-73.0,43.5,'HYDRO','Connecticut River Hydro',200,'USA','Vermont','OPERATIONAL',0],
  [-72.8,44.0,'WIND','Green Mountain Wind',100,'USA','Vermont','OPERATIONAL',0],
  // Massachusetts
  [-71.0,42.5,'GAS','Fore River CCGT',1200,'USA','Massachusetts','OPERATIONAL',0],
  [-70.9,41.6,'GAS','Canal CCGT',800,'USA','Massachusetts','OPERATIONAL',0],
  [-70.2,41.5,'OFFSHORE_WIND','Bay State Wind',800,'USA','Massachusetts','OPERATIONAL',0],
  [-71.3,42.2,'SOLAR','Devens Solar',80,'USA','Massachusetts','OPERATIONAL',0],
  // Rhode Island
  [-71.8,41.4,'OFFSHORE_WIND','Block Island Wind Farm',30,'USA','Rhode Island','OPERATIONAL',0],
  [-71.4,41.8,'GAS','Power Works RI',800,'USA','Rhode Island','OPERATIONAL',0],
  // Connecticut
  [-72.2,41.3,'NUCLEAR','Millstone Nuclear',2000,'USA','Connecticut','OPERATIONAL',0],
  [-72.5,41.7,'GAS','Middletown CCGT',1500,'USA','Connecticut','OPERATIONAL',0],
  [-73.0,41.5,'GAS','Bridgeport Energy',600,'USA','Connecticut','OPERATIONAL',0],
  // New York
  [-76.8,43.5,'NUCLEAR','Nine Mile Point Nuclear',900,'USA','New York','OPERATIONAL',0],
  [-73.5,41.2,'NUCLEAR','Indian Point Grid Node',2100,'USA','New York','OPERATIONAL',0],
  [-73.8,43.3,'HYDRO','Hudson River Hydro',600,'USA','New York','OPERATIONAL',0],
  [-73.7,41.1,'GAS','Bowline CCGT',1000,'USA','New York','OPERATIONAL',0],
  [-73.6,40.8,'GAS','Gowanus CCGT',800,'USA','New York','OPERATIONAL',0],
  [-77.5,42.8,'WIND','Fenner Wind',250,'USA','New York','OPERATIONAL',0],
  [-74.9,44.5,'WIND','Maple Ridge Wind',200,'USA','New York','OPERATIONAL',0],
  [-73.4,40.8,'GAS','Ravenswood CCGT',1800,'USA','New York','OPERATIONAL',0],
  // New Jersey
  [-75.4,39.5,'NUCLEAR','Salem/Hope Creek Nuclear',3450,'USA','New Jersey','OPERATIONAL',0],
  [-74.1,40.6,'GAS','Newark Bay CCGT',800,'USA','New Jersey','OPERATIONAL',0],
  [-74.5,40.0,'GAS','Logan CCGT',600,'USA','New Jersey','OPERATIONAL',0],
  [-74.2,39.4,'OFFSHORE_WIND','Atlantic Shores',1100,'USA','New Jersey','OPERATIONAL',0],
  // Pennsylvania
  [-80.1,40.3,'NUCLEAR','Beaver Valley Nuclear',940,'USA','Pennsylvania','OPERATIONAL',0],
  [-78.8,40.5,'NUCLEAR','Three Mile Island Area',800,'USA','Pennsylvania','OPERATIONAL',0],
  [-79.5,39.8,'COAL','Harrison Power Station',1600,'USA','Pennsylvania','OPERATIONAL',0.2],
  [-75.5,40.0,'GAS','Limerick CCGT',800,'USA','Pennsylvania','OPERATIONAL',0],
  [-75.8,40.8,'GAS','Marcus Hook CCGT',600,'USA','Pennsylvania','OPERATIONAL',0],
  [-78.0,40.3,'WIND','Allegheny Ridge Wind',100,'USA','Pennsylvania','OPERATIONAL',0],

  // ══ USA — MID-ATLANTIC / SOUTHEAST ═══════════════════════════════════════
  // Delaware
  [-75.5,39.2,'GAS','Edge Moor CCGT',500,'USA','Delaware','OPERATIONAL',0],
  // Maryland
  [-76.4,38.3,'NUCLEAR','Calvert Cliffs Nuclear',1700,'USA','Maryland','OPERATIONAL',0],
  [-76.9,39.2,'GAS','Brandon Shores',600,'USA','Maryland','OPERATIONAL',0],
  [-75.6,38.5,'OFFSHORE_WIND','US Wind Maryland',760,'USA','Maryland','OPERATIONAL',0],
  // Virginia
  [-77.3,37.6,'NUCLEAR','Surry Nuclear',1800,'USA','Virginia','OPERATIONAL',0],
  [-77.5,38.0,'NUCLEAR','North Anna Nuclear',1700,'USA','Virginia','OPERATIONAL',0],
  [-77.4,38.4,'GAS','Poseidon Resources VA',800,'USA','Virginia','OPERATIONAL',0],
  [-78.5,38.0,'GAS','Tenaska Fredericksburg',600,'USA','Virginia','OPERATIONAL',0],
  [-77.2,37.4,'SOLAR','Remington Solar',100,'USA','Virginia','OPERATIONAL',0],
  [-79.5,37.2,'WIND','Amazon Wind VA',200,'USA','Virginia','OPERATIONAL',0],
  // North Carolina
  [-80.9,35.5,'NUCLEAR','Catawba/McGuire Nuclear',2500,'USA','North Carolina','OPERATIONAL',0],
  [-78.2,35.5,'NUCLEAR','Shearon Harris Nuclear',900,'USA','North Carolina','OPERATIONAL',0],
  [-78.8,35.6,'GAS','Wayne County CCGT',800,'USA','North Carolina','OPERATIONAL',0],
  [-79.0,35.2,'SOLAR','Strata Solar NC',150,'USA','North Carolina','OPERATIONAL',0],
  [-81.2,36.1,'WIND','New River Appalachian Wind',300,'USA','North Carolina','OPERATIONAL',0],
  // South Carolina
  [-81.3,33.8,'NUCLEAR','Oconee Nuclear',2600,'USA','South Carolina','OPERATIONAL',0],
  [-80.5,33.2,'NUCLEAR','VC Summer Nuclear',2300,'USA','South Carolina','OPERATIONAL',0],
  [-80.9,34.0,'GAS','Columbia Energy SC',700,'USA','South Carolina','OPERATIONAL',0],
  [-79.7,33.6,'SOLAR','Hartsville Solar',120,'USA','South Carolina','OPERATIONAL',0],
  // Georgia
  [-84.0,33.3,'GAS','Plant McIntosh GA',800,'USA','Georgia','OPERATIONAL',0],
  [-82.7,33.5,'GAS','Plant Wansley',600,'USA','Georgia','OPERATIONAL',0.1],
  [-83.6,33.1,'COAL','Plant Bowen',1200,'USA','Georgia','DEGRADED',0.45],
  [-83.0,31.5,'SOLAR','Blue Ridge Solar GA',150,'USA','Georgia','OPERATIONAL',0],
  // Florida
  [-81.6,25.4,'NUCLEAR','Turkey Point Nuclear',2800,'USA','Florida','OPERATIONAL',0],
  [-80.5,27.5,'NUCLEAR','St. Lucie Nuclear',3000,'USA','Florida','OPERATIONAL',0],
  [-81.5,28.0,'GAS','Stanton Energy FL',1200,'USA','Florida','OPERATIONAL',0],
  [-87.0,30.4,'GAS','Calpine Pensacola',800,'USA','Florida','OPERATIONAL',0],
  [-82.8,28.0,'GAS','Hillsborough FL CCGT',700,'USA','Florida','OPERATIONAL',0],
  [-82.0,27.3,'SOLAR','Manatee Solar FL',200,'USA','Florida','OPERATIONAL',0],
  [-81.8,29.2,'SOLAR','Gainesville Solar FL',150,'USA','Florida','OPERATIONAL',0],
  [-81.3,25.0,'SOLAR','FPL Babcock Solar',100,'USA','Florida','OPERATIONAL',0],

  // ══ USA — SOUTH / APPALACHIA ═════════════════════════════════════════════
  // Alabama
  [-87.6,34.5,'NUCLEAR','Browns Ferry Nuclear',3300,'USA','Alabama','OPERATIONAL',0],
  [-86.1,32.9,'NUCLEAR','Farley Nuclear',1800,'USA','Alabama','OPERATIONAL',0],
  [-85.5,33.0,'HYDRO','Coosa River Hydro',300,'USA','Alabama','OPERATIONAL',0],
  [-86.5,33.6,'COAL','Plant Gorgas AL',1700,'USA','Alabama','DEGRADED',0.38],
  [-87.0,33.5,'GAS','Plant Greene County AL',800,'USA','Alabama','OPERATIONAL',0],
  // Mississippi
  [-89.0,32.3,'GAS','Kemper County MS',600,'USA','Mississippi','OPERATIONAL',0],
  [-90.9,31.1,'GAS','Plant Watson MS',500,'USA','Mississippi','OPERATIONAL',0],
  [-88.7,33.9,'COAL','Plant Daniel MS',1100,'USA','Mississippi','OPERATIONAL',0.25],
  // Tennessee
  [-84.4,36.0,'NUCLEAR','Watts Bar Nuclear',2325,'USA','Tennessee','OPERATIONAL',0],
  [-84.8,36.4,'NUCLEAR','Sequoyah Nuclear',2000,'USA','Tennessee','OPERATIONAL',0],
  [-84.7,35.5,'HYDRO','Tellico Dam',150,'USA','Tennessee','OPERATIONAL',0],
  [-88.0,35.6,'HYDRO','Kentucky Dam TVA',175,'USA','Tennessee','OPERATIONAL',0],
  [-87.8,36.6,'COAL','Paradise Plant TN',2600,'USA','Tennessee','DEGRADED',0.5],
  [-86.8,36.2,'GAS','Johnsonville TN',800,'USA','Tennessee','OPERATIONAL',0],
  // Kentucky
  [-87.5,37.7,'COAL','Gibson Station KY',1000,'USA','Kentucky','OPERATIONAL',0.2],
  [-84.8,37.5,'COAL','East Bend KY',600,'USA','Kentucky','OPERATIONAL',0.28],
  [-84.5,38.6,'HYDRO','Kentucky River Locks',200,'USA','Kentucky','OPERATIONAL',0],
  [-85.8,38.2,'GAS','South Shore KY CCGT',600,'USA','Kentucky','OPERATIONAL',0],
  [-87.1,37.9,'GAS','Trimble County KY',500,'USA','Kentucky','OPERATIONAL',0],

  // ══ USA — MIDWEST ════════════════════════════════════════════════════════
  // Ohio
  [-82.7,40.5,'COAL','Harrison Power OH',2700,'USA','Ohio','OPERATIONAL',0.22],
  [-84.5,39.6,'GAS','Hillsburg CCGT',1400,'USA','Ohio','OPERATIONAL',0],
  [-81.8,41.2,'GAS','Lake Shore CCGT OH',800,'USA','Ohio','OPERATIONAL',0],
  [-82.6,41.5,'NUCLEAR','Davis-Besse Nuclear',900,'USA','Ohio','OPERATIONAL',0],
  [-83.5,41.3,'WIND','Timber Road Wind OH',200,'USA','Ohio','OPERATIONAL',0],
  [-81.0,41.0,'GAS','FirstEnergy OH CCGT',600,'USA','Ohio','OPERATIONAL',0],
  // Indiana
  [-87.1,38.2,'COAL','Gibson Station IN',3300,'USA','Indiana','OPERATIONAL',0.15],
  [-86.3,38.0,'COAL','AES Petersburg IN',1700,'USA','Indiana','OPERATIONAL',0.18],
  [-86.1,39.8,'GAS','Harding Street IN',800,'USA','Indiana','OPERATIONAL',0],
  [-87.5,40.7,'WIND','Meadow Lake IN Wind',300,'USA','Indiana','OPERATIONAL',0],
  // Illinois
  [-88.4,40.6,'NUCLEAR','Clinton Power Station',1000,'USA','Illinois','OPERATIONAL',0],
  [-88.0,41.7,'NUCLEAR','Braidwood Nuclear',1878,'USA','Illinois','OPERATIONAL',0],
  [-87.4,41.3,'NUCLEAR','Byron/Quad Cities IL',2300,'USA','Illinois','OPERATIONAL',0],
  [-89.0,40.0,'COAL','E.D. Edwards IL',600,'USA','Illinois','DEGRADED',0.4],
  [-87.5,41.9,'GAS','Lincoln Way Energy IL',1000,'USA','Illinois','OPERATIONAL',0],
  [-89.5,40.8,'WIND','Harvest Wind IL',600,'USA','Illinois','OPERATIONAL',0],
  [-89.8,40.2,'WIND','Twin Groves Wind IL',396,'USA','Illinois','OPERATIONAL',0],
  // Michigan
  [-86.3,43.9,'NUCLEAR','Palisades Nuclear',800,'USA','Michigan','OPERATIONAL',0],
  [-86.5,41.9,'NUCLEAR','Cook Nuclear MI',2000,'USA','Michigan','OPERATIONAL',0],
  [-82.7,43.5,'NUCLEAR','Fermi Nuclear MI',1200,'USA','Michigan','OPERATIONAL',0],
  [-84.4,42.7,'GAS','Zeeland MI CCGT',1500,'USA','Michigan','OPERATIONAL',0],
  [-85.5,44.0,'WIND','Cross Winds MI',133,'USA','Michigan','OPERATIONAL',0],
  // Wisconsin
  [-87.5,44.1,'NUCLEAR','Point Beach Nuclear',600,'USA','Wisconsin','OPERATIONAL',0],
  [-87.9,43.0,'GAS','Valley Power WI',700,'USA','Wisconsin','OPERATIONAL',0],
  [-89.3,44.8,'WIND','Blue Sky Green Field WI',400,'USA','Wisconsin','OPERATIONAL',0],
  [-87.8,42.7,'COAL','Oak Creek WI',1200,'USA','Wisconsin','DEGRADED',0.35],
  // Minnesota
  [-94.0,44.5,'NUCLEAR','Prairie Island/Monticello',1400,'USA','Minnesota','OPERATIONAL',0],
  [-96.5,44.3,'WIND','Pipestone Wind MN',500,'USA','Minnesota','OPERATIONAL',0],
  [-95.4,47.0,'WIND','Buffalo Ridge Wind MN',400,'USA','Minnesota','OPERATIONAL',0],
  [-93.3,44.8,'HYDRO','Mississippi River Hydro',200,'USA','Minnesota','OPERATIONAL',0],
  [-93.1,45.0,'GAS','Black Dog MN CCGT',800,'USA','Minnesota','OPERATIONAL',0],
  // Iowa
  [-95.0,42.5,'WIND','Storm Lake Wind IA',600,'USA','Iowa','OPERATIONAL',0],
  [-92.9,42.0,'WIND','Iowa Windpower Belt',500,'USA','Iowa','OPERATIONAL',0],
  [-94.0,43.5,'WIND','Northwest IA Wind',300,'USA','Iowa','OPERATIONAL',0],
  [-93.6,41.6,'GAS','Duane Arnold IA',600,'USA','Iowa','OPERATIONAL',0],
  [-91.5,41.5,'COAL','Walter Scott IA',655,'USA','Iowa','DEGRADED',0.32],
  [-95.9,43.0,'WIND','MidAmerican Energy Wind',800,'USA','Iowa','OPERATIONAL',0],
  // Missouri
  [-90.5,38.6,'NUCLEAR','Callaway Nuclear MO',1200,'USA','Missouri','OPERATIONAL',0],
  [-93.5,39.5,'COAL','Hawthorn MO Coal',600,'USA','Missouri','OPERATIONAL',0.2],
  [-90.5,38.2,'COAL','Ameren Labadie',2300,'USA','Missouri','OPERATIONAL',0.15],
  [-90.2,38.6,'GAS','Peno Creek MO CCGT',700,'USA','Missouri','OPERATIONAL',0],
  [-95.0,40.0,'WIND','Elk Wind MO',350,'USA','Missouri','OPERATIONAL',0],

  // ══ USA — SOUTH CENTRAL ══════════════════════════════════════════════════
  // Texas (additional)
  [-101.8,33.8,'WIND','Panhandle Wind TX',400,'USA','Texas','OPERATIONAL',0],
  [-102.4,35.2,'WIND','Trent Mesa Wind TX',600,'USA','Texas','OPERATIONAL',0],
  [-100.1,31.3,'WIND','Sweetwater Wind TX',500,'USA','Texas','OPERATIONAL',0],
  [-99.5,34.2,'WIND','Buffalo Gap Wind TX',400,'USA','Texas','OPERATIONAL',0],
  [-103.2,31.8,'SOLAR','Permian Basin Solar TX',300,'USA','Texas','OPERATIONAL',0],
  [-100.5,29.5,'SOLAR','South TX Solar',250,'USA','Texas','OPERATIONAL',0],
  [-94.5,32.5,'GAS','East TX Energy CCGT',1000,'USA','Texas','OPERATIONAL',0],
  [-98.3,26.1,'GAS','Laredo CCGT TX',800,'USA','Texas','VULNERABLE',0.4],
  [-101.8,35.2,'GAS','Amarillo CCGT TX',600,'USA','Texas','OPERATIONAL',0],
  [-97.2,30.1,'GAS','Austin CCGT TX',1200,'USA','Texas','OPERATIONAL',0],
  [-96.5,33.2,'SOLAR','Dallas Solar TX',200,'USA','Texas','OPERATIONAL',0],
  [-97.8,26.4,'SOLAR','Valley Solar TX',180,'USA','Texas','OPERATIONAL',0],
  // Louisiana
  [-91.4,30.8,'NUCLEAR','Waterford Nuclear LA',2170,'USA','Louisiana','OPERATIONAL',0],
  [-91.7,31.1,'NUCLEAR','River Bend Nuclear LA',960,'USA','Louisiana','OPERATIONAL',0],
  [-91.2,30.5,'GAS','Entergy Louisiana CCGT',800,'USA','Louisiana','OPERATIONAL',0],
  [-92.0,30.1,'GAS','Cajun CCGT LA',600,'USA','Louisiana','VULNERABLE',0.55],
  // Arkansas
  [-93.0,34.8,'NUCLEAR','Arkansas Nuclear One',1800,'USA','Arkansas','OPERATIONAL',0],
  [-93.7,36.5,'HYDRO','Bull Shoals Dam AR',400,'USA','Arkansas','OPERATIONAL',0],
  [-91.4,34.5,'GAS','Lake Catherine AR',700,'USA','Arkansas','OPERATIONAL',0],
  [-95.0,36.5,'WIND','Flat Ridge AR Wind',350,'USA','Arkansas','OPERATIONAL',0],
  // Oklahoma
  [-98.3,36.5,'WIND','Panhandle OK Wind',500,'USA','Oklahoma','OPERATIONAL',0],
  [-96.5,36.8,'WIND','Blue Canyon Wind OK',400,'USA','Oklahoma','OPERATIONAL',0],
  [-97.6,35.5,'GAS','Redbud OK CCGT',700,'USA','Oklahoma','OPERATIONAL',0],
  [-95.8,35.2,'GAS','Grand River Dam OK',600,'USA','Oklahoma','OPERATIONAL',0],

  // ══ USA — GREAT PLAINS / MOUNTAIN ════════════════════════════════════════
  // Kansas
  [-98.5,38.7,'WIND','Gray County Wind KS',500,'USA','Kansas','OPERATIONAL',0],
  [-96.3,39.2,'WIND','Meridian Way Wind KS',400,'USA','Kansas','OPERATIONAL',0],
  [-100.0,37.7,'WIND','High Plains Wind KS',600,'USA','Kansas','OPERATIONAL',0],
  [-97.5,39.0,'GAS','Nearman CCGT KS',600,'USA','Kansas','OPERATIONAL',0],
  [-95.6,37.6,'COAL','Jeffrey Energy KS',2100,'USA','Kansas','OPERATIONAL',0.18],
  // Nebraska
  [-96.7,41.5,'WIND','Ainsworth Wind NE',600,'USA','Nebraska','OPERATIONAL',0],
  [-100.4,41.1,'WIND','Broken Bow Wind NE',400,'USA','Nebraska','OPERATIONAL',0],
  [-96.5,40.8,'NUCLEAR','Cooper Nuclear NE',760,'USA','Nebraska','OPERATIONAL',0],
  [-96.0,41.3,'NUCLEAR','Fort Calhoun Area NE',500,'USA','Nebraska','OPERATIONAL',0],
  [-98.2,40.8,'GAS','Gerald Gentleman NE',1400,'USA','Nebraska','OPERATIONAL',0.12],
  // South Dakota
  [-100.3,44.3,'WIND','Tatanka Wind SD',155,'USA','South Dakota','OPERATIONAL',0],
  [-101.5,45.5,'WIND','Crow Lake Wind SD',400,'USA','South Dakota','OPERATIONAL',0],
  [-98.8,44.4,'HYDRO','Big Bend Dam SD',500,'USA','South Dakota','OPERATIONAL',0],
  [-96.8,43.5,'WIND','Prairie Winds SD',300,'USA','South Dakota','OPERATIONAL',0],
  // North Dakota
  [-100.8,47.2,'COAL','Antelope Valley ND Coal',900,'USA','North Dakota','OPERATIONAL',0.2],
  [-97.5,47.9,'WIND','Sheyenne Wind ND',400,'USA','North Dakota','OPERATIONAL',0],
  [-102.8,46.9,'COAL','Leland Olds ND',200,'USA','North Dakota','DEGRADED',0.5],
  [-101.0,46.5,'WIND','Ashtabula Wind ND',600,'USA','North Dakota','OPERATIONAL',0],
  // Montana
  [-115.8,48.2,'HYDRO','Hungry Horse Dam MT',480,'USA','Montana','OPERATIONAL',0],
  [-111.6,46.9,'HYDRO','Yellowtail Dam MT',600,'USA','Montana','OPERATIONAL',0],
  [-108.7,45.9,'COAL','Colstrip Plant MT',1500,'USA','Montana','DEGRADED',0.45],
  [-105.5,46.0,'WIND','Judith Gap Wind MT',200,'USA','Montana','OPERATIONAL',0],
  // Wyoming
  [-105.0,41.7,'COAL','Dave Johnston WY',760,'USA','Wyoming','OPERATIONAL',0.2],
  [-105.5,43.0,'COAL','Laramie River Station WY',1800,'USA','Wyoming','OPERATIONAL',0.15],
  [-108.0,43.5,'WIND','Foote Creek Rim WY',600,'USA','Wyoming','OPERATIONAL',0],
  [-105.2,41.5,'GAS','Cheyenne Light WY',500,'USA','Wyoming','OPERATIONAL',0],
  [-107.6,42.8,'HYDRO','Fontenelle Dam WY',100,'USA','Wyoming','OPERATIONAL',0],
  // Colorado
  [-104.8,38.8,'GAS','Pueblo Comanche CO',1600,'USA','Colorado','OPERATIONAL',0],
  [-105.1,40.5,'GAS','Fort Collins CCGT CO',800,'USA','Colorado','OPERATIONAL',0],
  [-107.8,38.4,'COAL','Craig Station CO',1500,'USA','Colorado','DEGRADED',0.38],
  [-102.5,40.5,'WIND','Kit Carson Wind CO',500,'USA','Colorado','OPERATIONAL',0],
  [-103.7,38.0,'SOLAR','Pueblo Solar CO',150,'USA','Colorado','OPERATIONAL',0],
  [-104.5,37.4,'SOLAR','San Luis Valley Solar CO',200,'USA','Colorado','OPERATIONAL',0],
  // Utah
  [-111.1,39.0,'COAL','Hunter Station UT',1700,'USA','Utah','OPERATIONAL',0.15],
  [-112.5,38.5,'COAL','Intermountain Power UT',1900,'USA','Utah','OPERATIONAL',0.12],
  [-111.9,40.7,'GAS','Gadsby Power UT',600,'USA','Utah','OPERATIONAL',0],
  [-112.2,40.3,'WIND','Spanish Fork Wind UT',200,'USA','Utah','OPERATIONAL',0],
  [-113.0,37.6,'SOLAR','Escalante Solar UT',150,'USA','Utah','OPERATIONAL',0],

  // ══ USA — SOUTHWEST ═══════════════════════════════════════════════════════
  // New Mexico
  [-107.7,34.3,'GAS','PNM Reeves CCGT NM',600,'USA','New Mexico','OPERATIONAL',0],
  [-106.5,32.3,'SOLAR','Las Cruces Solar NM',150,'USA','New Mexico','OPERATIONAL',0],
  [-104.2,32.5,'SOLAR','SE New Mexico Solar',200,'USA','New Mexico','OPERATIONAL',0],
  [-103.4,33.8,'WIND','Roosevelt County Wind NM',250,'USA','New Mexico','OPERATIONAL',0],
  [-108.5,36.8,'COAL','Four Corners Plant',2200,'USA','New Mexico','DEGRADED',0.55],
  [-106.2,35.8,'WIND','Caprock Wind NM',500,'USA','New Mexico','OPERATIONAL',0],
  // Nevada
  [-117.2,36.8,'SOLAR','Silver State North NV',500,'USA','Nevada','OPERATIONAL',0],
  [-116.8,38.5,'SOLAR','Nevada Solar One',400,'USA','Nevada','OPERATIONAL',0],
  [-115.3,36.4,'GAS','Clark Station NV',1000,'USA','Nevada','OPERATIONAL',0],
  [-115.0,39.6,'GAS','Fort Churchill NV',400,'USA','Nevada','OPERATIONAL',0],
  [-118.3,37.5,'GEOTHERMAL','Rye Patch Geothermal NV',30,'USA','Nevada','OPERATIONAL',0],
  // Arizona
  [-113.0,32.8,'SOLAR','Maricopa Solar AZ',300,'USA','Arizona','OPERATIONAL',0],
  [-111.8,31.6,'SOLAR','Tucson Solar AZ',150,'USA','Arizona','OPERATIONAL',0],
  [-112.5,33.4,'GAS','West Phoenix Plant AZ',1200,'USA','Arizona','OPERATIONAL',0],
  [-110.3,32.3,'GAS','DeCordova AZ CCGT',800,'USA','Arizona','OPERATIONAL',0],
  [-111.5,35.5,'SOLAR','Kingman Solar AZ',200,'USA','Arizona','OPERATIONAL',0],
  // Idaho
  [-115.9,43.6,'HYDRO','Lucky Peak ID',90,'USA','Idaho','OPERATIONAL',0],
  [-116.5,44.8,'HYDRO','Dworshak Dam ID',400,'USA','Idaho','OPERATIONAL',0],
  [-117.0,43.8,'WIND','Magic Wind ID',400,'USA','Idaho','OPERATIONAL',0],
  [-116.2,43.5,'GAS','Langley Gulch ID',300,'USA','Idaho','OPERATIONAL',0],

  // ══ USA — WEST COAST ══════════════════════════════════════════════════════
  // Oregon
  [-121.6,45.6,'HYDRO','John Day Dam OR',2160,'USA','Oregon','OPERATIONAL',0],
  [-119.5,45.7,'HYDRO','McNary Dam OR',980,'USA','Oregon','OPERATIONAL',0],
  [-121.9,43.9,'GAS','Klamath Cogen OR',600,'USA','Oregon','OPERATIONAL',0],
  [-122.6,45.5,'GAS','North Bethany CCGT OR',600,'USA','Oregon','OPERATIONAL',0],
  [-120.7,45.5,'WIND','Stateline Wind OR',300,'USA','Oregon','OPERATIONAL',0],
  [-118.5,45.2,'WIND','Wasco County Wind OR',400,'USA','Oregon','OPERATIONAL',0],
  [-121.0,44.5,'SOLAR','Wheatland Solar OR',200,'USA','Oregon','OPERATIONAL',0],
  // Washington
  [-120.6,46.0,'HYDRO','Priest Rapids Dam WA',960,'USA','Washington','OPERATIONAL',0],
  [-119.4,47.6,'HYDRO','Wells Dam WA',840,'USA','Washington','OPERATIONAL',0],
  [-119.6,46.5,'NUCLEAR','Columbia Generating Station',1100,'USA','Washington','OPERATIONAL',0],
  [-120.8,46.5,'WIND','Vantage Wind WA',600,'USA','Washington','OPERATIONAL',0],
  [-119.7,47.0,'WIND','Ellensburg Wind WA',400,'USA','Washington','OPERATIONAL',0],
  [-122.4,47.8,'GAS','Puget Sound Energy CCGT',500,'USA','Washington','OPERATIONAL',0],
  // California (more)
  [-119.5,35.5,'SOLAR','Fresno Solar CA',400,'USA','California','OPERATIONAL',0],
  [-120.0,37.0,'SOLAR','Central Valley Solar CA',300,'USA','California','OPERATIONAL',0],
  [-117.6,33.5,'SOLAR','San Diego Solar CA',200,'USA','California','OPERATIONAL',0],
  [-121.5,38.5,'GAS','Sacramento CCGT CA',1000,'USA','California','OPERATIONAL',0],
  [-118.6,34.7,'GAS','SoCal CCGT CA',800,'USA','California','OPERATIONAL',0],
  [-122.0,37.5,'GAS','Bay Area CCGT CA',600,'USA','California','OPERATIONAL',0],
  [-120.3,37.9,'HYDRO','New Melones CA',300,'USA','California','OPERATIONAL',0],
  [-121.5,37.8,'WIND','Altamont Pass CA',300,'USA','California','OPERATIONAL',0],
  [-120.9,35.7,'NUCLEAR','Diablo Canyon Nuclear',2212,'USA','California','OPERATIONAL',0],
  [-116.2,33.7,'SOLAR','Coachella Valley Solar',400,'USA','California','OPERATIONAL',0],
  [-122.5,38.0,'GEOTHERMAL','Calpine The Geysers',400,'USA','California','OPERATIONAL',0],
  [-121.6,38.2,'SOLAR','Rancho Seco Solar',150,'USA','California','OPERATIONAL',0],
  // Hawaii
  [-158.0,21.4,'GAS','Oahu CCGT HI',700,'USA','Hawaii','OPERATIONAL',0],
  [-156.9,20.8,'SOLAR','Maui Solar HI',100,'USA','Hawaii','OPERATIONAL',0],
  [-156.3,20.7,'WIND','Kaheawa Wind HI',60,'USA','Hawaii','OPERATIONAL',0],
  [-154.9,19.4,'GEOTHERMAL','Puna Geothermal HI',50,'USA','Hawaii','OPERATIONAL',0],
  // Alaska
  [-150.1,61.2,'GAS','Anchorage CCGT AK',400,'USA','Alaska','OPERATIONAL',0],
  [-135.3,59.5,'HYDRO','Snettisham Hydro AK',200,'USA','Alaska','OPERATIONAL',0],
  [-147.7,64.8,'GAS','Fairbanks CCGT AK',200,'USA','Alaska','OPERATIONAL',0],

  // ══ USA — ADDITIONAL SUBSTATIONS ═════════════════════════════════════════
  [-69.4,44.1,'SUBSTATION','Maine ISO Hub',null,'USA','Maine','OPERATIONAL',0],
  [-71.5,43.2,'SUBSTATION','New England North Hub',null,'USA','New Hampshire','OPERATIONAL',0],
  [-72.6,44.1,'SUBSTATION','Vermont Grid Node',null,'USA','Vermont','OPERATIONAL',0],
  [-71.4,42.0,'SUBSTATION','ISO-NE South Hub',null,'USA','Massachusetts','OPERATIONAL',0],
  [-71.5,41.6,'SUBSTATION','RI Grid Hub',null,'USA','Rhode Island','OPERATIONAL',0],
  [-72.8,41.6,'SUBSTATION','Connecticut Hub',null,'USA','Connecticut','OPERATIONAL',0],
  [-77.2,43.0,'SUBSTATION','Upstate NY Hub',null,'USA','New York','OPERATIONAL',0],
  [-74.8,40.3,'SUBSTATION','PJM NJ Hub',null,'USA','New Jersey','OPERATIONAL',0],
  [-77.0,40.0,'SUBSTATION','PJM PA Hub',null,'USA','Pennsylvania','OPERATIONAL',0],
  [-76.5,39.0,'SUBSTATION','PJM MD Hub',null,'USA','Maryland','OPERATIONAL',0],
  [-78.0,37.5,'SUBSTATION','Dominion VA Hub',null,'USA','Virginia','OPERATIONAL',0],
  [-80.3,35.8,'SUBSTATION','Duke NC Hub',null,'USA','North Carolina','OPERATIONAL',0],
  [-81.2,33.9,'SUBSTATION','SCE&G SC Hub',null,'USA','South Carolina','OPERATIONAL',0],
  [-83.8,32.8,'SUBSTATION','Georgia Power Hub',null,'USA','Georgia','OPERATIONAL',0],
  [-81.5,28.5,'SUBSTATION','FPL Central Hub FL',null,'USA','Florida','VULNERABLE',0.42],
  [-87.0,32.4,'SUBSTATION','Alabama Power Hub',null,'USA','Alabama','OPERATIONAL',0],
  [-89.5,32.5,'SUBSTATION','Entergy MS Hub',null,'USA','Mississippi','OPERATIONAL',0],
  [-86.5,36.0,'SUBSTATION','TVA Central Hub',null,'USA','Tennessee','OPERATIONAL',0],
  [-85.5,37.8,'SUBSTATION','LGE/KU KY Hub',null,'USA','Kentucky','OPERATIONAL',0],
  [-82.9,40.2,'SUBSTATION','AEP Ohio Hub',null,'USA','Ohio','OPERATIONAL',0],
  [-86.5,39.2,'SUBSTATION','NIPSCO IN Hub',null,'USA','Indiana','OPERATIONAL',0],
  [-89.4,41.3,'SUBSTATION','ComEd IL Hub',null,'USA','Illinois','OPERATIONAL',0],
  [-84.0,43.0,'SUBSTATION','Consumers MI Hub',null,'USA','Michigan','OPERATIONAL',0],
  [-88.2,44.5,'SUBSTATION','WPS WI Hub',null,'USA','Wisconsin','OPERATIONAL',0],
  [-94.0,45.0,'SUBSTATION','Xcel MN Hub',null,'USA','Minnesota','OPERATIONAL',0],
  [-93.7,41.8,'SUBSTATION','MidAmerican IA Hub',null,'USA','Iowa','OPERATIONAL',0],
  [-90.8,38.6,'SUBSTATION','Ameren MO Hub',null,'USA','Missouri','OPERATIONAL',0],
  [-92.5,30.5,'SUBSTATION','Entergy LA Hub',null,'USA','Louisiana','VULNERABLE',0.6],
  [-92.5,35.0,'SUBSTATION','Entergy AR Hub',null,'USA','Arkansas','OPERATIONAL',0],
  [-96.5,35.8,'SUBSTATION','OG&E OK Hub',null,'USA','Oklahoma','OPERATIONAL',0],
  [-97.0,38.5,'SUBSTATION','Evergy KS Hub',null,'USA','Kansas','OPERATIONAL',0],
  [-97.5,41.0,'SUBSTATION','NPPD NE Hub',null,'USA','Nebraska','OPERATIONAL',0],
  [-100.0,44.2,'SUBSTATION','Basin SD Hub',null,'USA','South Dakota','OPERATIONAL',0],
  [-100.5,47.0,'SUBSTATION','Basin ND Hub',null,'USA','North Dakota','OPERATIONAL',0],
  [-110.5,46.5,'SUBSTATION','NorthWestern MT Hub',null,'USA','Montana','OPERATIONAL',0],
  [-106.5,43.0,'SUBSTATION','PacifiCorp WY Hub',null,'USA','Wyoming','OPERATIONAL',0],
  [-104.8,39.5,'SUBSTATION','Xcel CO Hub',null,'USA','Colorado','OPERATIONAL',0],
  [-111.4,40.2,'SUBSTATION','PacifiCorp UT Hub',null,'USA','Utah','OPERATIONAL',0],
  [-115.8,36.5,'SUBSTATION','Nevada Power Hub',null,'USA','Nevada','OPERATIONAL',0],
  [-112.4,33.6,'SUBSTATION','APS Phoenix Hub',null,'USA','Arizona','OPERATIONAL',0],
  [-106.5,35.0,'SUBSTATION','PNM NM Hub',null,'USA','New Mexico','OPERATIONAL',0],
  [-116.0,43.5,'SUBSTATION','Idaho Power Hub',null,'USA','Idaho','OPERATIONAL',0],
  [-122.7,45.4,'SUBSTATION','Portland General Hub',null,'USA','Oregon','OPERATIONAL',0],
  [-120.5,47.2,'SUBSTATION','PSE Eastside Hub',null,'USA','Washington','OPERATIONAL',0],
  [-119.2,36.2,'SUBSTATION','PG&E Fresno Hub',null,'USA','California','OPERATIONAL',0],
  [-117.0,34.5,'SUBSTATION','SCE Inland Empire Hub',null,'USA','California','OPERATIONAL',0],

  // ══ CANADA ═══════════════════════════════════════════════════════════════
  // British Columbia
  [-121.9,51.0,'HYDRO','BC Hydro Peace Canyon',700,'Canada','British Columbia','OPERATIONAL',0],
  [-123.4,49.2,'HYDRO','BC Hydro Stave Falls',80,'Canada','British Columbia','OPERATIONAL',0],
  [-125.8,50.2,'HYDRO','BC Hydro John Hart',560,'Canada','British Columbia','OPERATIONAL',0],
  [-124.3,54.0,'HYDRO','Site C Dam BC',1100,'Canada','British Columbia','OPERATIONAL',0],
  [-120.5,51.8,'WIND','Dawson Creek Wind BC',180,'Canada','British Columbia','OPERATIONAL',0],
  [-123.0,49.2,'GAS','Burnaby CCGT BC',600,'Canada','British Columbia','OPERATIONAL',0],
  // Alberta
  [-113.5,53.5,'GAS','Capital Power Edmonton',600,'Canada','Alberta','OPERATIONAL',0],
  [-114.1,51.0,'GAS','Balancing Pool Calgary',800,'Canada','Alberta','OPERATIONAL',0],
  [-112.0,49.7,'WIND','Castle Wind AB',400,'Canada','Alberta','OPERATIONAL',0],
  [-114.5,52.0,'WIND','Blackspring Wind AB',300,'Canada','Alberta','OPERATIONAL',0],
  [-111.5,51.5,'COAL','Keephills AB Coal',800,'Canada','Alberta','DEGRADED',0.45],
  [-113.8,52.7,'COAL','Sheerness AB Coal',800,'Canada','Alberta','DEGRADED',0.4],
  [-112.8,50.0,'SOLAR','Vulcan Solar AB',200,'Canada','Alberta','OPERATIONAL',0],
  // Saskatchewan
  [-106.7,52.1,'COAL','Boundary Dam SK',800,'Canada','Saskatchewan','DEGRADED',0.42],
  [-105.0,50.5,'GAS','Regina CCGT SK',400,'Canada','Saskatchewan','OPERATIONAL',0],
  [-106.5,51.0,'WIND','Cowessess Wind SK',300,'Canada','Saskatchewan','OPERATIONAL',0],
  // Manitoba
  [-97.1,50.1,'HYDRO','Nelson River Bipole MB',2000,'Canada','Manitoba','OPERATIONAL',0],
  [-98.5,54.8,'HYDRO','Kelsey Dam MB',300,'Canada','Manitoba','OPERATIONAL',0],
  [-96.5,49.6,'WIND','St. Leon Wind MB',200,'Canada','Manitoba','OPERATIONAL',0],
  // Ontario
  [-81.5,44.5,'NUCLEAR','Bruce Nuclear ON',6600,'Canada','Ontario','OPERATIONAL',0],
  [-78.8,43.8,'NUCLEAR','Darlington Nuclear ON',3512,'Canada','Ontario','OPERATIONAL',0],
  [-79.1,43.5,'NUCLEAR','Pickering Nuclear ON',3100,'Canada','Ontario','OPERATIONAL',0],
  [-78.5,44.3,'HYDRO','Stoney Lake ON',40,'Canada','Ontario','OPERATIONAL',0],
  [-81.0,42.2,'GAS','Greenfield South CCGT ON',280,'Canada','Ontario','OPERATIONAL',0],
  [-79.5,44.5,'WIND','Prince Wind ON',189,'Canada','Ontario','OPERATIONAL',0],
  [-80.0,43.7,'WIND','Wolfe Island Wind ON',198,'Canada','Ontario','OPERATIONAL',0],
  // Quebec
  [-73.8,53.8,'HYDRO','Robert-Bourassa QC',5616,'Canada','Quebec','OPERATIONAL',0],
  [-76.5,50.6,'HYDRO','Manic-5 QC',2660,'Canada','Quebec','OPERATIONAL',0],
  [-64.5,50.2,'HYDRO','Churchill Falls QC',5428,'Canada','Labrador','OPERATIONAL',0],
  [-71.3,47.5,'WIND','Riviere-du-Loup Wind QC',150,'Canada','Quebec','OPERATIONAL',0],
  [-72.2,46.5,'GAS','Becancour CCGT QC',550,'Canada','Quebec','OPERATIONAL',0],
  // New Brunswick
  [-65.5,47.3,'NUCLEAR','Point Lepreau Nuclear NB',700,'Canada','New Brunswick','OPERATIONAL',0],
  [-65.9,45.3,'GAS','Coleson Cove NB',600,'Canada','New Brunswick','OPERATIONAL',0],
  // Nova Scotia
  [-63.5,45.1,'WIND','White Hill Wind NS',180,'Canada','Nova Scotia','OPERATIONAL',0],
  [-60.1,46.0,'COAL','Lingan NS Coal',620,'Canada','Nova Scotia','DEGRADED',0.5],
  // PEI
  [-63.5,46.3,'WIND','North Cape Wind PEI',99,'Canada','Prince Edward Island','OPERATIONAL',0],
  // Canadian substations
  [-123.1,49.3,'SUBSTATION','BC Transmission Hub',null,'Canada','British Columbia','OPERATIONAL',0],
  [-114.0,51.1,'SUBSTATION','Alberta Grid Hub',null,'Canada','Alberta','OPERATIONAL',0],
  [-106.7,52.0,'SUBSTATION','Sask Power Hub',null,'Canada','Saskatchewan','OPERATIONAL',0],
  [-97.2,50.1,'SUBSTATION','Manitoba Hydro Hub',null,'Canada','Manitoba','OPERATIONAL',0],
  [-79.0,43.6,'SUBSTATION','IESO Ontario Hub',null,'Canada','Ontario','OPERATIONAL',0],
  [-73.5,46.4,'SUBSTATION','Hydro-Quebec Hub',null,'Canada','Quebec','OPERATIONAL',0],

  // ══ MEXICO ═══════════════════════════════════════════════════════════════
  [-110.0,29.1,'GAS','Hermosillo CCGT MX',600,'Mexico','Sonora','OPERATIONAL',0],
  [-109.8,27.0,'SOLAR','Sonora Solar MX',300,'Mexico','Sonora','OPERATIONAL',0],
  [-116.6,31.9,'GEOTHERMAL','Cerro Prieto Geothermal MX',720,'Mexico','Baja California','OPERATIONAL',0],
  [-115.5,32.5,'SOLAR','Mexicali Solar MX',150,'Mexico','Baja California','OPERATIONAL',0],
  [-106.1,28.6,'GAS','Chihuahua CCGT MX',500,'Mexico','Chihuahua','OPERATIONAL',0],
  [-104.5,29.5,'WIND','Chihuahua Wind MX',200,'Mexico','Chihuahua','OPERATIONAL',0],
  [-97.5,25.9,'WIND','Tamaulipas Wind MX',400,'Mexico','Tamaulipas','OPERATIONAL',0],
  [-97.0,26.5,'GAS','Altamira CCGT MX',1400,'Mexico','Tamaulipas','OPERATIONAL',0],
  [-96.1,19.2,'GAS','Tuxpan CCGT MX',1500,'Mexico','Veracruz','OPERATIONAL',0],
  [-103.4,20.7,'HYDRO','El Cajón Dam MX',750,'Mexico','Nayarit','OPERATIONAL',0],
  [-103.8,19.4,'HYDRO','Aguamilpa Dam MX',960,'Mexico','Jalisco','OPERATIONAL',0],
  [-99.0,17.6,'HYDRO','La Villita Dam MX',300,'Mexico','Guerrero','OPERATIONAL',0],
  [-96.5,16.9,'WIND','La Venta Wind Oaxaca',800,'Mexico','Oaxaca','OPERATIONAL',0],
  [-95.9,17.1,'GEOTHERMAL','Los Humeros Geothermal MX',100,'Mexico','Puebla','OPERATIONAL',0],
  [-105.3,20.7,'GAS','Manzanillo CCGT MX',600,'Mexico','Colima','OPERATIONAL',0],
  [-86.8,21.2,'GAS','Yucatan CCGT MX',500,'Mexico','Yucatan','OPERATIONAL',0],
  [-100.6,25.5,'NUCLEAR','Laguna Verde Nuclear MX',1610,'Mexico','Veracruz','OPERATIONAL',0],
  [-99.4,23.5,'SOLAR','Tamaulipas Solar MX',200,'Mexico','Tamaulipas','OPERATIONAL',0],
  [-98.2,19.4,'GAS','Valle de Mexico CCGT',1000,'Mexico','Mexico State','OPERATIONAL',0],
  // Mexico substations
  [-99.1,19.4,'SUBSTATION','CFE Metro Hub MX',null,'Mexico','Mexico State','OPERATIONAL',0],
  [-103.7,19.2,'SUBSTATION','CFE Occidente Hub MX',null,'Mexico','Jalisco','OPERATIONAL',0],
  [-97.6,22.2,'SUBSTATION','CFE Norte Hub MX',null,'Mexico','Tamaulipas','OPERATIONAL',0],
]

function makeFeature([lng, lat, tech, name, mw, country, region, status, riskScore]) {
  const assetType = tech === 'SUBSTATION' ? 'SUBSTATION' : 'POWER_PLANT'
  const riskLevel = riskScore >= 0.6 ? 'HIGH' : riskScore >= 0.3 ? 'MEDIUM' : riskScore > 0 ? 'LOW' : 'NONE'
  return {
    type: 'Feature',
    properties: {
      asset_id: `${tech.slice(0,3)}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
      name,
      asset_type: assetType,
      technology: assetType === 'SUBSTATION' ? null : tech,
      status,
      risk_level: riskLevel,
      risk_score: riskScore,
      capacity_mw: mw,
      country,
      region,
    },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  }
}

export const EXTENDED_INFRASTRUCTURE = {
  type: 'FeatureCollection',
  features: RAW.map(makeFeature),
}
