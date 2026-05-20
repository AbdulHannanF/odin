"""
Run every ETL pipeline sequentially. Designed for `python -m backend.etl.run_all`
from the repo root, OR `python run_all.py` from inside backend/etl/.

Each script is independent — failure in one does not abort the rest.
Outputs are written to /data-cache/*.geojson and become servable at
GET /api/v1/layers/{name}.
"""
from __future__ import annotations
import json
import sys
import time
import traceback


def _safe_run(label: str, fn) -> dict[str, str | float]:
    t0 = time.time()
    try:
        result = fn()
        return {"label": label, "ok": True, "elapsed_s": round(time.time() - t0, 2), **(result or {})}
    except Exception as exc:
        traceback.print_exc()
        return {"label": label, "ok": False, "elapsed_s": round(time.time() - t0, 2), "error": str(exc)}


def main() -> int:
    # Allow `python run_all.py` from inside backend/etl/
    try:
        from . import submarine_cables, power_plants, hifld_substations, nasa_eonet
    except ImportError:
        sys.path.insert(0, ".")
        sys.path.insert(0, "..")
        from backend.etl import submarine_cables, power_plants, hifld_substations, nasa_eonet  # type: ignore

    results = [
        _safe_run("submarine_cables",  submarine_cables.run),
        _safe_run("power_plants",      power_plants.run),
        _safe_run("hifld_substations", hifld_substations.run),
        _safe_run("nasa_eonet",        nasa_eonet.run),
    ]
    print(json.dumps(results, indent=2))
    return 0 if all(r["ok"] for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
