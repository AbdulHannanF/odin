"""
ODIN ETL pipelines.

Each module downloads one open-data source, normalizes it to EPSG:4326
GeoJSON, and writes a `{layer}.geojson` into `data-cache/` so the FastAPI
layers route can serve it without re-downloading.
"""
