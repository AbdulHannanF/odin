// ═══════════════════════════════════════════════════════════════════
// ODIN Neo4j Schema — Infrastructure Dependency Graph
// Run via: neo4j-shell or APOC import
// Models cascading failure relationships between assets
// ═══════════════════════════════════════════════════════════════════

// ── Constraints & Indexes ──────────────────────────────────────────

CREATE CONSTRAINT asset_id_unique IF NOT EXISTS
FOR (a:Asset) REQUIRE a.asset_id IS UNIQUE;

CREATE CONSTRAINT region_name_unique IF NOT EXISTS
FOR (r:Region) REQUIRE r.name IS UNIQUE;

CREATE CONSTRAINT supply_chain_id_unique IF NOT EXISTS
FOR (s:SupplyChain) REQUIRE s.supply_id IS UNIQUE;

CREATE INDEX asset_type_index IF NOT EXISTS FOR (a:Asset) ON (a.asset_type);
CREATE INDEX asset_status_index IF NOT EXISTS FOR (a:Asset) ON (a.status);
CREATE INDEX asset_risk_index IF NOT EXISTS FOR (a:Asset) ON (a.risk_level);
CREATE INDEX region_country_index IF NOT EXISTS FOR (r:Region) ON (r.country);

// ── Node Type: Asset ─────────────────────────────────────────────
// Core infrastructure node

// Properties:
//   asset_id       : STRING (PK, matches PostGIS asset_id)
//   name           : STRING
//   asset_type     : STRING (SUBSTATION, DATACENTER, HOSPITAL, etc.)
//   status         : STRING (OPERATIONAL, VULNERABLE, etc.)
//   risk_level     : STRING (CRITICAL, HIGH, MEDIUM, LOW, NONE)
//   risk_score     : FLOAT  [0.0, 1.0]
//   lat            : FLOAT
//   lon            : FLOAT
//   capacity_mw    : FLOAT
//   country        : STRING
//   criticality    : FLOAT  — how important is this asset to the graph

// Example seed:
MERGE (s1:Asset {asset_id: "SUBST-001"})
SET s1.name = "Northeast Grid Hub Alpha",
    s1.asset_type = "SUBSTATION",
    s1.status = "OPERATIONAL",
    s1.risk_level = "NONE",
    s1.risk_score = 0.0,
    s1.lat = 40.712776,
    s1.lon = -74.005974,
    s1.capacity_mw = 500.0,
    s1.country = "USA",
    s1.criticality = 0.95;

MERGE (pp1:Asset {asset_id: "PLANT-001"})
SET pp1.name = "Coastal Power Plant Bravo",
    pp1.asset_type = "POWER_PLANT",
    pp1.status = "OPERATIONAL",
    pp1.risk_level = "NONE",
    pp1.risk_score = 0.0,
    pp1.lat = 40.650002,
    pp1.lon = -73.949997,
    pp1.capacity_mw = 800.0,
    pp1.country = "USA",
    pp1.criticality = 0.90;

MERGE (dc1:Asset {asset_id: "DC-001"})
SET dc1.name = "Atlantic Datacenter Delta",
    dc1.asset_type = "DATACENTER",
    dc1.status = "OPERATIONAL",
    dc1.risk_level = "NONE",
    dc1.risk_score = 0.0,
    dc1.lat = 40.730610,
    dc1.lon = -73.935242,
    dc1.capacity_mw = 0.0,
    dc1.country = "USA",
    dc1.criticality = 0.88;

MERGE (h1:Asset {asset_id: "HOSP-001"})
SET h1.name = "Metro General Hospital",
    h1.asset_type = "HOSPITAL",
    h1.status = "OPERATIONAL",
    h1.risk_level = "NONE",
    h1.risk_score = 0.0,
    h1.lat = 40.740000,
    h1.lon = -74.000000,
    h1.country = "USA",
    h1.criticality = 0.99;

MERGE (tc1:Asset {asset_id: "TCOM-001"})
SET tc1.name = "Northeast Telecom Hub",
    tc1.asset_type = "TELECOM_TOWER",
    tc1.status = "OPERATIONAL",
    tc1.risk_level = "NONE",
    tc1.risk_score = 0.0,
    tc1.lat = 40.720000,
    tc1.lon = -73.980000,
    tc1.country = "USA",
    tc1.criticality = 0.80;

MERGE (wt1:Asset {asset_id: "WATR-001"})
SET wt1.name = "Harbor Water Treatment Plant",
    wt1.asset_type = "WATER_TREATMENT",
    wt1.status = "OPERATIONAL",
    wt1.risk_level = "NONE",
    wt1.risk_score = 0.0,
    wt1.lat = 40.670000,
    wt1.lon = -74.030000,
    wt1.country = "USA",
    wt1.criticality = 0.92;

