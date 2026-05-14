"""
ODIN Decision Agent
Prioritizes interventions balancing economic loss, human impact, and resource availability.
Scores and ranks all possible actions with confidence scores.
"""
from __future__ import annotations
import time
import uuid
from typing import Any
import structlog
from shared.models import AgentName, RiskLevel, DecisionOption, DecisionFlow

logger = structlog.get_logger("odin.agent.decision")

class DecisionAgent:
    agent_name = AgentName.DECISION

    def _score_intervention(
        self,
        action_type: str,
        economic_loss_usd: float,
        human_impact_score: float,
        resource_cost: float,
        urgency_minutes: int,
    ) -> float:
        """
        Multi-criteria scoring: higher = more urgent to execute.
        Score = (economic_weight * economic_loss + human_weight * human_impact) / (resource_cost * urgency_factor)
        """
        economic_weight = 0.4
        human_weight = 0.6
        normalized_economic = min(economic_loss_usd / 1_000_000, 10.0)
        normalized_resource = max(resource_cost, 0.1)
        urgency_factor = max(1.0, 60.0 / max(urgency_minutes, 1))

        raw_score = (economic_weight * normalized_economic + human_weight * human_impact_score) * urgency_factor
        return round(raw_score / normalized_resource, 4)

    async def prioritize(
        self,
        climate_result: dict[str, Any],
        cascade_result: dict[str, Any],
        economic_impact: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        t0 = time.time()
        logger.info("Decision prioritization started")

        options: list[DecisionOption] = []
        recommendations = climate_result.get("recommendations", [])
        cascade_chain = cascade_result.get("cascade_chain", [])
        total_loss = (economic_impact or {}).get("total_estimated_loss_usd", climate_result.get("economic_impact", {}).get("total_estimated_loss_usd", 500_000))
        urgency_min = cascade_result.get("intervention_window_minutes", 60)

        # Option 1: Emergency power rerouting
        reroute_score = self._score_intervention("EMERGENCY_REROUTE", total_loss * 0.8, 0.75, 2.0, urgency_min)
        options.append(DecisionOption(
            option_id="OPT-REROUTE",
            description="Emergency reroute power flow away from vulnerable transmission corridor",
            score=reroute_score,
            economic_impact_usd=total_loss * 0.8,
            human_impact_score=0.75,
            resource_cost=2.0,
            confidence=0.87,
        ))

        # Option 2: Preventive maintenance dispatch
        dispatch_score = self._score_intervention("DISPATCH_CREW", total_loss * 0.5, 0.60, 3.5, urgency_min * 2)
        options.append(DecisionOption(
            option_id="OPT-DISPATCH",
            description="Dispatch emergency maintenance crews to highest-risk assets",
            score=dispatch_score,
            economic_impact_usd=total_loss * 0.5,
            human_impact_score=0.60,
            resource_cost=3.5,
            confidence=0.82,
        ))

        # Option 3: Load shedding
        load_shed_score = self._score_intervention("LOAD_SHEDDING", total_loss * 0.3, 0.40, 1.0, urgency_min * 3)
        options.append(DecisionOption(
            option_id="OPT-LOAD-SHED",
            description="Controlled load shedding to protect critical infrastructure nodes",
            score=load_shed_score,
            economic_impact_usd=total_loss * 0.3,
            human_impact_score=0.40,
            resource_cost=1.0,
            confidence=0.78,
        ))

        # Option 4: Hybrid (reroute + dispatch)
        hybrid_score = self._score_intervention("HYBRID", total_loss * 0.9, 0.90, 5.0, urgency_min)
        options.append(DecisionOption(
            option_id="OPT-HYBRID",
            description="Combined reroute + crew dispatch for maximum resilience coverage",
            score=hybrid_score,
            economic_impact_usd=total_loss * 0.9,
            human_impact_score=0.90,
            resource_cost=5.0,
            confidence=0.91,
        ))

        # Rank options
        options.sort(key=lambda o: o.score, reverse=True)
        best = options[0]

        decision = DecisionFlow(
            options=options,
            chosen_option_id=best.option_id,
            rationale=(
                f"'{best.description}' selected with score {best.score:.3f}. "
                f"Urgency window: {urgency_min} min. "
                f"Economic stake: ${total_loss:,.0f}. "
                f"Human impact weight: {best.human_impact_score}."
            ),
            confidence=best.confidence,
        )

        duration_ms = int((time.time() - t0) * 1000)
        logger.info("Decision made", chosen=best.option_id, score=best.score, confidence=best.confidence)

        return {
            "agent": self.agent_name.value,
            "decision": decision.model_dump(),
            "ranked_options": [o.model_dump() for o in options],
            "chosen_action": best.option_id,
            "chosen_description": best.description,
            "confidence": best.confidence,
            "economic_stake_usd": total_loss,
            "urgency_window_minutes": urgency_min,
            "duration_ms": duration_ms,
        }
