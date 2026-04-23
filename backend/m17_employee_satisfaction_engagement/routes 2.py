from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Body, Depends, Query

from m17_employee_satisfaction_engagement import service as ese_svc
from m17_employee_satisfaction_engagement.constants import COL_COPILOT_QUERY_LOGS, LIST_SEGMENT_COLLECTION
from m17_employee_satisfaction_engagement.schemas import CopilotQueryCreate


def create_employee_satisfaction_engagement_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
) -> APIRouter:
    router = APIRouter(prefix="/employee-satisfaction-engagement", tags=["employee-satisfaction-engagement"])

    @router.get("/dashboard/summary")
    async def dashboard_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await ese_svc.dashboard_summary(db)

    @router.get("/executive/summary")
    async def executive_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await ese_svc.executive_summary(db)

    @router.get("/strategic/summary")
    async def strategic_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await ese_svc.strategic_experience_summary(db)

    @router.get("/summaries/bundle")
    async def summaries_bundle(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await ese_svc.summaries_bundle(db)

    @router.post("/copilot/query", status_code=201)
    async def copilot_query(payload: CopilotQueryCreate, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await ese_svc.copilot_query(db, payload, current_user.get("id"))

    @router.get("/copilot/queries")
    async def copilot_queries(
        skip: int = 0,
        limit: int = Query(100, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await ese_svc.list_simple(db, COL_COPILOT_QUERY_LOGS, skip=skip, limit=limit, sort="created_at")

    @router.post("/scenario/what-if")
    async def scenario_whatif(
        current_user: dict = Depends(get_current_user),
        payload: Optional[Dict[str, Any]] = Body(None),
    ):
        require_read(current_user)
        body = payload or {}
        st = str(body.get("scenario_type") or "custom")
        inputs = body.get("inputs") if isinstance(body.get("inputs"), dict) else {}
        return await ese_svc.scenario_whatif(db, st, inputs)

    def _list_factory(segment: str):
        col = LIST_SEGMENT_COLLECTION[segment]

        async def _endpoint(
            skip: int = 0,
            limit: int = Query(200, ge=1, le=500),
            current_user: dict = Depends(get_current_user),
        ):
            require_read(current_user)
            sort = "created_at"
            if "prediction" in col or "recommendation" in col:
                sort = "generated_at"
            elif "ai_sentiment_intelligence" in col:
                sort = "generated_at"
            elif "forecast" in col:
                sort = "generated_on"
            elif "snapshot" in col and "dashboard" not in col:
                sort = "snapshot_date"
            elif col.endswith("pulse_survey_campaigns"):
                sort = "launch_date"
            return await ese_svc.list_simple(db, col, skip=skip, limit=limit, sort=sort)

        return _endpoint

    for seg in sorted(LIST_SEGMENT_COLLECTION.keys()):
        router.add_api_route(
            f"/records/{seg}",
            _list_factory(seg),
            methods=["GET"],
            name=f"ese_list_{seg.replace('-', '_')}",
        )

    return router
