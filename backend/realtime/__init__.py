"""
ODIN Real-Time Streaming Subsystem
==================================

Per-channel ingest workers + a multi-channel WebSocket fan-out manager.

Channels:
    flights       OpenSky Network ADS-B (no API key)
    ships         AISStream / synthetic fallback
    satellites    CelesTrak TLE + skyfield propagation
    weather       Open-Meteo (no API key)
    earthquakes   USGS GeoJSON feed (no API key)
    agents        Internal: orchestrator pushes pipeline events

All channels degrade gracefully: if the upstream is unreachable the worker
emits a `degraded: true` envelope so the UI keeps rendering cached state.
"""
from .ws_manager import RealtimeHub, hub
from .runner import start_realtime_workers, stop_realtime_workers

__all__ = ["RealtimeHub", "hub", "start_realtime_workers", "stop_realtime_workers"]
