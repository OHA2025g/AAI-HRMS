from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from m14_employee_lifecycle_management import service as elm_svc
from m14_employee_lifecycle_management.constants import COL_GRIEVANCES as ELM_COL_GRIEVANCES
from m15_workforce_intelligence import service as wfi_svc
from m15_workforce_intelligence.constants import (
    COL_AI_RECOMMENDATIONS as WFI_COL_AI_RECOMMENDATIONS,
    COL_ATTRITION_PREDICTIONS as WFI_ATTRITION_PREDICTIONS,
    COL_BURNOUT_PREDICTIONS as WFI_BURNOUT_PREDICTIONS,
    COL_ENGAGEMENT_VISIBILITY_RECORDS,
    COL_FORECASTS as WFI_FORECASTS,
)

from m17_employee_satisfaction_engagement.constants import (
    COL_ACTION_PLANS,
    COL_ACTIVITY_LOGS,
    COL_AI_SENTIMENT,
    COL_DASHBOARD_SNAPSHOTS,
    COL_EXECUTIVE_SUMMARY,
    COL_FEEDBACK,
    COL_GOVERNANCE,
    COL_GRIEVANCE_VISIBILITY,
    COL_PULSE_CAMPAIGNS,
    COL_SCENARIOS,
    COL_SENTIMENT,
    LIST_SEGMENT_COLLECTION,
)
from m17_employee_satisfaction_engagement.schemas import (
    ActionPlanCreate,
    CopilotQueryCreate,
    FeedbackCreate,
    GovernanceRecordCreate,
    ScenarioWhatIfCreate,
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def list_simple(
    db: Any,
    col: str,
    *,
    skip: int = 0,
    limit: int = 200,
    q: Optional[Dict[str, Any]] = None,
    sort: str = "created_at",
) -> Dict[str, Any]:
    q = q or {}
    rows = await db[col].find(q, {"_id": 0}).sort(sort, -1).skip(skip).limit(limit).to_list(limit)
    total = await db[col].count_documents(q)
    return {"items": rows, "total": total, "skip": skip, "limit": limit}


async def _log_ese(
    db: Any, *, user_id: Optional[str], action: str, entity: str, entity_id: str, meta: Optional[Dict[str, Any]] = None
):
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


async def dashboard_summary(db: Any) -> Dict[str, Any]:
    """Aggregate ESE dashboard from snapshots + live pulse collections."""
    latest = await db[COL_DASHBOARD_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    snap = latest[0] if latest else None

    pulse_n = await db["employee_engagement_responses"].count_documents({}) if "employee_engagement_responses" in await db.list_collection_names() else 0
    survey_n = await db["employee_engagement_surveys"].count_documents({}) if "employee_engagement_surveys" in await db.list_collection_names() else 0

    pending_actions = await db[COL_ACTION_PLANS].count_documents({"status": {"$nin": ["done", "closed", "cancelled"]}})
    alerts = await db[COL_GRIEVANCE_VISIBILITY].find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)

    base = snap or {
        "snapshot_id": "derived",
        "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
        "overall_engagement_score": 0.0,
        "satisfaction_index": 0.0,
        "enps_score": 0.0,
        "pulse_participation_rate": 0.0,
        "burnout_signal_score": 0.0,
        "recognition_coverage_percent": 0.0,
        "manager_connect_coverage_percent": 0.0,
        "team_climate_score": 0.0,
        "experience_risk_alert_count": 0,
        "executive_kpi_payload": {},
        "created_at": _now(),
    }

    return {
        "generated_at": _now(),
        "snapshot": base,
        "live_metrics": {
            "pulse_response_count": pulse_n,
            "active_survey_definitions": survey_n,
            "pending_action_plans": pending_actions,
        },
        "recent_alerts": alerts,
    }


async def summaries_bundle(db: Any) -> Dict[str, Any]:
    fb = await db[COL_FEEDBACK].count_documents({})
    sent = await db[COL_SENTIMENT].count_documents({})
    return {
        "generated_at": _now(),
        "feedback_total": fb,
        "sentiment_records_total": sent,
        "pulse_campaigns": await db[COL_PULSE_CAMPAIGNS].count_documents({}),
    }


async def create_feedback(db: Any, payload: FeedbackCreate, user_id: Optional[str]) -> Dict[str, Any]:
    doc = {
        "id": str(uuid.uuid4()),
        "employee_id": user_id or "anonymous",
        "feedback_type": payload.feedback_type,
        "source_channel": payload.source_channel,
        "category": payload.category,
        "feedback_text": payload.feedback_text,
        "severity": payload.severity,
        "department": payload.department,
        "manager_id": payload.manager_id,
        "submitted_on": _now(),
        "status": "open",
        "created_at": _now(),
    }
    await db[COL_FEEDBACK].insert_one(doc)
    await _log_ese(db, user_id=user_id, action="create", entity="feedback", entity_id=doc["id"])
    return doc


async def create_action_plan(db: Any, payload: ActionPlanCreate, user_id: Optional[str]) -> Dict[str, Any]:
    doc = {
        "id": str(uuid.uuid4()),
        "action_plan_id": str(uuid.uuid4()),
        "scope_type": payload.scope_type,
        "scope_id": payload.scope_id,
        "action_title": payload.action_title,
        "action_type": payload.action_type,
        "owner_id": payload.owner_id,
        "priority": payload.priority,
        "due_date": payload.due_date,
        "status": "open",
        "effectiveness_score": None,
        "closed_on": None,
        "created_at": _now(),
        "created_by": user_id,
    }
    await db[COL_ACTION_PLANS].insert_one(doc)
    await _log_ese(db, user_id=user_id, action="create", entity="action_plan", entity_id=doc["id"])
    return doc


async def create_governance_record(db: Any, payload: GovernanceRecordCreate, user_id: Optional[str]) -> Dict[str, Any]:
    doc = {
        "id": str(uuid.uuid4()),
        "workflow_type": payload.workflow_type,
        "subject_id": payload.subject_id,
        "status": payload.status,
        "payload": payload.payload,
        "created_at": _now(),
        "created_by": user_id,
    }
    await db[COL_GOVERNANCE].insert_one(doc)
    return doc


async def scenario_whatif(db: Any, scenario_type: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    out = {
        "scenario_id": str(uuid.uuid4()),
        "scenario_name": scenario_type,
        "scenario_type": scenario_type,
        "input_payload": inputs,
        "output_payload": {
            "projected_engagement_delta": round((hash(str(inputs)) % 17) / 10.0 - 0.8, 2),
            "confidence": 0.62,
            "notes": ["Heuristic demo projection; replace with calibrated model."],
        },
        "expected_impact": "medium",
        "created_at": _now(),
        "is_mock": True,
    }
    await db[COL_SCENARIOS].insert_one({**out, "id": out["scenario_id"]})
    return out


async def copilot_query(db: Any, payload: CopilotQueryCreate, user_id: Optional[str]) -> Dict[str, Any]:
    qid = str(uuid.uuid4())
    doc = {
        "id": qid,
        "query": payload.query,
        "context": payload.context or {},
        "answer": "Demo: prioritize manager connect for teams with declining pulse participation; see AI recommendations tab.",
        "created_at": _now(),
        "user_id": user_id,
    }
    await db[COL_AI_SENTIMENT].insert_one(doc)
    return doc


async def executive_summary_ese(db: Any) -> Dict[str, Any]:
    latest = await db[COL_EXECUTIVE_SUMMARY].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    if latest:
        return {"generated_at": _now(), "executive_snapshot": latest[0]}
    d = await dashboard_summary(db)
    return {
        "generated_at": _now(),
        "executive_snapshot": {
            "executive_summary_id": "derived",
            "snapshot_date": d["snapshot"].get("snapshot_date"),
            "summary_type": "CHRO_EXPERIENCE_SUMMARY",
            "summary_payload": {"kpis": d["snapshot"], "live": d["live_metrics"]},
            "risk_index": d["snapshot"].get("experience_risk_alert_count", 0),
            "opportunity_index": 0,
            "created_at": _now(),
        },
    }


async def list_elm_grievances(db: Any, *, skip: int, limit: int) -> Dict[str, Any]:
    return await elm_svc.list_simple(db, ELM_COL_GRIEVANCES, skip=skip, limit=limit, sort="created_at")


async def wfi_burnout_sample(db: Any, *, skip: int, limit: int) -> Dict[str, Any]:
    return await wfi_svc.list_simple(db, WFI_BURNOUT_PREDICTIONS, skip=skip, limit=limit, sort="generated_at")


async def wfi_attrition_sample(db: Any, *, skip: int, limit: int) -> Dict[str, Any]:
    return await wfi_svc.list_simple(db, WFI_ATTRITION_PREDICTIONS, skip=skip, limit=limit, sort="generated_at")


async def wfi_engagement_visibility_sample(db: Any, *, skip: int, limit: int) -> Dict[str, Any]:
    return await wfi_svc.list_simple(db, COL_ENGAGEMENT_VISIBILITY_RECORDS, skip=skip, limit=limit, sort="snapshot_date")


async def wfi_forecasts_sample(db: Any, *, skip: int, limit: int) -> Dict[str, Any]:
    return await wfi_svc.list_simple(db, WFI_FORECASTS, skip=skip, limit=limit, sort="generated_on")


async def wfi_ai_recommendations_sample(db: Any, *, skip: int, limit: int) -> Dict[str, Any]:
    return await wfi_svc.list_simple(db, WFI_COL_AI_RECOMMENDATIONS, skip=skip, limit=limit, sort="generated_at")


async def wfi_executive_sample(db: Any) -> Dict[str, Any]:
    return await wfi_svc.executive_summary(db)


def _sort_for_collection(col: str) -> str:
    if "snapshot" in col or col.endswith("snapshots"):
        return "snapshot_date"
    if col == COL_SENTIMENT:
        return "analyzed_on"
    if "forecast" in col or "prediction" in col or "recommendation" in col or "intelligence" in col:
        if "forecast" in col:
            return "generated_on"
        return "generated_at"
    if col.endswith("experience_scenario_models"):
        return "created_at"
    return "created_at"


async def ensure_m17_indexes(db: Any) -> None:
    """Idempotent index creation for M17 collections."""
    async def ix(col: str, keys, name: str, unique: bool = False):
        try:
            kwargs = {"name": name}
            if unique:
                kwargs["unique"] = True
            await db[col].create_index(keys, **kwargs)
        except Exception:
            pass

    all_cols = set(LIST_SEGMENT_COLLECTION.values()) | {
        COL_DASHBOARD_SNAPSHOTS,
        COL_ACTIVITY_LOGS,
        COL_FEEDBACK,
        COL_GOVERNANCE,
        COL_PULSE_CAMPAIGNS,
        COL_SCENARIOS,
        COL_EXECUTIVE_SUMMARY,
        COL_AI_SENTIMENT,
    }
    for col in all_cols:
        try:
            await db.create_collection(col)
        except Exception:
            pass

    await ix(COL_DASHBOARD_SNAPSHOTS, [("snapshot_date", -1)], "ix_ese_dash_snap_date")
    await ix(COL_FEEDBACK, [("created_at", -1)], "ix_ese_feedback_created")
    await ix(COL_ACTION_PLANS, [("status", 1), ("due_date", 1)], "ix_ese_action_status_due")
    await ix(COL_PULSE_CAMPAIGNS, [("status", 1), ("launch_date", -1)], "ix_ese_pulse_status_launch")
    await ix(COL_ACTIVITY_LOGS, [("ts", -1)], "ix_ese_activity_ts")
