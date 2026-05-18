from __future__ import annotations

from typing import Any, Callable, Dict

from fastapi import APIRouter, Depends, Query

from m15_workforce_intelligence import service as wfi_svc
from m15_workforce_intelligence.constants import (
    COL_AI_RECOMMENDATIONS,
    COL_ATTRITION_PREDICTIONS,
    COL_BURNOUT_PREDICTIONS,
    COL_COMPLIANCE_RISK_PREDICTIONS,
    COL_COST_RISK_PREDICTIONS,
    COL_COPILOT_QUERIES,
    COL_COST_VISIBILITY_RECORDS,
    COL_COMPLIANCE_VISIBILITY_RECORDS,
    COL_DEMOGRAPHIC_SNAPSHOTS,
    COL_DEMAND_SUPPLY_RECORDS,
    COL_EXECUTIVE_SUMMARY_SNAPSHOTS,
    COL_FORECASTS,
    COL_HEADCOUNT_RECORDS,
    COL_ENGAGEMENT_VISIBILITY_RECORDS,
    COL_PERFORMANCE_VISIBILITY_RECORDS,
    COL_SNAPSHOT_RECORDS,
    COL_SKILL_RISK_PREDICTIONS,
    COL_SKILL_VISIBILITY_RECORDS,
    COL_STRATEGIC_OPPORTUNITY_SNAPSHOTS,
    COL_STRATEGIC_RISK_SNAPSHOTS,
    COL_UTILIZATION_SNAPSHOTS,
    COL_WORKFORCE_PLANS,
    COL_SCENARIO_MODELS,
    COL_MANAGER_EFFECTIVENESS_RECORDS,
)
from m15_workforce_intelligence.schemas import CopilotQueryCreate


def create_workforce_intelligence_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
) -> APIRouter:
    router = APIRouter(prefix="/workforce-intelligence", tags=["workforce-intelligence"])

    @router.get("/dashboard/summary")
    async def dashboard_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.dashboard_summary(db)

    @router.get("/executive/summary")
    async def executive_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.executive_summary(db)

    @router.post("/copilot/query", status_code=201)
    async def copilot_query(payload: CopilotQueryCreate, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.copilot_query(db, payload, current_user.get("id"))

    # Visibility
    @router.get("/headcount")
    async def headcount(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_HEADCOUNT_RECORDS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/demographics")
    async def demographics(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_DEMOGRAPHIC_SNAPSHOTS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/skills-capability")
    async def skills_visibility(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_SKILL_VISIBILITY_RECORDS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/availability-utilization")
    async def utilization(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_UTILIZATION_SNAPSHOTS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/engagement-experience")
    async def engagement(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_ENGAGEMENT_VISIBILITY_RECORDS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/performance-productivity")
    async def performance(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_PERFORMANCE_VISIBILITY_RECORDS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/compliance-documents-policy")
    async def compliance(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_COMPLIANCE_VISIBILITY_RECORDS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/cost-compensation")
    async def cost(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_COST_VISIBILITY_RECORDS, skip=skip, limit=limit, sort="snapshot_date")

    # Optimization / planning / decision support
    @router.get("/workforce-planning")
    async def workforce_planning(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_WORKFORCE_PLANS, skip=skip, limit=limit, sort="created_at")

    @router.get("/demand-supply")
    async def demand_supply(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_DEMAND_SUPPLY_RECORDS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/scenario-modeling")
    async def scenario_models(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_SCENARIO_MODELS, skip=skip, limit=limit, sort="created_at")

    @router.get("/manager-effectiveness")
    async def manager_effectiveness(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_MANAGER_EFFECTIVENESS_RECORDS, skip=skip, limit=limit, sort="snapshot_date")

    # Predictive / AI / exec
    @router.get("/forecasting")
    async def forecasts(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_FORECASTS, skip=skip, limit=limit, sort="generated_on")

    @router.get("/attrition-flight-risk")
    async def attrition(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_ATTRITION_PREDICTIONS, skip=skip, limit=limit, sort="generated_at")

    @router.get("/burnout-wellbeing-risk")
    async def burnout(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_BURNOUT_PREDICTIONS, skip=skip, limit=limit, sort="generated_at")

    @router.get("/skill-risk-capability-gap")
    async def skill_risk(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_SKILL_RISK_PREDICTIONS, skip=skip, limit=limit, sort="generated_at")

    @router.get("/cost-risk-budget")
    async def cost_risk(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_COST_RISK_PREDICTIONS, skip=skip, limit=limit, sort="generated_at")

    @router.get("/compliance-audit-risk")
    async def compliance_risk(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_COMPLIANCE_RISK_PREDICTIONS, skip=skip, limit=limit, sort="generated_at")

    @router.get("/ai-recommendations")
    async def ai_recs(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_AI_RECOMMENDATIONS, skip=skip, limit=limit, sort="generated_at")

    @router.get("/strategic-risk-intelligence")
    async def strategic_risk(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_STRATEGIC_RISK_SNAPSHOTS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/strategic-opportunity-intelligence")
    async def strategic_opportunity(skip: int = 0, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_STRATEGIC_OPPORTUNITY_SNAPSHOTS, skip=skip, limit=limit, sort="snapshot_date")

    @router.get("/executive-intelligence")
    async def executive_intel(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.executive_summary(db)

    # Audit / admin visibility
    @router.get("/copilot/queries")
    async def list_copilot_queries(skip: int = 0, limit: int = Query(50, ge=1, le=200), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await wfi_svc.list_simple(db, COL_COPILOT_QUERIES, skip=skip, limit=limit, sort="created_at")

    return router

