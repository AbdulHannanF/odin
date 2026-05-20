"""
ODIN Shared Configuration
Loads all settings from environment variables / .env file.
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────
    odin_env: str = Field("development", env="ODIN_ENV")
    odin_debug: bool = Field(True, env="ODIN_DEBUG")
    odin_log_dir: Path = Field(Path("./logs"), env="ODIN_LOG_DIR")
    backend_port: int = Field(8000, env="BACKEND_PORT")

    # ── AI / LLM ────────────────────────────────────────────────
    gemini_api_key: str = Field("", env="GEMINI_API_KEY")
    gemini_model: str = Field("gemini-1.5-pro", env="GEMINI_MODEL")

    # ── Mapbox ──────────────────────────────────────────────────
    mapbox_token: str = Field("", env="MAPBOX_TOKEN")

    # ── Weather ─────────────────────────────────────────────────
    openweather_api_key: str = Field("", env="OPENWEATHER_API_KEY")
    noaa_api_key: str = Field("", env="NOAA_API_KEY")

    # ── PostgreSQL ──────────────────────────────────────────────
    postgres_host: str = Field("localhost", env="POSTGRES_HOST")
    postgres_port: int = Field(5432, env="POSTGRES_PORT")
    postgres_db: str = Field("odin", env="POSTGRES_DB")
    postgres_user: str = Field("odin_user", env="POSTGRES_USER")
    postgres_password: str = Field("odin_password", env="POSTGRES_PASSWORD")

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def postgres_sync_dsn(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Neo4j ───────────────────────────────────────────────────
    neo4j_uri: str = Field("bolt://localhost:7687", env="NEO4J_URI")
    neo4j_user: str = Field("neo4j", env="NEO4J_USER")
    neo4j_password: str = Field("odin_neo4j_password", env="NEO4J_PASSWORD")

    # ── Redis ───────────────────────────────────────────────────
    redis_url: str = Field("redis://localhost:6379", env="REDIS_URL")

    # ── Real-time data sources (optional keys) ──────────────────
    aisstream_api_key: str = Field("", env="AISSTREAM_API_KEY")
    firms_map_key: str = Field("", env="FIRMS_MAP_KEY")

    # ── Feature Flags ────────────────────────────────────────────
    use_synthetic_weather: bool = Field(True, env="USE_SYNTHETIC_WEATHER")
    use_synthetic_grid: bool = Field(False, env="USE_SYNTHETIC_GRID")
    force_weather_api_failure: bool = Field(False, env="FORCE_WEATHER_API_FAILURE")
    enable_realtime_workers: bool = Field(True, env="ENABLE_REALTIME_WORKERS")

    class Config:
        # Resolve .env relative to the repo root regardless of cwd.
        env_file = str((Path(__file__).resolve().parent.parent.parent / ".env"))
        env_file_encoding = "utf-8"
        extra = "ignore"


# Singleton settings object
settings = Settings()

# Ensure log directory exists
settings.odin_log_dir.mkdir(parents=True, exist_ok=True)
