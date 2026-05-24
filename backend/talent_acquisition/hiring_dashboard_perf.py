"""Slow-query logging for Smart Hiring Dashboard aggregations."""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def log_slow_hiring_pack_query(duration_sec: float, **context: Any) -> None:
    threshold = float(os.environ.get("HIRING_PACK_SLOW_QUERY_SEC", "1.0"))
    if duration_sec >= threshold:
        logger.warning(
            "Slow hiring-pack aggregation %.3fs (threshold=%.3fs) %s",
            duration_sec,
            threshold,
            context,
        )
