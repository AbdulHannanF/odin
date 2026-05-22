"""
One-shot preprocessing: reads raw data-cache files, strips heavy metadata,
bakes color/size/shape props in so the frontend can use MapLibre expressions
directly without JS color-lookup code at render time.
"""
import json, math
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
CACHE = ROOT / "data-cache"

TECH_COLOR = {
    "SOLAR":          {"c": "#FFD700", "g": "#FFD70055"},
    "WIND":           {"c": "#00E5FF", "g": "#00E5FF44"},
    "HYDRO":          {"c": "#0077FF", "g": "#0077FF55"},
    "NUCLEAR":        {"c": "#CC44FF", "g": "#CC44FF66"},
    "GAS":            {"c": "#FF8C00", "g": "#FF8C0044"},
    "COAL":           {"c": "#8B7355", "g": "#8B735533"},
    "OIL":            {"c": "#FF4422", "g": "#FF442233"},
    "BIOMASS":        {"c": "#66BB44", "g": "#66BB4433"},
    "GEOTHERMAL":     {"c": "#FF6633", "g": "#FF663333"},
    "STORAGE":        {"c": "#FF44AA", "g": "#FF44AA44"},
    "WASTE":          {"c": "#AABB00", "g": "#AABB0022"},
    "COGENERATION":   {"c": "#FFAA33", "g": "#FFAA3333"},
    "PETCOKE":        {"c": "#A0855B", "g": "#A0855B22"},
    "WAVE AND TIDAL": {"c": "#00CCAA", "g": "#00CCAA22"},
    "OTHER":          {"c": "#888899", "g": "#88889922"},
}

VOLT_COLOR = {
    765: {"c": "#FFFFFF", "w": 2.5, "o": 0.95},
    500: {"c": "#00D4FF", "w": 2.0, "o": 0.90},
    345: {"c": "#4488EE", "w": 1.6, "o": 0.85},
    230: {"c": "#7766CC", "w": 1.3, "o": 0.80},
    138: {"c": "#AA88DD", "w": 1.0, "o": 0.70},
    115: {"c": "#AA88DD", "w": 0.9, "o": 0.65},
      0: {"c": "#554466", "w": 0.6, "o": 0.40},
}

SUB_COLOR = {
    765: {"c": "#FFFFFF", "s": 9.0},
    500: {"c": "#00E5FF", "s": 8.0},
    345: {"c": "#4499FF", "s": 7.0},
    230: {"c": "#8866FF", "s": 5.5},
    138: {"c": "#BB99FF", "s": 4.0},
    115: {"c": "#BB99FF", "s": 3.5},
      0: {"c": "#665577", "s": 2.5},
}

def volt_key(v):
    v = int(v or 0)
    for t in [765, 500, 345, 230, 138, 115]:
        if v >= t:
            return t
    return 0

def cap_radius(mw, base=3, mx=14):
    if not mw or mw <= 0:
        return base
    return round(min(mx, base * (1 + math.log10(max(1, mw)) / 2.5)), 2)


def process_power_plants():
    print("Processing power_plants.geojson...")
    src = json.loads((CACHE / "power_plants.geojson").read_text(encoding="utf-8"))
    out = []
    for f in src["features"]:
        p = f["properties"]
        tech = (p.get("technology") or "OTHER").upper()
        style = TECH_COLOR.get(tech, TECH_COLOR["OTHER"])
        mw = p.get("capacity_mw") or 0
        try:
            mw = float(mw)
        except Exception:
            mw = 0
        out.append({
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": {
                "name": p.get("name", ""),
                "technology": tech,
                "capacity_mw": round(mw, 1),
                "country": p.get("country", ""),
                "asset_type": "POWER_PLANT",
                "_c": style["c"],   # fill color  (prefixed to avoid MapLibre reserved names)
                "_g": style["g"],   # glow color
                "_r": cap_radius(mw),  # radius px
            }
        })
    dst = CACHE / "power_plants_styled.geojson"
    dst.write_text(json.dumps({"type": "FeatureCollection", "features": out}), encoding="utf-8")
    print(f"  >> {len(out)} plants  |  {dst.stat().st_size // 1024} KB  >>  {dst.name}")


def process_transmission():
    print("Processing transmission_lines.geojson (103 MB — may take 30 s)...")
    src = json.loads((CACHE / "transmission_lines.geojson").read_text(encoding="utf-8"))
    out = []
    for f in src["features"]:
        p = f["properties"]
        status = (p.get("STATUS") or "").upper()
        # keep in-service and unlabelled; skip decommissioned/proposed
        if status in ("NOT IN SERVICE", "DECOMMISSIONED", "UNDER CONSTRUCTION"):
            continue
        v = int(p.get("VOLTAGE") or p.get("voltage") or 0)
        if v < 69:
            continue  # skip sub-transmission noise
        key = volt_key(v)
        style = VOLT_COLOR[key]
        out.append({
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": {
                "v": v,
                "c": style["c"],
                "w": style["w"],
                "o": style["o"],
            }
        })
    dst = CACHE / "transmission_styled.geojson"
    dst.write_text(json.dumps({"type": "FeatureCollection", "features": out}), encoding="utf-8")
    print(f"  >> {len(out)} lines   |  {dst.stat().st_size // 1024} KB  >>  {dst.name}")


def process_substations():
    print("Processing substations.geojson...")
    src = json.loads((CACHE / "substations.geojson").read_text(encoding="utf-8"))
    out = []
    for f in src["features"]:
        p = f["properties"]
        v = int(p.get("voltage") or p.get("VOLTAGE") or 0)
        key = volt_key(v)
        style = SUB_COLOR[key]
        out.append({
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": {
                "name": p.get("name", ""),
                "v": v,
                "c": style["c"],
                "s": style["s"],
            }
        })
    dst = CACHE / "substations_styled.geojson"
    dst.write_text(json.dumps({"type": "FeatureCollection", "features": out}), encoding="utf-8")
    print(f"  >> {len(out)} subs    |  {dst.stat().st_size // 1024} KB  >>  {dst.name}")


def process_datacenters():
    print("Processing datacenters.geojson...")
    src = json.loads((CACHE / "datacenters.geojson").read_text(encoding="utf-8"))
    out = []
    for f in src["features"]:
        p = f["properties"]
        sqft = 0
        try:
            sqft = float(p.get("sqft") or 0)
        except Exception:
            pass
        s = round(min(12, 4 + math.log10(max(1000, sqft)) / 1.8), 2)
        out.append({
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": {
                "name": p.get("name", ""),
                "operator": p.get("operator", ""),
                "type": p.get("type", ""),
                "sqft": sqft,
                "s": s,
            }
        })
    dst = CACHE / "datacenters_styled.geojson"
    dst.write_text(json.dumps({"type": "FeatureCollection", "features": out}), encoding="utf-8")
    print(f"  >> {len(out)} DCs     |  {dst.stat().st_size // 1024} KB  >>  {dst.name}")


if __name__ == "__main__":
    process_power_plants()
    process_transmission()
    process_substations()
    if (CACHE / "datacenters.geojson").exists():
        process_datacenters()
    else:
        print("Skipping datacenters.geojson — file not found")
    print("\nAll done — styled GeoJSON files written to data-cache/")
