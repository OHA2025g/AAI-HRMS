from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from m12_training_development import service as td_svc
from m12_training_development.constants import COL_APPROVAL_REQUESTS
from m12_training_development.schemas import (
    CatalogItemCreate,
    EnrollmentCreate,
    ExtendedRecordCreate,
    TrainingBatchCreate,
    TrainingProgramCreate,
    TrainingProgramUpdate,
    TrainingSessionCreate,
)


def create_training_development_router(
    *,
    db: Any,
    get_current_user: Callable,
    require_read: Callable[[Dict], Dict],
    require_write: Callable[[Dict], Dict],
) -> APIRouter:
    router = APIRouter(prefix="/training-development", tags=["training-development"])

    @router.get("/dashboard/summary")
    async def td_dashboard(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await td_svc.dashboard_summary(db)

    @router.get("/training-programs")
    async def td_list_programs(
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=200),
        q: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        rows, total = await td_svc.list_programs(db, skip=skip, limit=limit, q=q, status=status, category=category)
        return {"items": rows, "total": total, "skip": skip, "limit": limit}

    @router.post("/training-programs", status_code=201)
    async def td_create_program(
        payload: TrainingProgramCreate,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        return await td_svc.create_program(db, payload, current_user.get("id"))

    @router.get("/training-programs/{training_id}")
    async def td_get_program(training_id: str, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        row = await td_svc.get_program(db, training_id)
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return row

    @router.get("/training-programs/{training_id}/detail")
    async def td_program_detail(training_id: str, current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        return await td_svc.program_detail_bundle(db, training_id)

    @router.patch("/training-programs/{training_id}")
    async def td_patch_program(
        training_id: str,
        payload: TrainingProgramUpdate,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        return await td_svc.update_program(db, training_id, payload, current_user.get("id"))

    @router.delete("/training-programs/{training_id}")
    async def td_archive_program(training_id: str, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await td_svc.archive_program(db, training_id, current_user.get("id"))

    @router.post("/training-programs/{training_id}/clone", status_code=201)
    async def td_clone_program(training_id: str, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await td_svc.clone_program(db, training_id, current_user.get("id"))

    @router.get("/batches")
    async def td_list_batches(
        training_id: Optional[str] = None,
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"items": await td_svc.list_batches(db, training_id=training_id, skip=skip, limit=limit)}

    @router.post("/batches", status_code=201)
    async def td_create_batch(payload: TrainingBatchCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await td_svc.create_batch(db, payload, current_user.get("id"))

    @router.get("/sessions")
    async def td_list_sessions(
        training_id: Optional[str] = None,
        skip: int = Query(0, ge=0),
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"items": await td_svc.list_sessions(db, training_id=training_id, skip=skip, limit=limit)}

    @router.post("/sessions", status_code=201)
    async def td_create_session(payload: TrainingSessionCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await td_svc.create_session(db, payload, current_user.get("id"))

    @router.get("/enrollments")
    async def td_list_enrollments(
        training_id: Optional[str] = None,
        employee_id: Optional[str] = None,
        skip: int = Query(0, ge=0),
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {
            "items": await td_svc.list_enrollments(
                db, training_id=training_id, employee_id=employee_id, skip=skip, limit=limit
            )
        }

    @router.post("/enrollments", status_code=201)
    async def td_create_enrollment(payload: EnrollmentCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await td_svc.create_enrollment(db, payload, current_user.get("id"))

    @router.get("/catalog-items")
    async def td_list_catalog(
        skip: int = Query(0, ge=0),
        limit: int = Query(200, ge=1, le=500),
        q: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"items": await td_svc.list_catalog(db, skip=skip, limit=limit, q=q)}

    @router.post("/catalog-items", status_code=201)
    async def td_create_catalog(payload: CatalogItemCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await td_svc.create_catalog_item(db, payload, current_user.get("id"))

    @router.get("/extended-records/{record_type}")
    async def td_list_extended(
        record_type: str,
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        rows, total = await td_svc.list_extended(db, record_type, skip=skip, limit=limit, employee_id=employee_id)
        return {"items": rows, "total": total, "skip": skip, "limit": limit}

    @router.post("/extended-records", status_code=201)
    async def td_create_extended(payload: ExtendedRecordCreate, current_user: dict = Depends(get_current_user)):
        require_write(current_user)
        return await td_svc.create_extended(db, payload, current_user.get("id"))

    @router.get("/ai/skill-gap-predictions")
    async def td_ai_gap_predictions(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        rows, _ = await td_svc.list_extended(db, "ai_skill_gap_prediction", skip=0, limit=50)
        return {"items": rows, "source": "td_extended_records"}

    @router.get("/ai/learning-recommendations")
    async def td_ai_learning_recs(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        rows, _ = await td_svc.list_extended(db, "ai_learning_recommendation", skip=0, limit=50)
        return {"items": rows, "source": "td_extended_records"}

    @router.get("/forecasts/summary")
    async def td_forecasts(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        rows, _ = await td_svc.list_extended(db, "forecast", skip=0, limit=50)
        return {"items": rows}

    @router.get("/approvals")
    async def td_list_approvals(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        rows = (
            await db[COL_APPROVAL_REQUESTS]
            .find({}, {"_id": 0})
            .sort("submitted_at", -1)
            .skip(skip)
            .limit(limit)
            .to_list(limit)
        )
        total = await db[COL_APPROVAL_REQUESTS].count_documents({})
        return {"items": rows, "total": total, "skip": skip, "limit": limit}

    return router
