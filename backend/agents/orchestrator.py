"""
ODIN Agent Orchestrator
Top-level LangGraph-style workflow that coordinates all 7 agents,
manages the ODINLogger trace, and implements the full
Ingest → Analyze → Simulate → Before/After loop.
"""
from __future__ import annotations
import time
import json
from pathlib import Path
from datetime import datetime
from typing import Any, Optional

import structlog

from shared.config import settings
from shared.logger import ODINLogger
from shared.models import (
    AgentName, TriggerType, RiskLevel, AssetStatus, GeoPoint, GeoBoundingBox
)
from agents.climate_agent import ClimateRiskAgent
from agents.wind_agent import WindIntelligenceAgent
from agents.resource_agent import ResourceIntelligenceAgent
from agents.cascade_agent import CascadingFailureAgent
from agents.decision_agent import DecisionAgent
from agents.dispatch_agent import DispatchAgent
from agents.reflection_agent import ReflectionAgent

logger = structlog.get_logger("odin.orchestrator")

# Load seed assets for in-memory operations when DB unavailable
_SEED_PATH = Path(__file__).parent.parent / "db" / "seed_data" / "infrastructure_seed.geojson"
def _load_seed_assets() -> list[dict[str, Any]]:
    try:
        with open(_SEED_PATH) as f:
            fc = json.load(f)
        return [
            {
                **feat["properties"],
                "lat": feat["geometry"]["coordinates"][1],
                "lon": feat["geometry"]["coordinates"][0],
            }
            for feat in fc["features"]
        ]
    except Exception:
        return []


