"""
Thin wrapper around google-generativeai.

Provides one entry point — `generate(prompt, system=None, json_mode=False)` —
that hides the SDK details and always returns a string (or {} on JSON failure).
Falls back to a deterministic heuristic stub when the API key is missing or
the library isn't installed, so the rest of ODIN never crashes on LLM errors.
"""
from __future__ import annotations
import asyncio
import json
from typing import Any

import structlog

from shared.config import settings

logger = structlog.get_logger("odin.gemini")

_model = None
_init_attempted = False


def _ensure_model():
    global _model, _init_attempted
    if _model is not None or _init_attempted:
        return _model
    _init_attempted = True
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY missing — Gemini calls will return heuristic stubs")
        return None
    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=settings.gemini_api_key)
        _model = genai.GenerativeModel(settings.gemini_model)
        logger.info("gemini initialised", model=settings.gemini_model)
    except Exception as exc:
        logger.warning("gemini init failed", error=str(exc))
        _model = None
    return _model


def is_available() -> bool:
    return _ensure_model() is not None


async def generate(
    prompt: str,
    *,
    system: str | None = None,
    json_mode: bool = False,
    temperature: float = 0.2,
    timeout_s: float = 12.0,
) -> str:
    """Run a single-turn Gemini call. Returns "" on any failure."""
    m = _ensure_model()
    if m is None:
        return ""
    full = f"{system}\n\n{prompt}" if system else prompt
    if json_mode:
        full += "\n\nRespond with ONLY a single JSON object — no prose, no code fences."

    def _call() -> str:
        try:
            cfg = {"temperature": temperature}
            resp = m.generate_content(full, generation_config=cfg)
            return (resp.text or "").strip()
        except Exception as exc:
            logger.warning("gemini generate failed", error=str(exc))
            return ""

    try:
        return await asyncio.wait_for(asyncio.to_thread(_call), timeout=timeout_s)
    except asyncio.TimeoutError:
        logger.warning("gemini timeout", timeout_s=timeout_s)
        return ""


async def generate_json(prompt: str, *, system: str | None = None, **kw: Any) -> dict[str, Any]:
    """JSON-mode helper — returns {} on parse failure."""
    raw = await generate(prompt, system=system, json_mode=True, **kw)
    if not raw:
        return {}
    # Strip any accidental code fence
    s = raw.strip()
    if s.startswith("```"):
        s = s.strip("`")
        if s.lower().startswith("json"):
            s = s[4:]
        s = s.strip()
    try:
        return json.loads(s)
    except Exception:
        # Try to grab the first {...} block
        start, end = s.find("{"), s.rfind("}")
        if 0 <= start < end:
            try:
                return json.loads(s[start:end + 1])
            except Exception:
                return {}
        return {}
