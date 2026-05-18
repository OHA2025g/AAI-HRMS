from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from m14_employee_lifecycle_management import service as elm_svc
from m14_employee_lifecycle_management.constants import (
    COL_ACCESS_PROVISIONING,
    COL_AI_INSIGHTS,
    COL_ANALYTICS_SNAPSHOTS,
    COL_ALUMNI_REHIRE,
    COL_APPROVAL_REQUESTS,
    COL_ASSET_RETURN,
    COL_BGV,
    COL_CLEARANCE,
    COL_COMP_REVISION,
    COL_EMPLOYEE_ASSETS,
    COL_EMPLOYEE_DOCUMENTS,
    COL_EMPLOYMENT_ADMIN,
    COL_EXIT_INTERVIEW,
    COL_FNF,
    COL_FORECASTS,
    COL_GRIEVANCES,
    COL_INTERNAL_MOBILITY,
    COL_KT_HANDOVER,
    COL_LEARNING_LINKAGE,
    COL_LIFECYCLE_NOTES,
    COL_MANAGER_INTERACTIONS,
    COL_NOTICE,
    COL_ONBOARDING,
    COL_PAYROLL_LINKAGE,
    COL_POLICY_CONSENTS,
    COL_POLICY_RULES,
    COL_PREBOARDING,
    COL_PROBATION,
    COL_RECOGNITION,
    COL_RESIGNATION,
    COL_RETENTION_SIGNALS,
    COL_SEPARATION,
    COL_WELLBEING,
    COL_ENGAGEMENT,
)
from m14_employee_lifecycle_management.schemas import GenericNoteCreate, OnboardingCreate, PreboardingCreate, ProbationCreate, ResignationCreate


