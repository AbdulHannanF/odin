"""
ODIN Cascading Failure Agent
Models interconnected dependencies (power, telecom, datacenters, hospitals)
to simulate failure propagation through Neo4j dependency graph.
"""
from __future__ import annotations
import time
from typing import Any
import structlog
from shared.models import AgentName, RiskLevel

logger = structlog.get_logger("odin.agent.cascade")

# Fallback in-memory graph when Neo4j is unavailable
FALLBACK_GRAPH = {
    "SUBST-001": {"depends_on": ["PLANT-001"], "powers": ["DC-001", "HOSP-001", "TCOM-001", "WATR-001"], "criticality": 0.95},
    "PLANT-001": {"depends_on": [], "powers": ["SUBST-001"], "criticality": 0.90},
    "DC-001":    {"depends_on": ["SUBST-001", "TCOM-001"], "powers": [], "criticality": 0.88},
    "HOSP-001":  {"depends_on": ["SUBST-001", "WATR-001"], "powers": [], "criticality": 0.99},
    "TCOM-001":  {"depends_on": ["SUBST-001"], "powers": [], "criticality": 0.80},
    "WATR-001":  {"depends_on": ["SUBST-001"], "powers": [], "criticality": 0.92},
}

class CascadingFailureAgent:
    agent_name = AgentName.CASCADE

    async def _query_neo4j(self, root_asset_id: str) -> list[dict[str, Any]]:
        """Query Neo4j for downstream assets. Falls back to in-memory graph."""
        try:
            from db.connections import neo4j_query
            cypher = """
            MATCH (root:Asset {asset_id: $asset_id})
            MATCH p = (root)-[:POWERS|DEPENDS_ON*1..5]->(downstream:Asset)
            RETURN downstream.asset_id AS asset_id,
                   downstream.name AS name,
                   downstream.asset_type AS asset_type,
                   downstream.criticality AS criticality,
                   length(p) AS hops
            ORDER BY downstream.criticality DESC, hops ASC
            """
            records = await neo4j_query(cypher, {"asset_id": root_asset_id})
            return records
        except Exception as e:
            logger.warning("Neo4j unavailable, using fallback graph", error=str(e))
            return self._fallback_propagate(root_asset_id)

    def _fallback_propagate(self, root_id: str, visited: set = None, depth: int = 0) -> list[dict[str, Any]]:
        if visited is None:
            visited = {root_id}
        results = []
        node = FALLBACK_GRAPH.get(root_id, {})
        for downstream_id in node.get("powers", []):
            if downstream_id not in visited:
                visited.add(downstream_id)
                ds_node = FALLBACK_GRAPH.get(downstream_id, {})
                results.append({
                    "asset_id": downstream_id,
                    "name": downstream_id,
                    "asset_type": "UNKNOWN",
                    "criticality": ds_node.get("criticality", 0.5),
                    "hops": depth + 1,
                })
                results.extend(self._fallback_propagate(downstream_id, visited, depth + 1))
        return results

    def _estimate_failure_time(self, hops: int, criticality: float) -> int:
        """Estimate minutes until failure propagates to this asset."""
        base_minutes = hops * 15
        urgency_factor = 2.0 - criticality
        return max(5, int(base_minutes * urgency_factor))

    async def simulate_failure(self, root_asset_id: str, root_asset_name: str) -> dict[str, Any]:
        t0 = time.time()
        logger.info("Cascading failure simulation started", root=root_asset_id)

        downstream = await self._query_neo4j(root_asset_id)

        cascade_chain = []
        for ds in downstream:
            criticality = ds.get("criticality") or 0.5
            hops = ds.get("hops") or 1
            failure_min = self._estimate_failure_time(hops, criticality)
            risk = RiskLevel.CRITICAL if criticality > 0.9 else (RiskLevel.HIGH if criticality > 0.7 else RiskLevel.MEDIUM)
            cascade_chain.append({
                "asset_id": ds["asset_id"],
                "name": ds.get("name", ds["asset_id"]),
                "asset_type": ds.get("asset_type", "UNKNOWN"),
                "hops_from_root": hops,
                "criticality": criticality,
                "estimated_failure_minutes": failure_min,
                "risk_level": risk.value,
                "impact": "CRITICAL" if criticality > 0.9 else "HIGH",
            })

        cascade_chain.sort(key=lambda x: x["estimated_failure_minutes"])

        total_criticality = sum(c["criticality"] for c in cascade_chain)
        intervention_window_min = cascade_chain[0]["estimated_failure_minutes"] if cascade_chain else 999

        duration_ms = int((time.time() - t0) * 1000)
        logger.info("Cascade simulation complete", chain_length=len(cascade_chain), window_min=intervention_window_min)

        return {
            "agent": self.agent_name.value,
            "root_asset": {"asset_id": root_asset_id, "name": root_asset_name},
            "cascade_chain": cascade_chain,
            "total_affected_assets": len(cascade_chain),
            "total_criticality_score": round(total_criticality, 3),
            "intervention_window_minutes": intervention_window_min,
            "cascade_depth": max((c["hops_from_root"] for c in cascade_chain), default=0),
            "summary": f"Failure of {root_asset_name} would cascade to {len(cascade_chain)} downstream assets within {intervention_window_min} minutes.",
            "confidence": 0.82,
            "duration_ms": duration_ms,
        }
