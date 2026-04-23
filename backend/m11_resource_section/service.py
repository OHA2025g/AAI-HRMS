from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from m11_resource_section.constants import (
    COL_AI_INSIGHTS,
    COL_APPROVALS,
    COL_ATTENDANCE_IMPACT,
    COL_AVAILABILITY,
    COL_BENCH_RECORDS,
    COL_CAREER,
    COL_CERTIFICATIONS,
    COL_CLASSIFICATIONS,
    COL_COMPLIANCE,
    COL_COST_PROFILES,
    COL_DEMAND_MATCHES,
    COL_DOCUMENTS,
    COL_FORECASTS,
    COL_LEARNING,
    COL_MOBILITY,
    COL_NOTES,
    COL_PROFILES,
    COL_READINESS,
    COL_SKILL_RECORDS,
    COL_UTIL_SNAPSHOTS,
)
from m11_resource_section.models import ResourceNoteCreate, ResourceProfilePatch, SkillRecordCreate


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _alloc_pct_for_employees(db, emp_ids: List[str]) -> Dict[str, int]:
    if not emp_ids:
        return {}
    rows = await db.allocations.find(
        {"employee_id": {"$in": emp_ids}, "deleted_at": None, "status": {"$in": ["ACTIVE", "PENDING"]}},
        {"_id": 0, "employee_id": 1, "allocation_percentage": 1},
    ).to_list(5000)
    out: Dict[str, int] = {}
    for r in rows:
        e = r.get("employee_id")
        if not e:
            continue
        out[e] = out.get(e, 0) + int(r.get("allocation_percentage") or 0)
    return out


async def _manager_name(db, manager_id: Optional[str]) -> Optional[str]:
    if not manager_id:
        return None
    m = await db.employees.find_one({"id": manager_id}, {"_id": 0, "full_name": 1})
    return m.get("full_name") if m else None


async def dashboard_summary(db) -> Dict[str, Any]:
    emps = await db.employees.find({}, {"_id": 0}).to_list(5000)
    active = [e for e in emps if (e.get("status") or "").upper() == "ACTIVE"]
    emp_ids = [e["id"] for e in active]
    alloc_map = await _alloc_pct_for_employees(db, emp_ids)
    bench_n = await db[COL_BENCH_RECORDS].count_documents({"bench_end_date": None})
    billable_tagged = await db[COL_PROFILES].count_documents({"billable_classification": {"$in": ["BILLABLE", "MIXED"]}})
    certs_exp = await db[COL_CERTIFICATIONS].count_documents(
        {"expiry_date": {"$lte": "2026-12-31"}, "status": {"$ne": "EXPIRED"}}
    )
    pending_appr = await db[COL_APPROVALS].count_documents({"status": "PENDING"})
    util_rows = await db[COL_UTIL_SNAPSHOTS].find({}, {"_id": 0}).to_list(5000)
    avg_util = 0.0
    if util_rows:
        avg_util = sum(float(r.get("overall_utilization") or 0) for r in util_rows) / len(util_rows)
    bill_util = 0.0
    if util_rows:
        bill_util = sum(float(r.get("billable_utilization") or 0) for r in util_rows) / len(util_rows)
    under_n = sum(1 for r in util_rows if r.get("under_utilized_flag"))
    over_n = sum(1 for r in util_rows if r.get("over_utilized_flag"))
    attr_hits = await db["m8_attrition_scores_latest"].count_documents({"attrition_risk": {"$gte": 0.65}})

    activities = await db[COL_ACTIVITY].find({}, {"_id": 0}).sort("created_at", -1).limit(12).to_list(12)

    return {
        "totals": {
            "total_resources": len(emps),
            "active_resources": len(active),
            "available_high_level": sum(1 for e in active if alloc_map.get(e["id"], 0) < 80),
            "allocated_full": sum(1 for e in active if alloc_map.get(e["id"], 0) >= 100),
            "partially_allocated": sum(1 for e in active if 0 < alloc_map.get(e["id"], 0) < 100),
            "bench_resources": bench_n,
            "billable_resources": billable_tagged or max(1, int(len(active) * 0.72)),
            "non_billable_resources": max(0, len(active) - (billable_tagged or int(len(active) * 0.72))),
            "avg_utilization_pct": round(avg_util, 1),
            "billable_utilization_pct": round(bill_util, 1),
            "under_utilized": under_n,
            "over_utilized": over_n,
            "critical_skill_shortage": await db[COL_DEMAND_MATCHES].count_documents({"match_status": "OPEN"}),
            "expiring_certifications": certs_exp,
            "pending_approvals": pending_appr,
            "attrition_signals": attr_hits,
        },
        "recent_activities": activities,
    }


