"""
HIFLD Electric Substations + Transmission Lines via ArcGIS REST.

No API key required. We page through with resultRecordCount to keep
each response manageable. Saved to data-cache/{substations,transmission_lines}.geojson.
"""
from __future__ import annotations
import json
from typing import Any

import httpx

from ._common import UA, feature_collection, write_geojson

SUBSTATIONS_URL = (
    "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/"
    "Electric_Substations/FeatureServer/0/query"
)
TRANSMISSION_URL = (
    "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/"
    "Electric_Power_Transmission_Lines/FeatureServer/0/query"
)
PAGE_SIZE = 2000


def _page(client: httpx.Client, url: str) -> list[dict[str, Any]]:
    offset = 0
    all_features: list[dict[str, Any]] = []
    while True:
        params = {
            "where": "1=1",
            "outFields": "*",
            "f": "geojson",
            "resultOffset": offset,
            "resultRecordCount": PAGE_SIZE,
            "outSR": 4326,
        }
        r = client.get(url, params=params, timeout=60)
        r.raise_for_status()
        data = r.json()
        feats = data.get("features") or []
        if not feats:
            break
        all_features.extend(feats)
        if len(feats) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        if offset > 50_000:  # safety guard
            break
    return all_features


def run() -> dict[str, str]:
    out: dict[str, str] = {}
    with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True) as c:
        try:
            subs = _page(c, SUBSTATIONS_URL)
            out["substations"] = str(write_geojson("substations", feature_collection(subs, source="HIFLD")))
        except Exception as e:
            out["substations_error"] = str(e)
        try:
            tx = _page(c, TRANSMISSION_URL)
            out["transmission_lines"] = str(write_geojson("transmission_lines", feature_collection(tx, source="HIFLD")))
        except Exception as e:
            out["transmission_error"] = str(e)
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
