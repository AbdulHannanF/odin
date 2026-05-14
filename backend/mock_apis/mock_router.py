"""
ODIN Mock APIs — Dispatch, Grid Reroute, and CRM
Simulated external API endpoints for hackathon demonstration.
These implement the "execute simulated action" requirement.
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/mock", tags=["Mock APIs"])

# In-memory state stores (replaces real databases for mock purposes)
_dispatch_tickets: dict[str, Any] = {}
_grid_states: dict[str, Any] = {}
_crm_tickets: dict[str, Any] = {}


# ══════════════════════════════════════════════════════════════════
# Dispatch API
# ══════════════════════════════════════════════════════════════════

class DispatchRequest(BaseModel):
    ticket_id: str | None = None
    incident_id: str
    asset_id: str
    asset_name: str | None = None
    action_type: str
    priority: str = "HIGH"
    instructions: str = ""
    assigned_team: str = "ALPHA-RESPONSE-TEAM"
    status: str = "PENDING"


class DispatchResponse(BaseModel):
    ticket_id: str
    incident_id: str
    asset_id: str
    action_type: str
    priority: str
    assigned_team: str
    status: str
    created_at: str
    message: str


@router.post("/dispatch", response_model=DispatchResponse, summary="Create dispatch ticket")
async def create_dispatch(req: DispatchRequest):
    """
    Mock dispatch API. Creates a maintenance/emergency ticket.
    Simulates: POST to a real field management system.
    """
    ticket_id = req.ticket_id or f"DISP-{str(uuid.uuid4().int)[:4].zfill(4)}"
    ticket = {
        "ticket_id": ticket_id,
        "incident_id": req.incident_id,
        "asset_id": req.asset_id,
        "asset_name": req.asset_name or req.asset_id,
        "action_type": req.action_type,
        "priority": req.priority,
        "instructions": req.instructions,
        "assigned_team": req.assigned_team,
        "status": "DISPATCHED",
        "created_at": datetime.utcnow().isoformat(),
    }
    _dispatch_tickets[ticket_id] = ticket
    return DispatchResponse(
        **ticket,
        message=f"Team {req.assigned_team} dispatched to asset {req.asset_id}."
    )


@router.get("/dispatch/{ticket_id}", summary="Get dispatch ticket status")
async def get_dispatch(ticket_id: str):
    if ticket_id not in _dispatch_tickets:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    return _dispatch_tickets[ticket_id]


@router.get("/dispatch", summary="List all dispatch tickets")
async def list_dispatch():
    return {"tickets": list(_dispatch_tickets.values()), "count": len(_dispatch_tickets)}


# ══════════════════════════════════════════════════════════════════
# Grid Reroute API
# ══════════════════════════════════════════════════════════════════

class RerouteRequest(BaseModel):
    asset_id: str
    from_status: str = "VULNERABLE"
    to_status: str = "REROUTED"
    reason: str = ""
    incident_id: str | None = None


class RerouteResponse(BaseModel):
    command_id: str
    asset_id: str
    previous_status: str
    new_status: str
    reason: str
    executed_at: str
    success: bool
    message: str


@router.patch("/grid/reroute", response_model=RerouteResponse, summary="Reroute grid segment")
async def reroute_grid(req: RerouteRequest):
    """
    Mock grid reroute API. Changes an asset's operational status.
    Demonstrates: PATCH state change → Before: VULNERABLE → After: REROUTED.
    """
    cmd_id = f"CMD-{uuid.uuid4().hex[:8].upper()}"
    previous = _grid_states.get(req.asset_id, {}).get("status", req.from_status)
    _grid_states[req.asset_id] = {
        "asset_id": req.asset_id,
        "status": req.to_status,
        "previous_status": previous,
        "last_command_id": cmd_id,
        "last_updated": datetime.utcnow().isoformat(),
        "reason": req.reason,
    }
    return RerouteResponse(
        command_id=cmd_id,
        asset_id=req.asset_id,
        previous_status=previous,
        new_status=req.to_status,
        reason=req.reason,
        executed_at=datetime.utcnow().isoformat(),
        success=True,
        message=f"Grid segment {req.asset_id} status changed: {previous} → {req.to_status}",
    )


@router.get("/grid/status/{asset_id}", summary="Get grid asset status")
async def get_grid_status(asset_id: str):
    """Returns current and previous grid state — enables Before/After comparison."""
    state = _grid_states.get(asset_id)
    if not state:
        return {
            "asset_id": asset_id,
            "status": "OPERATIONAL",
            "previous_status": None,
            "last_updated": None,
            "message": "No state changes recorded for this asset",
        }
    return state


@router.get("/grid/states", summary="Get all grid state changes")
async def get_all_grid_states():
    return {"states": list(_grid_states.values()), "count": len(_grid_states)}


# ══════════════════════════════════════════════════════════════════
# CRM Tickets API
# ══════════════════════════════════════════════════════════════════

class CRMTicketRequest(BaseModel):
    incident_id: str
    title: str
    description: str
    severity: str = "HIGH"
    asset_id: str | None = None
    before_state: dict[str, Any] | None = None
    after_state: dict[str, Any] | None = None
    assigned_to: str = "OPS-TEAM-A"


@router.post("/crm/ticket", summary="Create CRM incident ticket")
async def create_crm_ticket(req: CRMTicketRequest):
    """
    Mock CRM API. Creates an incident ticket with before/after state for audit trail.
    """
    ticket_id = f"CRM-{uuid.uuid4().hex[:6].upper()}"
    ticket = {
        "ticket_id": ticket_id,
        "incident_id": req.incident_id,
        "title": req.title,
        "description": req.description,
        "severity": req.severity,
        "asset_id": req.asset_id,
        "before_state": req.before_state,
        "after_state": req.after_state,
        "assigned_to": req.assigned_to,
        "status": "OPEN",
        "created_at": datetime.utcnow().isoformat(),
    }
    _crm_tickets[ticket_id] = ticket
    return {"ticket_id": ticket_id, "status": "OPEN", "message": f"CRM ticket {ticket_id} created successfully."}


@router.get("/crm/tickets", summary="List all CRM tickets")
async def list_crm_tickets():
    return {"tickets": list(_crm_tickets.values()), "count": len(_crm_tickets)}


@router.get("/crm/ticket/{ticket_id}", summary="Get CRM ticket")
async def get_crm_ticket(ticket_id: str):
    if ticket_id not in _crm_tickets:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="CRM ticket not found")
    return _crm_tickets[ticket_id]
