# ODIN Visual Layer Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the empty/sparse map with a data-dense, OpenGridWorks-quality visualization using all 34K+ assets already in data-cache/, with glowing multi-layer rendering.

**Architecture:** Python preprocessing script strips heavy HIFLD metadata and bakes color/size properties into GeoJSON files so the frontend reads values directly via MapLibre expressions. MapView rebuilds with 3-layer glow stack per layer type (outer-glow → mid-glow → core). layerColors.js is the single source of truth.

**Tech Stack:** MapLibre GL 4.x, FastAPI (already serving /api/v1/layers/{name}), Python 3.x for ETL, React 18

---

## Data audit results (at plan-write time)

| File | Features | Size | Keys |
|---|---|---|---|
| power_plants.geojson | 34,936 | 13 MB | technology (UPPERCASE), capacity_mw, name, country |
| transmission_lines.geojson | 52,000 | 103 MB | VOLTAGE (kV), STATUS, geometry (LineString) |
| substations.geojson | 39,904 | 8.6 MB | voltage (kV), name, operator, status |
| submarine_cables.geojson | 712 | 751 KB | (name, feature geometry) |
| cable_landing_points.geojson | 1,917 | 379 KB | name |
| datacenters.geojson | 1,382 | 366 KB | name, operator, type, sqft |
| wildfires.geojson | 497 | 214 KB | title, date |

Backend already exposes all files via `/api/v1/layers/{name}` — no new routes needed.

---

## Files

| File | Action | Purpose |
|---|---|---|
| `backend/etl/preprocess_styled.py` | **Create** | One-shot script: strip props, add color/size, output *_styled.geojson |
| `data-cache/power_plants_styled.geojson` | **Generated** | 34K plants with color/size baked in |
| `data-cache/transmission_styled.geojson` | **Generated** | 52K lines stripped to VOLTAGE + color props, filtered to IN SERVICE |
| `data-cache/substations_styled.geojson` | **Generated** | 40K subs with voltage-keyed color/size baked in |
| `data-cache/datacenters_styled.geojson` | **Generated** | 1.4K DCs with diamond metadata |
| `frontend/src/config/layerColors.js` | **Modify** | Fix voltageToKey (data is in kV, not V); add DC colors; add uppercase tech aliases |
| `frontend/src/components/Map/MapView.jsx` | **Rewrite** | Load all layers from API, 3-layer glow stack, diamond DCs, dark void basemap |
| `frontend/src/App.jsx` | **Modify** | Left panel: update legend groups to match actual layers |

---

## Task 1: Fix layerColors.js

**Files:**
- Modify: `frontend/src/config/layerColors.js`

- [ ] **Step 1: Fix voltageToKey and add uppercase tech aliases**

The current `voltageToKey` tries to handle both V and kV with broken logic. Data is in kV (`115`, `345`, `500`, `765`). Fix it and add a `techNameToKey` normalizer for uppercase data values.

Replace entire `frontend/src/config/layerColors.js`:

