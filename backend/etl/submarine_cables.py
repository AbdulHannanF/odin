"""
TeleGeography Submarine Cable Map.

Pulls the open GeoJSON exports from the public submarine cable map repo
and saves them to data-cache/ so the gateway can serve them at
/api/v1/layers/submarine_cables and /api/v1/layers/cable_landing_points.

License: TeleGeography publishes these for free public/commercial use
with attribution. https://www.submarinecablemap.com/
"""
from __future__ import annotations
import json

from ._common import http_get, write_geojson

CABLE_GEO_URL = "https://www.submarinecablemap.com/api/v3/cable/cable-geo.json"
LANDING_GEO_URL = "https://www.submarinecablemap.com/api/v3/landing-point/landing-point-geo.json"


def run() -> dict[str, str]:
    out: dict[str, str] = {}
    cable_raw = http_get(CABLE_GEO_URL)
    cable_fc = json.loads(cable_raw.decode("utf-8"))
    out["submarine_cables"] = str(write_geojson("submarine_cables", cable_fc))

    landing_raw = http_get(LANDING_GEO_URL)
    landing_fc = json.loads(landing_raw.decode("utf-8"))
    out["cable_landing_points"] = str(write_geojson("cable_landing_points", landing_fc))
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