def create_employee_lifecycle_management_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
) -> APIRouter:
    router = APIRouter(prefix="/employee-lifecycle-management", tags=["employee-lifecycle-management"])

    @router.get("/dashboard/summary")
    async def dashboard(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.dashboard_summary(db)

    @router.get("/employees/{employee_id}/bundle")
    async def employee_bundle(employee_id: str, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.employee_bundle(db, employee_id)

    # Create endpoints for core workflows
    @router.post("/pre-boarding", status_code=201)
    async def create_preboarding(payload: PreboardingCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await elm_svc.create_preboarding(db, payload, current_user.get("id"))

    @router.get("/pre-boarding")
    async def list_preboarding(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_PREBOARDING, skip=skip, limit=limit, sort="created_at")

    @router.post("/onboarding", status_code=201)
    async def create_onboarding(payload: OnboardingCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await elm_svc.create_onboarding(db, payload, current_user.get("id"))

    @router.get("/onboarding")
    async def list_onboarding(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_ONBOARDING, skip=skip, limit=limit, sort="created_at")

    @router.post("/probation-confirmation/probation", status_code=201)
    async def create_probation(payload: ProbationCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await elm_svc.create_probation(db, payload, current_user.get("id"))

    @router.get("/probation-confirmation/probation")
    async def list_probation(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_PROBATION, skip=skip, limit=limit, sort="created_at")

    @router.post("/resignation-exit", status_code=201)
    async def create_resignation(payload: ResignationCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await elm_svc.create_resignation(db, payload, current_user.get("id"))

    @router.get("/resignation-exit")
    async def list_resignation(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_RESIGNATION, skip=skip, limit=limit, sort="resignation_submitted_on")

    @router.post("/notes", status_code=201)
    async def create_note(payload: GenericNoteCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await elm_svc.create_note(db, payload, current_user.get("id"))

    @router.get("/notes")
    async def list_notes(employee_id: Optional[str] = None, limit: int = Query(200, ge=1, le=500), current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        q = {"employee_id": employee_id} if employee_id else {}
        return await elm_svc.list_simple(db, COL_LIFECYCLE_NOTES, skip=0, limit=limit, q=q, sort="created_at")

    # Simple list endpoints for all other submodules (seed-backed; extendable)
    @router.get("/documents-records")
    async def list_docs(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_EMPLOYEE_DOCUMENTS, skip=skip, limit=limit, sort="uploaded_at")

    @router.get("/bgv-compliance")
    async def list_bgv(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_BGV, skip=skip, limit=limit, sort="completed_on")

    @router.get("/policy-consent")
    async def list_policy(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_POLICY_CONSENTS, skip=skip, limit=limit, sort="accepted_on")

    @router.get("/access-assets-provisioning")
    async def list_provisioning(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_ACCESS_PROVISIONING, skip=skip, limit=limit, sort="completed_on")

    @router.get("/payroll-benefits-linkage")
    async def list_payroll(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_PAYROLL_LINKAGE, skip=skip, limit=limit, sort="updated_on")

    @router.get("/approvals-governance")
    async def list_approvals(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_APPROVAL_REQUESTS, skip=skip, limit=limit, sort="submitted_at")

    # Experience/growth/movement section
    @router.get("/attendance-leave-time")
    async def attendance_links(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return {"note": "Integrate existing attendance/leave module here when available."}

    @router.get("/learning-linkage")
    async def list_learning(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_LEARNING_LINKAGE, skip=skip, limit=limit, sort="created_at")

    @router.get("/engagement-experience")
    async def list_engagement(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_ENGAGEMENT, skip=skip, limit=limit, sort="captured_on")

    @router.get("/rewards-recognition")
    async def list_recognition(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_RECOGNITION, skip=skip, limit=limit, sort="awarded_on")

    @router.get("/internal-mobility")
    async def list_mobility(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_INTERNAL_MOBILITY, skip=skip, limit=limit, sort="requested_on")

    @router.get("/compensation-benefits")
    async def list_comp(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_COMP_REVISION, skip=skip, limit=limit, sort="created_on")

    @router.get("/employee-relations")
    async def list_grievances(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_GRIEVANCES, skip=skip, limit=limit, sort="created_at")

    @router.get("/wellbeing-support")
    async def list_wellbeing(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_WELLBEING, skip=skip, limit=limit, sort="created_at")

    @router.get("/manager-interactions")
    async def list_interactions(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_MANAGER_INTERACTIONS, skip=skip, limit=limit, sort="ts")

    @router.get("/communication-community")
    async def list_comms(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_COMMUNICATION, skip=skip, limit=limit, sort="ts")

    @router.get("/disciplinary-actions")
    async def list_disciplinary(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_DISCIPLINARY, skip=skip, limit=limit, sort="created_at")

    @router.get("/lifecycle-notes-history")
    async def notes_history(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_LIFECYCLE_NOTES, skip=skip, limit=limit, sort="created_at")

    # Transition/exit/intelligence section
    @router.get("/retention-signals")
    async def list_retention_signals(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_RETENTION_SIGNALS, skip=skip, limit=limit, sort="detected_on")

    @router.get("/notice-period")
    async def list_notice(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_NOTICE, skip=skip, limit=limit, sort="notice_start_date")

    @router.get("/exit-interviews")
    async def list_exit_interviews(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_EXIT_INTERVIEW, skip=skip, limit=limit, sort="scheduled_on")

    @router.get("/knowledge-transfer")
    async def list_kt(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_KT_HANDOVER, skip=skip, limit=limit, sort="created_at")

    @router.get("/full-final-settlement")
    async def list_fnf(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_FNF, skip=skip, limit=limit, sort="released_on")

    @router.get("/asset-return-access-revocation")
    async def list_asset_return(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_ASSET_RETURN, skip=skip, limit=limit, sort="updated_at")

    @router.get("/offboarding-clearance")
    async def list_clearance(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_CLEARANCE, skip=skip, limit=limit, sort="closed_on")

    @router.get("/separation-closure")
    async def list_separation(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_SEPARATION, skip=skip, limit=limit, sort="completed_on")

    @router.get("/alumni-rehire")
    async def list_alumni(skip: int = 0, limit: int = 200, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_ALUMNI_REHIRE, skip=skip, limit=limit, sort="updated_on")

    @router.get("/analytics")
    async def analytics(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        dash = await elm_svc.dashboard_summary(db)
        return {"dashboard": dash}

    @router.get("/forecasting/summary")
    async def forecasts(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_FORECASTS, skip=0, limit=100, sort="generated_on")

    @router.get("/ai-insights/summary")
    async def ai_insights(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_AI_INSIGHTS, skip=0, limit=100, sort="generated_at")

    @router.get("/strategic-intelligence")
    async def strategic(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await elm_svc.list_simple(db, COL_ANALYTICS_SNAPSHOTS, skip=0, limit=100, sort="generated_at")

    return router

