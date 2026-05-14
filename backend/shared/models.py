"""
ODIN Shared Pydantic Models
All data structures shared across the platform: agents, API, DB, logging.
"""
from __future__ import annotations
from enum import Enum
from typing import Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


# ═══════════════════════════════════════════════════════════════════
# Enumerations
# ═══════════════════════════════════════════════════════════════════

class AssetStatus(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    VULNERABLE = "VULNERABLE"
    DEGRADED = "DEGRADED"
    OFFLINE = "OFFLINE"
    REROUTED = "REROUTED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"


class AssetType(str, Enum):
    SUBSTATION = "SUBSTATION"
    TRANSMISSION_LINE = "TRANSMISSION_LINE"
    POWER_PLANT = "POWER_PLANT"
    WIND_TURBINE = "WIND_TURBINE"
    DATACENTER = "DATACENTER"
    HOSPITAL = "HOSPITAL"
    TELECOM_TOWER = "TELECOM_TOWER"
    WATER_TREATMENT = "WATER_TREATMENT"
    MINERAL_SITE = "MINERAL_SITE"


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"


class AgentName(str, Enum):
    CLIMATE = "ClimateAgent"
    WIND = "WindAgent"
    RESOURCE = "ResourceAgent"
    CASCADE = "CascadeAgent"
    DECISION = "DecisionAgent"
    DISPATCH = "DispatchAgent"
    REFLECTION = "ReflectionAgent"
    ORCHESTRATOR = "Orchestrator"


class TriggerType(str, Enum):
    UNSTRUCTURED_INPUT = "unstructured_input"
    NL_QUERY = "nl_query"
    SCHEDULED = "scheduled"
    ALERT = "alert"
    MANUAL = "manual"


class DispatchStatus(str, Enum):
    PENDING = "PENDING"
    DISPATCHED = "DISPATCHED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"


# ═══════════════════════════════════════════════════════════════════
# Geospatial Primitives
# ═══════════════════════════════════════════════════════════════════

class GeoPoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)

    def to_geojson_coords(self) -> list[float]:
        return [self.lon, self.lat]


class GeoBoundingBox(BaseModel):
    min_lat: float
    min_lon: float
    max_lat: float
    max_lon: float


# ═══════════════════════════════════════════════════════════════════
# Infrastructure Assets
# ═══════════════════════════════════════════════════════════════════

class InfrastructureAsset(BaseModel):
    asset_id: str = Field(default_factory=lambda: f"ASSET-{uuid.uuid4().hex[:8].upper()}")
    name: str
    asset_type: AssetType
    location: GeoPoint
    status: AssetStatus = AssetStatus.OPERATIONAL
    risk_level: RiskLevel = RiskLevel.NONE
    risk_score: float = Field(0.0, ge=0.0, le=1.0)
    capacity_mw: Optional[float] = None
    dependencies: list[str] = Field(default_factory=list)  # Asset IDs
    metadata: dict[str, Any] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class TransmissionLine(BaseModel):
    line_id: str = Field(default_factory=lambda: f"TL-{uuid.uuid4().hex[:6].upper()}")
    name: str
    from_asset_id: str
    to_asset_id: str
    voltage_kv: float
    length_km: float
    status: AssetStatus = AssetStatus.OPERATIONAL
    risk_score: float = Field(0.0, ge=0.0, le=1.0)
    coordinates: list[GeoPoint] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════
# Incidents & Events
# ═══════════════════════════════════════════════════════════════════

class Incident(BaseModel):
    incident_id: str = Field(default_factory=lambda: f"INC-{uuid.uuid4().hex[:8].upper()}")
    title: str
    description: str
    severity: RiskLevel
    affected_region: Optional[GeoBoundingBox] = None
    affected_assets: list[str] = Field(default_factory=list)
    source: str = "unstructured_input"
    raw_text: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved: bool = False


class WeatherAlert(BaseModel):
    alert_id: str = Field(default_factory=lambda: f"WX-{uuid.uuid4().hex[:6].upper()}")
    event_type: str  # e.g., "SEVERE_STORM", "FLOOD", "WILDFIRE"
    severity: RiskLevel
    region: GeoBoundingBox
    wind_speed_kmh: Optional[float] = None
    precipitation_mm: Optional[float] = None
    temperature_c: Optional[float] = None
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None
    source: str = "synthetic"


class WindVector(BaseModel):
    location: GeoPoint
    u_component: float   # East-West m/s
    v_component: float   # North-South m/s
    speed_ms: float
    direction_deg: float
    altitude_m: float = 100.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════
# Dispatch & Actions
# ═══════════════════════════════════════════════════════════════════

class DispatchTicket(BaseModel):
    ticket_id: str = Field(default_factory=lambda: f"DISP-{str(uuid.uuid4().int)[:4].zfill(4)}")
    incident_id: str
    asset_id: str
    action_type: str  # "MAINTENANCE", "INSPECTION", "EMERGENCY_REPAIR", "REROUTE"
    priority: RiskLevel
    assigned_team: Optional[str] = None
    location: Optional[GeoPoint] = None
    instructions: str = ""
    status: DispatchStatus = DispatchStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    notes: str = ""


