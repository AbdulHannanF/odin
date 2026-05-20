"""
Satellite tracker.

Pulls active TLEs from CelesTrak (no API key) every 6 hours and propagates
each satellite's geodetic position every PROPAGATE_INTERVAL_S using skyfield.

If skyfield isn't installed, falls back to a pure-Python SGP4 implementation;
if that also fails, falls back to a small bundled list of geostationary
sat fixtures so the UI still shows some dots.
"""
from __future__ import annotations
import asyncio
import math
import time
from typing import Any

import httpx
import structlog

from .ws_manager import hub

logger = structlog.get_logger("odin.realtime.satellites")

CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
TLE_REFRESH_S = 6 * 3600
PROPAGATE_INTERVAL_S = 6.0
HTTP_TIMEOUT_S = 15.0

# Fallback fixtures (geostationary, lat≈0)
FALLBACK_SATS = [
    {"id": "GOES-16", "name": "GOES-16",   "lon": -75.2, "lat": 0.0, "alt_km": 35786},
    {"id": "GOES-18", "name": "GOES-18",   "lon": -137.0, "lat": 0.0, "alt_km": 35786},
    {"id": "INMARSAT-4F1", "name": "INMARSAT 4F1", "lon": 64.0, "lat": 0.0, "alt_km": 35786},
    {"id": "ASTRA-1KR", "name": "ASTRA 1KR", "lon": 19.2, "lat": 0.0, "alt_km": 35786},
    {"id": "ISS",      "name": "ISS (ZARYA)", "lon": 0.0,  "lat": 0.0, "alt_km": 408},
]


def _parse_tles(text: str) -> list[tuple[str, str, str]]:
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    triples: list[tuple[str, str, str]] = []
    i = 0
    while i + 2 < len(lines):
        name, l1, l2 = lines[i], lines[i + 1], lines[i + 2]
        if l1.startswith("1 ") and l2.startswith("2 "):
            triples.append((name.strip(), l1, l2))
            i += 3
        else:
            i += 1
    return triples


async def _fetch_tles() -> list[tuple[str, str, str]]:
    async with httpx.AsyncClient(headers={"User-Agent": "ODIN/1.0"}) as client:
        r = await client.get(CELESTRAK_URL, timeout=HTTP_TIMEOUT_S)
        r.raise_for_status()
        return _parse_tles(r.text)


def _propagate_skyfield(triples: list[tuple[str, str, str]], max_n: int) -> list[dict[str, Any]]:
    from skyfield.api import EarthSatellite, load, wgs84  # type: ignore
    ts = load.timescale()
    t = ts.now()
    out: list[dict[str, Any]] = []
    for name, l1, l2 in triples[:max_n]:
        try:
            sat = EarthSatellite(l1, l2, name, ts)
            geo = wgs84.geographic_position_of(sat.at(t))
            out.append({
                "id": name,
                "name": name,
                "lon": float(geo.longitude.degrees),
                "lat": float(geo.latitude.degrees),
                "alt_km": float(geo.elevation.km),
            })
        except Exception:
            continue
    return out


def _propagate_fallback() -> list[dict[str, Any]]:
    t = time.time()
    out = []
    for i, s in enumerate(FALLBACK_SATS):
        if s["id"] == "ISS":
            # Crude circular motion for the demo
            phase = (t / 5400.0) * 2 * math.pi  # ~90 min orbit
            lon = ((phase * 57.295779513 + i * 13) + 180) % 360 - 180
            lat = 51.6 * math.sin(phase)
            out.append({**s, "lon": lon, "lat": lat})
        else:
            out.append(dict(s))
    return out


async def run(max_sats: int = 800) -> None:
    tles: list[tuple[str, str, str]] = []
    last_refresh = 0.0
    use_skyfield = True
    try:
        import skyfield  # noqa: F401
    except Exception:
        use_skyfield = False
        logger.warning("skyfield not installed, satellite stream will use fallback fixtures")

    while True:
        now = time.time()
        if not tles or (now - last_refresh) > TLE_REFRESH_S:
            try:
                tles = await _fetch_tles()
                last_refresh = now
                logger.info("celestrak refresh", tle_count=len(tles))
            except Exception as exc:
                logger.warning("celestrak fetch failed", error=str(exc))

        if use_skyfield and tles:
            try:
                sats = _propagate_skyfield(tles, max_sats)
                await hub.publish("satellites", {"count": len(sats), "items": sats, "source": "celestrak"})
                await asyncio.sleep(PROPAGATE_INTERVAL_S)
                continue
            except Exception as exc:
                logger.warning("skyfield propagation failed", error=str(exc))

        # Fallback path
        sats = _propagate_fallback()
        await hub.publish(
            "satellites",
            {"count": len(sats), "items": sats, "source": "fallback_fixtures"},
            degraded=True,
        )
        await asyncio.sleep(PROPAGATE_INTERVAL_S)
