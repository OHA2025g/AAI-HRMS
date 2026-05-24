"""Audit trail for assessment lifecycle actions."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

COL_ASSESSMENT_AUDIT = "assessment_audit_log"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def log_assessment_audit(
    db,
    *,
    action: str,
    actor_id: Optional[str],
    assessment_id: Optional[str] = None,
    submission_id: Optional[str] = None,
    detail: Optional[Dict[str, Any]] = None,
) -> None:
    await db[COL_ASSESSMENT_AUDIT].insert_one(
        {
            "id": str(uuid.uuid4()),
            "action": action,
            "actor_id": actor_id,
            "assessment_id": assessment_id,
            "submission_id": submission_id,
            "detail": detail or {},
            "created_at": _now_iso(),
        }
    )


async def list_assessment_audit(
    db,
    *,
    assessment_id: Optional[str] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {}
    if assessment_id:
        query["assessment_id"] = assessment_id
    rows = (
        await db[COL_ASSESSMENT_AUDIT]
        .find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(min(limit, 500))
        .to_list(limit)
    )
    for row in rows:
        if row.get("actor_id"):
            user = await db.users.find_one({"id": row["actor_id"]}, {"_id": 0, "full_name": 1, "email": 1})
            row["actor_name"] = (user or {}).get("full_name") or (user or {}).get("email") or row["actor_id"]
    return rows
