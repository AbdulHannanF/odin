"""
Maritime (AIS) ingest.

AISStream.io provides a free WebSocket stream of global AIS but requires a
free API key. If `AISSTREAM_API_KEY` is set we connect; otherwise we emit
a deterministic synthetic fleet so the globe still has moving ships.
"""
from __future__ import annotations
import asyncio
import json
import math
import random
import time
from typing import Any

import structlog

from shared.config import settings
from .ws_manager import hub

logger = structlog.get_logger("odin.realtime.ships")

AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream"
SYNTHETIC_INTERVAL_S = 5.0
SYNTHETIC_FLEET_SIZE = 220


def _seed_synthetic_fleet() -> list[dict[str, Any]]:
    rng = random.Random(20260519)
    types = ["TANKER", "CARGO", "CONTAINER", "BULK", "PASSENGER", "FISHING", "MILITARY"]
    routes = [
        # (origin_lon, origin_lat, dest_lon, dest_lat, name_prefix)
        (-74.0, 40.7, -9.1, 38.7, "TRA"),   # NY → Lisbon
        (121.5, 31.2, -118.3, 33.7, "PAC"), # Shanghai → LA
        (55.3, 25.2, 103.8, 1.3, "GLF"),    # Dubai → Singapore
        (4.5, 51.9, -74.0, 10.4, "ATL"),    # Rotterdam → Cartagena
        (114.2, 22.3, 139.7, 35.7, "EAS"),  # Hong Kong → Tokyo
        (32.6, 30.0, 12.5, 41.9, "MED"),    # Suez → Rome
    ]
    fleet: list[dict[str, Any]] = []
    for i in range(SYNTHETIC_FLEET_SIZE):
        olon, olat, dlon, dlat, prefix = rng.choice(routes)
        t = rng.random()
        lon = olon + (dlon - olon) * t + rng.uniform(-2, 2)
        lat = olat + (dlat - olat) * t + rng.uniform(-1.5, 1.5)
        fleet.append({
            "id": f"{prefix}-{i:04d}",
            "name": f"{prefix} VESSEL {i:04d}",
            "type": rng.choice(types),
            "lon": ((lon + 180) % 360) - 180,
            "lat": max(-78, min(78, lat)),
            "heading_deg": math.degrees(math.atan2(dlat - olat, dlon - olon)) + rng.uniform(-15, 15),
            "speed_kn": rng.uniform(6, 22),
            "_origin": (olon, olat),
            "_dest": (dlon, dlat),
            "_progress": t,
        })
    return fleet


def _advance(fleet: list[dict[str, Any]], dt: float) -> list[dict[str, Any]]:
    for v in fleet:
        olon, olat = v["_origin"]
        dlon, dlat = v["_dest"]
        v["_progress"] = (v["_progress"] + dt * (v["speed_kn"] * 0.0008) * 0.01) % 1.0
        t = v["_progress"]
        lon = olon + (dlon - olon) * t
        lat = olat + (dlat - olat) * t
        v["lon"] = ((lon + 180) % 360) - 180
        v["lat"] = max(-78, min(78, lat))
    return [
        {k: v[k] for k in ("id", "name", "type", "lon", "lat", "heading_deg", "speed_kn")}
        for v in fleet
    ]


async def _run_synthetic() -> None:
    fleet = _seed_synthetic_fleet()
    last = time.time()
    while True:
        now = time.time()
        dt = now - last
        last = now
        items = _advance(fleet, dt)
        await hub.publish(
            "ships",
            {"count": len(items), "items": items, "source": "synthetic"},
            degraded=True,
        )
        await asyncio.sleep(SYNTHETIC_INTERVAL_S)


async def _run_aisstream(api_key: str) -> None:
    try:
        import websockets  # type: ignore
    except Exception as exc:
        logger.warning("websockets lib missing, falling back to synthetic", error=str(exc))
        await _run_synthetic()
        return

    sub = {
        "APIKey": api_key,
        "BoundingBoxes": [[[-85, -180], [85, 180]]],
        "FilterMessageTypes": ["PositionReport"],
    }
    fleet: dict[str, dict[str, Any]] = {}
    last_emit = 0.0
    while True:
        try:
            async with websockets.connect(AISSTREAM_URL, ping_interval=20) as ws:  # type: ignore
                await ws.send(json.dumps(sub))
                async for raw in ws:
                    try:
                        msg = json.loads(raw)
                    except Exception:
                        continue
                    if msg.get("MessageType") != "PositionReport":
                        continue
                    m = (msg.get("Message") or {}).get("PositionReport") or {}
                    mmsi = msg.get("MetaData", {}).get("MMSI") or m.get("UserID")
                    if mmsi is None:
                        continue
                    fleet[str(mmsi)] = {
                        "id": str(mmsi),
                        "name": (msg.get("MetaData") or {}).get("ShipName") or str(mmsi),
                        "type": "VESSEL",
                        "lon": m.get("Longitude"),
                        "lat": m.get("Latitude"),
                        "heading_deg": m.get("TrueHeading"),
                        "speed_kn": m.get("Sog"),
                    }
                    now = time.time()
                    if now - last_emit > 4.0:
                        items = [v for v in fleet.values() if v["lon"] is not None and v["lat"] is not None]
                        await hub.publish("ships", {"count": len(items), "items": items[:3000], "source": "aisstream"})
                        last_emit = now
        except Exception as exc:
            logger.warning("aisstream connection lost, reconnecting", error=str(exc))
            await asyncio.sleep(5.0)


async def run() -> None:
    api_key = getattr(settings, "aisstream_api_key", "") or ""
    if api_key:
        logger.info("AIS source: aisstream.io")
        await _run_aisstream(api_key)
    else:
        logger.info("AIS source: synthetic fleet (no AISSTREAM_API_KEY set)")
        await _run_synthetic()
