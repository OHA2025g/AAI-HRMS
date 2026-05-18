from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException

from m16_cost_optimization_automation.constants import (
    COL_ACTIVITY_LOGS,
    COL_AI_COST_RECOMMENDATION_RECORDS,
    COL_AUTOMATION_EXECUTION_LOGS,
    COL_AUTOMATION_OPPORTUNITY_RECORDS,
    COL_AUTOMATION_ROI_RECORDS,
    COL_BUDGET_SPEND_RECORDS,
    COL_COST_DASHBOARD_SNAPSHOTS,
    COL_COST_FORECAST_RECORDS,
    COL_COST_OVERRUN_PREDICTION_RECORDS,
    COL_COPILOT_QUERY_LOGS,
    COL_EFFICIENCY_RISK_PREDICTION_RECORDS,
    COL_EXECUTIVE_COST_SUMMARY_SNAPSHOTS,
    COL_HR_OPERATIONS_COST_RECORDS,
    COL_MANUAL_EFFORT_RECORDS,
    COL_POLICY_EXCEPTION_LEAKAGE_RECORDS,
    COL_PROCESS_COST_RECORDS,
    COL_SAVINGS_OPPORTUNITY_RECORDS,
    COL_STRATEGIC_COST_INTELLIGENCE_SNAPSHOTS,
    COL_VENDOR_COST_RECORDS,
    COL_WORKFORCE_COST_RECORDS,
)
from m16_cost_optimization_automation.schemas import CopilotQueryCreate


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
    latest = await db[COL_COST_DASHBOARD_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    snap = latest[0] if latest else None

    top_savings = await db[COL_SAVINGS_OPPORTUNITY_RECORDS].find({}, {"_id": 0}).sort("priority_score", -1).limit(5).to_list(5)
    pending_budget = await db[COL_BUDGET_SPEND_RECORDS].count_documents({"approval_status": {"$nin": ["APPROVED", "CLOSED"]}})
    leakage_alerts = await db[COL_POLICY_EXCEPTION_LEAKAGE_RECORDS].count_documents({"severity": {"$in": ["HIGH", "CRITICAL"]}})

    if not snap:
        snap = {
            "snapshot_id": "derived",
            "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
            "total_hr_cost": 0,
            "total_workforce_cost": 0,
            "fixed_cost": 0,
            "variable_cost": 0,
            "budget_total": 0,
            "actual_spend_total": 0,
            "cost_variance_percent": 0,
            "automation_savings_total": 0,
            "cost_leakage_alert_count": leakage_alerts,
            "executive_kpi_payload": {},
            "created_at": _now(),
        }

    recent_ops = await db[COL_HR_OPERATIONS_COST_RECORDS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(6).to_list(6)

    return {
        "generated_at": _now(),
        "snapshot": snap,
        "kpis": {
            "total_hr_cost": snap.get("total_hr_cost"),
            "total_workforce_cost": snap.get("total_workforce_cost"),
            "budget_total": snap.get("budget_total"),
            "actual_spend_total": snap.get("actual_spend_total"),
            "cost_variance_percent": snap.get("cost_variance_percent"),
            "automation_savings_total": snap.get("automation_savings_total"),
            "cost_leakage_alert_count": snap.get("cost_leakage_alert_count", leakage_alerts),
            "pending_budget_approvals": pending_budget,
        },
        "top_savings_opportunities": top_savings,
        "recent_hr_operations_cost": recent_ops,
    }


async def executive_summary(db: Any) -> Dict[str, Any]:
    latest = await db[COL_EXECUTIVE_COST_SUMMARY_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    if latest:
        return {"generated_at": _now(), "executive_snapshot": latest[0]}
    d = await dashboard_summary(db)
    return {
        "generated_at": _now(),
        "executive_snapshot": {
            "executive_summary_id": "derived",
            "snapshot_date": d["snapshot"].get("snapshot_date"),
            "summary_type": "CHRO_CFO_SUMMARY",
            "summary_payload": {
                "headline": "Cost & automation intelligence (derived)",
                "kpis": d["kpis"],
                "notes": ["Seed coa_executive_cost_summary_snapshots for board-ready packs."],
            },
            "risk_index": 0.42,
            "opportunity_index": 0.58,
            "created_at": _now(),
        },
    }


async def strategic_intelligence_summary(db: Any) -> Dict[str, Any]:
    latest = await db[COL_STRATEGIC_COST_INTELLIGENCE_SNAPSHOTS].find({}, {"_id": 0}).sort("snapshot_date", -1).limit(1).to_list(1)
    if latest:
        return {"generated_at": _now(), "strategic_snapshot": latest[0]}
    return {
        "generated_at": _now(),
        "strategic_snapshot": {
            "strategic_snapshot_id": "derived",
            "snapshot_date": datetime.now(timezone.utc).date().isoformat(),
            "cost_efficiency_index": 0.72,
            "automation_maturity_index": 0.61,
            "budget_health_score": 0.68,
            "savings_realization_index": 0.55,
            "risk_map_payload": {"note": "Seed strategic snapshots for heatmaps."},
            "recommendation_payload": {"actions": []},
            "created_at": _now(),
        },
    }


async def summaries_bundle(db: Any) -> Dict[str, Any]:
    """Aggregate mini-summaries for dashboard widgets / integrations."""

    async def _count(col: str, q: Optional[Dict[str, Any]] = None) -> int:
        return await db[col].count_documents(q or {})

    return {
        "generated_at": _now(),
        "workforce_cost": {"records": await _count(COL_WORKFORCE_COST_RECORDS)},
        "hr_operations_cost": {"records": await _count(COL_HR_OPERATIONS_COST_RECORDS)},
        "budget_spend": {"records": await _count(COL_BUDGET_SPEND_RECORDS), "overspend": await _count(COL_BUDGET_SPEND_RECORDS, {"overspend_flag": True})},
        "vendor_cost": {"records": await _count(COL_VENDOR_COST_RECORDS)},
        "process_cost": {"records": await _count(COL_PROCESS_COST_RECORDS)},
        "manual_effort": {"records": await _count(COL_MANUAL_EFFORT_RECORDS)},
        "automation_roi": {"records": await _count(COL_AUTOMATION_ROI_RECORDS)},
        "forecasts": {"records": await _count(COL_COST_FORECAST_RECORDS)},
        "savings_pipeline": {"records": await _count(COL_SAVINGS_OPPORTUNITY_RECORDS)},
        "ai_recommendations": {"cost": await _count(COL_AI_COST_RECOMMENDATION_RECORDS)},
        "risk": {
            "overrun_predictions": await _count(COL_COST_OVERRUN_PREDICTION_RECORDS),
            "efficiency_risks": await _count(COL_EFFICIENCY_RISK_PREDICTION_RECORDS),
        },
        "automation": {
            "opportunities": await _count(COL_AUTOMATION_OPPORTUNITY_RECORDS),
            "executions_24h_hint": await _count(COL_AUTOMATION_EXECUTION_LOGS),
        },
    }


async def copilot_query(db: Any, payload: CopilotQueryCreate, user_id: Optional[str]) -> Dict[str, Any]:
    q = payload.query_text.strip()
    if not q:
        raise HTTPException(status_code=400, detail="query_text required")

    response = {
        "answer": (
            "Mock Cost & Automation Copilot. Connect an LLM to replace this layer; queries are audited in coa_copilot_query_logs."
        ),
        "suggested_drilldowns": [
            {"label": "Cost dashboard", "path": "/cost-optimization-automation/dashboard"},
            {"label": "Budget & spend control", "path": "/cost-optimization-automation/budget-spend-control"},
            {"label": "Automation ROI", "path": "/cost-optimization-automation/automation-roi-savings"},
            {"label": "Savings opportunities", "path": "/cost-optimization-automation/savings-opportunities"},
            {"label": "Scenario modeling", "path": "/cost-optimization-automation/scenario-modeling"},
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
    await _log(db, user_id=user_id, action="copilot_query", entity="coa_copilot", entity_id=doc["id"])
    doc.pop("_id", None)
    return doc


async def scenario_whatif(db: Any, scenario_type: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Deterministic mock scenario engine for demos."""

    st = (scenario_type or "custom").lower()
    base_savings = float(inputs.get("baseline_spend_millions") or 10)
    factor = 0.03
    if st == "hiring_freeze":
        factor = 0.08
    elif st == "automation_expansion":
        factor = 0.12
    elif st == "vendor_consolidation":
        factor = 0.07
    elif st == "budget_cut":
        factor = 0.05

    projected = round(base_savings * (1 - factor), 3)
    return {
        "generated_at": _now(),
        "scenario_type": st,
        "inputs": inputs,
        "output_payload": {"projected_annual_spend_millions": projected, "expected_savings_millions": round(base_savings - projected, 3)},
        "is_mock": True,
    }
