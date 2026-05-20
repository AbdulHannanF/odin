"""
Global HV transmission line downloader — OpenStreetMap / Overpass API.

Fetches power=line features for every continent in parallel (4 workers),
merges with the existing US HIFLD data, bakes color/width/opacity props,
and writes data-cache/transmission_global_styled.geojson.

Run:
    python backend/etl/fetch_global_tx.py
"""
from __future__ import annotations
import json, time, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request, urllib.error, urllib.parse

ROOT       = Path(__file__).parent.parent.parent
DATA_CACHE = ROOT / "data-cache"
DATA_CACHE.mkdir(exist_ok=True)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Continental bboxes [south, west, north, east]
REGIONS = [
    ("Europe_W",       35.0, -12.0,  72.0,  15.0),
    ("Europe_E",       35.0,  15.0,  72.0,  45.0),
    ("NA_West",        14.0,-170.0,  84.0,-100.0),
    ("NA_East",        14.0,-100.0,  84.0, -52.0),
    ("South_America", -56.0, -82.0,  13.0, -34.0),
    ("Africa_N",        0.0, -18.0,  38.0,  52.0),
    ("Africa_S",      -35.0, -18.0,   0.0,  52.0),
    ("Middle_East",    12.0,  25.0,  42.0,  65.0),
    ("Asia_Central",   22.0,  60.0,  55.0,  90.0),
    ("Asia_East_N",    30.0,  90.0,  55.0, 145.0),
    ("Asia_East_S",    10.0,  90.0,  30.0, 145.0),
    ("SE_Asia",       -10.0,  95.0,  28.0, 145.0),
    ("Oceania",       -47.0, 110.0,  -9.0, 180.0),
]

VOLT_TABLE = [
    (765, "#FFFFFF", 2.8, 0.95),
    (500, "#00D4FF", 2.2, 0.90),
    (345, "#4488EE", 1.8, 0.85),
    (230, "#7766CC", 1.4, 0.78),
    (138, "#AA88DD", 1.1, 0.68),
    (115, "#CC99EE", 0.9, 0.60),
      (0, "#554466", 0.6, 0.40),
]

def volt_style(kv: int):
    for thresh, c, w, o in VOLT_TABLE:
        if kv >= thresh:
            return c, round(w, 2), round(o, 2)
    return "#554466", 0.6, 0.40

def build_query(s, w, n, e) -> str:
    return (
        f"[out:json][timeout:120];\n"
        f"(way[\"power\"=\"line\"][\"voltage\"~\"^[0-9]\"]({s},{w},{n},{e}););\n"
        f"out geom qt;"
    )

def fetch_region(name: str, s, w, n, e) -> tuple[str, list[dict]]:
    body = urllib.parse.urlencode({"data": build_query(s, w, n, e)}).encode()
    req = urllib.request.Request(
        OVERPASS_URL, data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded",
                 "User-Agent": "ODIN-ETL/1.0"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=150) as resp:
            raw = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  [SKIP] {name}: HTTP {e.code} — {e.reason}", flush=True)
        return name, []
    except Exception as e:
        print(f"  [SKIP] {name}: {e}", flush=True)
        return name, []

    features = []
    for el in raw.get("elements", []):
        if el.get("type") != "way":
            continue
        geom = el.get("geometry", [])
        if len(geom) < 2:
            continue
        coords = [[round(pt["lon"], 5), round(pt["lat"], 5)] for pt in geom]
        tags = el.get("tags", {})
        raw_v = tags.get("voltage", "0").split(";")[0].strip()
        try:
            kv = int(raw_v)
        except ValueError:
            kv = 0
        if kv < 50:
            continue
        c, w_val, o = volt_style(kv)
        features.append({
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {"v": kv, "c": c, "w": w_val, "o": o},
        })
    print(f"  [OK] {name}: {len(features):,} lines", flush=True)
    return name, features

def endpoints_key(coords: list) -> tuple:
    """Direction-invariant endpoint key for dedup."""
    a = (coords[0][0], coords[0][1])
    b = (coords[-1][0], coords[-1][1])
    return (min(a, b), max(a, b))

def main():
    out = DATA_CACHE / "transmission_global_styled.geojson"
    all_features: list[dict] = []

    # Load existing US HIFLD data (already styled)
    us = DATA_CACHE / "transmission_styled.geojson"
    if us.exists():
        print(f"Loading US HIFLD ({us.stat().st_size//1024//1024} MB)…", flush=True)
        with open(us, encoding="utf-8") as f:
            us_fc = json.load(f)
        # HIFLD may have MultiLineString — normalise to LineString
        for feat in us_fc.get("features", []):
            g = feat.get("geometry", {})
            gtype = g.get("type", "")
            if gtype == "LineString":
                all_features.append(feat)
            elif gtype == "MultiLineString":
                for seg in g.get("coordinates", []):
                    if len(seg) >= 2:
                        all_features.append({
                            "type": "Feature",
                            "geometry": {"type": "LineString", "coordinates": seg},
                            "properties": feat["properties"],
                        })
        print(f"  >> {len(all_features):,} US lines loaded", flush=True)

    print(f"\nFetching {len(REGIONS)} regions via Overpass (4 parallel workers)…\n", flush=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch_region, *r): r[0] for r in REGIONS}
        for fut in as_completed(futures):
            name, feats = fut.result()
            all_features.extend(feats)
            print(f"  Running total: {len(all_features):,}", flush=True)

    # Deduplicate by rounded endpoints
    print(f"\nDeduplicating {len(all_features):,} features…", flush=True)
    seen: set = set()
    deduped: list[dict] = []
    for f in all_features:
        coords = f.get("geometry", {}).get("coordinates", [])
        if not coords or not isinstance(coords[0], (list, tuple)):
            continue
        try:
            key = endpoints_key(coords)
        except Exception:
            continue
        if key not in seen:
            seen.add(key)
            deduped.append(f)

    print(f"After dedup: {len(deduped):,} unique lines", flush=True)

    fc = {"type": "FeatureCollection", "features": deduped}
    print(f"Writing {out}…", flush=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(fc, f, separators=(",", ":"))

    mb = out.stat().st_size / 1_000_000
    print(f"\nDone!  {mb:.1f} MB  |  {len(deduped):,} global transmission lines", flush=True)

if __name__ == "__main__":
    t0 = time.time()
    main()
    print(f"Total time: {(time.time()-t0)/60:.1f} min", flush=True)
