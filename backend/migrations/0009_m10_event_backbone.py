"""M10: event outbox + idempotency + handler audit indexes."""

from __future__ import annotations

from event_backbone.constants import COL_M10_EVENTS, COL_M10_HANDLER_AUDIT, COL_M10_IDEMPOTENCY


async def up(db) -> None:
    await db[COL_M10_EVENTS].create_index("event_id", unique=True, name="uq_m10_event_id")
    await db[COL_M10_EVENTS].create_index([("status", 1), ("created_at", 1)], name="ix_m10_event_status_created")
    await db[COL_M10_EVENTS].create_index([("topic", 1), ("created_at", -1)], name="ix_m10_event_topic_created")
    await db[COL_M10_EVENTS].create_index(
        [("topic", 1), ("idempotency_key", 1)],
        unique=True,
        partialFilterExpression={"idempotency_key": {"$type": "string"}},
        name="uq_m10_event_topic_idempotency",
    )

    await db[COL_M10_IDEMPOTENCY].create_index(
        [("consumer", 1), ("topic", 1), ("idempotency_key", 1)],
        unique=True,
        name="uq_m10_idempotency_consumer_topic_key",
    )

    await db[COL_M10_HANDLER_AUDIT].create_index([("event_id", 1), ("at", -1)], name="ix_m10_handler_audit_event_at")
    await db[COL_M10_HANDLER_AUDIT].create_index([("at", -1)], name="ix_m10_handler_audit_at")


async def down(db) -> None:
    pass
