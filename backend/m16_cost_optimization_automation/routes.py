from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Body, Depends, Query

from m16_cost_optimization_automation import service as coa_svc
from m16_cost_optimization_automation.constants import COL_COPILOT_QUERY_LOGS, LIST_SEGMENT_COLLECTION
from m16_cost_optimization_automation.schemas import CopilotQueryCreate


def create_cost_optimization_automation_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
) -> APIRouter:
    router = APIRouter(prefix="/cost-optimization-automation", tags=["cost-optimization-automation"])

    @router.get("/dashboard/summary")
    async def dashboard_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await coa_svc.dashboard_summary(db)

    @router.get("/executive/summary")
    async def executive_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await coa_svc.executive_summary(db)

    @router.get("/strategic/summary")
    async def strategic_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await coa_svc.strategic_intelligence_summary(db)

    @router.get("/summaries/bundle")
    async def summaries_bundle(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await coa_svc.summaries_bundle(db)

    @router.post("/copilot/query", status_code=201)
    async def copilot_query(payload: CopilotQueryCreate, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await coa_svc.copilot_query(db, payload, current_user.get("id"))

    @router.get("/copilot/queries")
    async def copilot_queries(
        skip: int = 0,
        limit: int = Query(100, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await coa_svc.list_simple(db, COL_COPILOT_QUERY_LOGS, skip=skip, limit=limit, sort="created_at")

    @router.post("/scenario/what-if")
    async def scenario_whatif(
        current_user: dict = Depends(get_current_user),
        payload: Optional[Dict[str, Any]] = Body(None),
    ):
        require_read(current_user)
        body = payload or {}
        st = str(body.get("scenario_type") or "custom")
        inputs = body.get("inputs") if isinstance(body.get("inputs"), dict) else {}
        return await coa_svc.scenario_whatif(db, st, inputs)

    def _list_factory(segment: str):
        col = LIST_SEGMENT_COLLECTION[segment]

        async def _endpoint(
            skip: int = 0,
            limit: int = Query(200, ge=1, le=500),
            current_user: dict = Depends(get_current_user),
        ):
            require_read(current_user)
            sort = "created_at"
            if col.endswith("budget_spend_records"):
                sort = "updated_at"
            elif "forecast" in col or "prediction" in col or "recommendation" in col:
                sort = "generated_at"
            elif "snapshot" in col:
                sort = "snapshot_date"
            return await coa_svc.list_simple(db, col, skip=skip, limit=limit, sort=sort)

        return _endpoint

    for seg in sorted(LIST_SEGMENT_COLLECTION.keys()):
        router.add_api_route(
            f"/records/{seg}",
            _list_factory(seg),
            methods=["GET"],
            name=f"coa_list_{seg.replace('-', '_')}",
        )

    return router