```javascript
// Single source of truth for all ODIN map colors
// Reverse-engineered from OpenGridWorks palette

export const POWER_PLANT_COLORS = {
  Solar:          { fill: '#FFD700', stroke: '#FFE55C', glow: '#FFD70066' },
  Wind:           { fill: '#00E5FF', stroke: '#5FFFFF', glow: '#00E5FF55' },
  'Offshore Wind':{ fill: '#00BFFF', stroke: '#44DDFF', glow: '#00BFFF55' },
  Hydro:          { fill: '#0077FF', stroke: '#44AAFF', glow: '#0077FF66' },
  Nuclear:        { fill: '#CC44FF', stroke: '#EE88FF', glow: '#CC44FF77' },
  Gas:            { fill: '#FF8C00', stroke: '#FFAA44', glow: '#FF8C0055' },
  Coal:           { fill: '#8B7355', stroke: '#AABB66', glow: '#8B735544' },
  Oil:            { fill: '#FF4422', stroke: '#FF7766', glow: '#FF442244' },
  Biomass:        { fill: '#66BB44', stroke: '#99DD66', glow: '#66BB4444' },
  Geothermal:     { fill: '#FF6633', stroke: '#FF9966', glow: '#FF663344' },
  Storage:        { fill: '#FF44AA', stroke: '#FF88CC', glow: '#FF44AA55' },
  Waste:          { fill: '#AABB00', stroke: '#CCDD33', glow: '#AABB0033' },
  Cogeneration:   { fill: '#FFAA33', stroke: '#FFCC66', glow: '#FFAA3344' },
  Petcoke:        { fill: '#A0855B', stroke: '#C4A870', glow: '#A0855B33' },
  'Wave And Tidal':{ fill: '#00CCAA', stroke: '#44EEDD', glow: '#00CCAA33' },
  Other:          { fill: '#888899', stroke: '#AAAACC', glow: '#88889933' },
};

// Maps uppercase data values → canonical key
const TECH_ALIAS = {
  SOLAR: 'Solar', WIND: 'Wind', HYDRO: 'Hydro', NUCLEAR: 'Nuclear',
  GAS: 'Gas', COAL: 'Coal', OIL: 'Oil', BIOMASS: 'Biomass',
  GEOTHERMAL: 'Geothermal', STORAGE: 'Storage', WASTE: 'Waste',
  COGENERATION: 'Cogeneration', PETCOKE: 'Petcoke',
  'WAVE AND TIDAL': 'Wave And Tidal', OTHER: 'Other',
  'OFFSHORE WIND': 'Offshore Wind',
};

export function techToColor(rawTech) {
  const key = TECH_ALIAS[rawTech] || rawTech;
  return POWER_PLANT_COLORS[key] || POWER_PLANT_COLORS.Other;
}

export const TRANSMISSION_COLORS = {
  // kV threshold → style
  765: { stroke: '#FFFFFF', width: 2.5, opacity: 0.95, glow: '#FFFFFF88' },
  500: { stroke: '#00D4FF', width: 2.0, opacity: 0.90, glow: '#00D4FF66' },
  345: { stroke: '#4488EE', width: 1.6, opacity: 0.85, glow: '#4488EE55' },
  230: { stroke: '#7766CC', width: 1.3, opacity: 0.80, glow: '#7766CC44' },
  138: { stroke: '#AA88DD', width: 1.0, opacity: 0.70, glow: '#AA88DD33' },
  115: { stroke: '#AA88DD', width: 0.9, opacity: 0.65, glow: '#AA88DD22' },
  0:   { stroke: '#554466', width: 0.6, opacity: 0.40, glow: '#55446611' },
};

export const SUBSTATION_COLORS = {
  765: { fill: '#FFFFFF', glow: '#FFFFFFCC', size: 9  },
  500: { fill: '#00E5FF', glow: '#00E5FFAA', size: 8  },
  345: { fill: '#4499FF', glow: '#4499FF99', size: 7  },
  230: { fill: '#8866FF', glow: '#8866FF88', size: 5.5 },
  138: { fill: '#BB99FF', glow: '#BB99FF66', size: 4  },
  115: { fill: '#BB99FF', glow: '#BB99FF55', size: 3.5 },
  0:   { fill: '#665577', glow: '#66557733', size: 2.5 },
};

export const DATACENTER_COLORS = {
  fill: '#818cf8', glow: '#818cf899', stroke: '#a5b4fc', size: 5,
};

export const CABLE_COLORS = {
  line:    { stroke: '#e879f9', width: 1.2, glow: '#e879f988' },
  landing: { fill: '#ffffff',  glow: '#ffffff99', size: 5 },
};

export const WILDFIRE_COLORS = {
  active:    { fill: '#FF3300', glow: '#FF330099' },
  contained: { fill: '#FF7700', glow: '#FF770055' },
};

export const QUAKE_COLORS = {
  8: { fill: '#FF0000', glow: '#FF000088' },
  7: { fill: '#FF3300', glow: '#FF330066' },
  6: { fill: '#FF6600', glow: '#FF660055' },
  5: { fill: '#FF9900', glow: '#FF990044' },
  4: { fill: '#FFCC00', glow: '#FFCC0033' },
  0: { fill: '#FFEE88', glow: '#FFEE8822' },
};

// Voltage in kV → nearest threshold key
export function voltageToKey(kv) {
  const v = parseInt(kv) || 0;
  for (const t of [765, 500, 345, 230, 138, 115]) {
    if (v >= t) return t;
  }
  return 0;
}

// capacity in MW → pixel radius (log scale)
export function capacityToRadius(mw, base = 3, max = 14) {
  if (!mw || mw <= 0) return base;
  return Math.min(max, base * (1 + Math.log10(Math.max(1, mw)) / 2.5));
}
```