async def list_master(
    db,
    *,
    skip: int,
    limit: int,
    department: Optional[str],
    status: Optional[str],
    q: Optional[str],
) -> Tuple[List[Dict[str, Any]], int]:
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status.upper()
    if department:
        query["department"] = {"$regex": f"^{department}$", "$options": "i"}
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"full_name": rx},
            {"employee_code": rx},
            {"email": rx},
            {"role_title": rx},
        ]
    total = await db.employees.count_documents(query)
    rows = await db.employees.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    ids = [r["id"] for r in rows]
    alloc_map = await _alloc_pct_for_employees(db, ids)
    profiles = {}
    if ids:
        async for p in db[COL_PROFILES].find({"resource_id": {"$in": ids}}, {"_id": 0}):
            profiles[p["resource_id"]] = p
    readiness = {}
    if ids:
        async for p in db[COL_READINESS].find({"resource_id": {"$in": ids}}, {"_id": 0}).sort("calculated_on", -1):
            rid = p.get("resource_id")
            if rid and rid not in readiness:
                readiness[rid] = p
    bench = {}
    if ids:
        async for b in db[COL_BENCH_RECORDS].find({"resource_id": {"$in": ids}, "bench_end_date": None}, {"_id": 0}):
            bench[b["resource_id"]] = b
    util = {}
    if ids:
        async for u in db[COL_UTIL_SNAPSHOTS].find({"resource_id": {"$in": ids}}, {"_id": 0}).sort("snapshot_period", -1):
            rid = u.get("resource_id")
            if rid and rid not in util:
                util[rid] = u

    enriched = []
    for e in rows:
        rid = e["id"]
        prof = profiles.get(rid, {})
        ap = alloc_map.get(rid, 0)
        avail_pct = max(0, min(100, 100 - ap))
        u = util.get(rid, {})
        enriched.append(
            {
                **e,
                "resource_id": rid,
                "profile_overlay": prof,
                "availability_pct": avail_pct,
                "allocation_pct": ap,
                "utilization_pct": float(u.get("overall_utilization") or 0),
                "billable_utilization_pct": float(u.get("billable_utilization") or 0),
                "bench_active": rid in bench,
                "bench_record": bench.get(rid),
                "deployment_readiness_score": (readiness.get(rid) or {}).get("deployment_readiness_score"),
                "manager_name": await _manager_name(db, e.get("manager_id")),
                "primary_skill_display": prof.get("current_primary_skill") or ((e.get("skills") or [None])[0]),
            }
        )
    return enriched, total


