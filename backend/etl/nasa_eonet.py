"""
NASA EONET (Earth Observatory Natural Event Tracker) → GeoJSON.

No API key. One endpoint returns wildfires, storms, volcanoes, sea/lake ice,
icebergs, severe storms, dust/haze. We split by category into separate
data-cache layers so the frontend can toggle each.

https://eonet.gsfc.nasa.gov/docs/v3
"""
from __future__ import annotations
import json
from collections import defaultdict

from ._common import http_get_json, feature_collection, write_geojson

EVENTS_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=500"

# Map EONET category id → output layer name (data-cache filename stem)
CATEGORY_LAYERS = {
    "wildfires":     "wildfires",
    "severeStorms":  "severe_storms",
    "volcanoes":     "volcanoes",
    "seaLakeIce":    "sea_lake_ice",
    "drought":       "drought",
    "floods":        "floods",
    "earthquakes":   "natural_earthquakes",  # avoid clobbering realtime USGS feed
    "dustHaze":      "dust_haze",
    "manmade":       "manmade_events",
    "snow":          "snow_events",
    "landslides":    "landslides",
    "tempExtremes":  "temperature_extremes",
}


def _event_to_feature(ev: dict) -> dict | None:
    geoms = ev.get("geometry") or []
    if not geoms:
        return None
    # Use the most recent geometry record
    last = geoms[-1]
    gtype = last.get("type", "Point")
    coords = last.get("coordinates")
    if not coords:
        return None
    return {
        "type": "Feature",
        "geometry": {"type": gtype, "coordinates": coords},
        "properties": {
            "id": ev.get("id"),
            "title": ev.get("title"),
            "description": ev.get("description"),
            "link": ev.get("link"),
            "closed": ev.get("closed"),
            "date": last.get("date"),
            "magnitude_value": last.get("magnitudeValue"),
            "magnitude_unit": last.get("magnitudeUnit"),
            "source": "NASA EONET v3",
            "categories": [c.get("id") for c in (ev.get("categories") or [])],
        },
    }


def run() -> dict[str, str]:
    out: dict[str, str] = {}
    try:
        payload = http_get_json(EVENTS_URL, timeout=30)
    except Exception as e:
        return {"error": str(e)}

    by_category: defaultdict[str, list] = defaultdict(list)
    for ev in payload.get("events", []):
        feat = _event_to_feature(ev)
        if not feat:
            continue
        for cat in (ev.get("categories") or []):
            cat_id = cat.get("id")
            if cat_id in CATEGORY_LAYERS:
                by_category[CATEGORY_LAYERS[cat_id]].append(feat)

    for layer_name, feats in by_category.items():
        path = write_geojson(layer_name, feature_collection(feats, source="NASA EONET v3", count=len(feats)))
        out[layer_name] = str(path)
        out[f"{layer_name}_count"] = str(len(feats))
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
