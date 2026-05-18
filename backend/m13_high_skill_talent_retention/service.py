from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from m13_high_skill_talent_retention.constants import (
    COL_ACTIVITY_LOGS,
    COL_AI_FLIGHT_RISK,
    COL_AI_RECOMMENDATIONS,
    COL_APPROVAL_REQUESTS,
    COL_ATTRITION_PREDICTIONS,
    COL_CLIENT_CRITICAL,
    COL_COMP_COMPETITIVENESS,
    COL_CRITICAL_TALENT_PROFILES,
    COL_ENGAGEMENT_ACTION_PLANS,
    COL_ENGAGEMENT_SIGNALS,
    COL_EXIT_RISK_TRIGGERS,
    COL_INTERNAL_MOBILITY,
    COL_KNOWLEDGE_DEPENDENCY,
    COL_POLICY_RULES,
    COL_PROMOTION_STAGNATION,
    COL_PROJECT_CRITICAL,
    COL_RECOGNITION_RECORDS,
    COL_RELATIONSHIP_HISTORY,
    COL_RETENTION_CASES,
    COL_RETENTION_INCENTIVES,
    COL_RISK_ASSESSMENTS,
    COL_SEARCH_LOGS,
    COL_TALENT_SEGMENTS,
    COL_STABILITY_FORECASTS,
    COL_STAY_INTERVIEWS,
    COL_SUCCESSOR_COVERAGE,
    COL_TALENT_CRITICALITY_TAGS,
)
from m13_high_skill_talent_retention.schemas import (
    AttritionPredictionCreate,
    CriticalTalentProfileCreate,
    CriticalTalentProfileUpdate,
    EngagementActionPlanCreate,
    RetentionCaseCreate,
    RetentionRiskAssessmentCreate,
    StayInterviewCreate,
    TalentCriticalityTagCreate,
    TalentSegmentCreate,
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _log(db: Any, *, user_id: Optional[str], action: str, entity: str, entity_id: str, meta: Dict[str, Any] | None = None):
    await db[COL_ACTIVITY_LOGS].insert_one(
        {
            "id": str(uuid.uuid4()),
            "ts": _now(),
            "user_id": user_id,
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "meta": meta or {},
        }
    )


async def dashboard_summary(db: Any, *, bu: Optional[str] = None, dept: Optional[str] = None) -> Dict[str, Any]:
    pfilt: Dict[str, Any] = {"deleted_at": None}
    if bu:
        pfilt["business_unit"] = bu
    if dept:
        pfilt["department"] = dept

    total_critical = await db[COL_CRITICAL_TALENT_PROFILES].count_documents(pfilt)
    high_risk = await db[COL_CRITICAL_TALENT_PROFILES].count_documents({**pfilt, "current_risk_level": {"$in": ["HIGH", "CRITICAL"]}})
    med_risk = await db[COL_CRITICAL_TALENT_PROFILES].count_documents({**pfilt, "current_risk_level": "MEDIUM"})
    low_risk = await db[COL_CRITICAL_TALENT_PROFILES].count_documents({**pfilt, "current_risk_level": "LOW"})

    successor_yes = await db[COL_CRITICAL_TALENT_PROFILES].count_documents({**pfilt, "successor_available_flag": True})
    successor_cov = round(100.0 * successor_yes / max(1, total_critical), 1) if total_critical else 0.0

    engagement_rows = await db[COL_ENGAGEMENT_SIGNALS].find({}, {"_id": 0, "engagement_score": 1}).limit(5000).to_list(5000)
    engagement_health = (
        round(sum(float(r.get("engagement_score") or 0) for r in engagement_rows) / max(1, len(engagement_rows)), 2)
        if engagement_rows
        else 0.0
    )

    comp_risk = await db[COL_COMP_COMPETITIVENESS].count_documents({"compensation_risk_level": {"$in": ["HIGH", "CRITICAL"]}})
    burnout_risk = await db[COL_ENGAGEMENT_SIGNALS].count_documents({"burnout_score": {"$gte": 0.75}})
    project_critical = await db[COL_PROJECT_CRITICAL].count_documents({})
    client_critical = await db[COL_CLIENT_CRITICAL].count_documents({})

    pending_actions = await db[COL_ENGAGEMENT_ACTION_PLANS].count_documents({"status": {"$in": ["OPEN", "IN_PROGRESS"]}})
    open_cases = await db[COL_RETENTION_CASES].count_documents({"status": {"$in": ["OPEN", "IN_PROGRESS"]}})
    recent_alerts = (
        await db[COL_EXIT_RISK_TRIGGERS]
        .find({"severity": {"$in": ["HIGH", "CRITICAL"]}}, {"_id": 0})
        .sort("detected_on", -1)
        .limit(10)
        .to_list(10)
    )

    top_risk = (
        await db[COL_CRITICAL_TALENT_PROFILES]
        .find({**pfilt, "current_risk_level": {"$in": ["HIGH", "CRITICAL"]}}, {"_id": 0})
        .sort("retention_sensitivity_index", -1)
        .limit(15)
        .to_list(15)
    )

    return {
        "generated_at": _now(),
        "kpis": {
            "total_critical_talent": total_critical,
            "high_risk_talent": high_risk,
            "medium_risk_talent": med_risk,
            "low_risk_talent": low_risk,
            "successor_coverage_pct": successor_cov,
            "engagement_health_score": engagement_health,
            "compensation_risk_count": comp_risk,
            "burnout_risk_count": burnout_risk,
            "project_critical_talent_count": project_critical,
            "client_critical_talent_count": client_critical,
            "pending_retention_actions": pending_actions,
            "open_retention_cases": open_cases,
        },
        "recent_attrition_alerts": recent_alerts,
        "top_risk_talent": top_risk,
    }


async def list_profiles(
    db: Any,
    *,
    skip: int = 0,
    limit: int = 50,
    q: Optional[str] = None,
    risk: Optional[str] = None,
    segment: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    filt: Dict[str, Any] = {"deleted_at": None}
    if q:
        rx = {"$regex": q, "$options": "i"}
        filt["$or"] = [{"employee_id": rx}, {"talent_code": rx}, {"primary_skill": rx}, {"department": rx}]
    if risk:
        filt["current_risk_level"] = risk.upper()
    if segment:
        emp_ids = await db[COL_TALENT_SEGMENTS].distinct("employee_id", {"segment_type": segment, "active_flag": True})
        filt["employee_id"] = {"$in": emp_ids}
    total = await db[COL_CRITICAL_TALENT_PROFILES].count_documents(filt)
    rows = (
        await db[COL_CRITICAL_TALENT_PROFILES]
        .find(filt, {"_id": 0})
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return rows, total


async def get_profile(db: Any, profile_id: str) -> Optional[Dict[str, Any]]:
    return await db[COL_CRITICAL_TALENT_PROFILES].find_one({"id": profile_id, "deleted_at": None}, {"_id": 0})


async def create_profile(db: Any, payload: CriticalTalentProfileCreate, user_id: Optional[str]) -> Dict[str, Any]:
    exists = await db[COL_CRITICAL_TALENT_PROFILES].find_one({"talent_code": payload.talent_code, "deleted_at": None}, {"_id": 0, "id": 1})
    if exists:
        raise HTTPException(status_code=400, detail="talent_code must be unique")
    pid = str(uuid.uuid4())
    now = _now()
    doc = {
        "id": pid,
        "employee_id": payload.employee_id.strip(),
        "talent_code": payload.talent_code.strip().upper(),
        "business_unit": payload.business_unit,
        "department": payload.department,
        "manager_id": payload.manager_id,
        "primary_skill": payload.primary_skill.strip(),
        "secondary_skills": [s.strip() for s in (payload.secondary_skills or []) if s and str(s).strip()],
        "skill_depth_score": float(payload.skill_depth_score),
        "certifications_summary": payload.certifications_summary,
        "role_criticality": payload.role_criticality,
        "project_criticality": payload.project_criticality,
        "client_criticality": payload.client_criticality,
        "retention_sensitivity_index": float(payload.retention_sensitivity_index),
        "current_risk_level": payload.current_risk_level.upper(),
        "successor_available_flag": bool(payload.successor_available_flag),
        "mobility_preference": payload.mobility_preference,
        "work_preference": payload.work_preference,
        "notes": payload.notes,
        "created_by": user_id,
        "updated_by": user_id,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
    await db[COL_CRITICAL_TALENT_PROFILES].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="critical_talent_profile", entity_id=pid)
    return doc


async def update_profile(db: Any, profile_id: str, payload: CriticalTalentProfileUpdate, user_id: Optional[str]) -> Dict[str, Any]:
    ex = await get_profile(db, profile_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Profile not found")
    patch = payload.model_dump(exclude_unset=True)
    for k, v in list(patch.items()):
        if v is None:
            del patch[k]
    if "secondary_skills" in patch and patch["secondary_skills"] is not None:
        patch["secondary_skills"] = [s.strip() for s in patch["secondary_skills"] if s and str(s).strip()]
    if "current_risk_level" in patch and patch["current_risk_level"]:
        patch["current_risk_level"] = str(patch["current_risk_level"]).upper()
    patch["updated_at"] = _now()
    patch["updated_by"] = user_id
    await db[COL_CRITICAL_TALENT_PROFILES].update_one({"id": profile_id}, {"$set": patch})
    await _log(db, user_id=user_id, action="update", entity="critical_talent_profile", entity_id=profile_id, meta={"fields": list(patch.keys())})
    return await get_profile(db, profile_id)  # type: ignore


async def archive_profile(db: Any, profile_id: str, user_id: Optional[str]) -> Dict[str, Any]:
    ex = await get_profile(db, profile_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Profile not found")
    now = _now()
    await db[COL_CRITICAL_TALENT_PROFILES].update_one({"id": profile_id}, {"$set": {"deleted_at": now, "updated_at": now, "updated_by": user_id}})
    await _log(db, user_id=user_id, action="archive", entity="critical_talent_profile", entity_id=profile_id)
    return await db[COL_CRITICAL_TALENT_PROFILES].find_one({"id": profile_id}, {"_id": 0})


async def create_tag(db: Any, payload: TalentCriticalityTagCreate, user_id: Optional[str]) -> Dict[str, Any]:
    tid = str(uuid.uuid4())
    now = _now()
    doc = {
        "id": tid,
        "employee_id": payload.employee_id.strip(),
        "tag_type": payload.tag_type.strip().upper(),
        "tag_value": payload.tag_value.strip(),
        "reason": payload.reason,
        "assigned_by": user_id,
        "assigned_on": now,
        "active_flag": bool(payload.active_flag),
    }
    await db[COL_TALENT_CRITICALITY_TAGS].insert_one(doc)
    await _log(db, user_id=user_id, action="tag", entity="talent_tag", entity_id=tid)
    return doc


async def list_tags(db: Any, *, employee_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if employee_id:
        q["employee_id"] = employee_id
    return await db[COL_TALENT_CRITICALITY_TAGS].find(q, {"_id": 0}).sort("assigned_on", -1).limit(limit).to_list(limit)


async def create_segment(db: Any, payload: TalentSegmentCreate, user_id: Optional[str]) -> Dict[str, Any]:
    sid = str(uuid.uuid4())
    now = _now()
    doc = {
        "id": sid,
        "employee_id": payload.employee_id.strip(),
        "segment_type": payload.segment_type.strip().upper(),
        "priority_score": float(payload.priority_score),
        "rule_source": payload.rule_source.strip().upper(),
        "assigned_on": now,
        "active_flag": bool(payload.active_flag),
        "created_by": user_id,
    }
    await db[COL_TALENT_SEGMENTS].insert_one(doc)
    await _log(db, user_id=user_id, action="segment", entity="talent_segment", entity_id=sid)
    return doc


async def list_segments(db: Any, *, employee_id: Optional[str] = None, limit: int = 500) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if employee_id:
        q["employee_id"] = employee_id
    return await db[COL_TALENT_SEGMENTS].find(q, {"_id": 0}).sort("assigned_on", -1).limit(limit).to_list(limit)


async def create_risk_assessment(db: Any, payload: RetentionRiskAssessmentCreate, user_id: Optional[str]) -> Dict[str, Any]:
    rid = str(uuid.uuid4())
    now = _now()
    doc = {**payload.model_dump(), "id": rid, "assessed_on": now, "created_by": user_id}
    doc["risk_level"] = str(doc.get("risk_level") or "LOW").upper()
    await db[COL_RISK_ASSESSMENTS].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="risk_assessment", entity_id=rid)
    return doc


async def list_risk_assessments(db: Any, *, employee_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if employee_id:
        q["employee_id"] = employee_id
    return await db[COL_RISK_ASSESSMENTS].find(q, {"_id": 0}).sort("assessed_on", -1).limit(limit).to_list(limit)


async def create_prediction(db: Any, payload: AttritionPredictionCreate, user_id: Optional[str]) -> Dict[str, Any]:
    pid = str(uuid.uuid4())
    now = _now()
    doc = {**payload.model_dump(), "id": pid, "generated_at": now, "created_by": user_id}
    doc["predicted_risk_level"] = str(doc.get("predicted_risk_level") or "LOW").upper()
    await db[COL_ATTRITION_PREDICTIONS].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="attrition_prediction", entity_id=pid)
    return doc


async def list_predictions(db: Any, *, employee_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if employee_id:
        q["employee_id"] = employee_id
    return await db[COL_ATTRITION_PREDICTIONS].find(q, {"_id": 0}).sort("generated_at", -1).limit(limit).to_list(limit)


async def create_stay_interview(db: Any, payload: StayInterviewCreate, user_id: Optional[str]) -> Dict[str, Any]:
    iid = str(uuid.uuid4())
    now = _now()
    doc = {**payload.model_dump(), "id": iid, "created_by": user_id, "created_at": now, "updated_at": now}
    await db[COL_STAY_INTERVIEWS].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="stay_interview", entity_id=iid)
    return doc


async def list_stay_interviews(db: Any, *, employee_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if employee_id:
        q["employee_id"] = employee_id
    return await db[COL_STAY_INTERVIEWS].find(q, {"_id": 0}).sort("scheduled_on", -1).limit(limit).to_list(limit)


async def create_case(db: Any, payload: RetentionCaseCreate, user_id: Optional[str]) -> Dict[str, Any]:
    cid = str(uuid.uuid4())
    now = _now()
    doc = {**payload.model_dump(), "id": cid, "opened_on": now, "closed_on": None, "created_by": user_id}
    doc["risk_level"] = str(doc.get("risk_level") or "LOW").upper()
    await db[COL_RETENTION_CASES].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="retention_case", entity_id=cid)
    return doc


async def list_cases(db: Any, *, employee_id: Optional[str] = None, status: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if employee_id:
        q["employee_id"] = employee_id
    if status:
        q["status"] = status.upper()
    return await db[COL_RETENTION_CASES].find(q, {"_id": 0}).sort("opened_on", -1).limit(limit).to_list(limit)


async def create_action_plan(db: Any, payload: EngagementActionPlanCreate, user_id: Optional[str]) -> Dict[str, Any]:
    aid = str(uuid.uuid4())
    now = _now()
    doc = {**payload.model_dump(), "id": aid, "created_by": user_id, "created_at": now, "updated_at": now, "closed_on": None}
    await db[COL_ENGAGEMENT_ACTION_PLANS].insert_one(doc)
    await _log(db, user_id=user_id, action="create", entity="engagement_action_plan", entity_id=aid)
    return doc


async def list_action_plans(db: Any, *, employee_id: Optional[str] = None, status: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    q: Dict[str, Any] = {}
    if employee_id:
        q["employee_id"] = employee_id
    if status:
        q["status"] = status.upper()
    return await db[COL_ENGAGEMENT_ACTION_PLANS].find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


async def talent_detail_bundle(db: Any, profile_id: str) -> Dict[str, Any]:
    p = await get_profile(db, profile_id)
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")
    emp_id = p.get("employee_id")
    tags = await list_tags(db, employee_id=emp_id, limit=200)
    segs = await list_segments(db, employee_id=emp_id, limit=200)
    risks = await list_risk_assessments(db, employee_id=emp_id, limit=50)
    preds = await list_predictions(db, employee_id=emp_id, limit=50)
    stays = await list_stay_interviews(db, employee_id=emp_id, limit=50)
    cases = await list_cases(db, employee_id=emp_id, limit=50)
    actions = await list_action_plans(db, employee_id=emp_id, limit=50)

    # AI surfaces are seed-backed (can be evolved into live scoring).
    ai_rec = await db[COL_AI_RECOMMENDATIONS].find({"employee_id": emp_id}, {"_id": 0}).sort("generated_at", -1).limit(10).to_list(10)
    ai_risk = await db[COL_AI_FLIGHT_RISK].find({"employee_id": emp_id}, {"_id": 0}).sort("generated_at", -1).limit(10).to_list(10)

    return {
        "profile": p,
        "criticality_tags": tags,
        "segments": segs,
        "risk_assessments": risks,
        "attrition_predictions": preds,
        "stay_interviews": stays,
        "cases": cases,
        "action_plans": actions,
        "ai_recommendations": ai_rec,
        "ai_flight_risk": ai_risk,
    }


async def list_simple(db: Any, col: str, *, skip: int = 0, limit: int = 200, q: Optional[Dict[str, Any]] = None, sort: str = "created_at") -> Dict[str, Any]:
    q = q or {}
    rows = await db[col].find(q, {"_id": 0}).sort(sort, -1).skip(skip).limit(limit).to_list(limit)
    total = await db[col].count_documents(q)
    return {"items": rows, "total": total, "skip": skip, "limit": limit}


async def ai_recommendations_summary(db: Any) -> Dict[str, Any]:
    rows = await db[COL_AI_RECOMMENDATIONS].find({}, {"_id": 0}).sort("generated_at", -1).limit(100).to_list(100)
    return {"items": rows, "source": "hsr_ai_retention_recommendations"}


async def ai_flight_risk_summary(db: Any) -> Dict[str, Any]:
    rows = await db[COL_AI_FLIGHT_RISK].find({}, {"_id": 0}).sort("generated_at", -1).limit(100).to_list(100)
    return {"items": rows, "source": "hsr_ai_flight_risk_predictions"}


async def forecast_summary(db: Any) -> Dict[str, Any]:
    rows = await db[COL_STABILITY_FORECASTS].find({}, {"_id": 0}).sort("generated_on", -1).limit(100).to_list(100)
    return {"items": rows, "source": "hsr_talent_stability_forecasts"}

