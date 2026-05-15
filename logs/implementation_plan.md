# Project ODIN: Implementation Plan
## Autonomous Planetary Infrastructure Intelligence Platform

ODIN transforms geospatial infrastructure visualization into a fully agentic decision-making system. Built on a multi-agent backbone, it observes, reasons, predicts, simulates, coordinates, and autonomously responds to real-world infrastructure, climate, energy, and industrial risks.

---

## User Review Required

> [!IMPORTANT]
> This plan covers a large, multi-service project. Please review the **Open Questions** section below before I begin execution. Key decisions around API keys, database hosting, and scope will significantly affect the build strategy.

> [!WARNING]
> The full stack (PostGIS, Neo4j, Redis, FastAPI, React, React Native) requires Docker or local service installation. I will generate a `docker-compose.yml` that spins up all services locally. Please confirm this is acceptable.

---

## Open Questions

> [!IMPORTANT]
> **Q1 — API Keys:** Do you have any of the following? I can build with mock/synthetic data fallbacks if not:
> - **Mapbox** (map tiles — free tier available)
> - **OpenWeatherMap** (wind/climate data)
> - **NOAA API** (weather alerts)
> - **Google Maps Platform** (optional fallback)
>
> **Q2 — Mobile App:** Do you want React Native (JavaScript, shares code with web) or Flutter (Dart, better native performance)? Defaulting to **React Native** unless told otherwise.
>
> **Q3 — OpenGridWorks:** This is a Python library for grid topology modeling, not a hosted API. I will integrate its grid data structures (substations, lines, buses) as static seed data + mock real-time overlays. Is this acceptable?
>
> **Q4 — LLM Backend for Agents:** The agents need an LLM. Options:
> - **Google Gemini API** (recommended — aligns with Antigravity/hackathon judges)
> - **OpenAI GPT-4o**
> - **Local Ollama** (offline, slower)
>
> **Q5 — Deployment Target:** Local development only, or should I also configure for cloud deployment (e.g., Google Cloud Run)?

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ODIN Platform                            │
├──────────────┬──────────────────────────────┬───────────────────┤
│  Web Dashboard│     FastAPI Gateway          │  Mobile App       │
│  React +      │  (API Gateway / Orchestrator)│  React Native     │
│  Mapbox GL   │                              │  Field Operators  │
│  Deck.gl     ├──────────────┬───────────────┤                   │
│  Three.js    │  Agent       │  Mock APIs    │                   │
│              │  Orchestrator│  Dispatch     │                   │
│              │  (LangGraph) │  Reroute      │                   │
│              │              │  Ticketing    │                   │
│              ├──────────────┴───────────────┤                   │
│              │        Data Layer            │                   │
│              │  PostGIS | Neo4j | Redis      │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
                              │
                    External Data Sources
              NOAA | OpenWeather | OpenGridWorks
              Synthetic: Mineral Maps, News Feeds
