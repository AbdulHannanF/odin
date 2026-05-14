"""
ODIN Resource Intelligence Agent
Analyzes mineral/ore distribution and supply chain geopolitical risk.
"""
from __future__ import annotations
import json, time
from pathlib import Path
from typing import Any
import structlog
from shared.models import AgentName, RiskLevel

logger = structlog.get_logger("odin.agent.resource")
SEED_PATH = Path(__file__).parent.parent / "db" / "seed_data" / "mineral_seed.geojson"

class ResourceIntelligenceAgent:
    agent_name = AgentName.RESOURCE

    def _load_mineral_data(self) -> list[dict[str, Any]]:
        try:
            with open(SEED_PATH) as f:
                fc = json.load(f)
            return [
                {**feat["properties"], "lat": feat["geometry"]["coordinates"][1], "lon": feat["geometry"]["coordinates"][0]}
                for feat in fc["features"]
            ]
        except Exception as e:
            logger.warning("Could not load mineral seed", error=str(e))
            return []

    def _supply_chain_risk(self, mineral: dict[str, Any]) -> dict[str, Any]:
        risk = RiskLevel(mineral.get("geopolitical_risk", "LOW"))
        score = {"CRITICAL": 1.0, "HIGH": 0.75, "MEDIUM": 0.5, "LOW": 0.25, "NONE": 0.0}[risk.value]
        criticality = mineral.get("supply_chain_criticality", 0.5)
        composite = round(score * 0.6 + criticality * 0.4, 3)
        return {
            "mineral_id": mineral["mineral_id"],
            "mineral_type": mineral["mineral_type"],
            "country": mineral["country"],
            "region": mineral.get("region"),
            "geopolitical_risk": risk.value,
            "supply_chain_criticality": criticality,
            "composite_risk_score": composite,
            "reserves_mt": mineral.get("estimated_reserves_mt", 0),
            "alert": composite > 0.7,
            "notes": mineral.get("notes"),
        }

    async def analyze(self, mineral_filter: str | None = None) -> dict[str, Any]:
        t0 = time.time()
        minerals = self._load_mineral_data()
        if mineral_filter:
            minerals = [m for m in minerals if m["mineral_type"] == mineral_filter]
        assessments = [self._supply_chain_risk(m) for m in minerals]
        assessments.sort(key=lambda x: x["composite_risk_score"], reverse=True)
        critical_minerals = [a for a in assessments if a["alert"]]
        return {
            "agent": self.agent_name.value,
            "total_sites_analyzed": len(assessments),
            "critical_supply_chains": len(critical_minerals),
            "assessments": assessments,
            "top_risks": critical_minerals[:5],
            "geojson": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {**a, "alert": a["alert"]},
                        "geometry": {
                            "type": "Point",
                            "coordinates": [minerals[i]["lon"], minerals[i]["lat"]],
                        },
                    }
                    for i, a in enumerate(assessments)
                ],
            },
            "confidence": 0.88,
            "duration_ms": int((time.time() - t0) * 1000),
        }
