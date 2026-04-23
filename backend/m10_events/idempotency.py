"""Consumer-side idempotency + replay helpers (M10-2)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from m10_events.constants import COL_M10_IDEMPOTENCY, CONSUMER_NAME


def _idem_doc_key(consumer: str, topic: str, idempotency_key: str) -> Dict[str, str]:
    return {"consumer": consumer, "topic": topic, "idempotency_key": idempotency_key}


async def try_mark_processed(
    db,
    *,
    consumer: str,
    topic: str,
    idempotency_key: str,
    event_id: str,
) -> bool:
    """
    Returns True if this is the first time (insert succeeded).
    Returns False if duplicate (already processed for this consumer+key).
    """
    if not idempotency_key:
        return True
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        **_idem_doc_key(consumer, topic, idempotency_key),
        "event_id": event_id,
        "processed_at": now,
    }
    try:
        await db[COL_M10_IDEMPOTENCY].insert_one(doc)
        return True
    except Exception as e:
        from pymongo.errors import DuplicateKeyError

        if isinstance(e, DuplicateKeyError):
            return False
        raise


async def audit_handler_run(
    db,
    *,
    consumer: str,
    topic: str,
    event_id: str,
    ok: bool,
    detail: Optional[Dict[str, Any]] = None,
) -> None:
    from m10_events.constants import COL_M10_HANDLER_AUDIT

    await db[COL_M10_HANDLER_AUDIT].insert_one(
        {
            "consumer": consumer,
            "topic": topic,
            "event_id": event_id,
            "ok": ok,
            "detail": detail or {},
            "at": datetime.now(timezone.utc).isoformat(),
        }
    )
