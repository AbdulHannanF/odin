"""
Background worker lifecycle.

Spawned from the FastAPI startup event. Each ingest module exposes a
`run()` coroutine; we shield them so one channel crashing never takes
down the rest.
"""
from __future__ import annotations
import asyncio
from typing import Any

import structlog

from . import aviation_ingest, satellite_ingest, earthquake_ingest, weather_ingest, maritime_ingest

logger = structlog.get_logger("odin.realtime.runner")

_TASKS: list[asyncio.Task[Any]] = []


async def _supervised(name: str, coro_factory) -> None:
    while True:
        try:
            await coro_factory()
            logger.warning("worker exited cleanly, restarting in 5s", worker=name)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("worker crashed, restarting in 5s", worker=name, error=str(exc))
        await asyncio.sleep(5.0)


def start_realtime_workers() -> None:
    if _TASKS:
        return
    loop = asyncio.get_event_loop()
    workers = [
        ("flights",     aviation_ingest.run),
        ("satellites",  satellite_ingest.run),
        ("earthquakes", earthquake_ingest.run),
        ("weather",     weather_ingest.run),
        ("ships",       maritime_ingest.run),
    ]
    for name, fn in workers:
        t = loop.create_task(_supervised(name, fn), name=f"odin-rt-{name}")
        _TASKS.append(t)
    logger.info("real-time workers started", count=len(_TASKS))


async def stop_realtime_workers() -> None:
    for t in _TASKS:
        t.cancel()
    for t in _TASKS:
        try:
            await t
        except Exception:
            pass
    _TASKS.clear()
    logger.info("real-time workers stopped")
