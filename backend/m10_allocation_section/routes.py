from __future__ import annotations

from typing import Any, Awaitable, Callable, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from m10_allocation_section.models import (
    AllocationMasterCreate,
    AllocationMasterUpdate,
    ApprovalActionBody,
    ConflictResolveBody,
    NoteCreate,
    StaffingRequestCreate,
    StaffingRequestUpdate,
)
from m10_allocation_section import service as alloc_svc


class ConvertRequestBody(BaseModel):
    employee_id: str
    allocation_percentage: int = Field(default=100, ge=1, le=100)


def create_allocation_section_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
    require_approve: Callable[[Dict], Dict],
    assert_no_overallocation: Callable[..., Awaitable[None]],
) -> APIRouter:
    router = APIRouter(prefix="/resource-project-optimization/allocation", tags=["allocation-section"])

    @router.get("/dashboard/summary")
    async def dashboard_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await alloc_svc.dashboard_summary(db)

    @router.get("/master", response_model=Dict[str, Any])
    async def master_list(
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=200),
        project_id: Optional[str] = None,
        employee_id: Optional[str] = None,
        status: Optional[str] = None,
        billable: Optional[bool] = None,
        q: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        rows, total = await alloc_svc.list_allocation_master(
            db, skip=skip, limit=limit, project_id=project_id, employee_id=employee_id, status=status, billable=billable, q=q
        )
        return {"items": rows, "total": total, "skip": skip, "limit": limit}

    @router.get("/master/{allocation_id}")
    async def master_get(allocation_id: str, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        row = await alloc_svc.get_allocation_master(db, allocation_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return row

    @router.post("/master")
    async def master_create(payload: AllocationMasterCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await alloc_svc.create_allocation_master(
            db,
            payload=payload,
            user_id=current_user.get("id") or "",
            assert_no_overallocation=assert_no_overallocation,
        )

    @router.put("/master/{allocation_id}")
    async def master_update(
        allocation_id: str,
        payload: AllocationMasterUpdate,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        return await alloc_svc.update_allocation_master(
            db,
            allocation_id=allocation_id,
            payload=payload,
            user_id=current_user.get("id") or "",
            assert_no_overallocation=assert_no_overallocation,
        )

    @router.delete("/master/{allocation_id}")
    async def master_delete(allocation_id: str, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        await alloc_svc.soft_delete_allocation(db, allocation_id=allocation_id, user_id=current_user.get("id") or "")
        return {"ok": True}

    @router.post("/master/{allocation_id}/clone")
    async def master_clone(allocation_id: str, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await alloc_svc.clone_allocation(
            db,
            allocation_id=allocation_id,
            user_id=current_user.get("id") or "",
            assert_no_overallocation=assert_no_overallocation,
        )

    @router.get("/requests")
    async def requests_list(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await alloc_svc.list_staffing_requests(db)}

    @router.post("/requests")
    async def requests_create(payload: StaffingRequestCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await alloc_svc.create_staffing_request(db, payload=payload, user_id=current_user.get("id") or "")

    @router.put("/requests/{request_id}")
    async def requests_update(
        request_id: str,
        payload: StaffingRequestUpdate,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        return await alloc_svc.update_staffing_request(db, request_id=request_id, payload=payload, user_id=current_user.get("id") or "")

    @router.post("/requests/{request_id}/convert-to-allocation")
    async def requests_convert(request_id: str, body: ConvertRequestBody, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await alloc_svc.convert_request_to_allocation(
            db,
            request_id=request_id,
            employee_id=body.employee_id,
            allocation_percentage=body.allocation_percentage,
            user_id=current_user.get("id") or "",
            assert_no_overallocation=assert_no_overallocation,
        )

    @router.get("/assignment/suggestions")
    async def assignment_suggestions(
        project_id: str,
        skill: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"items": await alloc_svc.assignment_suggestions(db, project_id=project_id, skill=skill)}

    @router.get("/scheduling")
    async def scheduling_list(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await alloc_svc.scheduling_view(db)}

    @router.get("/capacity-conflicts")
    async def capacity_conflicts(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        conflicts = await alloc_svc.list_conflicts(db)
        return {"conflicts": conflicts, "capacity_rows": await alloc_svc.scheduling_view(db)}

    @router.post("/capacity-conflicts/{conflict_id}/resolve")
    async def capacity_conflict_resolve(
        conflict_id: str,
        body: ConflictResolveBody,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        return await alloc_svc.resolve_conflict(db, conflict_id=conflict_id, user_id=current_user.get("id") or "", body=body)

    @router.get("/billability-commercials")
    async def billability_commercials(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await alloc_svc.billability_rows(db)}

    @router.get("/approvals")
    async def approvals_list(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await alloc_svc.list_workflow_approvals(db)}

    @router.post("/approvals/{approval_id}/action")
    async def approvals_action(
        approval_id: str,
        body: ApprovalActionBody,
        current_user: dict = Depends(get_current_user),
    ):
        require_approve(current_user)
        return await alloc_svc.act_on_workflow_approval(db, approval_id=approval_id, body=body, user_id=current_user.get("id") or "")

    @router.get("/rollon-rolloff")
    async def rollon_rolloff_list(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await alloc_svc.list_rollon_rolloff(db)}

    @router.get("/demand-supply")
    async def demand_supply(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await alloc_svc.demand_supply_snapshot(db)

    @router.get("/fulfillment-bench")
    async def fulfillment_bench(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await alloc_svc.fulfillment_bench_summary(db)

    @router.get("/replacement-backup")
    async def replacement_backup(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await alloc_svc.replacement_backup_list(db)}

    @router.get("/changes-release")
    async def changes_release(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await alloc_svc.changes_release_list(db)

    @router.get("/calendar-heatmap")
    async def calendar_heatmap(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await alloc_svc.calendar_heatmap(db)

    @router.get("/documents-notes/notes")
    async def documents_notes_list_notes(
        allocation_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"notes": await alloc_svc.list_notes(db, allocation_id=allocation_id), "documents": await alloc_svc.list_documents(db)}

    @router.post("/documents-notes/notes")
    async def documents_notes_create(payload: NoteCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await alloc_svc.create_note(db, payload=payload, user_id=current_user.get("id") or "")

    @router.get("/alerts-communication")
    async def alerts_list(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await alloc_svc.list_alerts(db)}

    @router.post("/alerts-communication/{alert_id}/ack")
    async def alerts_ack(alert_id: str, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        await alloc_svc.ack_alert(db, alert_id=alert_id, user_id=current_user.get("id") or "")
        return {"ok": True}

    @router.get("/analytics/summary")
    async def analytics_summary(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await alloc_svc.analytics_summary(db)

    @router.get("/forecasting")
    async def forecasting(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await alloc_svc.forecasting_mock(db)

    @router.get("/ai-insights")
    async def ai_insights(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await alloc_svc.ai_insights_list(db)}

    return router
