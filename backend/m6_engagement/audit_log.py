"""M6-3: privacy compliance audit trail for engagement data access."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from m6_engagement.constants import COL_PRIVACY_AUDIT


async def log_engagement_privacy_event(
    db: AsyncIOMotorDatabase,
    *,
    action: str,
    actor_id: Optional[str],
    survey_id: Optional[str] = None,
    detail: Optional[Dict[str, Any]] = None,
) -> None:
    doc = {
        "id": str(uuid.uuid4()),
        "action": action,
        "actor_id": actor_id,
        "survey_id": survey_id,
        "detail": detail or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[COL_PRIVACY_AUDIT].insert_one(doc)
