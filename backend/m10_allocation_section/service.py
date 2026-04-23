from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from fastapi import HTTPException
from pymongo import ReturnDocument

from m10_allocation_section.constants import (
    COL_ACTIVITY_LOGS,
    COL_AI_INSIGHTS,
    COL_ALERTS,
    COL_BENCH_MATCHES,
    COL_CHANGES,
    COL_CONFLICTS,
    COL_DOCUMENTS,
    COL_FORECAST_SNAPSHOTS,
    COL_NOTES,
    COL_RELEASES,
    COL_ROLL_EVENTS,
    COL_STAFFING_REQUEST_HISTORY,
    COL_STAFFING_REQUESTS,
    COL_WORKFLOW_APPROVALS,
)
from m10_allocation_section.models import (
    AllocationMasterCreate,
    AllocationMasterUpdate,
    ApprovalActionBody,
    NoteCreate,
    StaffingRequestCreate,
    StaffingRequestUpdate,
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _log_activity(db, *, actor_id: str, action: str, entity_type: str, entity_id: str, payload: Optional[Dict] = None):
    doc = {
        "id": str(uuid.uuid4()),
        "actor_id": actor_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "payload": payload or {},
        "created_at": _iso_now(),
    }
    await db[COL_ACTIVITY_LOGS].insert_one(doc)


async def _next_allocation_code(db) -> str:
    year = datetime.now(timezone.utc).year
    key = f"ALC-{year}"
    rec = await db.allocation_counters.find_one_and_update(
        {"_id": key},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    seq = int((rec or {}).get("seq", 1))
    return f"{key}-{seq:05d}"


async def _enrich_allocation(db, row: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(row)
    out.pop("_id", None)
    eid = out.get("employee_id")
    pid = out.get("project_id")
    if eid:
        emp = await db.employees.find_one({"id": eid}, {"_id": 0, "full_name": 1, "department": 1, "manager_id": 1})
        if emp:
            out["employee_name"] = emp.get("full_name")
            out.setdefault("department", emp.get("department"))
            out.setdefault("manager_id", emp.get("manager_id"))
    if pid:
        proj = await db.projects.find_one({"id": pid}, {"_id": 0, "name": 1, "client_name": 1, "business_unit": 1})
        if proj:
            out["project_name"] = proj.get("name")
            out.setdefault("client_name", proj.get("client_name"))
            out.setdefault("business_unit", proj.get("business_unit"))
    cid = out.get("id")
    if cid:
        cflag = await db[COL_CONFLICTS].count_documents(
            {"allocation_id": cid, "resolution_status": {"$nin": ["RESOLVED", "DISMISSED"]}}
        )
        out["conflict_flag"] = cflag > 0
    return out


async def list_allocation_master(
    db,
    *,
    skip: int = 0,
    limit: int = 50,
    project_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    billable: Optional[bool] = None,
    q: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    query: Dict[str, Any] = {"deleted_at": None}
    if project_id:
        query["project_id"] = project_id.strip()
    if employee_id:
        query["employee_id"] = employee_id.strip()
    if status:
        query["status"] = status.strip().upper()
    if billable is not None:
        query["billable"] = billable
    if q:
        rx = {"$regex": q.strip(), "$options": "i"}
        query["$or"] = [
            {"allocation_code": rx},
            {"role": rx},
            {"remarks": rx},
        ]
    total = await db.allocations.count_documents(query)
    rows = await db.allocations.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    enriched = []
    for r in rows:
        enriched.append(await _enrich_allocation(db, r))
    return enriched, total


async def get_allocation_master(db, allocation_id: str) -> Optional[Dict[str, Any]]:
    row = await db.allocations.find_one({"id": allocation_id, "deleted_at": None}, {"_id": 0})
    if not row:
        return None
    return await _enrich_allocation(db, row)


async def create_allocation_master(
    db,
    *,
    payload: AllocationMasterCreate,
    user_id: str,
    assert_no_overallocation: Callable[..., Awaitable[None]],
) -> Dict[str, Any]:
    project_id = (payload.project_id or "").strip()
    employee_id = (payload.employee_id or "").strip()
    if not project_id or not employee_id:
        raise HTTPException(status_code=400, detail="project_id and employee_id are required")
    project = await db.projects.find_one({"id": project_id}, {"_id": 0, "id": 1})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0, "id": 1})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    await assert_no_overallocation(  # type: ignore[misc]
        employee_id,
        payload.start_date,
        payload.end_date,
        int(payload.allocation_percentage or 0),
        None,
    )

    now = _iso_now()
    aid = str(uuid.uuid4())
    code = await _next_allocation_code(db)
    doc = {
        "id": aid,
        "allocation_code": code,
        "project_id": project_id,
        "employee_id": employee_id,
        "role": (payload.role or "").strip() or None,
        "allocation_percentage": int(payload.allocation_percentage or 0),
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "billable": bool(payload.billable),
        "allocation_type": (payload.allocation_type or "FULL_TIME").upper(),
        "billing_category": payload.billing_category,
        "status": (payload.status or "PENDING").upper(),
        "approval_status": "PENDING",
        "primary_project_flag": bool(payload.primary_project_flag),
        "shadow_flag": bool(payload.shadow_flag),
        "backup_flag": bool(payload.backup_flag),
        "reserve_flag": bool(payload.reserve_flag),
        "cost_rate": payload.cost_rate,
        "billing_rate": payload.billing_rate,
        "manager_id": payload.manager_id,
        "remarks": payload.remarks,
        "request_id": None,
        "created_by": user_id,
        "updated_by": None,
        "created_at": now,
        "updated_at": None,
        "deleted_at": None,
        "approved_by": None,
        "approved_at": None,
        "rejection_reason": None,
    }
    await db.allocations.insert_one(doc)
    await _log_activity(db, actor_id=user_id, action="create", entity_type="allocation", entity_id=aid, payload={"code": code})
    return await _enrich_allocation(db, doc)


async def update_allocation_master(
    db,
    *,
    allocation_id: str,
    payload: AllocationMasterUpdate,
    user_id: str,
    assert_no_overallocation: Callable[..., Awaitable[None]],
) -> Dict[str, Any]:
    existing = await db.allocations.find_one({"id": allocation_id, "deleted_at": None}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Allocation not found")
    patch = payload.model_dump(exclude_none=True)
    if "allocation_percentage" in patch or "start_date" in patch or "end_date" in patch:
        pct = int(patch.get("allocation_percentage", existing.get("allocation_percentage") or 0))
        await assert_no_overallocation(  # type: ignore[misc]
            existing.get("employee_id") or "",
            patch.get("start_date", existing.get("start_date")),
            patch.get("end_date", existing.get("end_date")),
            pct,
            allocation_id,
        )
    for k in ("status", "approval_status", "allocation_type"):
        if k in patch and isinstance(patch[k], str):
            patch[k] = patch[k].upper()
    patch["updated_at"] = _iso_now()
    patch["updated_by"] = user_id
    await db.allocations.update_one({"id": allocation_id}, {"$set": patch})
    row = await db.allocations.find_one({"id": allocation_id}, {"_id": 0})
    await _log_activity(db, actor_id=user_id, action="update", entity_type="allocation", entity_id=allocation_id)
    return await _enrich_allocation(db, row)


async def soft_delete_allocation(db, *, allocation_id: str, user_id: str):
    res = await db.allocations.update_one(
        {"id": allocation_id, "deleted_at": None},
        {"$set": {"deleted_at": _iso_now(), "updated_by": user_id, "status": "CLOSED"}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Allocation not found")
    await _log_activity(db, actor_id=user_id, action="soft_delete", entity_type="allocation", entity_id=allocation_id)


async def clone_allocation(
    db,
    *,
    allocation_id: str,
    user_id: str,
    assert_no_overallocation: Callable[..., Awaitable[None]],
) -> Dict[str, Any]:
    src = await db.allocations.find_one({"id": allocation_id, "deleted_at": None}, {"_id": 0})
    if not src:
        raise HTTPException(status_code=404, detail="Allocation not found")
    create = AllocationMasterCreate(
        project_id=src["project_id"],
        employee_id=src["employee_id"],
        role=src.get("role"),
        allocation_percentage=int(src.get("allocation_percentage") or 50),
        start_date=src.get("start_date"),
        end_date=src.get("end_date"),
        billable=bool(src.get("billable", True)),
        allocation_type=src.get("allocation_type") or "PARTIAL",
        billing_category=src.get("billing_category"),
        status="PENDING",
        primary_project_flag=bool(src.get("primary_project_flag")),
        shadow_flag=bool(src.get("shadow_flag")),
        backup_flag=bool(src.get("backup_flag")),
        reserve_flag=bool(src.get("reserve_flag")),
        cost_rate=src.get("cost_rate"),
        billing_rate=src.get("billing_rate"),
        manager_id=src.get("manager_id"),
        remarks=(src.get("remarks") or "") + " (clone)",
    )
    return await create_allocation_master(db, payload=create, user_id=user_id, assert_no_overallocation=assert_no_overallocation)


async def dashboard_summary(db) -> Dict[str, Any]:
    base = {"deleted_at": None}
    all_rows = await db.allocations.find(base, {"_id": 0}).to_list(10000)
    active = [r for r in all_rows if (r.get("status") or "").upper() == "ACTIVE"]
    pending = [r for r in all_rows if (r.get("approval_status") or "").upper() == "PENDING"]
    billable = [r for r in active if r.get("billable")]
    non_bill = [r for r in active if not r.get("billable")]
    full_a = [r for r in active if int(r.get("allocation_percentage") or 0) >= 100]
    partial = [r for r in active if 0 < int(r.get("allocation_percentage") or 0) < 100]

    # Over / under by employee totals on active+pending
    by_emp: Dict[str, int] = {}
    for r in all_rows:
        if (r.get("status") or "").upper() in ("ACTIVE", "PENDING"):
            e = r.get("employee_id")
            if e:
                by_emp[e] = by_emp.get(e, 0) + int(r.get("allocation_percentage") or 0)
    over_count = sum(1 for _e, t in by_emp.items() if t > 100)
    under_count = sum(1 for _e, t in by_emp.items() if 0 < t < 80)

    open_demands = await db[COL_STAFFING_REQUESTS].count_documents(
        {"request_status": {"$in": ["OPEN", "IN_PROGRESS"]}}
    )
    conflicts_open = await db[COL_CONFLICTS].count_documents({"resolution_status": {"$nin": ["RESOLVED", "DISMISSED"]}})
    pending_approvals = await db[COL_WORKFLOW_APPROVALS].count_documents({"status": "PENDING"})
    pending_alloc_approvals = len(pending)

    from datetime import timedelta

    today = datetime.now(timezone.utc).date()
    upcoming_rolloff = await db[COL_ROLL_EVENTS].count_documents(
        {
            "planned_rolloff_date": {"$gte": str(today), "$lte": str(today + timedelta(days=30))},
            "actual_rolloff_date": None,
        }
    )
    bench_conv = await db[COL_BENCH_MATCHES].count_documents({"status": "CONVERTED"})
    fulfilled = await db[COL_STAFFING_REQUESTS].count_documents({"request_status": "FULFILLED"})
    total_req = await db[COL_STAFFING_REQUESTS].count_documents({})
    fulfillment_pct = round(100.0 * fulfilled / total_req, 1) if total_req else 0.0

    recent_changes = await db[COL_CHANGES].find({}, {"_id": 0}).sort("changed_on", -1).limit(8).to_list(8)
    recent_alerts = await db[COL_ALERTS].find({}, {"_id": 0}).sort("created_at", -1).limit(6).to_list(6)

    return {
        "totals": {
            "active_allocations": len(active),
            "billable_allocations": len(billable),
            "non_billable_allocations": len(non_bill),
            "full_allocations": len(full_a),
            "partial_allocations": len(partial),
            "over_allocated_resources": over_count,
            "under_allocated_resources": under_count,
            "open_staffing_demands": open_demands,
            "conflicts_open": conflicts_open,
            "upcoming_roll_offs_30d": upcoming_rolloff,
            "bench_to_allocation_conversions": bench_conv,
            "fulfillment_pct": fulfillment_pct,
            "pending_approvals": pending_approvals + pending_alloc_approvals,
            "pending_allocation_approvals": pending_alloc_approvals,
        },
        "recent_changes": recent_changes,
        "recent_alerts": recent_alerts,
    }


async def list_staffing_requests(db) -> List[Dict[str, Any]]:
    rows = await db[COL_STAFFING_REQUESTS].find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)
    return rows


async def create_staffing_request(db, *, payload: StaffingRequestCreate, user_id: str) -> Dict[str, Any]:
    if payload.needed_from_date and payload.needed_till_date and payload.needed_from_date > payload.needed_till_date:
        raise HTTPException(status_code=400, detail="needed_till_date must be on or after needed_from_date")
    rid = str(uuid.uuid4())
    now = _iso_now()
    doc = {
        "id": rid,
        "project_id": payload.project_id.strip(),
        "request_title": payload.request_title.strip(),
        "request_type": payload.request_type or "STAFFING",
        "required_role": payload.required_role,
        "required_skill": payload.required_skill,
        "skill_category": payload.skill_category,
        "competency_level": payload.competency_level,
        "experience_required": payload.experience_required,
        "certification_required": payload.certification_required,
        "location_required": payload.location_required,
        "work_mode": payload.work_mode,
        "billable_flag": bool(payload.billable_flag),
        "billing_type": payload.billing_type,
        "requested_count": int(payload.requested_count or 1),
        "needed_from_date": payload.needed_from_date,
        "needed_till_date": payload.needed_till_date,
        "urgency": payload.urgency or "medium",
        "priority": payload.priority or "medium",
        "justification": payload.justification,
        "request_status": "OPEN",
        "approval_status": "PENDING",
        "requested_by": user_id,
        "remarks": payload.remarks,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_STAFFING_REQUESTS].insert_one(doc)
    await db[COL_STAFFING_REQUEST_HISTORY].insert_one(
        {"id": str(uuid.uuid4()), "request_id": rid, "event": "created", "actor_id": user_id, "at": now, "meta": {}}
    )
    await _log_activity(db, actor_id=user_id, action="create", entity_type="staffing_request", entity_id=rid)
    return doc


async def update_staffing_request(db, *, request_id: str, payload: StaffingRequestUpdate, user_id: str) -> Dict[str, Any]:
    ex = await db[COL_STAFFING_REQUESTS].find_one({"id": request_id}, {"_id": 0})
    if not ex:
        raise HTTPException(status_code=404, detail="Request not found")
    patch = payload.model_dump(exclude_none=True)
    patch["updated_at"] = _iso_now()
    await db[COL_STAFFING_REQUESTS].update_one({"id": request_id}, {"$set": patch})
    row = await db[COL_STAFFING_REQUESTS].find_one({"id": request_id}, {"_id": 0})
    await _log_activity(db, actor_id=user_id, action="update", entity_type="staffing_request", entity_id=request_id)
    return row


async def convert_request_to_allocation(
    db,
    *,
    request_id: str,
    employee_id: str,
    allocation_percentage: int,
    user_id: str,
    assert_no_overallocation: Callable[..., Awaitable[None]],
) -> Dict[str, Any]:
    req = await db[COL_STAFFING_REQUESTS].find_one({"id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if (req.get("request_status") or "").upper() in ("CLOSED", "CANCELLED"):
        raise HTTPException(status_code=400, detail="Request is not open for conversion")
    payload = AllocationMasterCreate(
        project_id=req["project_id"],
        employee_id=employee_id.strip(),
        role=req.get("required_role"),
        allocation_percentage=allocation_percentage,
        start_date=req.get("needed_from_date"),
        end_date=req.get("needed_till_date"),
        billable=bool(req.get("billable_flag", True)),
        allocation_type="BILLABLE" if req.get("billable_flag") else "NON_BILLABLE",
        status="PENDING",
        remarks=f"Converted from request {request_id}",
    )
    created = await create_allocation_master(db, payload=payload, user_id=user_id, assert_no_overallocation=assert_no_overallocation)
    await db.allocations.update_one({"id": created["id"]}, {"$set": {"request_id": request_id}})
    created["request_id"] = request_id
    await db[COL_STAFFING_REQUESTS].update_one(
        {"id": request_id},
        {"$set": {"request_status": "FULFILLED", "linked_allocation_id": created["id"], "updated_at": _iso_now()}},
    )
    await db[COL_STAFFING_REQUEST_HISTORY].insert_one(
        {
            "id": str(uuid.uuid4()),
            "request_id": request_id,
            "event": "converted_to_allocation",
            "actor_id": user_id,
            "at": _iso_now(),
            "meta": {"allocation_id": created["id"]},
        }
    )
    return created


async def list_workflow_approvals(db, status: Optional[str] = None) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status.upper()
    return await db[COL_WORKFLOW_APPROVALS].find(q, {"_id": 0}).sort("submitted_at", -1).limit(500).to_list(500)


async def act_on_workflow_approval(db, *, approval_id: str, body: ApprovalActionBody, user_id: str) -> Dict[str, Any]:
    row = await db[COL_WORKFLOW_APPROVALS].find_one({"id": approval_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Approval not found")
    now = _iso_now()
    patch = {
        "status": "APPROVED" if body.action == "approve" else "REJECTED" if body.action == "reject" else "ESCALATED",
        "decided_at": now,
        "decided_by": user_id,
        "decision_reason": body.reason,
        "current_stage": body.stage or row.get("current_stage"),
    }
    await db[COL_WORKFLOW_APPROVALS].update_one({"id": approval_id}, {"$set": patch})
    return await db[COL_WORKFLOW_APPROVALS].find_one({"id": approval_id}, {"_id": 0})


async def list_rollon_rolloff(db) -> List[Dict[str, Any]]:
    return await db[COL_ROLL_EVENTS].find({}, {"_id": 0}).sort("planned_rolloff_date", 1).limit(500).to_list(500)


async def list_conflicts(db) -> List[Dict[str, Any]]:
    return await db[COL_CONFLICTS].find({}, {"_id": 0}).sort("detected_on", -1).limit(500).to_list(500)


async def resolve_conflict(db, *, conflict_id: str, user_id: str, body) -> Dict[str, Any]:
    patch = {
        "resolution_status": body.resolution_status,
        "remarks": body.remarks,
        "override_flag": bool(body.override_flag),
        "resolved_by": user_id,
        "resolved_on": _iso_now(),
    }
    await db[COL_CONFLICTS].update_one({"id": conflict_id}, {"$set": patch})
    row = await db[COL_CONFLICTS].find_one({"id": conflict_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Conflict not found")
    await _log_activity(db, actor_id=user_id, action="resolve_conflict", entity_type="conflict", entity_id=conflict_id)
    return row


async def billability_rows(db) -> List[Dict[str, Any]]:
    rows = await db.allocations.find({"deleted_at": None}, {"_id": 0}).limit(2000).to_list(2000)
    out = []
    for r in rows:
        rev = (r.get("billing_rate") or 0) * (r.get("allocation_percentage") or 0) / 100.0
        cost = (r.get("cost_rate") or 0) * (r.get("allocation_percentage") or 0) / 100.0
        er = await _enrich_allocation(db, r)
        er["revenue_estimate"] = round(rev, 2)
        er["cost_estimate"] = round(cost, 2)
        er["margin_estimate"] = round(rev - cost, 2)
        out.append(er)
    return out


async def demand_supply_snapshot(db) -> Dict[str, Any]:
    demands = await db.project_demands.find({}, {"_id": 0}).limit(200).to_list(200)
    emps = await db.employees.find({"status": "ACTIVE"}, {"_id": 0, "id": 1, "full_name": 1, "skills": 1, "role_title": 1}).limit(500).to_list(500)
    matches = []
    for d in demands[:40]:
        skill = (d.get("skill_name_lc") or d.get("skill_name") or "").lower()
        best = None
        best_score = 0
        for e in emps:
            sk = [str(s).lower() for s in (e.get("skills") or [])]
            score = 2 if skill and skill in sk else (1 if skill and any(skill in x for x in sk) else 0)
            rlc = (d.get("role_name_lc") or d.get("role_name") or "").lower()
            if rlc and e.get("role_title"):
                if rlc in str(e.get("role_title")).lower():
                    score += 1
            if score > best_score:
                best_score = score
                best = e
        matches.append(
            {
                "demand": d,
                "best_fit_employee": {"id": best.get("id"), "full_name": best.get("full_name")} if best else None,
                "best_fit_score": best_score,
            }
        )
    return {"demands_sample": len(demands), "active_employees": len(emps), "rows": matches}


async def fulfillment_bench_summary(db) -> Dict[str, Any]:
    bench = await db.employees.count_documents(
        {
            "status": "ACTIVE",
            "$or": [{"skills": {"$size": 0}}, {"skills": {"$exists": False}}],
        }
    )
    matches = await db[COL_BENCH_MATCHES].find({}, {"_id": 0}).limit(100).to_list(100)
    return {"bench_without_skills_count": bench, "bench_matches": matches}


async def replacement_backup_list(db) -> List[Dict[str, Any]]:
    rows = await db.allocations.find({"deleted_at": None, "$or": [{"backup_flag": True}, {"shadow_flag": True}]} , {"_id": 0}).limit(200).to_list(200)
    return [await _enrich_allocation(db, r) for r in rows]


async def changes_release_list(db) -> Dict[str, Any]:
    ch = await db[COL_CHANGES].find({}, {"_id": 0}).sort("changed_on", -1).limit(100).to_list(100)
    rel = await db[COL_RELEASES].find({}, {"_id": 0}).sort("release_date", -1).limit(100).to_list(100)
    return {"changes": ch, "releases": rel}


async def calendar_heatmap(db) -> Dict[str, Any]:
    rows = await db.allocations.find({"deleted_at": None, "status": "ACTIVE"}, {"_id": 0}).limit(500).to_list(500)
    matrix = []
    for r in rows:
        matrix.append(
            {
                "allocation_id": r.get("id"),
                "project_id": r.get("project_id"),
                "employee_id": r.get("employee_id"),
                "start_date": r.get("start_date"),
                "end_date": r.get("end_date"),
                "pct": r.get("allocation_percentage"),
            }
        )
    return {"cells": matrix}


async def list_notes(db, allocation_id: Optional[str] = None) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if allocation_id:
        q["allocation_id"] = allocation_id
    return await db[COL_NOTES].find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


async def create_note(db, *, payload: NoteCreate, user_id: str) -> Dict[str, Any]:
    nid = str(uuid.uuid4())
    now = _iso_now()
    doc = {
        "id": nid,
        "allocation_id": payload.allocation_id,
        "project_id": payload.project_id,
        "body": payload.body.strip(),
        "note_type": payload.note_type or "general",
        "created_by": user_id,
        "created_at": now,
    }
    await db[COL_NOTES].insert_one(doc)
    return doc


async def list_documents(db) -> List[Dict[str, Any]]:
    return await db[COL_DOCUMENTS].find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


async def list_alerts(db) -> List[Dict[str, Any]]:
    return await db[COL_ALERTS].find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)


async def ack_alert(db, *, alert_id: str, user_id: str):
    await db[COL_ALERTS].update_one(
        {"id": alert_id},
        {"$set": {"acknowledged": True, "acknowledged_by": user_id, "acknowledged_at": _iso_now()}},
    )


async def analytics_summary(db) -> Dict[str, Any]:
    rows = await db.allocations.find({"deleted_at": None}, {"_id": 0}).to_list(5000)
    by_type: Dict[str, int] = {}
    for r in rows:
        t = (r.get("allocation_type") or "UNSPECIFIED").upper()
        by_type[t] = by_type.get(t, 0) + 1
    bill = sum(1 for r in rows if r.get("billable"))
    nonb = len(rows) - bill
    return {
        "by_type": by_type,
        "billable_count": bill,
        "non_billable_count": nonb,
        "total_allocations": len(rows),
    }


async def forecasting_mock(db) -> Dict[str, Any]:
    cached = await db[COL_FORECAST_SNAPSHOTS].find_one({"id": "latest"}, {"_id": 0})
    if cached:
        cached.pop("id", None)
        return cached
    return {
        "horizon_months": 6,
        "projected_utilization_pct": 82.4,
        "capacity_gap_fte": 12.3,
        "bench_fte_forecast": 8.1,
        "hiring_trigger_fte": 4.0,
        "scenarios": [
            {"name": "Base", "utilization_pct": 82.4},
            {"name": "Aggressive hiring", "utilization_pct": 76.0},
        ],
    }


async def ai_insights_list(db) -> List[Dict[str, Any]]:
    return await db[COL_AI_INSIGHTS].find({}, {"_id": 0}).sort("generated_at", -1).limit(50).to_list(50)


async def assignment_suggestions(db, *, project_id: str, skill: Optional[str] = None) -> List[Dict[str, Any]]:
    emps = await db.employees.find({"status": "ACTIVE"}, {"_id": 0}).limit(200).to_list(200)
    out = []
    sk = (skill or "").lower()
    for e in emps:
        skills = [str(s).lower() for s in (e.get("skills") or [])]
        score = 95 if sk and sk in skills else (70 if skills else 40)
        out.append(
            {
                "employee_id": e.get("id"),
                "full_name": e.get("full_name"),
                "fit_score": score,
                "rationale": "Skill overlap" if sk and sk in skills else "General bench pool",
            }
        )
    out.sort(key=lambda x: -x["fit_score"])
    return out[:15]


async def scheduling_view(db) -> List[Dict[str, Any]]:
    return await db.allocations.find({"deleted_at": None}, {"_id": 0, "id": 1, "project_id": 1, "employee_id": 1, "start_date": 1, "end_date": 1, "allocation_percentage": 1}).limit(500).to_list(500)
