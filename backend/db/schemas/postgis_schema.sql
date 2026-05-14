-- ═══════════════════════════════════════════════════════════════════
-- ODIN PostGIS Schema
-- Infrastructure assets with geospatial indexing (SRID 4326 / WGS84)
-- ═══════════════════════════════════════════════════════════════════

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enumerations ─────────────────────────────────────────────────

CREATE TYPE asset_status AS ENUM (
    'OPERATIONAL', 'VULNERABLE', 'DEGRADED',
    'OFFLINE', 'REROUTED', 'UNDER_MAINTENANCE'
);

CREATE TYPE asset_type AS ENUM (
    'SUBSTATION', 'TRANSMISSION_LINE', 'POWER_PLANT', 'WIND_TURBINE',
    'DATACENTER', 'HOSPITAL', 'TELECOM_TOWER', 'WATER_TREATMENT', 'MINERAL_SITE'
);

CREATE TYPE risk_level AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE');

-- ── Infrastructure Assets ─────────────────────────────────────────

CREATE TABLE infrastructure_assets (
    asset_id        VARCHAR(64) PRIMARY KEY DEFAULT ('ASSET-' || upper(substring(gen_random_uuid()::text, 1, 8))),
    name            VARCHAR(255) NOT NULL,
    asset_type      asset_type NOT NULL,
    location        GEOMETRY(Point, 4326) NOT NULL,
    status          asset_status DEFAULT 'OPERATIONAL',
    risk_level      risk_level DEFAULT 'NONE',
    risk_score      FLOAT DEFAULT 0.0 CHECK (risk_score BETWEEN 0.0 AND 1.0),
    capacity_mw     FLOAT,
    voltage_kv      FLOAT,
    country         VARCHAR(100),
    region          VARCHAR(100),
    operator        VARCHAR(255),
    year_built      INTEGER,
    metadata        JSONB DEFAULT '{}',
    dependencies    TEXT[] DEFAULT '{}',   -- Array of asset_ids
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_updated    TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index on location
CREATE INDEX idx_assets_location ON infrastructure_assets USING GIST(location);
CREATE INDEX idx_assets_type ON infrastructure_assets(asset_type);
CREATE INDEX idx_assets_status ON infrastructure_assets(status);
CREATE INDEX idx_assets_risk ON infrastructure_assets(risk_level);

-- ── Transmission Lines ─────────────────────────────────────────────

CREATE TABLE transmission_lines (
    line_id         VARCHAR(64) PRIMARY KEY DEFAULT ('TL-' || upper(substring(gen_random_uuid()::text, 1, 6))),
    name            VARCHAR(255) NOT NULL,
    from_asset_id   VARCHAR(64) REFERENCES infrastructure_assets(asset_id),
    to_asset_id     VARCHAR(64) REFERENCES infrastructure_assets(asset_id),
    route           GEOMETRY(LineString, 4326),
    voltage_kv      FLOAT NOT NULL,
    length_km       FLOAT,
    capacity_mw     FLOAT,
    status          asset_status DEFAULT 'OPERATIONAL',
    risk_score      FLOAT DEFAULT 0.0 CHECK (risk_score BETWEEN 0.0 AND 1.0),
    risk_level      risk_level DEFAULT 'NONE',
    country         VARCHAR(100),
    operator        VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_updated    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lines_route ON transmission_lines USING GIST(route);
CREATE INDEX idx_lines_status ON transmission_lines(status);
CREATE INDEX idx_lines_from ON transmission_lines(from_asset_id);
CREATE INDEX idx_lines_to ON transmission_lines(to_asset_id);

-- ── Wind Resources ────────────────────────────────────────────────

CREATE TABLE wind_resources (
    resource_id     SERIAL PRIMARY KEY,
    location        GEOMETRY(Point, 4326) NOT NULL,
    mean_wind_speed FLOAT,      -- m/s at hub height
    wind_power_density FLOAT,   -- W/m²
    capacity_factor FLOAT,
    elevation_m     FLOAT,
    offshore        BOOLEAN DEFAULT FALSE,
    suitability_score FLOAT DEFAULT 0.0 CHECK (suitability_score BETWEEN 0.0 AND 1.0),
    data_source     VARCHAR(100) DEFAULT 'synthetic',
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wind_location ON wind_resources USING GIST(location);

-- ── Wind Vectors (time-series) ─────────────────────────────────────

CREATE TABLE wind_vectors (
    vector_id       SERIAL PRIMARY KEY,
    location        GEOMETRY(Point, 4326) NOT NULL,
    u_component     FLOAT NOT NULL,   -- East-West m/s
    v_component     FLOAT NOT NULL,   -- North-South m/s
    speed_ms        FLOAT NOT NULL,
    direction_deg   FLOAT NOT NULL,
    altitude_m      FLOAT DEFAULT 100.0,
    timestamp       TIMESTAMPTZ DEFAULT NOW(),
    data_source     VARCHAR(100) DEFAULT 'synthetic'
);

CREATE INDEX idx_wind_vectors_location ON wind_vectors USING GIST(location);
CREATE INDEX idx_wind_vectors_time ON wind_vectors(timestamp);

-- ── Mineral Sites ─────────────────────────────────────────────────

CREATE TABLE mineral_sites (
    mineral_id      VARCHAR(64) PRIMARY KEY DEFAULT ('MIN-' || upper(substring(gen_random_uuid()::text, 1, 6))),
    mineral_type    VARCHAR(50) NOT NULL,   -- lithium, cobalt, copper, etc.
    location        GEOMETRY(Point, 4326) NOT NULL,
    area_km2        GEOMETRY(Polygon, 4326),
    estimated_reserves_mt FLOAT,
    country         VARCHAR(100) NOT NULL,
    region          VARCHAR(100),
    geopolitical_risk risk_level DEFAULT 'LOW',
    supply_chain_criticality FLOAT DEFAULT 0.0,
    active          BOOLEAN DEFAULT TRUE,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mineral_location ON mineral_sites USING GIST(location);
CREATE INDEX idx_mineral_type ON mineral_sites(mineral_type);
CREATE INDEX idx_mineral_country ON mineral_sites(country);

-- ── Incidents ─────────────────────────────────────────────────────

CREATE TABLE incidents (
    incident_id     VARCHAR(64) PRIMARY KEY,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    severity        risk_level NOT NULL,
    raw_text        TEXT,
    source          VARCHAR(100) DEFAULT 'unstructured_input',
    affected_region GEOMETRY(Polygon, 4326),
    affected_assets TEXT[] DEFAULT '{}',
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    run_id          VARCHAR(64),    -- Links to agent trace
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_region ON incidents USING GIST(affected_region);
CREATE INDEX idx_incidents_resolved ON incidents(resolved);

-- ── Dispatch Tickets ───────────────────────────────────────────────

CREATE TABLE dispatch_tickets (
    ticket_id       VARCHAR(64) PRIMARY KEY,
    incident_id     VARCHAR(64) REFERENCES incidents(incident_id),
    asset_id        VARCHAR(64),
    action_type     VARCHAR(100) NOT NULL,
    priority        risk_level NOT NULL,
    assigned_team   VARCHAR(255),
    location        GEOMETRY(Point, 4326),
    instructions    TEXT,
    status          VARCHAR(50) DEFAULT 'PENDING',
    notes           TEXT,
    run_id          VARCHAR(64),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_tickets_incident ON dispatch_tickets(incident_id);
CREATE INDEX idx_tickets_status ON dispatch_tickets(status);
CREATE INDEX idx_tickets_asset ON dispatch_tickets(asset_id);

-- ── Agent Traces (summary index) ─────────────────────────────────

CREATE TABLE agent_trace_index (
    run_id          VARCHAR(64) PRIMARY KEY,
    trigger_type    VARCHAR(50),
    incident_id     VARCHAR(64),
    success         BOOLEAN,
    overall_confidence FLOAT,
    duration_ms     INTEGER,
    log_file_path   VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Trigger: auto-update last_updated ────────────────────────────

CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assets_updated
    BEFORE UPDATE ON infrastructure_assets
    FOR EACH ROW EXECUTE FUNCTION update_last_updated();

CREATE TRIGGER trg_lines_updated
    BEFORE UPDATE ON transmission_lines
    FOR EACH ROW EXECUTE FUNCTION update_last_updated();
