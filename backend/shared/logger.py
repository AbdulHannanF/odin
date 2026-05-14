"""
ODIN Structured Agent Trace Logger
Writes JSON logs to /logs/ for every workflow execution.
Satisfies the hackathon mandate for structured workplans, reasoning traces,
decision flows, tool calls, error recovery, and outcome evaluation.
"""
from __future__ import annotations

import json
import time
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import Any, Optional

import structlog
from pydantic import BaseModel

from shared.config import settings
from shared.models import (
    AgentTrace, AgentReasoningStep, ToolCall, ErrorRecovery,
    DecisionFlow, DecisionOption, AgentWorkplan, BeforeAfterState,
    StateSnapshot, DispatchTicket, GridRerouteCommand,
    AgentName, TriggerType, RiskLevel, AssetStatus
)


# ── Configure structlog for pretty console output ────────────────
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(colors=True),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger("odin")


def _default_serializer(obj: Any) -> Any:
    """JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, BaseModel):
        return obj.model_dump()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


class ODINLogger:
    """
    Manages the full lifecycle of an agent workflow trace.

    Usage:
        async with ODINLogger(TriggerType.UNSTRUCTURED_INPUT, raw_text) as tracer:
            tracer.set_workplan(goal, steps, agents)
            tracer.add_reasoning_step(...)
            tracer.add_tool_call(...)
            tracer.set_decision(...)
            tracer.record_before_after(...)
            tracer.set_outcome(success=True, summary="...")
    """

    def __init__(
        self,
        trigger: TriggerType,
        raw_input: Optional[str] = None,
        incident_id: Optional[str] = None,
    ):
        self.run_id = str(uuid.uuid4())
        self._start_time = time.time()
        self._log = logger.bind(run_id=self.run_id, trigger=trigger.value)

        self.trace = AgentTrace(
            run_id=self.run_id,
            trigger=trigger,
            raw_input=raw_input,
            incident_id=incident_id,
        )

    # ── Workplan ─────────────────────────────────────────────────

    def set_workplan(
        self,
        goal: str,
        steps: list[str],
        agents: list[AgentName],
        estimated_duration_s: Optional[float] = None,
    ) -> None:
        self.trace.workplan = AgentWorkplan(
            goal=goal,
            steps=steps,
            agents_involved=agents,
            estimated_duration_s=estimated_duration_s,
        )
        self._log.info("Workplan generated", goal=goal, steps=len(steps))

    # ── Observations ──────────────────────────────────────────────

    def add_observation(self, key: str, value: Any, source: str = "agent") -> None:
        obs = {"key": key, "value": value, "source": source, "timestamp": datetime.utcnow().isoformat()}
        self.trace.observations.append(obs)
        self._log.debug("Observation recorded", key=key, source=source)

    # ── Reasoning Steps ───────────────────────────────────────────

    def add_reasoning_step(
        self,
        agent: AgentName,
        description: str,
        confidence: float = 1.0,
        input_data: Optional[dict[str, Any]] = None,
        output_data: Optional[dict[str, Any]] = None,
        duration_ms: Optional[int] = None,
    ) -> None:
        step = AgentReasoningStep(
            agent=agent,
            step_index=len(self.trace.reasoning_steps),
            description=description,
            input_data=input_data,
            output_data=output_data,
            confidence=confidence,
            duration_ms=duration_ms,
        )
        self.trace.reasoning_steps.append(step)
        self._log.info(
            "Reasoning step",
            agent=agent.value,
            step=len(self.trace.reasoning_steps),
            description=description[:80],
            confidence=confidence,
        )

    # ── Decision Flow ─────────────────────────────────────────────

    def set_decision(
        self,
        options: list[dict[str, Any]],
        chosen_id: str,
        rationale: str,
        confidence: float = 1.0,
    ) -> None:
        parsed_options = [DecisionOption(**opt) for opt in options]
        self.trace.decision_flow = DecisionFlow(
            options=parsed_options,
            chosen_option_id=chosen_id,
            rationale=rationale,
            confidence=confidence,
        )
        self._log.info("Decision made", chosen=chosen_id, confidence=confidence, rationale=rationale[:100])

    # ── Tool Calls ────────────────────────────────────────────────

    def add_tool_call(
        self,
        tool_name: str,
        method: str,
        endpoint: str,
        payload: Optional[dict[str, Any]] = None,
        response: Optional[dict[str, Any]] = None,
        status_code: Optional[int] = None,
        duration_ms: Optional[int] = None,
        success: bool = True,
        error: Optional[str] = None,
    ) -> None:
        call = ToolCall(
            tool_name=tool_name,
            method=method,
            endpoint=endpoint,
            payload=payload,
            response=response,
            status_code=status_code,
            duration_ms=duration_ms,
            success=success,
            error=error,
        )
        self.trace.tool_calls.append(call)
        self._log.info(
            "Tool call executed",
            tool=tool_name,
            endpoint=endpoint,
            status=status_code,
            success=success,
        )

    # ── Error Recovery ────────────────────────────────────────────

    def record_error_recovery(
        self,
        agent: AgentName,
        reason: str,
        fallback_strategy: str,
        fallback_data_source: str,
        degraded_mode: bool = False,
        retry_count: int = 0,
    ) -> None:
        self.trace.error_recovery = ErrorRecovery(
            triggered=True,
            agent=agent,
            reason=reason,
            fallback_strategy=fallback_strategy,
            fallback_data_source=fallback_data_source,
            degraded_mode=degraded_mode,
            retry_count=retry_count,
            timestamp=datetime.utcnow(),
        )
        self._log.warning(
            "Error recovery triggered",
            agent=agent.value,
            reason=reason,
            fallback=fallback_strategy,
            degraded=degraded_mode,
        )

    # ── Before / After State ──────────────────────────────────────

    def record_before_after(
        self,
        asset_id: str,
        asset_name: str,
        before_status: AssetStatus,
        before_risk: RiskLevel,
        before_risk_score: float,
        after_status: AssetStatus,
        after_risk: RiskLevel,
        after_risk_score: float,
        change_reason: str,
        triggered_by: str,
        ticket_id: Optional[str] = None,
    ) -> None:
        before = StateSnapshot(
            asset_id=asset_id,
            status=before_status,
            risk_level=before_risk,
            risk_score=before_risk_score,
        )
        after = StateSnapshot(
            asset_id=asset_id,
            status=after_status,
            risk_level=after_risk,
            risk_score=after_risk_score,
        )
        ba = BeforeAfterState(
            asset_id=asset_id,
            asset_name=asset_name,
            before=before,
            after=after,
            change_reason=change_reason,
            triggered_by=triggered_by,
            ticket_id=ticket_id,
        )
        self.trace.before_after.append(ba)
        self.trace.before_states.append(before)
        self.trace.after_states.append(after)
        self._log.info(
            "State change recorded",
            asset=asset_name,
            before=before_status.value,
            after=after_status.value,
        )

    # ── Dispatch Tickets ──────────────────────────────────────────

    def add_dispatch_ticket(self, ticket: DispatchTicket) -> None:
        self.trace.dispatch_tickets.append(ticket)
        self._log.info("Dispatch ticket added", ticket_id=ticket.ticket_id, action=ticket.action_type)

    def add_reroute_command(self, cmd: GridRerouteCommand) -> None:
        self.trace.reroute_commands.append(cmd)
        self._log.info("Reroute command added", command_id=cmd.command_id, success=cmd.success)

    # ── Outcome ───────────────────────────────────────────────────

    def set_outcome(self, success: bool, summary: str, confidence: float = 1.0) -> None:
        self.trace.outcome_success = success
        self.trace.outcome_summary = summary
        self.trace.overall_confidence = confidence
        elapsed_ms = int((time.time() - self._start_time) * 1000)
        self.trace.total_duration_ms = elapsed_ms
        self._log.info(
            "Workflow outcome",
            success=success,
            confidence=confidence,
            duration_ms=elapsed_ms,
            summary=summary[:120],
        )

    # ── Persist to Disk ───────────────────────────────────────────

    def save(self) -> Path:
        """Write the full trace to /logs/{timestamp}_{run_id}.json"""
        log_dir: Path = settings.odin_log_dir
        log_dir.mkdir(parents=True, exist_ok=True)

        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
        filename = f"{ts}_{self.run_id[:8]}.json"
        path = log_dir / filename

        with open(path, "w", encoding="utf-8") as f:
            json.dump(
                self.trace.model_dump(),
                f,
                indent=2,
                default=_default_serializer,
            )

        self._log.info("Trace saved", path=str(path), run_id=self.run_id)
        return path

    # ── Context Manager ───────────────────────────────────────────

    async def __aenter__(self) -> "ODINLogger":
        self._log.info("Workflow started")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is not None:
            self._log.error("Workflow failed with exception", exc=str(exc_val))
            self.set_outcome(success=False, summary=f"Exception: {exc_val}", confidence=0.0)
        self.save()

    def __enter__(self) -> "ODINLogger":
        self._log.info("Workflow started (sync)")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is not None:
            self._log.error("Workflow failed", exc=str(exc_val))
            self.set_outcome(success=False, summary=f"Exception: {exc_val}", confidence=0.0)
        self.save()