async def get_master_detail(db, resource_id: str) -> Dict[str, Any]:
    emp = await db.employees.find_one({"id": resource_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Resource not found")
    prof = await db[COL_PROFILES].find_one({"resource_id": resource_id}, {"_id": 0})
    skills = await db[COL_SKILL_RECORDS].find({"resource_id": resource_id}, {"_id": 0}).to_list(500)
    av_rows = await db[COL_AVAILABILITY].find({"resource_id": resource_id}, {"_id": 0}).sort("updated_on", -1).limit(1).to_list(1)
    av = av_rows[0] if av_rows else None
    util = await db[COL_UTIL_SNAPSHOTS].find({"resource_id": resource_id}, {"_id": 0}).sort("snapshot_period", -1).limit(6).to_list(6)
    bench_rows = await db[COL_BENCH_RECORDS].find({"resource_id": resource_id, "bench_end_date": None}, {"_id": 0}).limit(1).to_list(1)
    bench = bench_rows[0] if bench_rows else None
    rd_rows = await db[COL_READINESS].find({"resource_id": resource_id}, {"_id": 0}).sort("calculated_on", -1).limit(1).to_list(1)
    readiness = rd_rows[0] if rd_rows else None
    matches = await db[COL_DEMAND_MATCHES].find({"resource_id": resource_id}, {"_id": 0}).limit(20).to_list(20)
    mobility = await db[COL_MOBILITY].find({"resource_id": resource_id}, {"_id": 0}).sort("event_date", -1).limit(20).to_list(20)
    career = await db[COL_CAREER].find_one({"resource_id": resource_id}, {"_id": 0})
    learning = await db[COL_LEARNING].find({"resource_id": resource_id}, {"_id": 0}).limit(30).to_list(30)
    certs = await db[COL_CERTIFICATIONS].find({"resource_id": resource_id}, {"_id": 0}).to_list(100)
    cost = await db[COL_COST_PROFILES].find_one({"resource_id": resource_id}, {"_id": 0})
    attend = await db[COL_ATTENDANCE_IMPACT].find({"resource_id": resource_id}, {"_id": 0}).limit(12).to_list(12)
    docs = await db[COL_DOCUMENTS].find({"resource_id": resource_id}, {"_id": 0}).limit(50).to_list(50)
    compl = await db[COL_COMPLIANCE].find({"resource_id": resource_id}, {"_id": 0}).limit(30).to_list(30)
    notes = await db[COL_NOTES].find({"resource_id": resource_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    approvals = await db[COL_APPROVALS].find({"resource_id": resource_id}, {"_id": 0}).sort("submitted_on", -1).limit(30).to_list(30)
    ai = await db[COL_AI_INSIGHTS].find({"resource_id": resource_id}, {"_id": 0}).sort("generated_at", -1).limit(20).to_list(20)
    alloc_map = await _alloc_pct_for_employees(db, [resource_id])
    return {
        "employee": emp,
        "profile": prof,
        "skills_extended": skills,
        "availability": av,
        "utilization_history": util,
        "bench": bench,
        "readiness": readiness,
        "demand_matches": matches,
        "mobility": mobility,
        "career": career,
        "learning": learning,
        "certifications": certs,
        "cost": cost,
        "attendance_impact": attend,
        "documents": docs,
        "compliance": compl,
        "notes": notes,
        "approvals": approvals,
        "ai_insights": ai,
        "allocation_pct": alloc_map.get(resource_id, 0),
        "availability_pct": max(0, 100 - alloc_map.get(resource_id, 0)),
    }


async def patch_profile(db, resource_id: str, payload: ResourceProfilePatch, user_id: str) -> Dict[str, Any]:
    emp = await db.employees.find_one({"id": resource_id}, {"_id": 0, "id": 1})
    if not emp:
        raise HTTPException(status_code=404, detail="Resource not found")
    patch = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    patch["resource_id"] = resource_id
    patch["updated_at"] = _now()
    patch["updated_by"] = user_id
    await db[COL_PROFILES].update_one({"resource_id": resource_id}, {"$set": patch}, upsert=True)
    row = await db[COL_PROFILES].find_one({"resource_id": resource_id}, {"_id": 0})
    return row or patch


async def list_classifications(db, resource_id: Optional[str] = None) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if resource_id:
        q["resource_id"] = resource_id
    return await db[COL_CLASSIFICATIONS].find(q, {"_id": 0}).limit(2000).to_list(2000)


async def add_classification(db, resource_id: str, tag: str, user_id: str) -> Dict[str, Any]:
    doc = {
        "id": str(uuid.uuid4()),
        "resource_id": resource_id,
        "tag": tag.strip(),
        "created_at": _now(),
        "created_by": user_id,
    }
    await db[COL_CLASSIFICATIONS].insert_one(doc)
    return doc


async def list_skill_records(db, resource_id: Optional[str] = None) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if resource_id:
        q["resource_id"] = resource_id
    return await db[COL_SKILL_RECORDS].find(q, {"_id": 0}).limit(2000).to_list(2000)


async def create_skill_record(db, payload: SkillRecordCreate, user_id: str) -> Dict[str, Any]:
    emp = await db.employees.find_one({"id": payload.resource_id}, {"_id": 0, "id": 1})
    if not emp:
        raise HTTPException(status_code=404, detail="Resource not found")
    sid = str(uuid.uuid4())
    doc = {
        "id": sid,
        "resource_id": payload.resource_id,
        "skill_name": payload.skill_name.strip(),
        "skill_category": payload.skill_category,
        "skill_type": (payload.skill_type or "SECONDARY").upper(),
        "competency_level": payload.competency_level,
        "proficiency_level": payload.proficiency_level,
        "experience_years": payload.experience_years,
        "domain_expertise": payload.domain_expertise,
        "tool_expertise": payload.tool_expertise,
        "certification_linked_flag": bool(payload.certification_linked_flag),
        "verified_flag": bool(payload.verified_flag),
        "remarks": payload.remarks,
        "last_assessed_on": None,
        "assessment_score": None,
        "created_at": _now(),
        "created_by": user_id,
    }
    await db[COL_SKILL_RECORDS].insert_one(doc)
    return doc


async def availability_utilization_bundle(db) -> Dict[str, Any]:
    av = await db[COL_AVAILABILITY].find({}, {"_id": 0}).limit(500).to_list(500)
    ut = await db[COL_UTIL_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_period", -1).limit(500).to_list(500)
    return {"availability": av, "utilization_snapshots": ut}


async def bench_list(db) -> List[Dict[str, Any]]:
    rows = await db[COL_BENCH_RECORDS].find({}, {"_id": 0}).sort("bench_start_date", -1).limit(500).to_list(500)
    out = []
    for r in rows:
        eid = r.get("resource_id")
        emp = await db.employees.find_one({"id": eid}, {"_id": 0, "full_name": 1, "department": 1, "role_title": 1}) if eid else {}
        out.append({**r, "employee_name": (emp or {}).get("full_name"), "department": (emp or {}).get("department")})
    return out


async def readiness_list(db) -> List[Dict[str, Any]]:
    return await db[COL_READINESS].find({}, {"_id": 0}).sort("calculated_on", -1).limit(500).to_list(500)


async def demand_matching_list(db) -> List[Dict[str, Any]]:
    return await db[COL_DEMAND_MATCHES].find({}, {"_id": 0}).sort("generated_on", -1).limit(500).to_list(500)


async def mobility_career_bundle(db) -> Dict[str, Any]:
    mob = await db[COL_MOBILITY].find({}, {"_id": 0}).sort("event_date", -1).limit(300).to_list(300)
    car = await db[COL_CAREER].find({}, {"_id": 0}).limit(500).to_list(500)
    return {"mobility": mob, "career_preferences": car}


async def learning_certifications_bundle(db) -> Dict[str, Any]:
    lr = await db[COL_LEARNING].find({}, {"_id": 0}).limit(500).to_list(500)
    ce = await db[COL_CERTIFICATIONS].find({}, {"_id": 0}).limit(500).to_list(500)
    return {"learning": lr, "certifications": ce}


async def cost_commercial_list(db) -> List[Dict[str, Any]]:
    rows = await db[COL_COST_PROFILES].find({}, {"_id": 0}).limit(500).to_list(500)
    out = []
    for r in rows:
        eid = r.get("resource_id")
        emp = await db.employees.find_one({"id": eid}, {"_id": 0, "full_name": 1}) if eid else {}
        out.append({**r, "full_name": (emp or {}).get("full_name")})
    return out


async def attendance_leave_list(db) -> List[Dict[str, Any]]:
    return await db[COL_ATTENDANCE_IMPACT].find({}, {"_id": 0}).limit(500).to_list(500)


async def documents_compliance_bundle(db) -> Dict[str, Any]:
    d = await db[COL_DOCUMENTS].find({}, {"_id": 0}).limit(500).to_list(500)
    c = await db[COL_COMPLIANCE].find({}, {"_id": 0}).limit(500).to_list(500)
    return {"documents": d, "compliance": c}


async def notes_list(db, resource_id: Optional[str] = None) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if resource_id:
        q["resource_id"] = resource_id
    return await db[COL_NOTES].find(q, {"_id": 0}).sort("created_at", -1).limit(300).to_list(300)


async def create_note(db, payload: ResourceNoteCreate, user_id: str) -> Dict[str, Any]:
    nid = str(uuid.uuid4())
    doc = {
        "id": nid,
        "resource_id": payload.resource_id,
        "note_type": payload.note_type,
        "title": payload.title,
        "content": payload.content.strip(),
        "is_pinned": bool(payload.is_pinned),
        "visibility_scope": payload.visibility_scope or "INTERNAL",
        "created_by": user_id,
        "created_at": _now(),
    }
    await db[COL_NOTES].insert_one(doc)
    return doc


async def analytics_summary(db) -> Dict[str, Any]:
    emps = await db.employees.count_documents({})
    active = await db.employees.count_documents({"status": "ACTIVE"})
    skills = await db[COL_SKILL_RECORDS].count_documents({})
    bench = await db[COL_BENCH_RECORDS].count_documents({"bench_end_date": None})
    by_dept = []
    pipeline = [{"$group": {"_id": "$department", "c": {"$sum": 1}}}, {"$sort": {"c": -1}}, {"$limit": 12}]
    try:
        by_dept = await db.employees.aggregate(pipeline).to_list(12)
    except Exception:
        by_dept = []
    return {"total_employees": emps, "active_employees": active, "skill_records": skills, "bench_open": bench, "by_department": by_dept}


async def forecasting_mock(db) -> Dict[str, Any]:
    doc = await db[COL_FORECASTS].find_one({"id": "latest"}, {"_id": 0})
    if doc:
        doc.pop("id", None)
        return doc
    return {
        "horizon_months": 6,
        "bench_fte_forecast": 14.2,
        "capacity_gap_fte": 9.5,
        "hiring_need_fte": 5.0,
        "skill_hotspots": ["cloud", "data", "security"],
        "scenarios": [{"name": "Base", "supply_gap_fte": 9.5}],
    }


async def approvals_list(db) -> List[Dict[str, Any]]:
    return await db[COL_APPROVALS].find({}, {"_id": 0}).sort("submitted_on", -1).limit(300).to_list(300)


async def approval_action(db, approval_id: str, body, user_id: str) -> Dict[str, Any]:
    patch = {
        "status": "APPROVED" if body.action == "approve" else "REJECTED" if body.action == "reject" else "ESCALATED",
        "decision": body.action.upper(),
        "decision_reason": body.reason,
        "approver_id": user_id,
        "acted_at": _now(),
    }
    await db[COL_APPROVALS].update_one({"id": approval_id}, {"$set": patch})
    row = await db[COL_APPROVALS].find_one({"id": approval_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Approval not found")
    return row


async def ai_insights_list(db, resource_id: Optional[str] = None) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if resource_id:
        q["resource_id"] = resource_id
    return await db[COL_AI_INSIGHTS].find(q, {"_id": 0}).sort("generated_at", -1).limit(100).to_list(100)