class GridRerouteCommand(BaseModel):
    command_id: str = Field(default_factory=lambda: f"CMD-{uuid.uuid4().hex[:8].upper()}")
    asset_id: str
    from_status: AssetStatus
    to_status: AssetStatus
    reason: str
    executed_at: datetime = Field(default_factory=datetime.utcnow)
    success: bool = False
    error: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════
# Before / After State (Hackathon Requirement)
# ═══════════════════════════════════════════════════════════════════

class StateSnapshot(BaseModel):
    asset_id: str
    status: AssetStatus
    risk_level: RiskLevel
    risk_score: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)


class BeforeAfterState(BaseModel):
    asset_id: str
    asset_name: str
    before: StateSnapshot
    after: StateSnapshot
    change_reason: str
    triggered_by: str  # agent name or action
    ticket_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════
# Agent Reasoning & Logging
# ═══════════════════════════════════════════════════════════════════

class AgentReasoningStep(BaseModel):
    agent: AgentName
    step_index: int
    description: str
    input_data: Optional[dict[str, Any]] = None
    output_data: Optional[dict[str, Any]] = None
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    duration_ms: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DecisionOption(BaseModel):
    option_id: str
    description: str
    score: float
    economic_impact_usd: float
    human_impact_score: float
    resource_cost: float
    confidence: float


class DecisionFlow(BaseModel):
    options: list[DecisionOption]
    chosen_option_id: str
    rationale: str
    confidence: float


class ToolCall(BaseModel):
    tool_name: str
    method: str  # GET, POST, PATCH, etc.
    endpoint: str
    payload: Optional[dict[str, Any]] = None
    response: Optional[dict[str, Any]] = None
    status_code: Optional[int] = None
    duration_ms: Optional[int] = None
    success: bool = True
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorRecovery(BaseModel):
    triggered: bool = False
    agent: Optional[AgentName] = None
    reason: Optional[str] = None
    fallback_strategy: Optional[str] = None
    fallback_data_source: Optional[str] = None
    degraded_mode: bool = False
    retry_count: int = 0
    timestamp: Optional[datetime] = None


class AgentWorkplan(BaseModel):
    goal: str
    steps: list[str]
    estimated_duration_s: Optional[float] = None
    agents_involved: list[AgentName] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════
# Master Agent Trace (The Hackathon Log Object)
# ═══════════════════════════════════════════════════════════════════

class AgentTrace(BaseModel):
    """
    The complete structured log for one ODIN workflow execution.
    Written to /logs/{timestamp}_{run_id}.json after every run.
    """
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trigger: TriggerType
    raw_input: Optional[str] = None
    incident_id: Optional[str] = None

    # Planning
    workplan: Optional[AgentWorkplan] = None

    # Execution
    observations: list[dict[str, Any]] = Field(default_factory=list)
    reasoning_steps: list[AgentReasoningStep] = Field(default_factory=list)
    decision_flow: Optional[DecisionFlow] = None
    tool_calls: list[ToolCall] = Field(default_factory=list)

    # Error handling
    error_recovery: ErrorRecovery = Field(default_factory=ErrorRecovery)

    # Outcome
    before_states: list[StateSnapshot] = Field(default_factory=list)
    after_states: list[StateSnapshot] = Field(default_factory=list)
    before_after: list[BeforeAfterState] = Field(default_factory=list)
    dispatch_tickets: list[DispatchTicket] = Field(default_factory=list)
    reroute_commands: list[GridRerouteCommand] = Field(default_factory=list)

    # Evaluation
    outcome_success: bool = False
    outcome_summary: str = ""
    overall_confidence: float = Field(1.0, ge=0.0, le=1.0)
    total_duration_ms: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════
# API Request / Response Models
# ═══════════════════════════════════════════════════════════════════

class IngestRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Unstructured text to process")
    source: str = Field("user_input", description="Origin of the text")
    priority: RiskLevel = RiskLevel.MEDIUM


class IngestResponse(BaseModel):
    run_id: str
    incident_id: Optional[str]
    message: str
    status: str


class NLQueryRequest(BaseModel):
    query: str = Field(..., min_length=5)
    context: Optional[dict[str, Any]] = None


class NLQueryResponse(BaseModel):
    query: str
    answer: str
    geojson_overlay: Optional[dict[str, Any]] = None
    map_center: Optional[GeoPoint] = None
    zoom_level: Optional[int] = None
    data_sources: list[str] = Field(default_factory=list)
    confidence: float = 1.0
    run_id: Optional[str] = None


class MineralData(BaseModel):
    mineral_id: str
    mineral_type: str  # lithium, cobalt, copper, etc.
    location: GeoPoint
    estimated_reserves_mt: float
    country: str
    region: str
    geopolitical_risk: RiskLevel
    supply_chain_criticality: float = Field(0.0, ge=0.0, le=1.0)
