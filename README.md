# ODIN — Autonomous Planetary Infrastructure Intelligence Platform

> *"Observe. Decide. Intervene. Now."*

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

ODIN transforms geospatial infrastructure visualization into a **fully agentic decision-making system** capable of observing, reasoning, predicting, simulating, coordinating, and autonomously responding to real-world infrastructure, climate, energy, and industrial risks.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How Google Antigravity Was Used](#how-google-antigravity-was-used)
3. [Agent Roster](#agent-roster)
4. [The Action Loop](#the-action-loop)
5. [Technology Stack](#technology-stack)
6. [APIs & Data Sources](#apis--data-sources)
7. [Mandatory Hackathon Logging](#mandatory-hackathon-logging)
8. [Robustness: Forced Failure Scenario](#robustness-forced-failure-scenario)
9. [Baseline Comparison](#baseline-comparison)
10. [Dataset Labeling](#dataset-labeling)
11. [Cost & Scalability](#cost--scalability)
12. [Privacy & Limitations](#privacy--limitations)
13. [Quick Start](#quick-start)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ODIN Platform                                  │
├─────────────────┬────────────────────────────────────┬──────────────────┤
│  Web Dashboard  │       FastAPI Gateway               │   Mobile App     │
│  React 18 +     │   (Orchestration Hub)               │ React Native +   │
│  Mapbox GL +    ├────────────────┬───────────────────┤ Expo             │
│  Deck.gl        │  Agent System  │   Mock APIs       │                  │
│  Three.js       │  (LangGraph)   │  /mock/dispatch   │                  │
│                 │                │  /mock/grid/...   │                  │
│                 ├────────────────┴───────────────────┤                  │
│                 │           Data Layer                │                  │
│                 │  PostGIS (Geospatial) · Neo4j       │                  │
│                 │  (Dependency Graph) · Redis         │                  │
└─────────────────┴────────────────────────────────────┴──────────────────┘
                                   │
                       External Data Sources
               NOAA API · OpenWeatherMap · OpenGridWorks
               Synthetic: Mineral Maps · Infrastructure Seed
```

### Directory Structure

```
ODIN/
├── backend/
│   ├── agents/           # 7 autonomous agents + orchestrator
│   ├── gateway/          # FastAPI API gateway
│   ├── mock_apis/        # Simulated Dispatch/Grid/CRM APIs
│   ├── db/
│   │   ├── schemas/      # PostGIS SQL + Neo4j Cypher schemas
│   │   └── seed_data/    # Synthetic GeoJSON datasets
│   └── shared/           # Pydantic models, logger, config
├── frontend/             # React + Mapbox + Deck.gl dashboard
├── mobile/               # React Native (Expo) field operator app
├── logs/                 # Structured Antigravity agent traces
└── docker-compose.yml    # Full stack: PostGIS, Neo4j, Redis, FastAPI, React
```

---

## How Google Antigravity Was Used

**ODIN was built using Google Antigravity as the primary AI orchestration and code generation platform.** Antigravity played the role of:

1. **Top-Level Architect**: Generated the complete implementation plan, defining all 7 agent responsibilities, database schemas, API contracts, and the full content-to-action loop before any code was written.

2. **Code Orchestrator**: Generated all production-quality Python agents, FastAPI routes, Pydantic schemas, React components, React Native screens, SQL/Cypher schemas, Docker configuration, and this README in a single end-to-end session.

3. **Reasoning Engine**: Every structured log file in `/logs/` is a **direct artifact of Antigravity's agentic reasoning** — the workplan, observations, reasoning steps, decision flow, tool calls, error recovery, and outcome summary all reflect the planning and execution chain Antigravity used.

4. **Meta-Orchestrator**: The `ODINOrchestrator` class mirrors how Antigravity itself operates: it plans (workplan), delegates to specialists (agents), monitors (reflection), and records everything (structured logs).

### Antigravity-to-ODIN Mapping

| Antigravity Capability | ODIN Implementation |
|------------------------|---------------------|
| Planning mode | `AgentWorkplan` in every trace |
| Tool use | `ToolCall` records in `ODINLogger` |
| Reasoning traces | `reasoning_steps[]` in JSON logs |
| Error recovery | `ReflectionAgent` + `ErrorRecovery` model |
| Before/after state | `BeforeAfterState` model + UI panel |
| Parallel research | Multiple agents running per pipeline |

---

## Agent Roster

| Agent | Role | Confidence Range |
|-------|------|-----------------|
| **ClimateAgent** | Monitors storms, floods, wildfires; estimates vulnerability and economic impact | 0.75–0.90 |
| **WindAgent** | Analyzes wind vectors, turbine efficiency, renders particle simulations | 0.75–0.88 |
| **ResourceAgent** | Analyzes mineral distribution, supply chain geopolitical risk | 0.80–0.92 |
| **CascadeAgent** | Models dependency graph failure propagation via Neo4j | 0.72–0.88 |
| **DecisionAgent** | Multi-criteria intervention ranking (economic × human × resource cost) | 0.78–0.91 |
| **DispatchAgent** | Calls mock APIs, creates tickets, executes chosen action | 0.82–0.91 |
| **ReflectionAgent** | Validates outputs, detects contradictions, triggers fallback mode | 0.65–0.85 |

---

## The Action Loop

Every unstructured input triggers this end-to-end pipeline:

```
Unstructured Text Input
        │
        ▼
[1] Ingest & Parse (Gateway /api/ingest)
        │  — Extract region, severity keywords
        ▼
[2] ClimateAgent — Fetch weather alert, assess per-asset risk scores
        │  — Output: affected_assets[], economic_impact{}
        ▼
[3] CascadeAgent — Traverse Neo4j graph from highest-risk asset
        │  — Output: cascade_chain[], intervention_window_minutes
        ▼
[4] DecisionAgent — Score 4 intervention options
        │  — Output: ranked_options[], chosen_action, rationale
        ▼
[5] DispatchAgent — Execute via mock APIs
        │  — PATCH /mock/grid/reroute  →  VULNERABLE → REROUTED
        │  — POST  /mock/dispatch      →  Create DISP-XXXX ticket
        │  — POST  /mock/crm/ticket    →  Log before/after in CRM
        ▼
[6] ReflectionAgent — Validate, detect issues, adjust confidence
        ▼
[7] ODINLogger — Write structured JSON to /logs/{timestamp}_{run_id}.json
        ▼
[8] WebSocket broadcast → Frontend Before/After panel updates live
```

---

## Technology Stack

### Backend
- **FastAPI 0.111** — Async API gateway, WebSocket support
- **LangGraph 0.1** — Agent state graph orchestration backbone
- **Google Gemini API** (gemini-1.5-pro) — LLM for NL reasoning (optional, synthetic fallback included)
- **PostgreSQL 16 + PostGIS 3.4** — Geospatial asset indexing (SRID 4326)
- **Neo4j 5.19** — Infrastructure dependency graph, cascading failure traversal
- **Redis 7** — Real-time event streaming, pub/sub for WebSocket bridge
- **Pydantic v2** — All data models, validation, serialization
- **structlog** — Structured console logging

### Frontend
- **React 18** + **Vite** — SPA with fast HMR
- **Mapbox GL v3** — Base map, globe projection, fog effect
- **Deck.gl v9** — Wind heatmap overlay, mineral site hexbins
- **Three.js** — Optional 3D particle wind animation
- **Framer Motion** — Micro-animations
- **Recharts** — Confidence score charts

### Mobile
- **React Native 0.74** + **Expo** — Cross-platform field operator app
- **React Navigation** — Bottom tab navigation
- **Expo Notifications** — Push alerts for critical incidents

---

## APIs & Data Sources

| Source | Type | Usage | Fallback |
|--------|------|-------|---------|
| OpenWeatherMap | Real-time REST | Wind speed, precipitation | Synthetic generator |
| NOAA Weather Alerts | REST | Severe storm alerts | Synthetic weather events |
| OpenGridWorks | Python library | Grid topology schemas (power buses, lines, substations) | infrastructure_seed.geojson |
| Mapbox GL | Tile API | Base map, globe projection | None (public token required) |
| PostGIS | Internal DB | Geospatial asset storage | Seed GeoJSON files |
| Neo4j | Internal DB | Dependency graph queries | In-memory FALLBACK_GRAPH |

### OpenGridWorks Integration

OpenGridWorks is a Python library for standardized grid topology modeling. ODIN integrates its data structures (substations, buses, transmission lines) as:
1. **Schema compatibility**: PostGIS schema columns mirror OpenGridWorks asset types
2. **Seed data**: `infrastructure_seed.geojson` uses OpenGridWorks-compatible asset classifications
3. **Agent compatibility**: All agents accept the OpenGridWorks asset type vocabulary

---

## Mandatory Hackathon Logging

Every ODIN pipeline run writes a structured JSON trace to `/logs/{timestamp}_{run_id}.json`. The schema (`AgentTrace`) contains **all 6 required hackathon log categories**:

| Section | Field(s) | Description |
|---------|----------|-------------|
| Workplan | `workplan.goal`, `workplan.steps` | High-level goals generated before execution |
| Observations | `observations[]` | Data loaded and environmental readings |
| Reasoning | `reasoning_steps[]` | Per-agent logic with confidence scores |
| Decision Flow | `decision_flow.options[]`, `.chosen_option_id`, `.rationale` | Multi-criteria scoring and selection |
| Tool Calls | `tool_calls[]` | Exact mock API calls with payloads and responses |
| Error Recovery | `error_recovery.triggered`, `.fallback_strategy`, `.degraded_mode` | Fallback handling |
| Outcome | `outcome_success`, `outcome_summary`, `overall_confidence` | Run evaluation |
| Before/After | `before_after[].before`, `.after` | State change per asset |

See [`logs/sample_trace.json`](logs/sample_trace.json) for a complete example.

---

## Robustness: Forced Failure Scenario

### Scenario: Weather API Timeout

Set `FORCE_WEATHER_API_FAILURE=true` in `.env` to activate.

**What happens:**
1. ClimateAgent attempts to call OpenWeatherMap API
2. After 1 retry (simulated), connection fails
3. **ReflectionAgent detects** the missing real-time data
4. ClimateAgent falls back to synthetic weather generator
5. Log records:
   ```json
   "error_recovery": {
     "triggered": true,
     "agent": "ClimateAgent",
     "reason": "Weather API unavailable",
     "fallback_strategy": "Load synthetic weather data from seed generator",
     "degraded_mode": true,
     "retry_count": 1
   }
   ```
6. ReflectionAgent adjusts overall confidence downward (-0.20)
7. Dashboard shows "⚡ Running in DEGRADED mode" banner
8. Pipeline continues with reduced confidence rather than failing

**Evidence of graceful degradation**: The pipeline still produces dispatch tickets and reroute commands — it simply flags data quality reduction.

---

## Baseline Comparison

### ODIN (Adaptive Agentic System) vs. Static Heuristic System

| Capability | Static Heuristic | ODIN Agentic |
|-----------|-----------------|--------------|
| **Storm shift adaptation** | Pre-defined static flood zone polygons; no update when storm path changes | ClimateAgent re-runs analysis each time raw text is ingested; regions update dynamically |
| **Cascading failure detection** | Isolated per-asset risk scores; no dependency modeling | CascadeAgent traverses Neo4j graph; automatically discovers 2nd/3rd order failures |
| **Data failure handling** | Returns error or null; pipeline halts | ReflectionAgent activates fallback; pipeline continues in degraded mode with documented uncertainty |
| **Intervention prioritization** | Rank by single metric (e.g., capacity MW) | DecisionAgent multi-criteria scoring: economic loss × human impact / resource cost × urgency |
| **Contradictions** | Not detected; silent error | ReflectionAgent cross-validates between agents; flags and adjusts confidence |
| **Audit trail** | None | Full JSON trace: workplan → reasoning → decision → tools → outcome |
| **NL query** | Fixed dashboard filters | Free-form natural language routed to appropriate agents with GeoJSON map overlay |
| **Real-time adaptation** | Batch refresh every N hours | WebSocket broadcast on each incident; dashboard updates within 1 second |

**Concrete example**: A Category 4 hurricane shifts 200km east at 3AM. The static system still shows the original flood zone from its last batch run (6 hours ago). ODIN: an operator pastes a news alert into the ingest panel → ClimateAgent re-analyzes → new affected assets identified → CascadeAgent re-propagates → DecisionAgent picks new reroute path → DispatchAgent creates updated tickets — all within ~2 seconds.

---

## Dataset Labeling

| Dataset | Type | PII |
|---------|------|-----|
| `infrastructure_seed.geojson` | **SYNTHETIC** — fictional facilities | None |
| `mineral_seed.geojson` | **SYNTHETIC** — approximate geographic regions, not real reserves | None |
| OpenWeatherMap responses | **REAL** real-time weather (when API key provided) | None |
| NOAA alerts | **REAL** US government public data | None |
| Neo4j seed graph | **SYNTHETIC** — fictional dependency relationships | None |
| Agent log traces | System-generated metadata only | None |

> **No real infrastructure operational data, PII, or sensitive facility information is stored or transmitted.**

---

## Cost & Scalability

### Cost Per Operation (Estimated)

| Operation | Components | Estimated Cost |
|-----------|-----------|----------------|
| Full incident pipeline | 4 Gemini API calls + DB queries | ~$0.008–0.025 |
| NL query | 1 Gemini API call | ~$0.002–0.008 |
| Wind vector fetch | Synthetic: $0 · OpenWeather: $0.0005 | $0–$0.001 |
| PostGIS spatial query | Self-hosted Docker | ~$0 variable |
| Neo4j graph traversal | Self-hosted Docker | ~$0 variable |

*At $0.015 average per pipeline run: 10,000 incidents/day ≈ $150/day ≈ $4,500/month*

### 10x Scaling (100K daily incidents)

- **Backend**: Kubernetes HPA on FastAPI pods; target p95 latency < 2s
- **PostGIS**: Read replicas + connection pooling (PgBouncer)
- **Neo4j**: Causal cluster (3-node) for HA graph queries
- **Redis**: Redis Cluster for pub/sub at scale
- **Gemini API**: Batch API for non-urgent queries; streaming for real-time
- **Logs**: Move from file-based to S3/GCS with Athena querying

### Latency Estimates

| Component | P50 | P95 |
|-----------|-----|-----|
| Full pipeline (synthetic weather) | 800ms | 2.5s |
| Full pipeline (real API calls) | 1.5s | 5s |
| NL query | 400ms | 1.5s |
| PostGIS spatial query | 20ms | 80ms |
| Neo4j graph traversal (5 hops) | 30ms | 120ms |

---

## Privacy & Limitations

### Privacy
- No PII is collected or stored at any point
- API keys are loaded from environment variables only — never hardcoded
- All synthetic data is clearly labelled; no real infrastructure operational data is used
- WebSocket connections do not persist user session data

### System Limitations
1. **Weather accuracy**: When `USE_SYNTHETIC_WEATHER=true`, risk scores are estimates only
2. **Economic model**: Linear approximation ±40% accuracy vs. actuarial models
3. **Cascade model**: Neo4j graph is a simplified representation; real grid dependencies are more complex
4. **Gemini API dependency**: NL reasoning quality degrades without a valid API key (falls back to keyword routing)
5. **Map token**: Mapbox requires a public token for tile rendering; a placeholder is provided but tiles won't load
6. **Mobile**: Expo Go required for development; EAS Build for production distribution

---

## Quick Start

### Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.11+

### 1. Clone & Configure

```bash
git clone <repo>
cd ODIN
cp .env.example .env
# Edit .env — add MAPBOX_TOKEN, GEMINI_API_KEY (optional)
```

### 2. Start Services (Docker)

```bash
docker-compose up -d postgres neo4j redis
```

### 3. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn gateway.main:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 5. (Optional) Start Mobile

```bash
cd mobile
npm install
npx expo start
# Scan QR with Expo Go app
```

### 6. Run the Demo Pipeline

1. Open the web dashboard at http://localhost:3000
2. Paste one of the demo alerts in the left **Ingest Alert** panel
3. Click **⚡ Run ODIN Pipeline**
4. Watch the **Agent Reasoning** panel populate with steps, confidence scores, and tool calls
5. The **Before → After State** tab shows the grid state change (VULNERABLE → REROUTED)
6. Check `logs/` for the full structured JSON trace

### 7. Demo Forced Failure

```bash
# In .env:
FORCE_WEATHER_API_FAILURE=true
# Restart backend — next pipeline run will trigger Reflection Agent fallback
```

### API Documentation

With the backend running, visit: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## License

MIT License. ODIN is a hackathon demonstration system. All synthetic data is fictional.
