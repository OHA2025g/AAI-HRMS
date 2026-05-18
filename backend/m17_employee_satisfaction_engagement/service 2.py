from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException

from m17_employee_satisfaction_engagement.constants import (
    COL_ACTIVITY_LOGS,
    COL_AI_ENGAGEMENT_RECOMMENDATION_RECORDS,
    COL_BURNOUT_RISK_PREDICTION_RECORDS,
    COL_COPILOT_QUERY_LOGS,
    COL_EMPLOYEE_FEEDBACK_RECORDS,
    COL_ENGAGEMENT_ANALYTICS_SNAPSHOTS,
    COL_ENGAGEMENT_DASHBOARD_SNAPSHOTS,
    COL_ENGAGEMENT_DECLINE_PREDICTION_RECORDS,
    COL_EXECUTIVE_EXPERIENCE_SUMMARY_SNAPSHOTS,
    COL_EXPERIENCE_FORECAST_RECORDS,
    COL_EXPERIENCE_GAP_ANALYSIS_RECORDS,
    COL_PULSE_SURVEY_CAMPAIGNS,
    COL_STRATEGIC_EXPERIENCE_INTELLIGENCE_SNAPSHOTS,
)
from m17_employee_satisfaction_engagement.schemas import CopilotQueryCreate


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _log(
    db: Any,
    *,
    user_id: Optional[str],
    action: str,
    entity: str,
    entity_id: str,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
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


async def list_simple(
    db: Any,
    col: str,
    *,
    skip: int = 0,
    limit: int = 200,
    sort: str = "created_at",
) -> Dict[str, Any]:
    rows = await db[col].find({}, {"_id": 0}).sort(sort, -1).skip(skip).limit(limit).to_list(limit)
    total = await db[col].count_documents({})
    return {"items": rows, "total": total, "skip": skip, "limit": limit}


async def dashboard_summary(db: Any) -> Dict[str, Any]:
    latest = await db[COL_ENGAGEMENT_DASHBOARD_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    snap = latest[0] if latest else None

    open_feedback = await db[COL_EMPLOYEE_FEEDBACK_RECORDS].count_documents({"status": {"$nin": ["CLOSED", "RESOLVED"]}})
    high_burnout = await db[COL_BURNOUT_RISK_PREDICTION_RECORDS].count_documents({"severity": {"$in": ["HIGH", "CRITICAL"]}})

    if not snap:
        snap = {
            "snapshot_id": "derived",
            "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
            "overall_engagement_score": 0.72,
            "satisfaction_index": 0.74,
            "enps_score": 22,
            "pulse_participation_rate": 0.61,
            "burnout_signal_score": 0.28,
            "recognition_coverage_percent": 0.55,
            "manager_connect_coverage_percent": 0.58,
            "team_climate_score": 0.7,
            "experience_risk_alert_count": high_burnout,
            "executive_kpi_payload": {},
            "created_at": _now(),
        }

    recent_campaigns = await db[COL_PULSE_SURVEY_CAMPAIGNS].find({}, {"_id": 0}).sort("launch_date", -1).limit(6).to_list(6)
    top_risks = await db[COL_ENGAGEMENT_DECLINE_PREDICTION_RECORDS].find({}, {"_id": 0}).sort("engagement_drop_probability", -1).limit(5).to_list(5)

    return {
        "generated_at": _now(),
        "snapshot": snap,
        "kpis": {
            "overall_engagement_score": snap.get("overall_engagement_score"),
            "satisfaction_index": snap.get("satisfaction_index"),
            "enps_score": snap.get("enps_score"),
            "pulse_participation_rate": snap.get("pulse_participation_rate"),
            "burnout_signal_score": snap.get("burnout_signal_score"),
            "experience_risk_alert_count": snap.get("experience_risk_alert_count", high_burnout),
            "open_feedback_items": open_feedback,
        },
        "recent_pulse_campaigns": recent_campaigns,
        "top_experience_risks": top_risks,
    }


async def executive_summary(db: Any) -> Dict[str, Any]:
    latest = await db[COL_EXECUTIVE_EXPERIENCE_SUMMARY_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    if latest:
        return {"generated_at": _now(), "executive_snapshot": latest[0]}
    d = await dashboard_summary(db)
    return {
        "generated_at": _now(),
        "executive_snapshot": {
            "executive_summary_id": "derived",
            "snapshot_date": d["snapshot"].get("snapshot_date"),
            "summary_type": "CHRO_EXPERIENCE_SUMMARY",
            "summary_payload": {
                "headline": "Workforce experience intelligence (derived)",
                "kpis": d["kpis"],
                "notes": ["Seed ese_executive_experience_summary_snapshots for board-ready packs."],
            },
            "risk_index": 0.38,
            "opportunity_index": 0.64,
            "created_at": _now(),
        },
    }


async def strategic_experience_summary(db: Any) -> Dict[str, Any]:
    latest = await db[COL_STRATEGIC_EXPERIENCE_INTELLIGENCE_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    if latest:
        return {"generated_at": _now(), "strategic_snapshot": latest[0]}
    return {
        "generated_at": _now(),
        "strategic_snapshot": {
            "strategic_snapshot_id": "derived",
            "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
            "experience_health_index": 0.71,
            "belonging_inclusion_health_index": 0.69,
            "burnout_exposure_index": 0.33,
            "risk_map_payload": {"note": "Seed strategic snapshots for heatmaps."},
            "recommendation_payload": {"priorities": ["manager connect", "recognition equity"]},
            "created_at": _now(),
        },
    }


async def summaries_bundle(db: Any) -> Dict[str, Any]:
    async def _count(col: str, q: Optional[Dict[str, Any]] = None) -> int:
        return await db[col].count_documents(q or {})

    return {
        "generated_at": _now(),
        "pulse_campaigns": {"records": await _count(COL_PULSE_SURVEY_CAMPAIGNS)},
        "feedback": {"records": await _count(COL_EMPLOYEE_FEEDBACK_RECORDS)},
        "analytics_snapshots": {"records": await _count(COL_ENGAGEMENT_ANALYTICS_SNAPSHOTS)},
        "burnout_predictions": {"records": await _count(COL_BURNOUT_RISK_PREDICTION_RECORDS)},
        "engagement_decline": {"records": await _count(COL_ENGAGEMENT_DECLINE_PREDICTION_RECORDS)},
        "experience_gaps": {"records": await _count(COL_EXPERIENCE_GAP_ANALYSIS_RECORDS)},
        "ai_recommendations": {"records": await _count(COL_AI_ENGAGEMENT_RECOMMENDATION_RECORDS)},
        "forecasts": {"records": await _count(COL_EXPERIENCE_FORECAST_RECORDS)},
    }


async def copilot_query(db: Any, payload: CopilotQueryCreate, user_id: Optional[str]) -> Dict[str, Any]:
    q = payload.query_text.strip()
    if not q:
        raise HTTPException(status_code=400, detail="query_text required")

    response = {
        "answer": (
            "Mock Engagement & Experience Copilot. Wire an LLM for production; queries are stored in ese_engagement_copilot_query_logs."
        ),
        "suggested_drilldowns": [
            {"label": "Engagement dashboard", "path": "/employee-satisfaction-engagement/dashboard"},
            {"label": "Pulse surveys", "path": "/employee-satisfaction-engagement/pulse-surveys"},
            {"label": "Burnout risk", "path": "/employee-satisfaction-engagement/burnout-risk"},
            {"label": "AI recommendations", "path": "/employee-satisfaction-engagement/ai-recommendations"},
            {"label": "Executive support", "path": "/employee-satisfaction-engagement/executive-decision-support"},
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
    await db[COL_COPILOT_QUERY_LOGS].insert_one(doc)
    await _log(db, user_id=user_id, action="copilot_query", entity="ese_copilot", entity_id=doc["id"])
    doc.pop("_id", None)
    return doc


async def scenario_whatif(db: Any, scenario_type: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    st = (scenario_type or "custom").lower()
    base_engagement = float(inputs.get("baseline_engagement_score") or 0.72)
    delta = -0.02
    if st == "recognition_program_expansion":
        delta = 0.06
    elif st == "manager_coaching":
        delta = 0.04
    elif st == "workload_reduction":
        delta = 0.05
    elif st == "flexible_work_policy":
        delta = 0.03

    projected = max(0.0, min(1.0, base_engagement + delta))
    return {
        "generated_at": _now(),
        "scenario_type": st,
        "inputs": inputs,
        "output_payload": {"projected_engagement_score": round(projected, 3), "expected_enps_delta": round(delta * 40, 1)},
        "is_mock": True,
    }
