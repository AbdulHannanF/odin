"""
WRI Global Power Plant Database → GeoJSON points.

Open-license dataset, ~34k plants worldwide.
We try a few known mirrors; if all fail we leave the existing seed data
in place rather than aborting the rest of the ETL run.
"""
from __future__ import annotations
import csv
import io
import json
import zipfile

import httpx

from ._common import CACHE_DIR, UA, feature_collection, write_geojson

CANDIDATE_URLS = [
    "https://wri-dataportal-prod.s3.amazonaws.com/manual/global_power_plant_database_v_1_3.zip",
    "https://datasets.wri.org/dataset/53623dfd-3df6-4f15-a091-67457cdb571f/resource/79de8f01-ad48-4bbf-9d7d-d8c0dd7f3a90/download/globalpowerplantdatabasev130.zip",
]

CSV_HINT = "global_power_plant_database.csv"
TECH_MAP = {
    "Solar": "SOLAR", "Wind": "WIND", "Hydro": "HYDRO", "Nuclear": "NUCLEAR",
    "Gas": "GAS", "Coal": "COAL", "Oil": "OIL", "Geothermal": "GEOTHERMAL",
    "Biomass": "BIOMASS", "Storage": "STORAGE",
}


def _download_zip() -> bytes | None:
    for url in CANDIDATE_URLS:
        try:
            with httpx.Client(headers={"User-Agent": UA}, follow_redirects=True, timeout=120) as c:
                r = c.get(url)
                r.raise_for_status()
                return r.content
        except Exception:
            continue
    return None


def _csv_from_zip(buf: bytes) -> str | None:
    try:
        zf = zipfile.ZipFile(io.BytesIO(buf))
    except Exception:
        return None
    for name in zf.namelist():
        if name.lower().endswith(".csv") and CSV_HINT in name.lower():
            return zf.read(name).decode("utf-8", errors="ignore")
    # Fallback: first csv we find
    for name in zf.namelist():
        if name.lower().endswith(".csv"):
            return zf.read(name).decode("utf-8", errors="ignore")
    return None


def _csv_to_geojson(csv_text: str) -> dict:
    reader = csv.DictReader(io.StringIO(csv_text))
    features = []
    for row in reader:
        try:
            lon = float(row.get("longitude") or row.get("lon"))
            lat = float(row.get("latitude") or row.get("lat"))
        except Exception:
            continue
        tech = row.get("primary_fuel") or row.get("fuel1") or "OTHER"
        cap = row.get("capacity_mw") or row.get("capacity_mw_total") or 0
        try:
            cap_f = float(cap)
        except Exception:
            cap_f = 0.0
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "asset_id": row.get("gppd_idnr") or row.get("name", ""),
                "name": row.get("name", ""),
                "asset_type": "POWER_PLANT",
                "technology": TECH_MAP.get(tech, tech.upper() if tech else "OTHER"),
                "capacity_mw": cap_f,
                "country": row.get("country_long") or row.get("country", ""),
                "commissioning_year": row.get("commissioning_year") or None,
                "owner": row.get("owner") or None,
                "source": "WRI Global Power Plant Database v1.3",
            },
        })
    return feature_collection(features, source="WRI GPPDB v1.3", count=len(features))


def run() -> dict[str, str]:
    out: dict[str, str] = {}
    buf = _download_zip()
    if not buf:
        out["error"] = "all candidate URLs failed"
        return out
    raw = buf if buf[:1] == b"P" else None
    csv_text = _csv_from_zip(buf) if raw else None
    if not csv_text:
        # Try as raw CSV
        try:
            csv_text = buf.decode("utf-8")
        except Exception:
            out["error"] = "unable to decode payload"
            return out
    fc = _csv_to_geojson(csv_text)
    out["power_plants"] = str(write_geojson("power_plants", fc))
    out["count"] = str(len(fc["features"]))
    return out


if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
