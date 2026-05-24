"""Per-user dismissals for Smart Hiring Dashboard alerts."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List

COL_HIRING_ALERT_DISMISSALS = "hiring_dashboard_alert_dismissals"


async def list_dismissed_alert_ids(db, user_id: str) -> List[str]:
    if not user_id:
        return []
    rows = await db[COL_HIRING_ALERT_DISMISSALS].find(
        {"user_id": user_id},
        {"_id": 0, "alert_id": 1},
    ).to_list(500)
    return [r["alert_id"] for r in rows if r.get("alert_id")]


async def dismiss_alert(db, user_id: str, alert_id: str) -> None:
    if not user_id or not alert_id:
        return
    now = datetime.now(timezone.utc).isoformat()
    await db[COL_HIRING_ALERT_DISMISSALS].update_one(
        {"user_id": user_id, "alert_id": alert_id},
        {"$set": {"user_id": user_id, "alert_id": alert_id, "dismissed_at": now}},
        upsert=True,
    )


async def restore_alert(db, user_id: str, alert_id: str) -> None:
    if not user_id or not alert_id:
        return
    await db[COL_HIRING_ALERT_DISMISSALS].delete_one({"user_id": user_id, "alert_id": alert_id})
