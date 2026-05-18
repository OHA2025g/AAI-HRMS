from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Body, Depends, Query

from m17_employee_satisfaction_engagement.constants import LIST_SEGMENT_COLLECTION
from m17_employee_satisfaction_engagement import service as ese_svc
from m17_employee_satisfaction_engagement.schemas import (
    ActionPlanCreate,
    CopilotQueryCreate,
    FeedbackCreate,
    GovernanceRecordCreate,
    ScenarioWhatIfCreate,
)
from m17_employee_satisfaction_engagement.service import _sort_for_collection


def create_employee_satisfaction_engagement_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
    require_engagement_executive: Optional[Callable[[Dict], Dict]] = None,
    require_engagement_ai: Optional[Callable[[Dict], Dict]] = None,
) -> APIRouter:
    router = APIRouter(prefix="/employee-satisfaction-engagement", tags=["employee-satisfaction-engagement"])

    req_ex = require_engagement_executive or require_read
    req_ai = require_engagement_ai or require_read

    @router.get("/dashboard/summary")
    async def dashboard_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await ese_svc.dashboard_summary(db)

    @router.get("/summaries/bundle")
    async def summaries_bundle(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await ese_svc.summaries_bundle(db)

    @router.get("/integrations/elm/grievances")
    async def integration_elm_grievances(
        skip: int = 0,
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await ese_svc.list_elm_grievances(db, skip=skip, limit=limit)

    @router.get("/integrations/wfi/burnout-risk")
    async def integration_wfi_burnout(
        skip: int = 0,
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await ese_svc.wfi_burnout_sample(db, skip=skip, limit=limit)

    @router.get("/integrations/wfi/attrition-risk")
    async def integration_wfi_attrition(
        skip: int = 0,
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await ese_svc.wfi_attrition_sample(db, skip=skip, limit=limit)

    @router.get("/integrations/wfi/engagement-visibility")
    async def integration_wfi_engagement_vis(
        skip: int = 0,
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await ese_svc.wfi_engagement_visibility_sample(db, skip=skip, limit=limit)

    @router.get("/integrations/wfi/forecasts")
    async def integration_wfi_forecasts(
        skip: int = 0,
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await ese_svc.wfi_forecasts_sample(db, skip=skip, limit=limit)

    @router.get("/integrations/wfi/ai-recommendations")
    async def integration_wfi_ai_recs(
        skip: int = 0,
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        req_ai(current_user)
        return await ese_svc.wfi_ai_recommendations_sample(db, skip=skip, limit=limit)

    @router.get("/integrations/wfi/executive-summary")
    async def integration_wfi_executive(current_user: dict = Depends(get_current_user)):
        req_ex(current_user)
        return await ese_svc.wfi_executive_sample(db)

    @router.get("/executive/summary")
    async def executive_summary_ese(current_user: dict = Depends(get_current_user)):
        req_ex(current_user)
        return await ese_svc.executive_summary_ese(db)

    @router.post("/feedback", status_code=201)
    async def post_feedback(payload: FeedbackCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await ese_svc.create_feedback(db, payload, current_user.get("id"))

    @router.post("/action-plans", status_code=201)
    async def post_action_plan(payload: ActionPlanCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await ese_svc.create_action_plan(db, payload, current_user.get("id"))

    @router.post("/governance/records", status_code=201)
    async def post_governance(payload: GovernanceRecordCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await ese_svc.create_governance_record(db, payload, current_user.get("id"))

    @router.post("/scenario/what-if")
    async def scenario_whatif(
        current_user: dict = Depends(get_current_user),
        payload: Optional[ScenarioWhatIfCreate] = Body(None),
    ):
        require_read(current_user)
        body = payload or ScenarioWhatIfCreate()
        return await ese_svc.scenario_whatif(db, body.scenario_type, body.input_payload)

    @router.post("/copilot/query", status_code=201)
    async def copilot_query(payload: CopilotQueryCreate, current_user: dict = Depends(get_current_user)):
        req_ai(current_user)
        return await ese_svc.copilot_query(db, payload, current_user.get("id"))

    for seg in sorted(LIST_SEGMENT_COLLECTION.keys()):
        col = LIST_SEGMENT_COLLECTION[seg]

        def _make_endpoint(collection: str):
            async def _endpoint(
                skip: int = 0,
                limit: int = Query(200, ge=1, le=500),
                current_user: dict = Depends(get_current_user),
            ):
                require_read(current_user)
                sort = _sort_for_collection(collection)
                return await ese_svc.list_simple(db, collection, skip=skip, limit=limit, sort=sort)

            return _endpoint

        router.add_api_route(
            f"/records/{seg}",
            _make_endpoint(col),
            methods=["GET"],
            name=f"ese_list_{seg.replace('-', '_')}",
        )

    return router
