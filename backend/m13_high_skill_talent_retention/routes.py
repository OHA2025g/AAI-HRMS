from __future__ import annotations

import uuid
from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from m13_high_skill_talent_retention import service as hsr_svc
from m13_high_skill_talent_retention.constants import (
    COL_APPROVAL_REQUESTS,
    COL_BENCH_RISK,
    COL_CAREER_GROWTH,
    COL_CLIENT_CRITICAL,
    COL_COMP_COMPETITIVENESS,
    COL_COUNTEROFFER_CASES,
    COL_CRITICALITY_MAPPING,
    COL_DEVELOPMENT_PLANS,
    COL_ENGAGEMENT_SIGNALS,
    COL_EXIT_RISK_TRIGGERS,
    COL_INTERNAL_MOBILITY,
    COL_KNOWLEDGE_DEPENDENCY,
    COL_POLICY_RULES,
    COL_PROMOTION_STAGNATION,
    COL_PROJECT_CRITICAL,
    COL_RECOGNITION_RECORDS,
    COL_RELATIONSHIP_HISTORY,
    COL_RETENTION_INCENTIVES,
    COL_RETENTION_LEARNING_LINKS,
    COL_SEARCH_LOGS,
    COL_SKILL_UTILIZATION,
    COL_STRATEGIC_SNAPSHOTS,
    COL_SUCCESSOR_COVERAGE,
    COL_WORK_EXPERIENCE_PREFS,
    COL_WORKLOAD_WELLBEING,
)
from m13_high_skill_talent_retention.schemas import (
    AttritionPredictionCreate,
    CriticalTalentProfileCreate,
    CriticalTalentProfileUpdate,
    EngagementActionPlanCreate,
    RetentionCaseCreate,
    RetentionRiskAssessmentCreate,
    RetentionSearchLogCreate,
    StayInterviewCreate,
    TalentCriticalityTagCreate,
    TalentSegmentCreate,
)


