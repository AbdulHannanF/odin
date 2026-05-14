"""
ODIN Wind Intelligence Agent
Analyzes wind vector fields, turbine efficiency, and atmospheric pressure.
Renders animated vector particle simulations (NOAA/OpenWeather or synthetic).
"""
from __future__ import annotations
import math, time, random
from datetime import datetime
from typing import Any
import structlog
from shared.models import WindVector, GeoPoint, AgentName

logger = structlog.get_logger("odin.agent.wind")

SYNTHETIC_WIND_GRID = [
    {"lat": 40.7 + i * 0.5, "lon": -74.0 + j * 0.5, "u": random.uniform(-15, 15), "v": random.uniform(-15, 15)}
    for i in range(6) for j in range(6)
]

class WindIntelligenceAgent:
    agent_name = AgentName.WIND

    def _compute_vector(self, u: float, v: float) -> tuple[float, float]:
        speed = math.sqrt(u ** 2 + v ** 2)
        direction = (math.degrees(math.atan2(-u, -v)) + 360) % 360
        return round(speed, 2), round(direction, 2)

    def _turbine_efficiency(self, wind_ms: float, rated_ms: float = 12.0, cut_in: float = 3.0, cut_out: float = 25.0) -> float:
        if wind_ms < cut_in or wind_ms > cut_out:
            return 0.0
        elif wind_ms >= rated_ms:
            return 1.0
        return ((wind_ms - cut_in) / (rated_ms - cut_in)) ** 3

    async def get_wind_vectors(self, bounds: dict[str, float]) -> list[dict[str, Any]]:
        t0 = time.time()
        vectors = []
        for point in SYNTHETIC_WIND_GRID:
            lat, lon = point["lat"], point["lon"]
            if not (bounds["min_lat"] <= lat <= bounds["max_lat"] and bounds["min_lon"] <= lon <= bounds["max_lon"]):
                continue
            u, v = point["u"], point["v"]
            speed, direction = self._compute_vector(u, v)
            vectors.append({
                "lat": lat, "lon": lon,
                "u": u, "v": v,
                "speed_ms": speed,
                "direction_deg": direction,
                "altitude_m": 100.0,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "synthetic",
            })
        logger.info("Wind vectors computed", count=len(vectors), duration_ms=int((time.time()-t0)*1000))
        return vectors

    async def analyze_turbine_fleet(self, turbines: list[dict[str, Any]], wind_vectors: list[dict[str, Any]]) -> list[dict[str, Any]]:
        results = []
        for turbine in turbines:
            nearest = min(wind_vectors, key=lambda w: math.hypot(w["lat"] - turbine.get("lat", 0), w["lon"] - turbine.get("lon", 0)), default=None)
            if not nearest:
                continue
            wind_ms = nearest["speed_ms"]
            efficiency = self._turbine_efficiency(wind_ms)
            rated_mw = turbine.get("capacity_mw", 5.0) or 5.0
            actual_mw = rated_mw * efficiency
            results.append({
                "asset_id": turbine.get("asset_id"),
                "name": turbine.get("name"),
                "wind_speed_ms": wind_ms,
                "efficiency": round(efficiency, 3),
                "rated_mw": rated_mw,
                "actual_output_mw": round(actual_mw, 2),
                "status": "OPTIMAL" if efficiency > 0.8 else ("PARTIAL" if efficiency > 0.3 else "STANDBY"),
            })
        return results

    async def analyze(self, assets: list[dict[str, Any]], bounds: dict[str, float]) -> dict[str, Any]:
        vectors = await self.get_wind_vectors(bounds)
        turbines = [a for a in assets if a.get("asset_type") == "WIND_TURBINE"]
        fleet_analysis = await self.analyze_turbine_fleet(turbines, vectors)
        total_rated = sum(t["rated_mw"] for t in fleet_analysis)
        total_actual = sum(t["actual_output_mw"] for t in fleet_analysis)
        return {
            "agent": self.agent_name.value,
            "wind_vectors": vectors,
            "turbine_analysis": fleet_analysis,
            "fleet_summary": {
                "total_turbines": len(fleet_analysis),
                "total_rated_mw": round(total_rated, 2),
                "total_actual_mw": round(total_actual, 2),
                "fleet_efficiency": round(total_actual / total_rated, 3) if total_rated > 0 else 0.0,
            },
            "confidence": 0.80,
        }
