"""M5-2: sync job with retries + status reporting."""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from m5_training.catalog_normalize import normalize_course_record
from m5_training.constants import COL_LMS_COURSES, COL_LMS_SYNC_RUNS, DEFAULT_LMS_PROVIDER
from m5_training.lms_adapter import get_provider

logger = logging.getLogger(__name__)


async def upsert_normalized_course(db: AsyncIOMotorDatabase, norm: Dict[str, Any]) -> str:
    ex = await db[COL_LMS_COURSES].find_one(
        {"provider": norm["provider"], "external_id": norm["external_id"]},
        {"_id": 0, "id": 1},
    )
    now = datetime.now(timezone.utc).isoformat()
    cid = ex["id"] if ex else str(uuid.uuid4())
    doc = {
        "id": cid,
        **norm,
        "synced_at": now,
    }
    await db[COL_LMS_COURSES].update_one(
        {"provider": norm["provider"], "external_id": norm["external_id"]},
        {"$set": doc},
        upsert=True,
    )
    return cid


async def run_lms_catalog_sync(
    db: AsyncIOMotorDatabase,
    *,
    provider: Optional[str] = None,
    max_retries: int = 3,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    provider_name = (provider or DEFAULT_LMS_PROVIDER).strip().lower()
    run_id = str(uuid.uuid4())
    started = datetime.now(timezone.utc)
    attempts = 0
    last_error: Optional[str] = None
    upserted = 0
    status = "failed"

    for attempt in range(max(1, int(max_retries))):
        attempts = attempt + 1
        try:
            prov = get_provider(provider_name)
            raw_rows: List[Dict[str, Any]] = await prov.fetch_courses()
            for raw in raw_rows:
                norm = normalize_course_record(raw, provider=prov.provider_name)
                await upsert_normalized_course(db, norm)
                upserted += 1
            status = "ok"
            last_error = None
            break
        except Exception as e:  # noqa: BLE001
            last_error = str(e)
            logger.warning("LMS sync attempt %s failed: %s", attempts, e)
            if attempt < max_retries - 1:
                await asyncio.sleep(0.25 * (2**attempt))

    ended = datetime.now(timezone.utc)
    summary = {
        "run_id": run_id,
        "provider": provider_name,
        "started_at": started.isoformat(),
        "ended_at": ended.isoformat(),
        "status": status,
        "attempts": attempts,
        "courses_upserted": upserted,
        "error_message": last_error,
        "actor_id": actor_id,
    }
    await db[COL_LMS_SYNC_RUNS].insert_one(summary)
    summary.pop("_id", None)
    return summary
