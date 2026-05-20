"""Common helpers for ETL scripts: cache dir, http download, GeoJSON write."""
from __future__ import annotations
import json
from pathlib import Path
from typing import Any

import httpx

CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "data-cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

UA = "ODIN/1.0 (+https://odin.local)"


def http_get(url: str, *, timeout: float = 60.0, headers: dict[str, str] | None = None) -> bytes:
    h = {"User-Agent": UA}
    if headers:
        h.update(headers)
    with httpx.Client(headers=h, follow_redirects=True, timeout=timeout) as c:
        r = c.get(url)
        r.raise_for_status()
        return r.content


def http_get_json(url: str, **kwargs: Any) -> Any:
    return json.loads(http_get(url, **kwargs).decode("utf-8"))


def write_geojson(name: str, fc: dict[str, Any]) -> Path:
    path = CACHE_DIR / f"{name}.geojson"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False)
    return path


def write_json(name: str, obj: Any) -> Path:
    path = CACHE_DIR / f"{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False)
    return path


def feature_collection(features: list[dict[str, Any]], **meta: Any) -> dict[str, Any]:
    return {"type": "FeatureCollection", "features": features, "metadata": meta}
