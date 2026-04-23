from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from m11_resource_section.models import ApprovalActionBody, ResourceNoteCreate, ResourceProfilePatch, SkillRecordCreate
from m11_resource_section import service as rs_svc


class ClassificationBody(BaseModel):
    resource_id: str
    tag: str = Field(..., min_length=1, max_length=120)


def create_resource_section_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
    require_approve: Callable[[Dict], Dict],
) -> APIRouter:
    router = APIRouter(prefix="/resource-project-optimization/resource", tags=["resource-section"])

    @router.get("/dashboard/summary")
    async def resource_dashboard(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await rs_svc.dashboard_summary(db)

    @router.get("/master")
    async def resource_master_list(
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=200),
        department: Optional[str] = None,
        status: Optional[str] = None,
        q: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        rows, total = await rs_svc.list_master(db, skip=skip, limit=limit, department=department, status=status, q=q)
        return {"items": rows, "total": total, "skip": skip, "limit": limit}

    @router.get("/master/{resource_id}")
    async def resource_master_get(resource_id: str, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await rs_svc.get_master_detail(db, resource_id)

    @router.patch("/master/{resource_id}/profile")
    async def resource_profile_patch(
        resource_id: str,
        payload: ResourceProfilePatch,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        return await rs_svc.patch_profile(db, resource_id, payload, current_user.get("id") or "")

    @router.get("/classification")
    async def resource_classification_list(
        resource_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"items": await rs_svc.list_classifications(db, resource_id=resource_id)}

    @router.post("/classification")
    async def resource_classification_add(body: ClassificationBody, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await rs_svc.add_classification(db, body.resource_id, body.tag, current_user.get("id") or "")

    @router.get("/skills")
    async def resource_skills_list(
        resource_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"items": await rs_svc.list_skill_records(db, resource_id=resource_id)}

    @router.post("/skills")
    async def resource_skills_create(payload: SkillRecordCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await rs_svc.create_skill_record(db, payload, current_user.get("id") or "")

    @router.get("/availability-utilization")
    async def resource_availability_utilization(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await rs_svc.availability_utilization_bundle(db)

    @router.get("/bench")
    async def resource_bench(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await rs_svc.bench_list(db)}

    @router.get("/deployment-readiness")
    async def resource_readiness(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await rs_svc.readiness_list(db)}

    @router.get("/demand-matching")
    async def resource_demand_matching(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await rs_svc.demand_matching_list(db)}

    @router.get("/mobility-career")
    async def resource_mobility_career(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await rs_svc.mobility_career_bundle(db)

    @router.get("/learning-certifications")
    async def resource_learning_certs(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await rs_svc.learning_certifications_bundle(db)

    @router.get("/cost-commercial")
    async def resource_cost_commercial(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await rs_svc.cost_commercial_list(db)}

    @router.get("/attendance-leave-impact")
    async def resource_attendance_leave(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await rs_svc.attendance_leave_list(db)}

    @router.get("/documents-compliance")
    async def resource_docs_compliance(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await rs_svc.documents_compliance_bundle(db)

    @router.get("/notes-communication")
    async def resource_notes_list(
        resource_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"items": await rs_svc.notes_list(db, resource_id=resource_id)}

    @router.post("/notes-communication")
    async def resource_notes_create(payload: ResourceNoteCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await rs_svc.create_note(db, payload, current_user.get("id") or "")

    @router.get("/analytics/summary")
    async def resource_analytics(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await rs_svc.analytics_summary(db)

    @router.get("/forecasting")
    async def resource_forecasting(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await rs_svc.forecasting_mock(db)

    @router.get("/approvals-governance")
    async def resource_approvals_list(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"items": await rs_svc.approvals_list(db)}

    @router.post("/approvals-governance/{approval_id}/action")
    async def resource_approvals_action(
        approval_id: str,
        body: ApprovalActionBody,
        current_user: dict = Depends(get_current_user),
    ):
        require_approve(current_user)
        return await rs_svc.approval_action(db, approval_id, body, current_user.get("id") or "")

    @router.get("/ai-insights")
    async def resource_ai_insights(
        resource_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"items": await rs_svc.ai_insights_list(db, resource_id=resource_id)}

    return router
