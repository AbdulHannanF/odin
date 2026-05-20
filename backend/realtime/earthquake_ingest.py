"""
USGS Earthquakes feed.

No API key. Refreshes every 90 s. Emits each event as a GeoJSON-ish dict
the frontend renders as a pulsing red ring with magnitude-scaled radius.
"""
from __future__ import annotations
import asyncio
from typing import Any

import httpx
import structlog

from .ws_manager import hub

logger = structlog.get_logger("odin.realtime.quakes")

USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
POLL_INTERVAL_S = 90.0
HTTP_TIMEOUT_S = 10.0


def _to_quake(feat: dict[str, Any]) -> dict[str, Any] | None:
    try:
        props = feat.get("properties", {}) or {}
        geom = feat.get("geometry", {}) or {}
        coords = geom.get("coordinates", []) or []
        if len(coords) < 2:
            return None
        return {
            "id": feat.get("id"),
            "mag": props.get("mag"),
            "place": props.get("place"),
            "time": props.get("time"),
            "url": props.get("url"),
            "tsunami": bool(props.get("tsunami")),
            "lon": float(coords[0]),
            "lat": float(coords[1]),
            "depth_km": float(coords[2]) if len(coords) > 2 else None,
        }
    except Exception:
        return None


async def run() -> None:
    backoff = POLL_INTERVAL_S
    async with httpx.AsyncClient(headers={"User-Agent": "ODIN/1.0"}) as client:
        while True:
            try:
                r = await client.get(USGS_URL, timeout=HTTP_TIMEOUT_S)
                r.raise_for_status()
                feats = (r.json() or {}).get("features") or []
                items = [q for q in (_to_quake(f) for f in feats) if q is not None]
                items.sort(key=lambda x: x.get("time") or 0, reverse=True)
                await hub.publish("earthquakes", {"count": len(items), "items": items[:500], "source": "usgs"})
                logger.info("usgs tick", count=len(items))
                backoff = POLL_INTERVAL_S
            except Exception as exc:
                last = hub.snapshot("earthquakes")
                items = (last or {}).get("data", {}).get("items", []) if last else []
                await hub.publish(
                    "earthquakes",
                    {"count": len(items), "items": items, "source": "usgs_cache", "error": str(exc)},
                    degraded=True,
                    cache_snapshot=False,
                )
                backoff = min(POLL_INTERVAL_S * 2, 600)
                logger.warning("usgs failed", error=str(exc))
            await asyncio.sleep(backoff)
