from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException

from m15_workforce_intelligence.constants import (
    COL_ACTIVITY_LOGS,
    COL_AI_RECOMMENDATIONS,
    COL_ATTRITION_PREDICTIONS,
    COL_BURNOUT_PREDICTIONS,
    COL_COMPLIANCE_RISK_PREDICTIONS,
    COL_COPILOT_QUERIES,
    COL_COST_RISK_PREDICTIONS,
    COL_EXECUTIVE_SUMMARY_SNAPSHOTS,
    COL_FORECASTS,
    COL_HEADCOUNT_RECORDS,
    COL_SNAPSHOT_RECORDS,
    COL_SKILL_RISK_PREDICTIONS,
    COL_SKILL_VISIBILITY_RECORDS,
    COL_STRATEGIC_OPPORTUNITY_SNAPSHOTS,
    COL_STRATEGIC_RISK_SNAPSHOTS,
    COL_UTILIZATION_SNAPSHOTS,
)
from m15_workforce_intelligence.schemas import CopilotQueryCreate


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _log(db: Any, *, user_id: Optional[str], action: str, entity: str, entity_id: str, meta: Dict[str, Any] | None = None):
    await db[COL_ACTIVITY_LOGS].insert_one(
        {"id": str(uuid.uuid4()), "ts": _now(), "user_id": user_id, "action": action, "entity": entity, "entity_id": entity_id, "meta": meta or {}}
    )


async def list_simple(db: Any, col: str, *, skip: int = 0, limit: int = 200, q: Optional[Dict[str, Any]] = None, sort: str = "created_at") -> Dict[str, Any]:
    q = q or {}
    rows = await db[col].find(q, {"_id": 0}).sort(sort, -1).skip(skip).limit(limit).to_list(limit)
    total = await db[col].count_documents(q)
    return {"items": rows, "total": total, "skip": skip, "limit": limit}


async def dashboard_summary(db: Any) -> Dict[str, Any]:
    # Prefer seeded snapshots if present, else derive from live employees/allocations.
    latest = await db[COL_SNAPSHOT_RECORDS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    latest = latest[0] if latest else None

    # Live derivations
    total_workforce = await db.employees.count_documents({})
    active = await db.employees.count_documents({"status": {"$in": ["ACTIVE", "ONBOARDING"]}})
    inactive = await db.employees.count_documents({"status": {"$in": ["INACTIVE", "EXITED"]}})
    bench = await db.employees.count_documents({"status": "ACTIVE", "bench_status": {"$in": [True, "BENCH"]}})

    # Simple utilization estimate if allocations exist (else fall back to 0)
    alloc_count = await db.allocations.count_documents({}) if "allocations" in await db.list_collection_names() else 0
    avg_util = 0.0
    if alloc_count:
        # Approx: billable allocation fraction from allocation records if field exists.
        rows = await db.allocations.find({}, {"_id": 0, "allocation_percentage": 1}).limit(2000).to_list(2000)
        vals = [float(r.get("allocation_percentage") or 0) for r in rows if (r.get("allocation_percentage") is not None)]
        avg_util = round(sum(vals) / max(1, len(vals)), 2) if vals else 0.0

    top_skill_gaps = []
    try:
        inv = await db.workforce_skills.find({}, {"_id": 0, "skill_name": 1, "demand_count": 1, "supply_count": 1, "gap": 1, "priority": 1}).sort("gap", -1).limit(8).to_list(8)
        top_skill_gaps = inv or []
    except Exception:
        top_skill_gaps = []

    snapshot = latest or {
        "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
        "total_workforce": total_workforce,
        "active_workforce": active,
        "inactive_workforce": inactive,
        "new_joiners": 0,
        "exits": 0,
        "bench_population": bench,
        "billable_population": 0,
        "non_billable_population": 0,
        "average_utilization": avg_util,
        "critical_alert_count": 0,
    }

    recent_changes = await db.employees.find({}, {"_id": 0, "employee_code": 1, "full_name": 1, "department": 1, "status": 1, "updated_at": 1}).sort("updated_at", -1).limit(8).to_list(8)

    return {
        "generated_at": _now(),
        "snapshot": snapshot,
        "kpis": {
            "total_workforce": snapshot.get("total_workforce", total_workforce),
            "active_workforce": snapshot.get("active_workforce", active),
            "inactive_workforce": snapshot.get("inactive_workforce", inactive),
            "bench_population": snapshot.get("bench_population", bench),
            "average_utilization": snapshot.get("average_utilization", avg_util),
            "critical_alert_count": snapshot.get("critical_alert_count", 0),
        },
        "top_skill_gaps": top_skill_gaps,
        "recent_workforce_changes": recent_changes,
    }


async def executive_summary(db: Any) -> Dict[str, Any]:
    latest = await db[COL_EXECUTIVE_SUMMARY_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    if latest:
        return {"generated_at": _now(), "executive_snapshot": latest[0]}
    dash = await dashboard_summary(db)
    return {
        "generated_at": _now(),
        "executive_snapshot": {
            "snapshot_date": dash["snapshot"]["snapshot_date"],
            "summary_type": "CXO_WORKFORCE_SUMMARY",
            "summary_payload": {
                "headline": "Workforce intelligence summary (derived)",
                "kpis": dash["kpis"],
                "top_skill_gaps": dash["top_skill_gaps"][:5],
                "notes": ["Seed executive snapshots to enable richer executive decision intelligence."],
            },
            "risk_index": 0.45,
            "opportunity_index": 0.55,
            "created_at": _now(),
        },
    }


async def copilot_query(db: Any, payload: CopilotQueryCreate, user_id: Optional[str]) -> Dict[str, Any]:
    q = payload.query_text.strip()
    if not q:
        raise HTTPException(status_code=400, detail="query_text required")

    # Lightweight mock reasoning with pointers to drill-down routes.
    response = {
        "answer": "Mock Copilot response. Use the drill-down pages for details.",
        "suggested_drilldowns": [
            {"label": "Headcount Intelligence", "path": "/workforce-intelligence/headcount"},
            {"label": "Skills & Capability Visibility", "path": "/workforce-intelligence/skills-capability"},
            {"label": "Availability & Utilization", "path": "/workforce-intelligence/availability-utilization"},
            {"label": "Executive Decision Intelligence", "path": "/workforce-intelligence/executive-intelligence"},
        ],
        "interpreted_query": {"query_type": payload.query_type, "text": q},
    }

    doc = {
        "id": str(uuid.uuid4()),
        "query_id": str(uuid.uuid4()),
        "user_id": user_id,
        "query_text": q,
        "query_type": payload.query_type,
        "response_payload": response,
        "created_at": _now(),
        "source_type": payload.source_type,
        "is_mock": bool(payload.is_mock),
    }
    await db[COL_COPILOT_QUERIES].insert_one(doc)
    await _log(db, user_id=user_id, action="copilot_query", entity="copilot", entity_id=doc["id"])
    doc.pop("_id", None)
    return doc

