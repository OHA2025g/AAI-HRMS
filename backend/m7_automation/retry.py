"""M7-1: async retry with exponential backoff."""

from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


async def run_with_retries(
    op: Callable[[], Awaitable[T]],
    *,
    max_attempts: int = 3,
    backoff_sec: float = 1.0,
    label: str = "op",
) -> T:
    """
    Runs `op` up to `max_attempts` times. Waits `backoff_sec * 2**i` after failures.
    Re-raises the last exception if all attempts fail.
    """
    max_attempts = max(1, int(max_attempts))
    backoff_sec = max(0.1, float(backoff_sec))
    last_exc: Exception | None = None
    for attempt in range(max_attempts):
        try:
            return await op()
        except Exception as e:
            last_exc = e
            logger.warning("%s attempt %s/%s failed: %s", label, attempt + 1, max_attempts, e)
            if attempt + 1 >= max_attempts:
                break
            await asyncio.sleep(backoff_sec * (2**attempt))
    assert last_exc is not None
    raise last_exc
