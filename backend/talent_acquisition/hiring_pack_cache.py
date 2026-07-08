"""In-process TTL cache for GET /dashboard/hiring-pack with event-driven invalidation."""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Tuple

from talent_acquisition.hiring_constants import HIRING_LLM_INSIGHTS_CACHE_TTL_SEC, HIRING_PACK_CACHE_TTL_SEC

logger = logging.getLogger(__name__)

_HIRING_PACK_CACHE: Dict[str, Tuple[float, Any]] = {}
_LLM_INSIGHTS_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}


def get_cached_hiring_pack(cache_key: str) -> Any | None:
    hit = _HIRING_PACK_CACHE.get(cache_key)
    if not hit:
        return None
    cached_at, payload = hit
    if (time.time() - cached_at) >= HIRING_PACK_CACHE_TTL_SEC:
        _HIRING_PACK_CACHE.pop(cache_key, None)
        _LLM_INSIGHTS_CACHE.pop(cache_key, None)
        return None
    return payload


def set_cached_hiring_pack(cache_key: str, payload: Any) -> None:
    _HIRING_PACK_CACHE[cache_key] = (time.time(), payload)


def get_cached_llm_insights(cache_key: str) -> Dict[str, Any] | None:
    hit = _LLM_INSIGHTS_CACHE.get(cache_key)
    if not hit:
        return None
    cached_at, payload = hit
    if (time.time() - cached_at) >= HIRING_LLM_INSIGHTS_CACHE_TTL_SEC:
        _LLM_INSIGHTS_CACHE.pop(cache_key, None)
        return None
    return payload


def set_cached_llm_insights(cache_key: str, payload: Dict[str, Any]) -> None:
    _LLM_INSIGHTS_CACHE[cache_key] = (time.time(), payload)


def invalidate_hiring_pack_cache(*, reason: str = "pipeline_change") -> int:
    """Clear all hiring-pack and LLM insight cache entries."""
    count = len(_HIRING_PACK_CACHE) + len(_LLM_INSIGHTS_CACHE)
    if count:
        _HIRING_PACK_CACHE.clear()
        _LLM_INSIGHTS_CACHE.clear()
        logger.info("Invalidated hiring-pack cache (%d entries) reason=%s", count, reason)
    return count


def hiring_pack_cache_size() -> int:
    return len(_HIRING_PACK_CACHE)


def hiring_llm_insights_cache_size() -> int:
    return len(_LLM_INSIGHTS_CACHE)
