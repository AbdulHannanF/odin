"""
Multi-channel WebSocket fan-out hub.

Each connected client subscribes to one or more channels (flights, ships,
satellites, weather, earthquakes, agents). Ingest workers publish JSON
envelopes into a channel; the hub forwards to subscribers.

Snapshots are cached so a new subscriber gets the most recent state
without waiting for the next poll cycle.
"""
from __future__ import annotations
import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Iterable

from fastapi import WebSocket
import structlog

logger = structlog.get_logger("odin.realtime.hub")

VALID_CHANNELS = {"flights", "ships", "satellites", "weather", "earthquakes", "agents"}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class RealtimeHub:
    """Pub/sub over WebSockets for ODIN's live data streams."""

    def __init__(self) -> None:
        self._subs: dict[str, set[WebSocket]] = defaultdict(set)
        self._snapshots: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    # ── Subscriber management ────────────────────────────────────────
    async def subscribe(self, ws: WebSocket, channels: Iterable[str]) -> list[str]:
        accepted: list[str] = []
        async with self._lock:
            for ch in channels:
                if ch in VALID_CHANNELS:
                    self._subs[ch].add(ws)
                    accepted.append(ch)
        for ch in accepted:
            snap = self._snapshots.get(ch)
            if snap is not None:
                try:
                    await ws.send_json({"channel": ch, "event": "snapshot", **snap})
                except Exception:
                    pass
        return accepted

    async def unsubscribe_all(self, ws: WebSocket) -> None:
        async with self._lock:
            for subs in self._subs.values():
                subs.discard(ws)

    # ── Publishing ───────────────────────────────────────────────────
    async def publish(
        self,
        channel: str,
        payload: dict[str, Any],
        *,
        cache_snapshot: bool = True,
        degraded: bool = False,
    ) -> int:
        if channel not in VALID_CHANNELS:
            logger.warning("publish to unknown channel", channel=channel)
            return 0
        envelope = {
            "channel": channel,
            "event": "tick",
            "ts": _utc_now_iso(),
            "degraded": degraded,
            "data": payload,
        }
        if cache_snapshot:
            self._snapshots[channel] = {"ts": envelope["ts"], "degraded": degraded, "data": payload}
        dead: list[WebSocket] = []
        targets = list(self._subs.get(channel, ()))
        for ws in targets:
            try:
                await ws.send_json(envelope)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    for subs in self._subs.values():
                        subs.discard(ws)
        return len(targets) - len(dead)

    def snapshot(self, channel: str) -> dict[str, Any] | None:
        return self._snapshots.get(channel)

    def stats(self) -> dict[str, Any]:
        return {
            "channels": {ch: len(subs) for ch, subs in self._subs.items()},
            "snapshots_cached": list(self._snapshots.keys()),
            "ts": _utc_now_iso(),
        }


hub = RealtimeHub()
