"""
ODIN Dispatch Agent
Generates maintenance tasks, reroutes field teams, triggers mock workflow APIs.
Executes the chosen action from the Decision Agent.
"""
from __future__ import annotations
import time
import uuid
from datetime import datetime
from typing import Any
import httpx
import structlog
from shared.models import (
    AgentName, DispatchTicket, GridRerouteCommand,
    AssetStatus, RiskLevel, DispatchStatus, GeoPoint
)

logger = structlog.get_logger("odin.agent.dispatch")

# Base URL for mock APIs (self-referential within the same FastAPI app)
MOCK_API_BASE = "http://localhost:8000/mock"

class DispatchAgent:
    agent_name = AgentName.DISPATCH

    async def _call_mock_api(self, method: str, endpoint: str, payload: dict) -> dict[str, Any]:
        """Call a mock API endpoint and return result with timing."""
        url = f"{MOCK_API_BASE}{endpoint}"
        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                if method == "POST":
                    resp = await client.post(url, json=payload)
                elif method == "PATCH":
                    resp = await client.patch(url, json=payload)
                else:
                    resp = await client.get(url)
                resp.raise_for_status()
                duration_ms = int((time.time() - t0) * 1000)
                return {
                    "success": True,
                    "status_code": resp.status_code,
                    "data": resp.json(),
                    "duration_ms": duration_ms,
                    "endpoint": endpoint,
                }
        except Exception as e:
            # Mock APIs might not be running in test mode — simulate response
            duration_ms = int((time.time() - t0) * 1000)
            logger.warning("Mock API call failed, using simulated response", endpoint=endpoint, error=str(e))
            return {
                "success": True,  # Treat as success for demo purposes
                "status_code": 200,
                "data": {"simulated": True, **payload, "id": f"SIM-{uuid.uuid4().hex[:6].upper()}"},
                "duration_ms": duration_ms,
                "endpoint": endpoint,
                "fallback": "simulated",
            }

    async def execute_reroute(self, asset_id: str, asset_name: str, incident_id: str) -> dict[str, Any]:
        """Execute grid reroute command via mock API."""
        payload = {
            "asset_id": asset_id,
            "from_status": "VULNERABLE",
            "to_status": "REROUTED",
            "reason": f"Automated reroute triggered by incident {incident_id}",
            "incident_id": incident_id,
        }
        result = await self._call_mock_api("PATCH", "/grid/reroute", payload)
        cmd = GridRerouteCommand(
            asset_id=asset_id,
            from_status=AssetStatus.VULNERABLE,
            to_status=AssetStatus.REROUTED,
            reason=payload["reason"],
            success=result["success"],
        )
        logger.info("Reroute executed", asset=asset_name, success=result["success"])
        return {"command": cmd.model_dump(), "api_result": result}

    async def create_dispatch_ticket(
        self,
        incident_id: str,
        asset_id: str,
        asset_name: str,
        action_type: str,
        priority: RiskLevel,
        instructions: str,
        location: GeoPoint | None = None,
    ) -> dict[str, Any]:
        """Create a dispatch ticket via mock CRM API."""
        ticket_id = f"DISP-{str(uuid.uuid4().int)[:4].zfill(4)}"
        payload = {
            "ticket_id": ticket_id,
            "incident_id": incident_id,
            "asset_id": asset_id,
            "asset_name": asset_name,
            "action_type": action_type,
            "priority": priority.value,
            "instructions": instructions,
            "assigned_team": "ALPHA-RESPONSE-TEAM",
            "status": "PENDING",
        }
        result = await self._call_mock_api("POST", "/dispatch", payload)
        ticket = DispatchTicket(
            ticket_id=ticket_id,
            incident_id=incident_id,
            asset_id=asset_id,
            action_type=action_type,
            priority=priority,
            assigned_team="ALPHA-RESPONSE-TEAM",
            instructions=instructions,
            location=location,
            status=DispatchStatus.DISPATCHED if result["success"] else DispatchStatus.PENDING,
        )
        logger.info("Dispatch ticket created", ticket_id=ticket_id, action=action_type)
        return {"ticket": ticket.model_dump(), "api_result": result}

    async def execute(
        self,
        decision: dict[str, Any],
        affected_assets: list[dict[str, Any]],
        incident_id: str,
    ) -> dict[str, Any]:
        """Execute the chosen action from the Decision Agent."""
        t0 = time.time()
        chosen = decision.get("chosen_action", "OPT-REROUTE")
        tickets = []
        reroutes = []
        tool_calls = []

        high_risk = [a for a in affected_assets if a.get("risk_score", 0) > 0.4][:3]

        if chosen in ("OPT-REROUTE", "OPT-HYBRID"):
            for asset in high_risk:
                result = await self.execute_reroute(
                    asset["asset_id"], asset.get("name", asset["asset_id"]), incident_id
                )
                reroutes.append(result["command"])
                tool_calls.append({
                    "tool": "GridRerouteAPI",
                    "method": "PATCH",
                    "endpoint": "/mock/grid/reroute",
                    "payload": {"asset_id": asset["asset_id"], "to_status": "REROUTED"},
                    "result": result["api_result"],
                })

        if chosen in ("OPT-DISPATCH", "OPT-HYBRID"):
            for asset in high_risk:
                location = GeoPoint(lat=asset.get("lat", 40.7), lon=asset.get("lon", -74.0)) if "lat" in asset else None
                result = await self.create_dispatch_ticket(
                    incident_id=incident_id,
                    asset_id=asset["asset_id"],
                    asset_name=asset.get("name", asset["asset_id"]),
                    action_type="EMERGENCY_INSPECTION",
                    priority=RiskLevel(asset.get("risk_level", "HIGH")),
                    instructions=f"Inspect and assess damage at {asset.get('name')}. Storm impact imminent.",
                    location=location,
                )
                tickets.append(result["ticket"])
                tool_calls.append({
                    "tool": "DispatchAPI",
                    "method": "POST",
                    "endpoint": "/mock/dispatch",
                    "payload": {"asset_id": asset["asset_id"], "action_type": "EMERGENCY_INSPECTION"},
                    "result": result["api_result"],
                })

        duration_ms = int((time.time() - t0) * 1000)
        logger.info("Dispatch execution complete", tickets=len(tickets), reroutes=len(reroutes))

        return {
            "agent": self.agent_name.value,
            "action_executed": chosen,
            "dispatch_tickets": tickets,
            "reroute_commands": reroutes,
            "tool_calls": tool_calls,
            "assets_acted_on": len(high_risk),
            "confidence": decision.get("confidence", 0.85),
            "duration_ms": duration_ms,
        }
