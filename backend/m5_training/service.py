"""Async helpers: path templates, certification expiry scan."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from m5_training.constants import COL_ASSIGNMENTS, COL_CERTIFICATIONS, COL_LEARNING_PATH_TEMPLATES


async def load_path_templates_map(db: AsyncIOMotorDatabase) -> Dict[str, List[Dict[str, str]]]:
    rows = await db[COL_LEARNING_PATH_TEMPLATES].find({}, {"_id": 0}).to_list(500)
    out: Dict[str, List[Dict[str, str]]] = {}
    for r in rows:
        sk = (r.get("skill_name_lc") or "").strip().lower()
        steps = r.get("steps") or []
        if not sk or not isinstance(steps, list):
            continue
        out[sk] = [
            {"step_title": str(s.get("step_title") or ""), "description": str(s.get("description") or "")}
            for s in steps
            if isinstance(s, dict)
        ]
    return out


async def scan_certification_expiry(
    db: AsyncIOMotorDatabase,
    *,
    days_ahead: int = 30,
    notify_fn=None,
) -> Dict[str, Any]:
    """
    Find certifications expiring within window; optional notify_fn(recipient_id, cert_doc).
    Sets expiry_reminder_sent_at on notified docs.
    """
    days_ahead = max(1, min(int(days_ahead), 365))
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days_ahead)

    q = {
        "expires_at": {
            "$gte": now.isoformat(),
            "$lte": end.isoformat(),
            "$exists": True,
            "$nin": [None, ""],
        },
        "$or": [{"expiry_reminder_sent_at": {"$exists": False}}, {"expiry_reminder_sent_at": None}],
    }
    rows = await db[COL_CERTIFICATIONS].find(q, {"_id": 0}).to_list(500)
    notified = 0
    for c in rows:
        if notify_fn:
            await notify_fn(c)
        await db[COL_CERTIFICATIONS].update_one(
            {"id": c.get("id")},
            {"$set": {"expiry_reminder_sent_at": now.isoformat()}},
        )
        notified += 1
    return {"scanned": len(rows), "reminders_marked": notified, "window_days": days_ahead}


async def manager_team_training_summary(
    db: AsyncIOMotorDatabase,
    *,
    manager_employee_id: str,
) -> Dict[str, Any]:
    """Roll-up assignments + certs for direct reports (manager_employee_id = boss employee UUID)."""
    reports = await db.employees.find({"manager_id": manager_employee_id}, {"_id": 0, "employee_code": 1}).to_list(
        500
    )
    codes = [r.get("employee_code") for r in reports if r.get("employee_code")]
    if not codes:
        return {
            "manager_employee_id": manager_employee_id,
            "direct_reports": 0,
            "assignments_in_progress": 0,
            "assignments_completed": 0,
            "certifications_expiring_60d": 0,
        }

    in_prog = await db[COL_ASSIGNMENTS].count_documents(
        {"employee_code": {"$in": codes}, "status": "IN_PROGRESS"}
    )
    completed = await db[COL_ASSIGNMENTS].count_documents(
        {"employee_code": {"$in": codes}, "status": "COMPLETED"}
    )

    soon = datetime.now(timezone.utc) + timedelta(days=60)
    certs_soon = await db[COL_CERTIFICATIONS].count_documents(
        {
            "employee_code": {"$in": codes},
            "expires_at": {"$lte": soon.isoformat(), "$gte": datetime.now(timezone.utc).isoformat()},
        }
    )

    return {
        "manager_employee_id": manager_employee_id,
        "direct_reports": len(codes),
        "assignments_in_progress": in_prog,
        "assignments_completed": completed,
        "certifications_expiring_60d": certs_soon,
    }
