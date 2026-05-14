"""
ODIN Database Connections
Manages async connections to PostgreSQL+PostGIS, Neo4j, and Redis.
"""
from __future__ import annotations

import json
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import redis.asyncio as aioredis
from neo4j import AsyncGraphDatabase, AsyncDriver
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from shared.config import settings

import structlog
logger = structlog.get_logger("odin.db")


# ═══════════════════════════════════════════════════════════════════
# PostgreSQL + PostGIS (SQLAlchemy async)
# ═══════════════════════════════════════════════════════════════════

_pg_engine = None
_pg_session_factory = None


def get_pg_engine():
    global _pg_engine
    if _pg_engine is None:
        _pg_engine = create_async_engine(
            settings.postgres_dsn,
            echo=settings.odin_debug,
            pool_size=10,
            max_overflow=20,
        )
    return _pg_engine


def get_session_factory():
    global _pg_session_factory
    if _pg_session_factory is None:
        _pg_session_factory = async_sessionmaker(
            bind=get_pg_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _pg_session_factory


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ═══════════════════════════════════════════════════════════════════
# Neo4j
# ═══════════════════════════════════════════════════════════════════

_neo4j_driver: Optional[AsyncDriver] = None


def get_neo4j_driver() -> AsyncDriver:
    global _neo4j_driver
    if _neo4j_driver is None:
        _neo4j_driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
    return _neo4j_driver


@asynccontextmanager
async def get_neo4j_session():
    driver = get_neo4j_driver()
    async with driver.session() as session:
        yield session


async def neo4j_query(cypher: str, params: dict = None) -> list[dict]:
    """Execute a read query against Neo4j and return list of record dicts."""
    async with get_neo4j_session() as session:
        result = await session.run(cypher, params or {})
        records = await result.data()
        return records


async def neo4j_write(cypher: str, params: dict = None) -> None:
    """Execute a write query against Neo4j."""
    async with get_neo4j_session() as session:
        await session.run(cypher, params or {})


# ═══════════════════════════════════════════════════════════════════
# Redis
# ═══════════════════════════════════════════════════════════════════

_redis_client: Optional[aioredis.Redis] = None


def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def redis_publish(channel: str, message: dict) -> None:
    """Publish a JSON message to a Redis pub/sub channel."""
    r = get_redis()
    await r.publish(channel, json.dumps(message))


async def redis_set(key: str, value: dict, ttl_seconds: int = 300) -> None:
    r = get_redis()
    await r.setex(key, ttl_seconds, json.dumps(value))


async def redis_get(key: str) -> Optional[dict]:
    r = get_redis()
    raw = await r.get(key)
    if raw:
        return json.loads(raw)
    return None


# ═══════════════════════════════════════════════════════════════════
# Startup / Shutdown
# ═══════════════════════════════════════════════════════════════════

async def startup_db() -> None:
    """Initialize all database connections on app startup."""
    logger.info("Initializing database connections...")
    try:
        engine = get_pg_engine()
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        logger.info("PostgreSQL connected")
    except Exception as e:
        logger.warning("PostgreSQL not available", error=str(e))

    try:
        driver = get_neo4j_driver()
        async with driver.session() as s:
            await s.run("RETURN 1")
        logger.info("Neo4j connected")
    except Exception as e:
        logger.warning("Neo4j not available", error=str(e))

    try:
        r = get_redis()
        await r.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning("Redis not available", error=str(e))


async def shutdown_db() -> None:
    """Close all database connections on app shutdown."""
    global _pg_engine, _neo4j_driver, _redis_client
    if _pg_engine:
        await _pg_engine.dispose()
    if _neo4j_driver:
        await _neo4j_driver.close()
    if _redis_client:
        await _redis_client.aclose()
    logger.info("All database connections closed")
