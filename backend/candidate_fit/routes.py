"""FastAPI routes for Phase 2 contextual fit simulation."""

from __future__ import annotations

from typing import Callable, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from candidate_fit.constants import COL_PHASE2_REPORTS
from candidate_fit.simulator import build_phase2_report
from career_trajectory.constants import COL_REPORTS
from talent_acquisition.hiring_rbac import assert_candidate_access


class Phase2SimulateBody(BaseModel):
    candidate_id: str
    trajectory_report_id: Optional[str] = None
    job_id: Optional[str] = None
    manager_employee_id: Optional[str] = None


def create_phase2_fit_router(
    *,
    db,
    get_current_user,
    require_read: Callable[[dict], dict],
    require_write: Callable[[dict], dict],
) -> APIRouter:
    router = APIRouter(prefix="/ai-hiring/candidate-fit/phase2", tags=["phase2-fit"])

    async def _latest_phase1(candidate_id: str, trajectory_report_id: Optional[str] = None) -> Dict:
        if trajectory_report_id:
            doc = await db[COL_REPORTS].find_one({"id": trajectory_report_id}, {"_id": 0})
            if doc:
                return doc
        latest = (
            await db[COL_REPORTS]
            .find({"candidate_id": candidate_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(1)
            .to_list(1)
        )
        if not latest:
            raise HTTPException(
                status_code=400,
                detail="Complete Phase 1 career trajectory analysis before running Phase 2.",
            )
        return latest[0]

    @router.post("/simulate")
    async def simulate(
        body: Phase2SimulateBody,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        await assert_candidate_access(db, current_user, body.candidate_id)
        traj = await _latest_phase1(body.candidate_id, body.trajectory_report_id)
        manager = None
        if body.manager_employee_id:
            manager = await db.employees.find_one(
                {"id": body.manager_employee_id},
                {"_id": 0, "full_name": 1, "name": 1, "email": 1},
            )
        candidate = await db.candidates.find_one(
            {"id": body.candidate_id},
            {"_id": 0, "full_name": 1, "email": 1, "headline": 1, "skills": 1},
        )
        job = None
        resolved_job_id = body.job_id or traj.get("job_id")
        if resolved_job_id:
            job = await db.jobs.find_one(
                {"id": resolved_job_id},
                {"_id": 0, "id": 1, "title": 1, "normalized_title": 1, "skills": 1, "description": 1},
            )
        report = build_phase2_report(
            candidate_id=body.candidate_id,
            trajectory_report=traj,
            job_id=resolved_job_id,
            job=job,
            candidate=candidate,
            manager_employee=manager,
        )
        # insert_one mutates the dict with a BSON ObjectId _id — keep response JSON-safe
        await db[COL_PHASE2_REPORTS].insert_one(dict(report))
        return report

    @router.get("/candidate/{candidate_id}")
    async def get_by_candidate(
        candidate_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        await assert_candidate_access(db, current_user, candidate_id)
        latest = (
            await db[COL_PHASE2_REPORTS]
            .find({"candidate_id": candidate_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(1)
            .to_list(1)
        )
        if not latest:
            raise HTTPException(status_code=404, detail="No Phase 2 report for this candidate")
        return latest[0]

    @router.get("/report/{report_id}")
    async def get_report(
        report_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        doc = await db[COL_PHASE2_REPORTS].find_one({"id": report_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Phase 2 report not found")
        return doc

    @router.get("/report/{report_id}/export")
    async def export_report(
        report_id: str,
        format: str = Query("json"),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        doc = await db[COL_PHASE2_REPORTS].find_one({"id": report_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Phase 2 report not found")
        if format == "json":
            return doc
        if format == "csv":
            line = f"id,candidate_id,score,{doc.get('overall_contextual_fit_score')}\n"
            from fastapi.responses import Response

            return Response(content=line, media_type="text/csv")
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    return router