class ODINOrchestrator:
    """
    Master workflow controller for ODIN.
    
    Executes the full pipeline:
    1. Ingest & parse unstructured input
    2. Climate risk analysis
    3. Cascading failure simulation (on highest-risk asset)
    4. Decision scoring
    5. Action dispatch (mock APIs)
    6. Reflection & confidence adjustment
    7. Log structured trace to /logs/
    """

    def __init__(self):
        self.climate_agent = ClimateRiskAgent()
        self.wind_agent = WindIntelligenceAgent()
        self.resource_agent = ResourceIntelligenceAgent()
        self.cascade_agent = CascadingFailureAgent()
        self.decision_agent = DecisionAgent()
        self.dispatch_agent = DispatchAgent()
        self.reflection_agent = ReflectionAgent()
        self._log = logger

    async def _load_assets(self) -> list[dict[str, Any]]:
        """Load assets from PostGIS or fall back to seed file."""
        try:
            from db.connections import get_db_session
            async with get_db_session() as session:
                from sqlalchemy import text
                result = await session.execute(text(
                    "SELECT asset_id, name, asset_type, status, risk_score, risk_level, "
                    "capacity_mw, country, region, "
                    "ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon "
                    "FROM infrastructure_assets LIMIT 100"
                ))
                rows = result.mappings().all()
                if rows:
                    return [dict(r) for r in rows]
        except Exception as e:
            self._log.warning("PostGIS unavailable, using seed data", error=str(e))
        return _load_seed_assets()

    def _extract_region(self, text: str) -> GeoBoundingBox:
        """Simple keyword-based region extraction from text."""
        text_lower = text.lower()
        regions = {
            "gulf": GeoBoundingBox(min_lat=25.0, min_lon=-98.0, max_lat=31.0, max_lon=-87.0),
            "northeast": GeoBoundingBox(min_lat=38.0, min_lon=-80.0, max_lat=47.0, max_lon=-66.0),
            "california": GeoBoundingBox(min_lat=32.5, min_lon=-124.5, max_lat=42.0, max_lon=-114.0),
            "florida": GeoBoundingBox(min_lat=24.5, min_lon=-87.5, max_lat=31.0, max_lon=-80.0),
            "europe": GeoBoundingBox(min_lat=35.0, min_lon=-10.0, max_lat=71.0, max_lon=40.0),
        }
        for keyword, bbox in regions.items():
            if keyword in text_lower:
                return bbox
        return GeoBoundingBox(min_lat=25.0, min_lon=-100.0, max_lat=50.0, max_lon=-65.0)

    # ── Main Pipeline ─────────────────────────────────────────────

    async def run_incident_pipeline(
        self,
        raw_text: str,
        incident_id: Optional[str] = None,
        trigger: TriggerType = TriggerType.UNSTRUCTURED_INPUT,
    ) -> dict[str, Any]:
        """
        Full ODIN workflow: unstructured text → structured action → before/after state.
        Returns the complete run result and saves a trace to /logs/.
        """
        t_total = time.time()
        api_failure = settings.force_weather_api_failure or settings.use_synthetic_weather

        async with ODINLogger(trigger, raw_text, incident_id) as tracer:

            # ── STEP 1: WORKPLAN ─────────────────────────────────
            tracer.set_workplan(
                goal="Analyze infrastructure risk from unstructured input and execute protective interventions",
                steps=[
                    "1. Load infrastructure assets from PostGIS",
                    "2. Fetch weather alert and assess climate risk (ClimateAgent)",
                    "3. Identify highest-risk asset and simulate cascading failure (CascadeAgent)",
                    "4. Score and rank intervention options (DecisionAgent)",
                    "5. Execute chosen action via mock APIs (DispatchAgent)",
                    "6. Validate results and adjust confidence (ReflectionAgent)",
                    "7. Record before/after state and save trace",
                ],
                agents=[
                    AgentName.CLIMATE, AgentName.CASCADE,
                    AgentName.DECISION, AgentName.DISPATCH, AgentName.REFLECTION,
                ],
                estimated_duration_s=15.0,
            )

            # ── STEP 2: LOAD ASSETS ──────────────────────────────
            assets = await self._load_assets()
            region = self._extract_region(raw_text)
            tracer.add_observation("assets_loaded", len(assets), source="PostGIS/seed")
            tracer.add_observation("region_detected", region.model_dump(), source="text_analysis")

            # ── STEP 3: CLIMATE ANALYSIS ─────────────────────────
            t_climate = time.time()
            climate_result = await self.climate_agent.analyze(raw_text, assets, region)
            tracer.add_reasoning_step(
                agent=AgentName.CLIMATE,
                description=f"Analyzed {len(assets)} assets. Found {len(climate_result['affected_assets'])} at risk. "
                            f"Event: {climate_result['alert']['event_type']}. "
                            f"Economic stake: ${climate_result['economic_impact']['total_estimated_loss_usd']:,.0f}",
                confidence=climate_result["confidence"],
                input_data={"asset_count": len(assets), "raw_text_length": len(raw_text)},
                output_data={"affected_count": len(climate_result["affected_assets"])},
                duration_ms=int((time.time() - t_climate) * 1000),
            )

            if api_failure or climate_result.get("api_fallback_used"):
                tracer.record_error_recovery(
                    agent=AgentName.CLIMATE,
                    reason="Weather API unavailable or FORCE_WEATHER_API_FAILURE=true",
                    fallback_strategy="Load synthetic weather data from seed generator",
                    fallback_data_source="synthetic_fallback",
                    degraded_mode=True,
                    retry_count=1,
                )

            # ── STEP 4: CASCADE SIMULATION ───────────────────────
            # Pick the highest-risk asset as the failure root
            affected = climate_result.get("affected_assets", [])
            root_asset = affected[0] if affected else {"asset_id": "SUBST-001", "name": "Northeast Grid Hub Alpha"}

            t_cascade = time.time()
            cascade_result = await self.cascade_agent.simulate_failure(
                root_asset["asset_id"], root_asset.get("name", root_asset["asset_id"])
            )
            tracer.add_reasoning_step(
                agent=AgentName.CASCADE,
                description=f"Failure of '{root_asset.get('name')}' cascades to "
                            f"{cascade_result['total_affected_assets']} downstream assets. "
                            f"Intervention window: {cascade_result['intervention_window_minutes']} min.",
                confidence=cascade_result["confidence"],
                duration_ms=int((time.time() - t_cascade) * 1000),
            )

            # ── STEP 5: DECISION ─────────────────────────────────
            t_decision = time.time()
            decision_result = await self.decision_agent.prioritize(climate_result, cascade_result)
            tracer.add_reasoning_step(
                agent=AgentName.DECISION,
                description=f"Chosen action: {decision_result['chosen_action']} — "
                            f"{decision_result['chosen_description']}. "
                            f"Confidence: {decision_result['confidence']:.2f}.",
                confidence=decision_result["confidence"],
                duration_ms=int((time.time() - t_decision) * 1000),
            )
            tracer.set_decision(
                options=[o for o in decision_result["ranked_options"]],
                chosen_id=decision_result["chosen_action"],
                rationale=decision_result["decision"]["rationale"],
                confidence=decision_result["confidence"],
            )

            # ── STEP 6: DISPATCH ─────────────────────────────────
            t_dispatch = time.time()
            dispatch_result = await self.dispatch_agent.execute(
                decision_result, affected, incident_id or "INC-UNKNOWN"
            )
            # Record tool calls in tracer
            for tc in dispatch_result.get("tool_calls", []):
                tracer.add_tool_call(
                    tool_name=tc["tool"],
                    method=tc["method"],
                    endpoint=tc["endpoint"],
                    payload=tc.get("payload"),
                    response=tc.get("result", {}).get("data"),
                    status_code=tc.get("result", {}).get("status_code"),
                    duration_ms=tc.get("result", {}).get("duration_ms"),
                    success=tc.get("result", {}).get("success", True),
                )
            tracer.add_reasoning_step(
                agent=AgentName.DISPATCH,
                description=f"Executed {dispatch_result['action_executed']}: "
                            f"{len(dispatch_result['dispatch_tickets'])} tickets, "
                            f"{len(dispatch_result['reroute_commands'])} reroutes.",
                confidence=dispatch_result["confidence"],
                duration_ms=int((time.time() - t_dispatch) * 1000),
            )

            # ── STEP 7: BEFORE/AFTER STATE ───────────────────────
            for cmd in dispatch_result.get("reroute_commands", []):
                asset_name = next((a.get("name", cmd["asset_id"]) for a in affected if a["asset_id"] == cmd["asset_id"]), cmd["asset_id"])
                ticket_id = dispatch_result["dispatch_tickets"][0]["ticket_id"] if dispatch_result["dispatch_tickets"] else None
                tracer.record_before_after(
                    asset_id=cmd["asset_id"],
                    asset_name=asset_name,
                    before_status=AssetStatus.VULNERABLE,
                    before_risk=RiskLevel.HIGH,
                    before_risk_score=0.72,
                    after_status=AssetStatus.REROUTED,
                    after_risk=RiskLevel.LOW,
                    after_risk_score=0.18,
                    change_reason=cmd.get("reason", "Automated reroute"),
                    triggered_by="DispatchAgent",
                    ticket_id=ticket_id,
                )

            # ── STEP 8: REFLECTION ───────────────────────────────
            t_reflect = time.time()
            all_results = {
                "climate_result": climate_result,
                "cascade_result": cascade_result,
                "decision_result": decision_result,
                "dispatch_result": dispatch_result,
            }
            reflection_result = await self.reflection_agent.evaluate(
                all_results,
                base_confidence=decision_result["confidence"],
                api_failure_occurred=api_failure or climate_result.get("api_fallback_used", False),
            )
            tracer.add_reasoning_step(
                agent=AgentName.REFLECTION,
                description=f"Trust level: {reflection_result['trust_level']}. "
                            f"Issues: {len(reflection_result['issues_detected'])}. "
                            f"Adjusted confidence: {reflection_result['adjusted_confidence']:.2f}.",
                confidence=reflection_result["adjusted_confidence"],
                duration_ms=int((time.time() - t_reflect) * 1000),
            )

            # ── STEP 9: FINAL OUTCOME ────────────────────────────
            final_confidence = reflection_result["adjusted_confidence"]
            success = final_confidence >= 0.60 and bool(dispatch_result.get("dispatch_tickets") or dispatch_result.get("reroute_commands"))
            total_ms = int((time.time() - t_total) * 1000)

            tracer.set_outcome(
                success=success,
                summary=(
                    f"ODIN processed incident in {total_ms}ms. "
                    f"Action: {decision_result['chosen_action']}. "
                    f"Assets affected: {len(affected)}. "
                    f"Tickets: {len(dispatch_result['dispatch_tickets'])}. "
                    f"Reroutes: {len(dispatch_result['reroute_commands'])}. "
                    f"Final confidence: {final_confidence:.2f}."
                ),
                confidence=final_confidence,
            )

            return {
                "run_id": tracer.run_id,
                "incident_id": incident_id,
                "success": success,
                "climate": climate_result,
                "cascade": cascade_result,
                "decision": decision_result,
                "dispatch": dispatch_result,
                "reflection": reflection_result,
                "before_after": [ba.model_dump() for ba in tracer.trace.before_after],
                "total_duration_ms": total_ms,
                "confidence": final_confidence,
            }

    async def _classify_query(self, query: str) -> dict[str, Any]:
        """LLM-powered intent classifier with keyword fallback."""
        from shared.gemini import generate_json, is_available
        if is_available():
            system = (
                "You are ODIN's natural-language router. Map the user's geospatial query to "
                "ONE intent and extract any region. Intents: WIND, MINERAL, VULNERABILITY, "
                "INFRASTRUCTURE, GENERAL. Region is a free-text string or null."
            )
            schema = '{"intent": "WIND|MINERAL|VULNERABILITY|INFRASTRUCTURE|GENERAL", "region": "string|null", "minerals": ["lithium"|"cobalt"|...] }'
            prompt = f"Query: {query!r}\nReply with this JSON schema only:\n{schema}"
            data = await generate_json(prompt, system=system)
            if data.get("intent"):
                return data
        q = query.lower()
        if "wind" in q or "turbine" in q or "offshore" in q:
            return {"intent": "WIND", "region": None}
        if "mineral" in q or "lithium" in q or "cobalt" in q or "supply chain" in q:
            return {"intent": "MINERAL", "region": None,
                    "minerals": [m for m in ("lithium", "cobalt") if m in q]}
        if "vulnerable" in q or "flood" in q or "risk" in q:
            return {"intent": "VULNERABILITY", "region": None}
        return {"intent": "GENERAL", "region": None}

    async def run_nl_query(self, query: str) -> dict[str, Any]:
        """
        Answer a natural language geospatial query.
        Uses Gemini for intent + answer when available, falls back to keywords.
        """
        from shared.gemini import generate, is_available
        async with ODINLogger(TriggerType.NL_QUERY, query) as tracer:
            tracer.set_workplan(
                goal=f"Answer: '{query}'",
                steps=["1. Classify query intent (Gemini if available)", "2. Route to relevant agent", "3. Generate final answer"],
                agents=[AgentName.ORCHESTRATOR],
            )

            classification = await self._classify_query(query)
            intent = classification.get("intent", "GENERAL")
            tracer.add_observation("intent", intent, source="gemini" if is_available() else "keyword")
            q = query.lower()

            if intent == "WIND" or "wind" in q or "turbine" in q or "offshore" in q:
                assets = await self._load_assets()
                bounds = {"min_lat": 30.0, "max_lat": 65.0, "min_lon": -15.0, "max_lon": 40.0}
                result = await self.wind_agent.analyze(assets, bounds)
                tracer.add_reasoning_step(AgentName.WIND, "Wind analysis for NL query", confidence=0.80)
                tracer.set_outcome(True, "Wind analysis complete", 0.80)
                return {
                    "query": query,
                    "answer": f"Analyzed {result['fleet_summary']['total_turbines']} wind turbines. "
                              f"Total capacity: {result['fleet_summary']['total_rated_mw']:.0f} MW, "
                              f"actual: {result['fleet_summary']['total_actual_mw']:.0f} MW "
                              f"({result['fleet_summary']['fleet_efficiency']*100:.1f}% efficiency). "
                              f"Offshore expansion best suited for North Sea and Baltic corridors.",
                    "geojson": None,
                    "data_sources": ["synthetic_wind_grid", "seed_turbines"],
                    "confidence": 0.80,
                }
            elif intent == "MINERAL" or "mineral" in q or "lithium" in q or "cobalt" in q or "supply chain" in q:
                mineral = "lithium" if "lithium" in q else ("cobalt" if "cobalt" in q else None)
                if not mineral and classification.get("minerals"):
                    mineral = classification["minerals"][0]
                result = await self.resource_agent.analyze(mineral)
                tracer.add_reasoning_step(AgentName.RESOURCE, "Mineral supply chain analysis", confidence=0.88)
                tracer.set_outcome(True, "Resource analysis complete", 0.88)
                top = result["top_risks"]
                return {
                    "query": query,
                    "answer": f"Found {result['total_sites_analyzed']} mineral sites. "
                              f"{result['critical_supply_chains']} have critical supply chain risk. "
                              f"Top risk: {top[0]['country']} ({top[0]['mineral_type']}) — "
                              f"composite risk {top[0]['composite_risk_score']:.2f}." if top else "No critical minerals found.",
                    "geojson": result.get("geojson"),
                    "data_sources": ["mineral_seed.geojson"],
                    "confidence": 0.88,
                }
            elif intent == "VULNERABILITY" or "vulnerable" in q or "flood" in q or "risk" in q:
                assets = await self._load_assets()
                result = await self.climate_agent.analyze(query, assets)
                tracer.add_reasoning_step(AgentName.CLIMATE, "Vulnerability query", confidence=0.82)
                tracer.set_outcome(True, "Vulnerability analysis complete", 0.82)
                return {
                    "query": query,
                    "answer": f"Identified {len(result['affected_assets'])} vulnerable assets. "
                              f"Highest risk: {result['affected_assets'][0]['name'] if result['affected_assets'] else 'none'}. "
                              f"Estimated economic impact: ${result['economic_impact']['total_estimated_loss_usd']:,.0f}.",
                    "geojson": None,
                    "data_sources": ["infrastructure_seed.geojson", "synthetic_weather"],
                    "confidence": 0.82,
                }
            else:
                # No specialist agent matched — let Gemini answer directly,
                # constrained to ODIN's domain.
                answer = ""
                if is_available():
                    system = (
                        "You are ODIN, an autonomous planetary infrastructure intelligence "
                        "platform. You answer concisely (≤ 3 sentences) about power grids, "
                        "submarine cables, pipelines, data centers, wind/solar/nuclear, "
                        "aviation, satellites, earthquakes, and supply chains. If the question "
                        "is out of scope, say so and suggest a related ODIN capability."
                    )
                    answer = await generate(query, system=system, temperature=0.3, timeout_s=10)
                if not answer:
                    answer = (
                        "ODIN can analyze: wind resources, mineral supply chains, infrastructure "
                        "vulnerability, transmission failures, and economic impact. Please refine "
                        "your query."
                    )
                tracer.set_outcome(True, "Generic query answered", 0.65)
                return {
                    "query": query,
                    "answer": answer,
                    "geojson": None,
                    "data_sources": (["gemini"] if is_available() and answer else []),
                    "confidence": 0.65 if is_available() else 0.55,
                }
