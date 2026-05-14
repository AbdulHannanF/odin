"""
ODIN FastAPI Gateway
Main application entry point. Registers all routers, manages lifecycle.
"""
from __future__ import annotations
import json
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from shared.config import settings
from shared.models import (
    IngestRequest, IngestResponse,
    NLQueryRequest, NLQueryResponse,
    GeoPoint, RiskLevel
)
from agents.orchestrator import ODINOrchestrator
from mock_apis.mock_router import router as mock_router

import structlog
logger = structlog.get_logger("odin.gateway")

# ── App Instance ──────────────────────────────────────────────────

app = FastAPI(
    title="ODIN — Planetary Infrastructure Intelligence API",
    description=(
        "Autonomous multi-agent platform for infrastructure risk analysis, "
        "cascading failure simulation, and real-time incident response."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8081", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Orchestrator (singleton) ──────────────────────────────────────

orchestrator = ODINOrchestrator()

# ── WebSocket connection manager ──────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict[str, Any]):
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                pass

ws_manager = ConnectionManager()

# ── Lifecycle ─────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    logger.info("ODIN Gateway starting up", env=settings.odin_env)
    try:
        from db.connections import startup_db
        await startup_db()
    except Exception as e:
        logger.warning("DB startup failed — running in seed-data mode", error=str(e))

@app.on_event("shutdown")
async def shutdown():
    try:
        from db.connections import shutdown_db
        await shutdown_db()
    except Exception:
        pass
    logger.info("ODIN Gateway shut down")

# ── Health & Info ──────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "ODIN",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "docs": "/docs",
    }

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ── Ingest Endpoint (Core Hackathon Flow) ─────────────────────────

@app.post("/api/ingest", response_model=IngestResponse, tags=["Core Pipeline"])
async def ingest(req: IngestRequest, background_tasks: BackgroundTasks):
    """
    **Core ODIN pipeline.**
    
    Accepts unstructured text (weather alert, news article, supply disruption report).
    Triggers: Ingest → Climate Analysis → Cascade Simulation → Decision → Dispatch → Reflection.
    Returns run_id for polling the full trace via /api/agents/trace/{run_id}.
    """
    import uuid
    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"

    # Run pipeline synchronously (for demo) — use BackgroundTasks for production
    try:
        result = await orchestrator.run_incident_pipeline(req.text, incident_id)
        # Broadcast to all WebSocket listeners
        await ws_manager.broadcast({
            "type": "INCIDENT_PROCESSED",
            "run_id": result["run_id"],
            "incident_id": incident_id,
            "summary": result["reflection"].get("recommendation", ""),
            "before_after": result["before_after"],
            "confidence": result["confidence"],
            "timestamp": datetime.utcnow().isoformat(),
        })
        return IngestResponse(
            run_id=result["run_id"],
            incident_id=incident_id,
            message=f"Pipeline complete. Action: {result['decision']['chosen_action']}. "
                    f"Confidence: {result['confidence']:.2f}.",
            status="complete",
        )
    except Exception as e:
        logger.error("Ingest pipeline failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# ── Natural Language Query ────────────────────────────────────────

@app.post("/api/query/nl", response_model=NLQueryResponse, tags=["NL Query"])
async def nl_query(req: NLQueryRequest):
    """
    Answer geospatial natural language questions.
    Routes to appropriate agents and returns answer + GeoJSON overlay.
    """
    try:
        result = await orchestrator.run_nl_query(req.query)
        return NLQueryResponse(
            query=result["query"],
            answer=result["answer"],
            geojson_overlay=result.get("geojson"),
            data_sources=result.get("data_sources", []),
            confidence=result.get("confidence", 0.75),
            run_id=result.get("run_id"),
        )
    except Exception as e:
        logger.error("NL query failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# ── Grid State ───────────────────────────────────────────────────

@app.get("/api/grid/state", tags=["Grid"])
async def get_grid_state():
    """Return current infrastructure state from seed data."""
    seed_path = Path(__file__).parent.parent / "db" / "seed_data" / "infrastructure_seed.geojson"
    try:
        with open(seed_path) as f:
            data = json.load(f)
        return {"geojson": data, "source": "seed_data", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Wind Vectors ─────────────────────────────────────────────────

@app.get("/api/wind/vectors", tags=["Wind"])
async def get_wind_vectors(
    min_lat: float = 35.0, max_lat: float = 55.0,
    min_lon: float = -10.0, max_lon: float = 30.0,
):
    """Return wind vector data for map animation."""
    from agents.wind_agent import WindIntelligenceAgent
    agent = WindIntelligenceAgent()
    vectors = await agent.get_wind_vectors({
        "min_lat": min_lat, "max_lat": max_lat,
        "min_lon": min_lon, "max_lon": max_lon,
    })
    return {"vectors": vectors, "count": len(vectors), "timestamp": datetime.utcnow().isoformat()}

# ── Mineral Overlay ──────────────────────────────────────────────

@app.get("/api/minerals/overlay", tags=["Minerals"])
async def get_mineral_overlay(mineral_type: str | None = None):
    """Return mineral site GeoJSON overlay for map."""
    from agents.resource_agent import ResourceIntelligenceAgent
    agent = ResourceIntelligenceAgent()
    result = await agent.analyze(mineral_type)
    return {
        "geojson": result["geojson"],
        "assessments": result["assessments"],
        "critical_count": result["critical_supply_chains"],
        "timestamp": datetime.utcnow().isoformat(),
    }

# ── Agent Traces ─────────────────────────────────────────────────

@app.get("/api/agents/trace/{run_id}", tags=["Agents"])
async def get_trace(run_id: str):
    """Return the full structured agent trace for a run ID."""
    log_dir = settings.odin_log_dir
    matches = list(log_dir.glob(f"*_{run_id[:8]}*.json"))
    if not matches:
        raise HTTPException(status_code=404, detail=f"No trace found for run_id={run_id}")
    with open(matches[0]) as f:
        return json.load(f)

@app.get("/api/agents/traces", tags=["Agents"])
async def list_traces():
    """List all available agent traces."""
    log_dir = settings.odin_log_dir
    traces = []
    for p in sorted(log_dir.glob("*.json"), reverse=True)[:20]:
        try:
            with open(p) as f:
                data = json.load(f)
            traces.append({
                "run_id": data.get("run_id"),
                "timestamp": data.get("timestamp"),
                "trigger": data.get("trigger"),
                "success": data.get("outcome_success"),
                "confidence": data.get("overall_confidence"),
                "file": p.name,
            })
        except Exception:
            pass
    return {"traces": traces, "count": len(traces)}

# ── WebSocket ─────────────────────────────────────────────────────

@app.websocket("/ws/incidents")
async def websocket_incidents(websocket: WebSocket):
    """Real-time incident stream for the frontend dashboard."""
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo ping-pong for keepalive
            await websocket.send_json({"type": "PONG", "timestamp": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# ── Mock APIs ─────────────────────────────────────────────────────

app.include_router(mock_router)

# ── Dev Runner ────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("gateway.main:app", host="0.0.0.0", port=settings.backend_port, reload=True)
