from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from m14_employee_lifecycle_management.constants import (
    COL_ACTIVITY_LOGS,
    COL_ACCESS_PROVISIONING,
    COL_AI_INSIGHTS,
    COL_ANALYTICS_SNAPSHOTS,
    COL_APPROVAL_REQUESTS,
    COL_ASSET_RETURN,
    COL_BGV,
    COL_CLEARANCE,
    COL_COMMUNICATION,
    COL_COMP_REVISION,
    COL_CONFIRMATION,
    COL_DISCIPLINARY,
    COL_EMPLOYEE_ASSETS,
    COL_EMPLOYEE_DOCUMENTS,
    COL_EMPLOYMENT_ADMIN,
    COL_EXIT_INTERVIEW,
    COL_FNF,
    COL_FORECASTS,
    COL_GRIEVANCES,
    COL_INTERNAL_MOBILITY,
    COL_KT_HANDOVER,
    COL_LIFECYCLE_NOTES,
    COL_MANAGER_INTERACTIONS,
    COL_NOTICE,
    COL_ONBOARDING,
    COL_PAYROLL_LINKAGE,
    COL_POLICY_CONSENTS,
    COL_POLICY_RULES,
    COL_PREBOARDING,
    COL_PROBATION,
    COL_RECOGNITION,
    COL_RESIGNATION,
    COL_RETENTION_SIGNALS,
    COL_SEPARATION,
    COL_ALUMNI_REHIRE,
    COL_WELLBEING,
    COL_LEARNING_LINKAGE,
    COL_ENGAGEMENT,
)
from m14_employee_lifecycle_management.schemas import GenericNoteCreate, OnboardingCreate, PreboardingCreate, ProbationCreate, ResignationCreate


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _log(db: Any, *, user_id: Optional[str], action: str, entity: str, entity_id: str, meta: Dict[str, Any] | None = None):
    await db[COL_ACTIVITY_LOGS].insert_one(
        {"id": str(uuid.uuid4()), "ts": _now(), "user_id": user_id, "action": action, "entity": entity, "entity_id": entity_id, "meta": meta or {}}
    )


async def dashboard_summary(db: Any) -> Dict[str, Any]:
    total_employees = await db.employees.count_documents({})
    active = await db.employees.count_documents({"status": {"$in": ["ACTIVE", "ONBOARDING"]}})
    onboarding = await db[COL_ONBOARDING].count_documents({"onboarding_status": {"$in": ["IN_PROGRESS", "PENDING"]}})
    probation = await db[COL_PROBATION].count_documents({"probation_status": {"$in": ["IN_PROGRESS", "EXTENDED"]}})
    confirmations_due = await db[COL_CONFIRMATION].count_documents({"approval_status": "PENDING"})
    doc_pending = await db[COL_EMPLOYEE_DOCUMENTS].count_documents({"verification_status": {"$in": ["PENDING", "REVIEW"]}})
    bgv_pending = await db[COL_BGV].count_documents({"bgv_overall_status": {"$in": ["PENDING", "IN_PROGRESS"]}})
    provisioning_pending = await db[COL_ACCESS_PROVISIONING].count_documents({"provisioning_status": {"$in": ["PENDING", "IN_PROGRESS"]}})
    payroll_ready = await db[COL_PAYROLL_LINKAGE].count_documents({"payroll_readiness_status": "READY"})
    approvals = await db[COL_APPROVAL_REQUESTS].count_documents({"status": "PENDING"})

    recent_alerts = (
        await db[COL_RETENTION_SIGNALS]
        .find({"severity": {"$in": ["HIGH", "CRITICAL"]}}, {"_id": 0})
        .sort("detected_on", -1)
        .limit(8)
        .to_list(8)
    )
    recent_activity = (
        await db[COL_ACTIVITY_LOGS]
        .find({}, {"_id": 0})
        .sort("ts", -1)
        .limit(10)
        .to_list(10)
    )

    return {
        "generated_at": _now(),
        "kpis": {
            "total_employees": total_employees,
            "active_employees": active,
            "pending_onboarding_tasks": onboarding,
            "employees_in_probation": probation,
            "confirmations_due": confirmations_due,
            "pending_document_compliance": doc_pending,
            "bgv_pending": bgv_pending,
            "pending_provisioning_tasks": provisioning_pending,
            "payroll_onboarding_ready": payroll_ready,
            "pending_approvals": approvals,
        },
        "recent_lifecycle_alerts": recent_alerts,
        "recent_employee_activities": recent_activity,
    }


async def _ensure_employee(db: Any, employee_id: str):
    if not employee_id:
        raise HTTPException(status_code=400, detail="employee_id required")
    ex = await db.employees.find_one({"$or": [{"id": employee_id}, {"employee_code": employee_id}]}, {"_id": 0, "id": 1})
    if not ex:
        raise HTTPException(status_code=404, detail="Employee not found")
    return ex.get("id") or employee_id


