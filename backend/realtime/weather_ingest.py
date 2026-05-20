"""
Open-Meteo weather snapshots.

No API key. We sample a coarse global grid every 10 minutes and emit
wind + temperature per cell so the frontend can paint a wind/temp overlay
without each client hammering Open-Meteo directly.
"""
from __future__ import annotations
import asyncio
from typing import Any

import httpx
import structlog

from .ws_manager import hub

logger = structlog.get_logger("odin.realtime.weather")

POLL_INTERVAL_S = 600.0
HTTP_TIMEOUT_S = 12.0

# 6 × 12 grid (~30° spacing) keeps response small and avoids rate limits.
GRID_LATS = [-60.0, -30.0, 0.0, 30.0, 45.0, 60.0]
GRID_LONS = [-150.0, -120.0, -90.0, -60.0, -30.0, 0.0, 30.0, 60.0, 90.0, 120.0, 150.0, 180.0]

URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lats}&longitude={lons}"
    "&current=temperature_2m,wind_speed_10m,wind_direction_10m"
    "&timezone=UTC"
)


async def _fetch_grid(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    lats = ",".join(str(la) for la in GRID_LATS for _ in GRID_LONS)
    lons = ",".join(str(lo) for _ in GRID_LATS for lo in GRID_LONS)
    r = await client.get(URL.format(lats=lats, lons=lons), timeout=HTTP_TIMEOUT_S)
    r.raise_for_status()
    payload = r.json()
    # Open-Meteo returns a list when multiple coords are provided
    rows = payload if isinstance(payload, list) else [payload]
    out: list[dict[str, Any]] = []
    flat = [(la, lo) for la in GRID_LATS for lo in GRID_LONS]
    for (la, lo), row in zip(flat, rows):
        cur = row.get("current") or {}
        out.append({
            "lat": la, "lon": lo,
            "temp_c": cur.get("temperature_2m"),
            "wind_ms": cur.get("wind_speed_10m"),
            "wind_dir_deg": cur.get("wind_direction_10m"),
        })
    return out


async def run() -> None:
    async with httpx.AsyncClient(headers={"User-Agent": "ODIN/1.0"}) as client:
        while True:
            try:
                cells = await _fetch_grid(client)
                await hub.publish("weather", {"count": len(cells), "items": cells, "source": "open-meteo"})
                logger.info("weather tick", count=len(cells))
            except Exception as exc:
                last = hub.snapshot("weather")
                items = (last or {}).get("data", {}).get("items", []) if last else []
                await hub.publish(
                    "weather",
                    {"count": len(items), "items": items, "source": "open-meteo_cache", "error": str(exc)},
                    degraded=True,
                    cache_snapshot=False,
                )
                logger.warning("open-meteo failed", error=str(exc))
            await asyncio.sleep(POLL_INTERVAL_S)
