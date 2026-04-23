"""Background consumer loop — Mongo-claimed outbox pattern (M10-2)."""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from pymongo import ReturnDocument

from m10_events.constants import (
    CLAIM_BATCH_SIZE,
    COL_M10_EVENTS,
    MAX_DELIVERY_ATTEMPTS,
    POLL_INTERVAL_SEC,
)
from m10_events.handlers import dispatch_event

logger = logging.getLogger(__name__)


async def _claim_one(db) -> Optional[dict]:
    return await db[COL_M10_EVENTS].find_one_and_update(
        {
            "status": "PENDING",
            "attempts": {"$lt": MAX_DELIVERY_ATTEMPTS},
        },
        {"$set": {"status": "PROCESSING"}, "$inc": {"attempts": 1}},
        sort=[("created_at", 1)],
        return_document=ReturnDocument.AFTER,
    )


async def process_one_event(db, doc: dict) -> None:
    event_id = doc.get("event_id")
    env = doc.get("envelope") or {}
    if not isinstance(env, dict):
        env = {}
    try:
        await dispatch_event(db, env)
        await db[COL_M10_EVENTS].update_one(
            {"event_id": event_id},
            {
                "$set": {
                    "status": "DONE",
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                    "last_error": None,
                }
            },
        )
    except Exception as e:
        attempts = int(doc.get("attempts") or 0)
        if attempts >= MAX_DELIVERY_ATTEMPTS:
            await db[COL_M10_EVENTS].update_one(
                {"event_id": event_id},
                {"$set": {"status": "FAILED", "last_error": str(e)[:2000]}},
            )
            logger.exception("m10 event %s permanently failed after %s attempts", event_id, attempts)
        else:
            await db[COL_M10_EVENTS].update_one(
                {"event_id": event_id},
                {"$set": {"status": "PENDING", "last_error": str(e)[:2000]}},
            )
            logger.warning("m10 event %s will retry: %s", event_id, e)


async def run_consumer_loop(db) -> None:
    if (os.environ.get("M10_EVENT_CONSUMER_ENABLED") or "1").strip().lower() in ("0", "false", "no"):
        logger.info("M10 event consumer disabled (M10_EVENT_CONSUMER_ENABLED=0)")
        return
    logger.info("M10 event consumer loop started")
    while True:
        try:
            for _ in range(CLAIM_BATCH_SIZE):
                doc = await _claim_one(db)
                if not doc:
                    break
                await process_one_event(db, doc)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("m10 consumer batch error")
        await asyncio.sleep(POLL_INTERVAL_SEC)


def spawn_consumer_task(db) -> asyncio.Task:
    return asyncio.create_task(run_consumer_loop(db), name="m10_event_consumer")
