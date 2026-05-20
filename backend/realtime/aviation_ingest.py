"""
OpenSky Network ADS-B poller.

Anonymous endpoint: https://opensky-network.org/api/states/all
No API key required (rate-limited to ~10 s for anonymous).
Returns ~5k–15k airborne aircraft globally.

If the API is unreachable the worker emits a degraded envelope built
from the last successful snapshot so the globe keeps showing planes.
"""
from __future__ import annotations
import asyncio
from typing import Any

import httpx
import structlog

from .ws_manager import hub

logger = structlog.get_logger("odin.realtime.aviation")

OPENSKY_URL = "https://opensky-network.org/api/states/all"
POLL_INTERVAL_S = 12.0      # be polite — anon limit is 10s
HTTP_TIMEOUT_S = 8.0


def _decode_state(s: list[Any]) -> dict[str, Any] | None:
    # OpenSky state vector schema:
    # 0 icao24, 1 callsign, 2 origin_country, 3 time_position, 4 last_contact,
    # 5 lon, 6 lat, 7 baro_alt, 8 on_ground, 9 velocity, 10 heading,
    # 11 vert_rate, 12 sensors, 13 geo_alt, 14 squawk, 15 spi, 16 position_source
    try:
        if s[5] is None or s[6] is None:
            return None
        return {
            "id": s[0],
            "callsign": (s[1] or "").strip() or None,
            "country": s[2],
            "lon": float(s[5]),
            "lat": float(s[6]),
            "alt_m": float(s[7]) if s[7] is not None else None,
            "on_ground": bool(s[8]),
            "velocity_ms": float(s[9]) if s[9] is not None else None,
            "heading_deg": float(s[10]) if s[10] is not None else None,
            "vert_rate_ms": float(s[11]) if s[11] is not None else None,
        }
    except Exception:
        return None


async def fetch_once(client: httpx.AsyncClient) -> list[dict[str, Any]]:
    r = await client.get(OPENSKY_URL, timeout=HTTP_TIMEOUT_S)
    r.raise_for_status()
    states = (r.json() or {}).get("states") or []
    out: list[dict[str, Any]] = []
    for s in states:
        d = _decode_state(s)
        if d is not None and not d["on_ground"]:
            out.append(d)
    return out


async def run() -> None:
    consecutive_failures = 0
    backoff = POLL_INTERVAL_S
    async with httpx.AsyncClient(headers={"User-Agent": "ODIN/1.0"}) as client:
        while True:
            try:
                planes = await fetch_once(client)
                consecutive_failures = 0
                backoff = POLL_INTERVAL_S
                await hub.publish(
                    "flights",
                    {"count": len(planes), "items": planes[:4000], "source": "opensky"},
                    degraded=False,
                )
                logger.info("flights tick", count=len(planes))
            except Exception as exc:
                consecutive_failures += 1
                backoff = min(POLL_INTERVAL_S * 2 ** consecutive_failures, 120)
                last = hub.snapshot("flights")
                items = (last or {}).get("data", {}).get("items", []) if last else []
                await hub.publish(
                    "flights",
                    {"count": len(items), "items": items, "source": "opensky_cache", "error": str(exc)},
                    degraded=True,
                    cache_snapshot=False,
                )
                logger.warning("opensky failed, serving cache", error=str(exc), backoff=backoff)
            await asyncio.sleep(backoff)