- [ ] **Step 2: Verify no import breaks**

```bash
cd frontend && npx vite build --mode development 2>&1 | tail -5
```
Expected: "built in Xs" with no errors.

---

## Task 2: Python preprocessing — bake style props into GeoJSON

**Files:**
- Create: `backend/etl/preprocess_styled.py`

- [ ] **Step 1: Write the preprocessing script**

```python
# backend/etl/preprocess_styled.py
"""
One-shot preprocessing: reads raw data-cache files, strips heavy metadata,
bakes color/size/shape props in so the frontend can use MapLibre expressions
directly without JavaScript color-lookup code.
"""
import json, math, sys
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
        if v >= t: return t
    return 0

def cap_radius(mw, base=3, mx=14):
    if not mw or mw <= 0: return base
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
        out.append({
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": {
                "name": p.get("name", ""),
                "tech": tech,
                "mw": round(float(mw), 1) if mw else 0,
                "country": p.get("country", ""),
                "c": style["c"],   # fill color
                "g": style["g"],   # glow color
                "r": cap_radius(mw),  # radius
            }
        })
    dst = CACHE / "power_plants_styled.geojson"
    dst.write_text(json.dumps({"type": "FeatureCollection", "features": out}), encoding="utf-8")
    print(f"  → {len(out)} plants written to {dst.name} ({dst.stat().st_size // 1024} KB)")


def process_transmission():
    print("Processing transmission_lines.geojson (103 MB — may take 30s)...")
    src = json.loads((CACHE / "transmission_lines.geojson").read_text(encoding="utf-8"))
    out = []
    for f in src["features"]:
        p = f["properties"]
        status = (p.get("STATUS") or "").upper()
        if status and status not in ("IN SERVICE", "ENERGIZED", "PROPOSED"):
            continue  # skip decommissioned
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
    print(f"  → {len(out)} lines written to {dst.name} ({dst.stat().st_size // 1024} KB)")


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
    print(f"  → {len(out)} substations written to {dst.name} ({dst.stat().st_size // 1024} KB)")


def process_datacenters():
    print("Processing datacenters.geojson...")
    src = json.loads((CACHE / "datacenters.geojson").read_text(encoding="utf-8"))
    out = []
    for f in src["features"]:
        p = f["properties"]
        sqft = float(p.get("sqft") or 0)
        # size proportional to sqft (log scale), floor at 4px
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
    print(f"  → {len(out)} datacenters written to {dst.name} ({dst.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    process_power_plants()
    process_transmission()
    process_substations()
    process_datacenters()
    print("Done.")
```

- [ ] **Step 2: Run the script**

```bash
cd "E:\Downloads and Agreements\Git Projects\ODIN"
python backend/etl/preprocess_styled.py
```

Expected output:
```
Processing power_plants.geojson...
  → 34936 plants written to power_plants_styled.geojson (...KB)
Processing transmission_lines.geojson (103 MB — may take 30s)...
  → ~50000 lines written to transmission_styled.geojson (...KB)
Processing substations.geojson...
  → 39904 substations written to substations_styled.geojson (...KB)
Processing datacenters.geojson...
  → 1382 datacenters written to datacenters_styled.geojson (...KB)
Done.
```

---

## Task 3: Rebuild MapView.jsx

**Files:**
- Modify: `frontend/src/components/Map/MapView.jsx`

This is the core visual work. The rebuilt map:
- Uses a near-void dark raster basemap (CARTO dark nolabels at 35% opacity)
- Adds a diamond SDF image for datacenter markers
- Loads all 6 styled layers from the API in order: cables → transmission → substations → power plants → datacenters → realtime
- Applies 3-layer glow stack: outer-glow (large, blurred, 15-20% opacity) → mid-glow (medium, 40%) → core (sharp, 90%+)
- Uses zoom-interpolated sizes so data is visible at global zoom but doesn't overpower at city zoom
- Exposes `flyTo` and `feedSatellites` via `useImperativeHandle` (already present, keep them)

The full replacement for `frontend/src/components/Map/MapView.jsx` is in the execution step below.

---

## Task 4: Update App.jsx left panel

**Files:**
- Modify: `frontend/src/App.jsx`

The left panel `TECH_LEGEND` should list all real fuel types with their correct colors from `layerColors.js`. Update counts to match real data from preprocessing.

---
