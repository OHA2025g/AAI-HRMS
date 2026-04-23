"""Publish events to Mongo outbox (M10-2)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from m10_events.constants import COL_M10_EVENTS, DEFAULT_PRODUCER
from m10_events.schemas import M10EventEnvelope
from m10_events.topics import ALL_TOPICS

logger = logging.getLogger(__name__)


async def publish_event(
    db,
    *,
    topic: str,
    payload: Dict[str, Any],
    producer: str = DEFAULT_PRODUCER,
    correlation_id: Optional[str] = None,
    causation_id: Optional[str] = None,
    idempotency_key: Optional[str] = None,
) -> str:
    if topic not in ALL_TOPICS:
        logger.warning("m10 publish: unknown topic %s (allowed set may need update)", topic)

    if idempotency_key:
        existing = await db[COL_M10_EVENTS].find_one(
            {"topic": topic, "idempotency_key": idempotency_key},
            {"_id": 0, "event_id": 1},
        )
        if existing and existing.get("event_id"):
            return str(existing["event_id"])

    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    env = M10EventEnvelope(
        event_id=event_id,
        topic=topic,
        occurred_at=now,
        producer=producer,
        correlation_id=correlation_id,
        causation_id=causation_id,
        idempotency_key=idempotency_key,
        payload=payload,
    )
    doc = {
        "event_id": event_id,
        "topic": topic,
        "idempotency_key": idempotency_key,
        "envelope": env.model_dump(),
        "status": "PENDING",
        "attempts": 0,
        "last_error": None,
        "created_at": now,
        "processed_at": None,
    }
    await db[COL_M10_EVENTS].insert_one(doc)
    return event_id