```

---

## Proposed Changes

### Phase 1 — Project Scaffold & Directory Structure

#### [NEW] Project Root
```
ODIN/
├── backend/
│   ├── gateway/          # FastAPI API Gateway
│   ├── agents/           # LangGraph agent definitions
│   │   ├── climate_agent.py
│   │   ├── wind_agent.py
│   │   ├── resource_agent.py
│   │   ├── cascade_agent.py
│   │   ├── decision_agent.py
│   │   ├── dispatch_agent.py
│   │   └── reflection_agent.py
│   ├── mock_apis/        # Simulated external APIs
│   │   ├── dispatch_api.py
│   │   ├── grid_reroute_api.py
│   │   └── crm_tickets_api.py
│   ├── db/
│   │   ├── schemas/
│   │   │   ├── postgis_schema.sql
│   │   │   └── neo4j_schema.cypher
│   │   ├── seed_data/    # Synthetic infrastructure data
│   │   └── connections.py
│   ├── shared/
│   │   ├── models.py     # Pydantic models
│   │   └── logger.py     # Structured agent trace logger
│   └── requirements.txt
├── frontend/             # React web dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/      # Mapbox + Deck.gl layers
│   │   │   ├── AgentPanel/  # Live agent reasoning display
│   │   │   ├── BeforeAfter/ # State comparison UI
│   │   │   ├── NLQuery/  # Natural language query bar
│   │   │   └── IncidentFeed/
│   │   ├── pages/
│   │   └── hooks/
│   └── package.json
├── mobile/               # React Native field operator app
├── logs/                 # Structured Antigravity agent traces
│   └── .gitkeep
├── docker-compose.yml
└── README.md
```

---

### Phase 2 — Backend: Database Schemas

#### [NEW] postgis_schema.sql
- Tables: `infrastructure_assets`, `transmission_lines`, `substations`, `power_plants`, `wind_turbines`
- Geometry columns with SRID 4326 (WGS84)
- Risk score columns, operational status, last_updated timestamps

#### [NEW] neo4j_schema.cypher
- Node types: `(:Asset)`, `(:Region)`, `(:Dependency)`, `(:SupplyChain)`
- Relationships: `[:POWERS]`, `[:DEPENDS_ON]`, `[:SUPPLIES]`, `[:VULNERABLE_TO]`
- Used by the Cascading Failure Agent to propagate failure through the dependency graph

---

### Phase 3 — Backend: Shared Models & Logger

#### [NEW] shared/models.py
Pydantic models for:
- `InfrastructureAsset`, `Incident`, `AgentWorkplan`
- `ActionRecord`, `BeforeAfterState`, `DispatchTicket`
- `AgentTrace` (the core structured log object)

#### [NEW] shared/logger.py
- `ODINLogger` class writing structured JSON to `/logs/`
- Captures: workplan, observations, reasoning steps, tool calls, confidence scores, error recovery, final outcomes
- One log file per incident/workflow run, named `{timestamp}_{incident_id}.json`

---

### Phase 4 — Backend: Agents (LangGraph)

#### [NEW] agents/climate_agent.py
- Ingests unstructured weather alerts / news text
- Queries PostGIS for assets within storm polygon
- Outputs: vulnerability list + economic impact estimate

#### [NEW] agents/wind_agent.py
- Fetches wind vector data (OpenWeather or synthetic fallback)
- Calculates turbine efficiency per location
- Outputs: GeoJSON wind particle data for Deck.gl rendering

#### [NEW] agents/resource_agent.py
- Queries mineral distribution dataset (synthetic: lithium, cobalt, copper)
- Cross-references Neo4j supply chain graph
- Outputs: geopolitical risk scores per mineral corridor

#### [NEW] agents/cascade_agent.py
- Uses Neo4j graph traversal to propagate failure from an initial asset
- Returns: ordered list of at-risk downstream assets + estimated failure times

#### [NEW] agents/decision_agent.py
- Receives outputs from Climate + Cascade agents
- Scores interventions by: economic loss × human impact / resource cost
- Returns: ranked action list with confidence scores

#### [NEW] agents/dispatch_agent.py
- Takes ranked actions from Decision Agent
- Calls Mock Dispatch API (`POST /mock/dispatch`)
- Calls Mock Grid Reroute API (`PATCH /mock/grid/reroute`)
- Returns: ticket IDs + before/after grid state

#### [NEW] agents/reflection_agent.py
- Monitors all agent outputs for: missing data, contradictions, API timeouts
- **Forced Failure Scenario:** Weather API timeout → fallback to cached synthetic data + logs degraded mode warning
- Returns: confidence-adjusted outputs + fallback flags

---

### Phase 5 — Backend: Mock APIs

#### [NEW] mock_apis/dispatch_api.py
`POST /mock/dispatch` — Creates a synthetic maintenance ticket
`GET /mock/dispatch/{ticket_id}` — Returns ticket status

#### [NEW] mock_apis/grid_reroute_api.py
`PATCH /mock/grid/reroute` — Changes grid segment status from `VULNERABLE` → `REROUTED`
`GET /mock/grid/status/{asset_id}` — Returns current/previous state

#### [NEW] mock_apis/crm_tickets_api.py
`POST /mock/crm/ticket` — Logs incident in mock CRM with before/after fields

---

### Phase 6 — Backend: API Gateway

#### [NEW] gateway/main.py
FastAPI app with routes:
- `POST /api/ingest` — Accepts unstructured text, triggers full agent pipeline
- `GET /api/grid/state` — Current infrastructure state from PostGIS
- `GET /api/agents/trace/{run_id}` — Returns full structured log for a run
- `POST /api/query/nl` — Natural language geospatial query
- `GET /api/wind/vectors` — Wind particle data for map
- `GET /api/minerals/overlay` — Mineral distribution GeoJSON
- WebSocket `/ws/incidents` — Real-time incident stream to frontend

---

### Phase 7 — Frontend: React Web Dashboard

#### [NEW] frontend/src/
Key components:
- **`<MapView />`** — Mapbox GL base map with Deck.gl overlay layers:
  - `WindParticleLayer` (animated vectors, Three.js or Deck.gl TripsLayer)
  - `ClimateHeatmapLayer` (hexbin overlay)
  - `InfrastructureLayer` (substations, lines, power plants)
  - `MineralOverlayLayer`
  - `IncidentAlertLayer` (pulsing markers on at-risk assets)
- **`<NLQueryBar />`** — Chat-style input, sends to `/api/query/nl`, renders results on map
- **`<AgentReasoningPanel />`** — Live trace viewer showing agent steps, confidence scores
- **`<BeforeAfterPanel />`** — Side-by-side grid state comparison (Vulnerable → Rerouted)
- **`<IncidentFeed />`** — Real-time log of processed incidents
- **`<DispatchTicketModal />`** — Shows generated maintenance tickets

Design system: dark glassmorphism theme, electric blue/cyan/amber accent palette, Inter font.

---

### Phase 8 — Mobile App: React Native

#### [NEW] mobile/
- Incident feed with push alerts (local notifications)
- Conversational AI interface (POST to `/api/query/nl`)
- Offline caching (AsyncStorage for last-known grid state)
- Field operator: view dispatch tickets, mark complete
- Lightweight map view (react-native-maps)

---

### Phase 9 — Mandatory Hackathon Logging

#### [NEW] logs/ directory
Every agent workflow run writes a file: `logs/{timestamp}_{incident_id}.json`

```json
{
  "run_id": "uuid",
  "timestamp": "ISO-8601",
  "trigger": "unstructured_text | nl_query | scheduled",
  "workplan": { "goal": "...", "steps": [...] },
  "observations": [...],
  "reasoning_steps": [
    { "agent": "ClimateAgent", "step": "...", "confidence": 0.87 }
  ],
  "decision_flow": { "options": [...], "chosen": "...", "rationale": "..." },
  "tool_calls": [
    { "tool": "POST /mock/dispatch", "payload": {...}, "response": {...} }
  ],
  "error_recovery": { "triggered": true, "reason": "API timeout", "fallback": "cached_data" },
  "before_state": { "asset_id": "TX-44", "status": "VULNERABLE" },
  "after_state": { "asset_id": "TX-44", "status": "REROUTED" },
  "outcome": { "success": true, "ticket_id": "DISP-0042", "confidence": 0.91 }
}
```

---

### Phase 10 — Docker Compose & README

#### [NEW] docker-compose.yml
Services: `postgres+postgis`, `neo4j`, `redis`, `backend`, `frontend`

#### [NEW] README.md
- Architecture overview + diagrams
- How Antigravity orchestrated the build
- API docs + OpenGridWorks integration approach
- Dataset labeling (synthetic vs. real)
- Cost/scalability estimates
- Privacy considerations + limitations
- Baseline comparison: ODIN vs. static heuristic system

---

## Verification Plan

### Automated Tests
- `pytest backend/` — Unit tests for agents, mock APIs, logger
- `npm test` in `frontend/` — Component tests for BeforeAfterPanel, AgentReasoningPanel
- End-to-end: POST to `/api/ingest` with sample weather alert text → verify full log written to `/logs/`

### Manual Verification (Browser)
- Open web dashboard → confirm map loads with infrastructure layer
- Submit NL query → confirm results rendered on map
- Trigger forced weather API failure → confirm Reflection Agent log shows fallback
- Verify Before/After panel updates after dispatch action

### Forced Failure Demo
- Disable OpenWeather endpoint in config → agent retries once → falls back to synthetic cache → logs `degraded_mode: true`

---

## Execution Order (Steps)

| # | Step | Key Output |
|---|------|-----------|
| 1 | Scaffold directories + install deps | Folder structure, `requirements.txt`, `package.json` |
| 2 | Shared models + logger | `models.py`, `logger.py` |
| 3 | DB schemas + seed data | `.sql`, `.cypher`, synthetic GeoJSON |
| 4 | Mock APIs | 3 mock API modules |
| 5 | Agent implementations (LangGraph) | 7 agent files |
| 6 | FastAPI gateway | `gateway/main.py` |
| 7 | Frontend scaffold + map | React app with Mapbox + Deck.gl |
| 8 | Frontend agent panels + NL query | Reasoning panel, Before/After, query bar |
| 9 | Mobile app (React Native) | Expo-based app |
| 10 | Docker compose | `docker-compose.yml` |
| 11 | README + baseline comparison | `README.md` |
| 12 | Integration test + log demo | Sample log in `/logs/` |
