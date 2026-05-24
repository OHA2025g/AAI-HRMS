"""Optional hiring analytics events (Find Matches adoption, etc.)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

COL_HIRING_ANALYTICS_EVENTS = "hiring_analytics_events"


async def log_hiring_analytics_event(
    db,
    *,
    event_type: str,
    job_id: Optional[str] = None,
    user_id: Optional[str] = None,
    match_count: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    doc: Dict[str, Any] = {
        "type": event_type,
        "job_id": job_id,
        "user_id": user_id,
        "match_count": match_count,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        doc["extra"] = extra
    await db[COL_HIRING_ANALYTICS_EVENTS].insert_one(doc)


async def log_find_matches_event(
    db,
    *,
    job_id: str,
    user_id: str,
    match_count: int,
) -> None:
    await log_hiring_analytics_event(
        db,
        event_type="find_matches",
        job_id=job_id,
        user_id=user_id,
        match_count=match_count,
    )