// ── Node Type: Region ─────────────────────────────────────────────
MERGE (r1:Region {name: "Northeast USA"})
SET r1.country = "USA",
    r1.population = 55000000,
    r1.gdp_billion_usd = 2100.0;

MERGE (r2:Region {name: "Southeast USA"})
SET r2.country = "USA",
    r2.population = 38000000,
    r2.gdp_billion_usd = 1400.0;

// ── Node Type: SupplyChain ────────────────────────────────────────
MERGE (sc1:SupplyChain {supply_id: "SC-LITHIUM-AU"})
SET sc1.mineral = "lithium",
    sc1.country_origin = "Australia",
    sc1.annual_supply_mt = 55000,
    sc1.geopolitical_risk = "LOW",
    sc1.criticality = 0.85;

MERGE (sc2:SupplyChain {supply_id: "SC-COBALT-CD"})
SET sc2.mineral = "cobalt",
    sc2.country_origin = "DRC",
    sc2.annual_supply_mt = 70000,
    sc2.geopolitical_risk = "CRITICAL",
    sc2.criticality = 0.95;

MERGE (sc3:SupplyChain {supply_id: "SC-COPPER-CL"})
SET sc3.mineral = "copper",
    sc3.country_origin = "Chile",
    sc3.annual_supply_mt = 5600000,
    sc3.geopolitical_risk = "MEDIUM",
    sc3.criticality = 0.78;

// ── Relationships ─────────────────────────────────────────────────

// Power plant supplies substation
MERGE (pp1)-[:POWERS {
    transmission_line_id: "TL-001",
    capacity_mw: 500.0,
    voltage_kv: 345.0,
    failure_probability: 0.05
}]->(s1);

// Substation powers datacenter
MERGE (s1)-[:POWERS {
    transmission_line_id: "TL-002",
    capacity_mw: 200.0,
    voltage_kv: 138.0,
    failure_probability: 0.08
}]->(dc1);

// Substation powers hospital
MERGE (s1)-[:POWERS {
    transmission_line_id: "TL-003",
    capacity_mw: 50.0,
    voltage_kv: 69.0,
    failure_probability: 0.03
}]->(h1);

// Substation powers telecom
MERGE (s1)-[:POWERS {
    transmission_line_id: "TL-004",
    capacity_mw: 30.0,
    voltage_kv: 33.0,
    failure_probability: 0.06
}]->(tc1);

// Substation powers water treatment
MERGE (s1)-[:POWERS {
    transmission_line_id: "TL-005",
    capacity_mw: 80.0,
    voltage_kv: 69.0,
    failure_probability: 0.04
}]->(wt1);

// Datacenter depends on telecom for management network
MERGE (dc1)-[:DEPENDS_ON {
    dependency_type: "NETWORK",
    criticality: 0.75,
    impact_on_failure: "PARTIAL_OUTAGE"
}]->(tc1);

// Hospital depends on water treatment
MERGE (h1)-[:DEPENDS_ON {
    dependency_type: "WATER_SUPPLY",
    criticality: 0.90,
    impact_on_failure: "CRITICAL_OPERATIONS_AT_RISK"
}]->(wt1);

// Assets in regions
MERGE (s1)-[:LOCATED_IN]->(r1);
MERGE (pp1)-[:LOCATED_IN]->(r1);
MERGE (dc1)-[:LOCATED_IN]->(r1);
MERGE (h1)-[:LOCATED_IN]->(r1);
MERGE (tc1)-[:LOCATED_IN]->(r1);
MERGE (wt1)-[:LOCATED_IN]->(r1);

// Supply chain vulnerability
MERGE (dc1)-[:REQUIRES_MINERAL {
    quantity_mt_annual: 500,
    use_case: "SERVER_HARDWARE"
}]->(sc1);

MERGE (r1)-[:HAS_SUPPLY_CHAIN]->(sc2);
MERGE (r1)-[:HAS_SUPPLY_CHAIN]->(sc3);

// ── Cascading Failure Query Template ─────────────────────────────
// To find all assets that would fail if SUBST-001 fails:
//
// MATCH (root:Asset {asset_id: "SUBST-001"})
// MATCH p = (root)-[:POWERS|DEPENDS_ON*1..5]->(downstream:Asset)
// RETURN downstream.asset_id, downstream.name,
//        downstream.criticality, length(p) AS hops
// ORDER BY downstream.criticality DESC, hops ASC