def create_high_skill_retention_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
) -> APIRouter:
    router = APIRouter(prefix="/high-skill-talent-retention", tags=["high-skill-talent-retention"])

    @router.get("/dashboard/summary")
    async def retention_dashboard_summary(
        bu: Optional[str] = None,
        department: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await hsr_svc.dashboard_summary(db, bu=bu, dept=department)

    # Profiles (Critical Talent + Master)
    @router.get("/talent-profiles")
    async def list_talent_profiles(
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=200),
        q: Optional[str] = None,
        risk: Optional[str] = None,
        segment: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        rows, total = await hsr_svc.list_profiles(db, skip=skip, limit=limit, q=q, risk=risk, segment=segment)
        return {"items": rows, "total": total, "skip": skip, "limit": limit}

    @router.post("/talent-profiles", status_code=201)
    async def create_talent_profile(payload: CriticalTalentProfileCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.create_profile(db, payload, current_user.get("id"))

    @router.get("/talent-profiles/{profile_id}")
    async def get_talent_profile(profile_id: str, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        row = await hsr_svc.get_profile(db, profile_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return row

    @router.get("/talent-profiles/{profile_id}/detail")
    async def talent_detail(profile_id: str, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.talent_detail_bundle(db, profile_id)

    @router.patch("/talent-profiles/{profile_id}")
    async def patch_talent_profile(
        profile_id: str, payload: CriticalTalentProfileUpdate, current_user: dict = Depends(get_current_user)
    ):
        require_write(current_user)
        return await hsr_svc.update_profile(db, profile_id, payload, current_user.get("id"))

    @router.delete("/talent-profiles/{profile_id}")
    async def archive_talent_profile(profile_id: str, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.archive_profile(db, profile_id, current_user.get("id"))

    # Tagging + segmentation
    @router.get("/criticality-tags")
    async def list_tags(
        employee_id: Optional[str] = None, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)
    ):
        require_read(current_user)
        return {"items": await hsr_svc.list_tags(db, employee_id=employee_id, limit=limit)}

    @router.post("/criticality-tags", status_code=201)
    async def create_tag(payload: TalentCriticalityTagCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.create_tag(db, payload, current_user.get("id"))

    @router.get("/segments")
    async def list_segments(
        employee_id: Optional[str] = None, limit: int = Query(500, ge=1, le=1000), current_user: dict = Depends(get_current_user)
    ):
        require_read(current_user)
        return {"items": await hsr_svc.list_segments(db, employee_id=employee_id, limit=limit)}

    @router.post("/segments", status_code=201)
    async def create_segment(payload: TalentSegmentCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.create_segment(db, payload, current_user.get("id"))

    # Risk assessment + predictions
    @router.get("/risk-assessments")
    async def list_risk(employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await hsr_svc.list_risk_assessments(db, employee_id=employee_id, limit=200)}

    @router.post("/risk-assessments", status_code=201)
    async def create_risk(payload: RetentionRiskAssessmentCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.create_risk_assessment(db, payload, current_user.get("id"))

    @router.get("/attrition-predictions")
    async def list_predictions(employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await hsr_svc.list_predictions(db, employee_id=employee_id, limit=200)}

    @router.post("/attrition-predictions", status_code=201)
    async def create_prediction(payload: AttritionPredictionCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.create_prediction(db, payload, current_user.get("id"))

    # Stay interviews
    @router.get("/stay-interviews")
    async def list_stays(employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await hsr_svc.list_stay_interviews(db, employee_id=employee_id, limit=200)}

    @router.post("/stay-interviews", status_code=201)
    async def create_stay(payload: StayInterviewCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.create_stay_interview(db, payload, current_user.get("id"))

    # Cases + action plans
    @router.get("/cases")
    async def list_cases(
        employee_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)
    ):
        require_read(current_user)
        return {"items": await hsr_svc.list_cases(db, employee_id=employee_id, status=status, limit=200)}

    @router.post("/cases", status_code=201)
    async def create_case(payload: RetentionCaseCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.create_case(db, payload, current_user.get("id"))

    @router.get("/engagement-actions")
    async def list_actions(
        employee_id: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)
    ):
        require_read(current_user)
        return {"items": await hsr_svc.list_action_plans(db, employee_id=employee_id, status=status, limit=200)}

    @router.post("/engagement-actions", status_code=201)
    async def create_action(payload: EngagementActionPlanCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await hsr_svc.create_action_plan(db, payload, current_user.get("id"))

    # Simple list endpoints for additional submodules (seed-backed + extendable)
    @router.get("/recognition-rewards")
    async def list_recognition(
        skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)
    ):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_RECOGNITION_RECORDS, skip=skip, limit=limit, sort="awarded_on")

    @router.get("/relationship-history")
    async def list_relationship_history(
        skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)
    ):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_RELATIONSHIP_HISTORY, skip=skip, limit=limit, sort="ts")

    @router.get("/compensation-analysis")
    async def list_comp_analysis(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_COMP_COMPETITIVENESS, skip=skip, limit=limit, sort="evaluated_on")

    @router.get("/incentives")
    async def list_incentives(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_RETENTION_INCENTIVES, skip=skip, limit=limit, sort="start_date")

    @router.get("/exit-risk-triggers")
    async def list_triggers(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_EXIT_RISK_TRIGGERS, skip=skip, limit=limit, sort="detected_on")

    @router.get("/knowledge-risk")
    async def list_knowledge(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_KNOWLEDGE_DEPENDENCY, skip=skip, limit=limit, sort="assessed_on")

    @router.get("/promotion-stagnation")
    async def list_stagnation(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_PROMOTION_STAGNATION, skip=skip, limit=limit, sort="captured_on")

    @router.get("/approvals")
    async def list_approvals(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_APPROVAL_REQUESTS, skip=skip, limit=limit, sort="submitted_at")

    @router.get("/policies")
    async def list_policies(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_POLICY_RULES, skip=skip, limit=limit, sort="updated_at")

    # AI + forecast
    @router.get("/ai-recommendations")
    async def ai_recs(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.ai_recommendations_summary(db)

    @router.get("/ai-flight-risk")
    async def ai_flight(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.ai_flight_risk_summary(db)

    @router.get("/forecasting/summary")
    async def forecasts(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.forecast_summary(db)

    # Natural language search: log + naive results
    @router.post("/natural-language-search", status_code=201)
    async def retention_nl_search(payload: RetentionSearchLogCreate, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        uid = current_user.get("id")
        doc = {**payload.model_dump(), "id": str(uuid.uuid4()), "ts": hsr_svc._now(), "user_id": uid}
        await db[COL_SEARCH_LOGS].insert_one(doc)
        # naive query against profiles (employee_id, skill, dept)
        rows, total = await hsr_svc.list_profiles(db, skip=0, limit=50, q=payload.query, risk=None, segment=None)
        return {"log": doc, "results": rows, "total": total}

    @router.get("/search/logs")
    async def list_search_logs(limit: int = Query(100, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        rows = await db[COL_SEARCH_LOGS].find({}, {"_id": 0}).sort("ts", -1).limit(limit).to_list(limit)
        return {"items": rows}

    # Additional spec routes (seed-backed list endpoints)
    @router.get("/sentiment-engagement")
    async def list_sentiment(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_ENGAGEMENT_SIGNALS, skip=skip, limit=limit, sort="captured_on")

    @router.get("/career-growth")
    async def list_career_growth(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_CAREER_GROWTH, skip=skip, limit=limit, sort="captured_on")

    @router.get("/internal-mobility")
    async def list_internal_mobility(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_INTERNAL_MOBILITY, skip=skip, limit=limit, sort="requested_on")

    @router.get("/skill-utilization")
    async def list_skill_util(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_SKILL_UTILIZATION, skip=skip, limit=limit, sort="captured_on")

    @router.get("/criticality-mapping")
    async def list_criticality_map(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_CRITICALITY_MAPPING, skip=skip, limit=limit, sort="updated_at")

    @router.get("/successor-coverage")
    async def list_successors(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_SUCCESSOR_COVERAGE, skip=skip, limit=limit, sort="reviewed_on")

    @router.get("/development-plans")
    async def list_dev_plans(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_DEVELOPMENT_PLANS, skip=skip, limit=limit, sort="updated_at")

    @router.get("/learning-upskilling")
    async def list_learning_links(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_RETENTION_LEARNING_LINKS, skip=skip, limit=limit, sort="created_at")

    @router.get("/workload-wellbeing")
    async def list_wellbeing(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_WORKLOAD_WELLBEING, skip=skip, limit=limit, sort="captured_on")

    @router.get("/work-experience")
    async def list_work_experience(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_WORK_EXPERIENCE_PREFS, skip=skip, limit=limit, sort="updated_at")

    @router.get("/counteroffer-handling")
    async def list_counteroffers(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_COUNTEROFFER_CASES, skip=skip, limit=limit, sort="handled_on")

    @router.get("/client-critical")
    async def list_client_critical(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_CLIENT_CRITICAL, skip=skip, limit=limit, sort="created_at")

    @router.get("/project-critical")
    async def list_project_critical(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_PROJECT_CRITICAL, skip=skip, limit=limit, sort="created_at")

    @router.get("/bench-risk")
    async def list_bench_risk(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_BENCH_RISK, skip=skip, limit=limit, sort="captured_on")

    @router.get("/strategic-intelligence")
    async def list_strategic_snapshots(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await hsr_svc.list_simple(db, COL_STRATEGIC_SNAPSHOTS, skip=skip, limit=limit, sort="generated_at")

    @router.get("/analytics")
    async def analytics(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        # lightweight aggregate payload suitable for dashboards; expand as needed.
        dash = await hsr_svc.dashboard_summary(db)
        risk_rows = await hsr_svc.list_risk_assessments(db, employee_id=None, limit=200)
        return {"dashboard": dash, "recent_risk_assessments": risk_rows[:50]}

    return router

