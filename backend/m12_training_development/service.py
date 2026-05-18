from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from m12_training_development.constants import (
    COL_APPROVAL_REQUESTS,
    COL_ASSESSMENT_RESULTS,
    COL_ASSESSMENTS,
    COL_CATALOG_ITEMS,
    COL_EXTENDED_RECORDS,
    COL_TRAINING_ATTENDANCE,
    COL_TRAINING_BATCHES,
    COL_TRAINING_ENROLLMENTS,
    COL_TRAINING_PROGRAMS,
    COL_TRAINING_SESSIONS,
)
from m12_training_development.schemas import (
    CatalogItemCreate,
    EnrollmentCreate,
    ExtendedRecordCreate,
    TrainingBatchCreate,
    TrainingProgramCreate,
    TrainingProgramUpdate,
    TrainingSessionCreate,
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def dashboard_summary(db: Any) -> Dict[str, Any]:
    """Aggregate KPIs for training dashboard."""
    base_prog = {"deleted_at": None}
    total_programs = await db[COL_TRAINING_PROGRAMS].count_documents(base_prog)
    active_programs = await db[COL_TRAINING_PROGRAMS].count_documents({**base_prog, "active_flag": True, "status": "ACTIVE"})
    upcoming = await db[COL_TRAINING_SESSIONS].count_documents(
        {"session_status": {"$in": ["SCHEDULED", "CONFIRMED"]}, "start_datetime": {"$gte": _now()}}
    )
    enroll_total = await db[COL_TRAINING_ENROLLMENTS].count_documents({})
    completions = await db[COL_TRAINING_ENROLLMENTS].count_documents({"enrollment_status": "COMPLETED"})
    pending_nom = await db[COL_TRAINING_ENROLLMENTS].count_documents({"enrollment_status": "PENDING"})
    pending_appr = await db[COL_TRAINING_ENROLLMENTS].count_documents({"approval_status": "PENDING"})
    appr_workflow = await db[COL_APPROVAL_REQUESTS].count_documents({"status": "PENDING"})

    attended = await db[COL_TRAINING_ATTENDANCE].count_documents({"attendance_status": "PRESENT"})
    absent = await db[COL_TRAINING_ATTENDANCE].count_documents({"attendance_status": "ABSENT"})
    denom = max(1, attended + absent)
    attendance_pct = round(100.0 * attended / denom, 1)

    results = await db[COL_ASSESSMENT_RESULTS].find({}, {"_id": 0, "pass_flag": 1}).to_list(50_000)
    passed = sum(1 for r in results if r.get("pass_flag"))
    assess_pct = round(100.0 * passed / max(1, len(results)), 1) if results else 0.0

    cert_expiring = await db[COL_EXTENDED_RECORDS].count_documents(
        {"record_type": "compliance_audit", "body.alert_type": "CERT_EXPIRING"}
    )
    compliance_done = await db[COL_TRAINING_ENROLLMENTS].count_documents(
        {"enrollment_status": "COMPLETED", "metadata.compliance": True}
    )
    compliance_total = await db[COL_TRAINING_ENROLLMENTS].count_documents({"metadata.compliance": True})
    compliance_pct = round(100.0 * compliance_done / max(1, compliance_total), 1) if compliance_total else 0.0

    budget_agg = await db[COL_EXTENDED_RECORDS].find({"record_type": "budget_line"}, {"_id": 0, "body": 1}).to_list(5000)
    budget_used = sum(float((b.get("body") or {}).get("spent") or 0) for b in budget_agg)
    budget_total = sum(float((b.get("body") or {}).get("allocated") or 0) for b in budget_agg)
    budget_util = round(100.0 * budget_used / max(1.0, budget_total), 1) if budget_total else 0.0

    recent = (
        await db[COL_TRAINING_ENROLLMENTS]
        .find({}, {"_id": 0})
        .sort("enrolled_on", -1)
        .limit(8)
        .to_list(8)
    )
    alerts = (
        await db[COL_EXTENDED_RECORDS]
        .find({"body.severity": {"$in": ["HIGH", "CRITICAL"]}}, {"_id": 0})
        .sort("created_at", -1)
        .limit(6)
        .to_list(6)
    )
    cal = (
        await db[COL_TRAINING_SESSIONS]
        .find({"start_datetime": {"$gte": _now()}}, {"_id": 0})
        .sort("start_datetime", 1)
        .limit(5)
        .to_list(5)
    )

    return {
        "generated_at": _now(),
        "kpis": {
            "total_programs": total_programs,
            "active_programs": active_programs,
            "upcoming_sessions": upcoming,
            "enrollments": enroll_total,
            "completions": completions,
            "pending_nominations": pending_nom,
            "pending_enrollment_approvals": pending_appr,
            "pending_workflow_approvals": appr_workflow,
            "attendance_pct": attendance_pct,
            "assessment_pass_pct": assess_pct,
            "certification_expiry_alerts": cert_expiring,
            "mandatory_compliance_completion_pct": compliance_pct,
            "budget_utilization_pct": budget_util,
        },
        "recent_enrollments": recent,
        "recent_alerts": alerts,
        "calendar_snapshot": cal,
    }


async def list_programs(
    db: Any,
    *,
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    filt: Dict[str, Any] = {"deleted_at": None}
    if status:
        filt["status"] = status.upper()
    if category:
        filt["training_category"] = category
    if q:
        rx = {"$regex": q, "$options": "i"}
        filt["$or"] = [{"training_name": rx}, {"training_code": rx}]
    total = await db[COL_TRAINING_PROGRAMS].count_documents(filt)
    rows = (
        await db[COL_TRAINING_PROGRAMS]
        .find(filt, {"_id": 0})
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return rows, total


async def get_program(db: Any, training_id: str) -> Optional[Dict[str, Any]]:
    return await db[COL_TRAINING_PROGRAMS].find_one({"id": training_id, "deleted_at": None}, {"_id": 0})


async def create_program(db: Any, payload: TrainingProgramCreate, user_id: Optional[str]) -> Dict[str, Any]:
    code = payload.training_code.strip().upper()
    exists = await db[COL_TRAINING_PROGRAMS].find_one({"training_code": code, "deleted_at": None}, {"_id": 0, "id": 1})
    if exists:
        raise HTTPException(status_code=400, detail="training_code must be unique")
    tid = str(uuid.uuid4())
    now = _now()
    doc = {
        "id": tid,
        "training_code": code,
        "training_name": payload.training_name.strip(),
        "training_category": payload.training_category,
        "training_type": payload.training_type,
        "level": payload.level,
        "delivery_mode": payload.delivery_mode,
        "duration_hours": float(payload.duration_hours),
        "credits": float(payload.credits),
        "description": payload.description,
        "objectives": payload.objectives,
        "learning_outcomes": payload.learning_outcomes,
        "target_audience": payload.target_audience,
        "linked_skills": [s.strip() for s in (payload.linked_skills or []) if s.strip()],
        "linked_roles": [s.strip() for s in (payload.linked_roles or []) if s.strip()],
        "compliance_flag": payload.compliance_flag,
        "certification_flag": payload.certification_flag,
        "mandatory_flag": payload.mandatory_flag,
        "active_flag": payload.active_flag,
        "version": 1,
        "status": payload.status.upper(),
        "created_by": user_id,
        "updated_by": user_id,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    await db[COL_TRAINING_PROGRAMS].insert_one(doc)
    return doc


async def update_program(db: Any, training_id: str, payload: TrainingProgramUpdate, user_id: Optional[str]) -> Dict[str, Any]:
    ex = await get_program(db, training_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Training program not found")
    patch = payload.model_dump(exclude_unset=True)
    if not patch:
        return ex
    for k, v in list(patch.items()):
        if v is None:
            del patch[k]
    if "status" in patch and patch["status"]:
        patch["status"] = str(patch["status"]).upper()
    patch["updated_at"] = _now()
    patch["updated_by"] = user_id
    if "linked_skills" in patch and patch["linked_skills"] is not None:
        patch["linked_skills"] = [s.strip() for s in patch["linked_skills"] if s and str(s).strip()]
    if "linked_roles" in patch and patch["linked_roles"] is not None:
        patch["linked_roles"] = [s.strip() for s in patch["linked_roles"] if s and str(s).strip()]
    await db[COL_TRAINING_PROGRAMS].update_one({"id": training_id}, {"$set": patch, "$inc": {"version": 1}})
    return await get_program(db, training_id)  # type: ignore


async def archive_program(db: Any, training_id: str, user_id: Optional[str]) -> Dict[str, Any]:
    ex = await get_program(db, training_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Training program not found")
    if ex.get("mandatory_flag") and ex.get("compliance_flag"):
        active_assign = await db[COL_TRAINING_ENROLLMENTS].count_documents(
            {"training_id": training_id, "enrollment_status": {"$in": ["ENROLLED", "IN_PROGRESS"]}, "metadata.compliance": True}
        )
        if active_assign > 0:
            raise HTTPException(status_code=400, detail="Cannot archive mandatory compliance program with active enrollments")
    now = _now()
    await db[COL_TRAINING_PROGRAMS].update_one(
        {"id": training_id},
        {"$set": {"deleted_at": now, "active_flag": False, "status": "ARCHIVED", "updated_at": now, "updated_by": user_id}},
    )
    return await db[COL_TRAINING_PROGRAMS].find_one({"id": training_id}, {"_id": 0})


async def program_detail_bundle(db: Any, training_id: str) -> Dict[str, Any]:
    p = await get_program(db, training_id)
    if not p:
        raise HTTPException(status_code=404, detail="Training program not found")
    sessions = await db[COL_TRAINING_SESSIONS].find({"training_id": training_id}, {"_id": 0}).sort("start_datetime", 1).to_list(200)
    batches = await db[COL_TRAINING_BATCHES].find({"training_id": training_id}, {"_id": 0}).to_list(100)
    enr = await db[COL_TRAINING_ENROLLMENTS].find({"training_id": training_id}, {"_id": 0}).sort("enrolled_on", -1).to_list(500)
    att = await db[COL_TRAINING_ATTENDANCE].find({"training_id": training_id}, {"_id": 0}).limit(500).to_list(500)
    asm = await db[COL_ASSESSMENTS].find({"training_id": training_id}, {"_id": 0}).to_list(50)
    results = await db[COL_ASSESSMENT_RESULTS].find({"training_id": training_id}, {"_id": 0}).limit(500).to_list(500)
    feedback = await db[COL_EXTENDED_RECORDS].find(
        {"record_type": "feedback", "body.training_id": training_id},
        {"_id": 0},
    ).limit(100).to_list(100)
    return {
        "program": p,
        "sessions": sessions,
        "batches": batches,
        "enrollments": enr,
        "attendance": att,
        "assessments": asm,
        "assessment_results": results,
        "feedback": feedback,
    }


async def create_batch(db: Any, payload: TrainingBatchCreate, user_id: Optional[str]) -> Dict[str, Any]:
    if not await get_program(db, payload.training_id):
        raise HTTPException(status_code=404, detail="Training program not found")
    bid = str(uuid.uuid4())
    now = _now()
    doc = {
        "id": bid,
        "training_id": payload.training_id,
        "batch_code": payload.batch_code.strip().upper(),
        "batch_name": payload.batch_name.strip(),
        "capacity": int(payload.capacity),
        "status": payload.status.upper(),
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_TRAINING_BATCHES].insert_one(doc)
    doc.pop("_id", None)
    return doc


async def list_batches(db: Any, training_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if training_id:
        q["training_id"] = training_id
    return await db[COL_TRAINING_BATCHES].find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)


async def create_session(db: Any, payload: TrainingSessionCreate, user_id: Optional[str]) -> Dict[str, Any]:
    if not await get_program(db, payload.training_id):
        raise HTTPException(status_code=404, detail="Training program not found")
    sid = str(uuid.uuid4())
    now = _now()
    doc = {
        "id": sid,
        "training_id": payload.training_id,
        "batch_id": payload.batch_id,
        "session_title": payload.session_title.strip(),
        "start_datetime": payload.start_datetime,
        "end_datetime": payload.end_datetime,
        "trainer_id": payload.trainer_id,
        "venue_or_link": payload.venue_or_link,
        "delivery_mode": payload.delivery_mode,
        "capacity": int(payload.capacity),
        "session_status": payload.session_status.upper(),
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_TRAINING_SESSIONS].insert_one(doc)
    doc.pop("_id", None)
    return doc


async def list_sessions(db: Any, training_id: Optional[str] = None, skip: int = 0, limit: int = 200) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if training_id:
        q["training_id"] = training_id
    return await db[COL_TRAINING_SESSIONS].find(q, {"_id": 0}).sort("start_datetime", -1).skip(skip).limit(limit).to_list(limit)


async def _batch_capacity_remaining(db: Any, batch_id: str) -> Tuple[int, int]:
    b = await db[COL_TRAINING_BATCHES].find_one({"id": batch_id}, {"_id": 0, "capacity": 1})
    if not b:
        raise HTTPException(status_code=404, detail="Batch not found")
    cap = int(b.get("capacity") or 0)
    used = await db[COL_TRAINING_ENROLLMENTS].count_documents(
        {"batch_id": batch_id, "enrollment_status": {"$nin": ["CANCELLED", "REJECTED"]}}
    )
    return cap, max(0, cap - used)


async def create_enrollment(db: Any, payload: EnrollmentCreate, user_id: Optional[str]) -> Dict[str, Any]:
    if not await get_program(db, payload.training_id):
        raise HTTPException(status_code=404, detail="Training program not found")
    emp = await db.employees.find_one({"id": payload.employee_id}, {"_id": 0, "id": 1})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    waitlist = bool(payload.waitlist_flag)
    remaining = 1_000_000
    if payload.batch_id:
        _cap, remaining = await _batch_capacity_remaining(db, payload.batch_id)
        if remaining <= 0 and not waitlist:
            raise HTTPException(status_code=400, detail="Batch is full; enable waitlist or pick another batch")
    eid = str(uuid.uuid4())
    now = _now()
    if payload.batch_id and remaining <= 0 and waitlist:
        estatus = "WAITLISTED"
    else:
        estatus = payload.enrollment_status.upper()
    doc = {
        "id": eid,
        "training_id": payload.training_id,
        "batch_id": payload.batch_id,
        "employee_id": payload.employee_id,
        "nomination_type": payload.nomination_type.upper(),
        "enrollment_status": estatus,
        "approval_status": payload.approval_status.upper(),
        "waitlist_flag": waitlist,
        "enrolled_on": now,
        "cancelled_on": None,
        "remarks": None,
        "metadata": {},
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_TRAINING_ENROLLMENTS].insert_one(doc)
    doc.pop("_id", None)
    return doc


async def list_enrollments(
    db: Any,
    *,
    training_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if training_id:
        q["training_id"] = training_id
    if employee_id:
        q["employee_id"] = employee_id
    return await db[COL_TRAINING_ENROLLMENTS].find(q, {"_id": 0}).sort("enrolled_on", -1).skip(skip).limit(limit).to_list(limit)


async def list_catalog(db: Any, skip: int = 0, limit: int = 200, q: Optional[str] = None) -> List[Dict[str, Any]]:
    filt: Dict[str, Any] = {}
    if q:
        filt["title"] = {"$regex": q, "$options": "i"}
    return await db[COL_CATALOG_ITEMS].find(filt, {"_id": 0}).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)


async def create_catalog_item(db: Any, payload: CatalogItemCreate, user_id: Optional[str]) -> Dict[str, Any]:
    if payload.training_id and not await get_program(db, payload.training_id):
        raise HTTPException(status_code=404, detail="Training program not found")
    cid = str(uuid.uuid4())
    now = _now()
    doc = {
        "id": cid,
        "training_id": payload.training_id,
        "catalog_type": payload.catalog_type,
        "title": payload.title.strip(),
        "description": payload.description,
        "skill_tags": [s.strip().lower() for s in (payload.skill_tags or []) if s and str(s).strip()],
        "role_tags": [s.strip() for s in (payload.role_tags or []) if s and str(s).strip()],
        "source_type": payload.source_type,
        "provider_name": payload.provider_name,
        "duration_hours": float(payload.duration_hours),
        "mode": payload.mode,
        "mandatory_flag": payload.mandatory_flag,
        "status": payload.status,
        "visibility": payload.visibility,
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_CATALOG_ITEMS].insert_one(doc)
    doc.pop("_id", None)
    return doc


async def list_extended(
    db: Any,
    record_type: str,
    *,
    skip: int = 0,
    limit: int = 100,
    employee_id: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    q: Dict[str, Any] = {"record_type": record_type}
    if employee_id:
        q["employee_id"] = employee_id
    total = await db[COL_EXTENDED_RECORDS].count_documents(q)
    rows = (
        await db[COL_EXTENDED_RECORDS]
        .find(q, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return rows, total


async def create_extended(db: Any, payload: ExtendedRecordCreate, user_id: Optional[str]) -> Dict[str, Any]:
    rid = str(uuid.uuid4())
    now = _now()
    doc = {
        "id": rid,
        "record_type": payload.record_type,
        "title": payload.title.strip(),
        "body": payload.body,
        "employee_id": payload.employee_id,
        "department_id": payload.department_id,
        "priority": payload.priority.upper(),
        "status": payload.status.upper(),
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_EXTENDED_RECORDS].insert_one(doc)
    doc.pop("_id", None)
    return doc


async def clone_program(db: Any, training_id: str, user_id: Optional[str]) -> Dict[str, Any]:
    src = await get_program(db, training_id)
    if not src:
        raise HTTPException(status_code=404, detail="Training program not found")
    payload = TrainingProgramCreate(
        training_code=f"{src['training_code']}-C{str(uuid.uuid4())[:6].upper()}",
        training_name=f"{src['training_name']} (copy)",
        training_category=src.get("training_category") or "GENERAL",
        training_type=src.get("training_type") or "COURSE",
        level=src.get("level") or "ALL",
        delivery_mode=src.get("delivery_mode") or "VIRTUAL",
        duration_hours=float(src.get("duration_hours") or 0),
        credits=float(src.get("credits") or 0),
        description=src.get("description"),
        objectives=src.get("objectives"),
        learning_outcomes=src.get("learning_outcomes"),
        target_audience=src.get("target_audience"),
        linked_skills=list(src.get("linked_skills") or []),
        linked_roles=list(src.get("linked_roles") or []),
        compliance_flag=bool(src.get("compliance_flag")),
        certification_flag=bool(src.get("certification_flag")),
        mandatory_flag=bool(src.get("mandatory_flag")),
        active_flag=False,
        status="DRAFT",
    )
    return await create_program(db, payload, user_id)
