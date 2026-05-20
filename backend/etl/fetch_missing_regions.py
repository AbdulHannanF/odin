"""
Fills missing regions from the first ETL pass:
  - Europe (split into 8°×8° grid — large bboxes returned 0 from size limits)
  - Africa, Middle East, SE Asia, NA_West (got 429 — run sequentially with delays)
  - Merges into existing transmission_global_styled.geojson

Run after fetch_global_tx.py:
    python backend/etl/fetch_missing_regions.py
"""
from __future__ import annotations
import json, time
from pathlib import Path
import urllib.request, urllib.error, urllib.parse

ROOT       = Path(__file__).parent.parent.parent
DATA_CACHE = ROOT / "data-cache"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

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

def make_cells(s, w, n, e, step=8):
    """Split a large bbox into step×step degree cells."""
    cells = []
    lat = s
    while lat < n:
        lon = w
        while lon < e:
            cells.append((round(lat, 1), round(lon, 1), min(round(lat + step, 1), n), min(round(lon + step, 1), e)))
            lon += step
        lat += step
    return cells

# All regions that need reprocessing
REGIONS_GRID = [
    # Europe — split into 8°×8° cells
    ("Europe",      35.0, -12.0,  72.0,  45.0, 8),
    # Africa — 10°×10° cells
    ("Africa",     -35.0, -18.0,  38.0,  52.0, 10),
    # Middle East — 6°×6° cells
    ("Middle_East", 12.0,  25.0,  42.0,  65.0, 6),
    # SE Asia — 6°×6° cells
    ("SE_Asia",    -10.0,  95.0,  28.0, 145.0, 6),
    # NA_West
    ("NA_West",     14.0,-170.0,  84.0,-100.0, 10),
]

def fetch_cell(s, w, n, e, retries=3) -> list[dict]:
    q = (f"[out:json][timeout:90][maxsize:536870912];\n"
         f"(way[\"power\"=\"line\"][\"voltage\"~\"^[0-9]\"]({s},{w},{n},{e}););\n"
         f"out geom qt;")
    body = urllib.parse.urlencode({"data": q}).encode()
    req = urllib.request.Request(
        OVERPASS_URL, data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded",
                 "User-Agent": "ODIN-ETL/1.0"},
        method="POST",
    )
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = json.loads(resp.read())
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 30 * (attempt + 1)
                print(f"    429 — waiting {wait}s…", flush=True)
                time.sleep(wait)
                continue
            print(f"    HTTP {e.code} — skipping", flush=True)
            return []
        except Exception as e:
            print(f"    Error: {e} — skipping", flush=True)
            return []
    else:
        return []

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
    return features

def endpoints_key(coords):
    a = (coords[0][0], coords[0][1])
    b = (coords[-1][0], coords[-1][1])
    return (min(a, b), max(a, b))

def main():
    out = DATA_CACHE / "transmission_global_styled.geojson"

    # Load existing global file
    if out.exists():
        print(f"Loading existing global file ({out.stat().st_size//1024//1024} MB)…", flush=True)
        with open(out, encoding="utf-8") as f:
            fc = json.load(f)
        all_features = fc.get("features", [])
        print(f"  >> {len(all_features):,} existing lines", flush=True)
    else:
        print("No existing global file — starting fresh", flush=True)
        all_features = []

    # Build existing endpoint set for dedup
    print("Building dedup index…", flush=True)
    seen: set = set()
    for f in all_features:
        coords = f.get("geometry", {}).get("coordinates", [])
        if coords and isinstance(coords[0], (list, tuple)):
            try:
                seen.add(endpoints_key(coords))
            except Exception:
                pass

    new_total = 0
    for region_name, s, w, n, e, step in REGIONS_GRID:
        cells = make_cells(s, w, n, e, step)
        print(f"\n[{region_name}] {len(cells)} cells (step={step}°)…", flush=True)
        region_count = 0

        for i, (cs, cw, cn, ce) in enumerate(cells):
            feats = fetch_cell(cs, cw, cn, ce)
            added = 0
            for f in feats:
                coords = f["geometry"]["coordinates"]
                try:
                    key = endpoints_key(coords)
                except Exception:
                    continue
                if key not in seen:
                    seen.add(key)
                    all_features.append(f)
                    added += 1
            region_count += added
            new_total += added
            if added:
                print(f"  cell {i+1}/{len(cells)} ({cs},{cw} to {cn},{ce}): +{added} new lines", flush=True)
            time.sleep(2)  # polite rate limit

        print(f"  >> {region_name} total: +{region_count} new lines", flush=True)

        # Save checkpoint after each major region
        print(f"  Saving checkpoint ({len(all_features):,} total)…", flush=True)
        fc_out = {"type": "FeatureCollection", "features": all_features}
        with open(out, "w", encoding="utf-8") as f:
            json.dump(fc_out, f, separators=(",", ":"))

    mb = out.stat().st_size / 1_000_000
    print(f"\nDone!  {mb:.1f} MB  |  {len(all_features):,} total lines  |  +{new_total} new", flush=True)

if __name__ == "__main__":
    t0 = time.time()
    main()
    print(f"Total time: {(time.time()-t0)/60:.1f} min", flush=True)
