"""Topic handlers — extend as new consumers are added (M10-2)."""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable, Dict

from m10_events.constants import CONSUMER_NAME
from m10_events.idempotency import audit_handler_run, try_mark_processed
from m10_events.topics import (
    TOPIC_EMPLOYEE_LIFECYCLE_EVENT_CREATED,
    TOPIC_WORKFLOW_RUN_COMPLETED,
    TOPIC_WORKFLOW_RUN_FAILED,
)

logger = logging.getLogger(__name__)

HandlerFn = Callable[[Any, Dict[str, Any]], Awaitable[None]]


async def _handle_lifecycle_created(db, envelope: Dict[str, Any]) -> None:
    """Downstream hooks (notifications, search index) can subscribe later."""
    p = envelope.get("payload") or {}
    logger.info(
        "m10 consumer: lifecycle_event.created envelope_event=%s lifecycle_event_id=%s employee_code=%s",
        envelope.get("event_id"),
        p.get("lifecycle_event_id"),
        p.get("employee_code"),
    )


async def _handle_workflow_completed(db, envelope: Dict[str, Any]) -> None:
    p = envelope.get("payload") or {}
    logger.info(
        "m10 consumer: workflow.run.completed event_id=%s rule_id=%s run_id=%s",
        envelope.get("event_id"),
        p.get("rule_id"),
        p.get("run_id"),
    )


async def _handle_workflow_failed(db, envelope: Dict[str, Any]) -> None:
    p = envelope.get("payload") or {}
    logger.warning(
        "m10 consumer: workflow.run.failed event_id=%s rule_id=%s run_id=%s",
        envelope.get("event_id"),
        p.get("rule_id"),
        p.get("run_id"),
    )


HANDLERS: Dict[str, HandlerFn] = {
    TOPIC_EMPLOYEE_LIFECYCLE_EVENT_CREATED: _handle_lifecycle_created,
    TOPIC_WORKFLOW_RUN_COMPLETED: _handle_workflow_completed,
    TOPIC_WORKFLOW_RUN_FAILED: _handle_workflow_failed,
}


async def dispatch_event(db, envelope: Dict[str, Any]) -> None:
    topic = envelope.get("topic") or ""
    event_id = envelope.get("event_id") or ""
    idem = envelope.get("idempotency_key")
    fn = HANDLERS.get(topic)
    if not fn:
        logger.debug("m10 consumer: no handler for topic=%s", topic)
        return

    if idem:
        from m10_events.constants import COL_M10_IDEMPOTENCY

        dup = await db[COL_M10_IDEMPOTENCY].find_one(
            {"consumer": CONSUMER_NAME, "topic": topic, "idempotency_key": str(idem)},
            {"_id": 0},
        )
        if dup:
            logger.info("m10 consumer: skip duplicate idempotency_key=%s topic=%s", idem, topic)
            return

    try:
        await fn(db, envelope)
        if idem:
            await try_mark_processed(
                db,
                consumer=CONSUMER_NAME,
                topic=topic,
                idempotency_key=str(idem),
                event_id=event_id,
            )
        await audit_handler_run(db, consumer=CONSUMER_NAME, topic=topic, event_id=event_id, ok=True)
    except Exception as e:
        await audit_handler_run(
            db,
            consumer=CONSUMER_NAME,
            topic=topic,
            event_id=event_id,
            ok=False,
            detail={"error": str(e)},
        )
        raise