async def create_preboarding(db: Any, payload: PreboardingCreate, user_id: Optional[str]) -> Dict[str, Any]:
    eid = await _ensure_employee(db, payload.employee_id)
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "employee_id": eid, "created_at": _now(), "updated_at": _now(), "created_by": user_id, "seed_marker": None}
    await db[COL_PREBOARDING].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="preboarding", entity_id=doc["id"])
    doc.pop("_id", None)
    return doc


async def create_onboarding(db: Any, payload: OnboardingCreate, user_id: Optional[str]) -> Dict[str, Any]:
    eid = await _ensure_employee(db, payload.employee_id)
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "employee_id": eid, "created_at": _now(), "updated_at": _now(), "created_by": user_id, "seed_marker": None}
    await db[COL_ONBOARDING].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="onboarding", entity_id=doc["id"])
    doc.pop("_id", None)
    return doc


async def create_probation(db: Any, payload: ProbationCreate, user_id: Optional[str]) -> Dict[str, Any]:
    eid = await _ensure_employee(db, payload.employee_id)
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "employee_id": eid, "created_at": _now(), "updated_at": _now(), "created_by": user_id, "seed_marker": None}
    await db[COL_PROBATION].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="probation", entity_id=doc["id"])
    doc.pop("_id", None)
    return doc


async def create_resignation(db: Any, payload: ResignationCreate, user_id: Optional[str]) -> Dict[str, Any]:
    eid = await _ensure_employee(db, payload.employee_id)
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "employee_id": eid, "created_at": _now(), "updated_at": _now(), "created_by": user_id, "seed_marker": None}
    await db[COL_RESIGNATION].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="resignation", entity_id=doc["id"])
    doc.pop("_id", None)
    return doc


async def create_note(db: Any, payload: GenericNoteCreate, user_id: Optional[str]) -> Dict[str, Any]:
    eid = await _ensure_employee(db, payload.employee_id)
    doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "employee_id": eid, "created_at": _now(), "updated_at": _now(), "created_by": user_id, "seed_marker": None}
    await db[COL_LIFECYCLE_NOTES].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="note", entity_id=doc["id"])
    doc.pop("_id", None)
    return doc


async def list_simple(db: Any, col: str, *, skip: int = 0, limit: int = 100, q: Optional[Dict[str, Any]] = None, sort: str = "created_at") -> Dict[str, Any]:
    q = q or {}
    rows = await db[col].find(q, {"_id": 0}).sort(sort, -1).skip(skip).limit(limit).to_list(limit)
    total = await db[col].count_documents(q)
    return {"items": rows, "total": total, "skip": skip, "limit": limit}


async def employee_bundle(db: Any, employee_id: str) -> Dict[str, Any]:
    eid = await _ensure_employee(db, employee_id)
    emp = await db.employees.find_one({"id": eid}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {
        "employee": emp,
        "preboarding": (await db[COL_PREBOARDING].find({"employee_id": eid}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)),
        "onboarding": (await db[COL_ONBOARDING].find({"employee_id": eid}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)),
        "probation": (await db[COL_PROBATION].find({"employee_id": eid}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)),
        "documents": (await db[COL_EMPLOYEE_DOCUMENTS].find({"employee_id": eid}, {"_id": 0}).sort("uploaded_at", -1).limit(20).to_list(20)),
        "bgv": (await db[COL_BGV].find({"employee_id": eid}, {"_id": 0}).sort("completed_on", -1).limit(10).to_list(10)),
        "notes": (await db[COL_LIFECYCLE_NOTES].find({"employee_id": eid}, {"_id": 0}).sort("created_at", -1).limit(30).to_list(30)),
        "resignation": (await db[COL_RESIGNATION].find({"employee_id": eid}, {"_id": 0}).sort("resignation_submitted_on", -1).limit(10).to_list(10)),
        "notice": (await db[COL_NOTICE].find({"employee_id": eid}, {"_id": 0}).sort("notice_start_date", -1).limit(10).to_list(10)),
        "exit_interviews": (await db[COL_EXIT_INTERVIEW].find({"employee_id": eid}, {"_id": 0}).sort("scheduled_on", -1).limit(10).to_list(10)),
        "clearance": (await db[COL_CLEARANCE].find({"employee_id": eid}, {"_id": 0}).sort("closed_on", -1).limit(10).to_list(10)),
        "ai_insights": (await db[COL_AI_INSIGHTS].find({"employee_id_or_group": eid}, {"_id": 0}).sort("generated_at", -1).limit(10).to_list(10)),
    }

