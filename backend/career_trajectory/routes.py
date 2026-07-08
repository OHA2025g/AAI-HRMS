"""FastAPI routes for Career Trajectory / Candidate Fit Simulation."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from career_trajectory.async_jobs import (
    COL_JOBS,
    create_analyze_job,
    get_analyze_job,
    retry_analyze_job,
    run_analyze_job,
    schedule_analyze_job,
)
from career_trajectory.config_loader import default_config_document
from career_trajectory.constants import COL_CONFIG, COL_REPORTS, DEFAULT_CONFIG_ID
from career_trajectory.parser import extract_text_from_bytes
from career_trajectory.report_generator import analyze_resume_text
from talent_acquisition.candidate_display import candidate_display_name
from talent_acquisition.candidate_dedupe import (
    dedupe_candidate_dicts,
    dedupe_candidates_for_select,
    trajectory_select_candidate_filter,
)
from talent_acquisition.hiring_rbac import allowed_candidate_ids, assert_candidate_access


class AnalyzeTextBody(BaseModel):
    resume_text: str
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    background: bool = False


class ConfigUpdateBody(BaseModel):
    overall_weights: Dict[str, float] = Field(default_factory=dict)
    sub_weights: Dict[str, Dict[str, float]] = Field(default_factory=dict)


COMPARE_SUMMARY_SCORE_KEYS = (
    "career_progression",
    "leadership_maturity",
    "project_complexity",
    "business_impact",
    "retention_risk",
)


def _score_dimension_value(scores: Dict[str, Any], key: str) -> Optional[float]:
    block = scores.get(key)
    if isinstance(block, dict):
        val = block.get("score")
        if val is not None:
            try:
                return float(val)
            except (TypeError, ValueError):
                return None
    return None


def _trajectory_compare_summary(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Compact summary for compare page table + radar chart."""
    scores = doc.get("scores") or {}
    overall = scores.get("overall_career_trajectory") or {}
    summary: Dict[str, Any] = {
        "report_id": doc.get("id"),
        "overall_score": overall.get("score"),
        "primary_archetype": (doc.get("primary_archetype") or {}).get("name"),
        "decision_gate": (doc.get("decision_gate") or {}).get("category"),
        "created_at": doc.get("created_at"),
    }
    for key in COMPARE_SUMMARY_SCORE_KEYS:
        summary[key] = _score_dimension_value(scores, key)
    return summary


def _report_summary(doc: Dict[str, Any]) -> Dict[str, Any]:
    scores = doc.get("scores") or {}
    overall = scores.get("overall_career_trajectory") or {}
    arch = doc.get("primary_archetype") or {}
    return {
        "id": doc.get("id"),
        "candidate_id": doc.get("candidate_id"),
        "job_id": doc.get("job_id"),
        "created_at": doc.get("created_at"),
        "scores": scores,
        "primary_archetype": arch,
        "decision_gate": doc.get("decision_gate"),
        "overall_score": overall.get("score"),
    }


def create_career_trajectory_router(
    *,
    db,
    get_current_user,
    require_read: Callable[[dict], dict],
    require_write: Callable[[dict], dict],
) -> APIRouter:
    router = APIRouter(
        prefix="/ai-hiring/candidate-fit/career-trajectory",
        tags=["career-trajectory"],
    )

    async def _load_config() -> Dict[str, Any]:
        doc = await db[COL_CONFIG].find_one({"id": DEFAULT_CONFIG_ID}, {"_id": 0})
        if not doc:
            doc = default_config_document()
            await db[COL_CONFIG].insert_one({**doc})
        return doc

    async def _persist_report(report: Dict[str, Any]) -> Dict[str, Any]:
        await db[COL_REPORTS].insert_one(dict(report))
        return report

    async def _resolve_resume_text(
        *,
        candidate_id: Optional[str],
        resume_text: Optional[str],
        file: Optional[UploadFile],
    ) -> str:
        text = (resume_text or "").strip()
        if file:
            raw = await file.read()
            text = extract_text_from_bytes(raw, file.filename or "upload.pdf").strip()
        if not text and candidate_id:
            cand = await db.candidates.find_one({"id": candidate_id}, {"_id": 0, "resume_text": 1})
            if cand:
                text = (cand.get("resume_text") or "").strip()
        if len(text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Resume text must be at least 50 characters (paste text, upload CV, or select a candidate with a stored résumé).",
            )
        return text

    @router.get("/candidates/select-options")
    async def list_candidate_select_options(
        limit: int = Query(500, ge=1, le=1000),
        current_user: dict = Depends(get_current_user),
    ):
        """Candidates with human-readable labels for trajectory UI dropdowns."""
        require_read(current_user)
        cursor = (
            db.candidates.find(
                trajectory_select_candidate_filter(),
                {"_id": 0, "id": 1, "full_name": 1, "email": 1, "headline": 1},
            )
            .sort([("full_name", 1)])
            .limit(limit)
        )
        rows = await cursor.to_list(limit)
        rows = dedupe_candidates_for_select(rows)
        items: List[Dict[str, Any]] = []
        for row in rows:
            cid = str(row.get("id") or "").strip()
            if not cid:
                continue
            display = candidate_display_name(row)
            if not display or display == "Unnamed Candidate":
                continue
            email = (row.get("email") or "").strip()
            label = f"{display} ({email})" if email else display
            items.append(
                {
                    "id": cid,
                    "label": label,
                    "full_name": row.get("full_name"),
                    "email": email or None,
                    "headline": row.get("headline"),
                }
            )
        return {"items": items}

    @router.get("/reports")
    async def list_reports(
        candidate_id: str = Query(...),
        limit: int = Query(25, ge=1, le=100),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        await assert_candidate_access(db, current_user, candidate_id)
        cursor = (
            db[COL_REPORTS]
            .find({"candidate_id": candidate_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
        rows = await cursor.to_list(limit)
        return {"items": [_report_summary(r) for r in rows]}

    @router.get("/report/{report_id}")
    async def get_report(
        report_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        doc = await db[COL_REPORTS].find_one({"id": report_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Report not found")
        cid = doc.get("candidate_id")
        if cid:
            await assert_candidate_access(db, current_user, cid)
        return doc

    @router.delete("/report/{report_id}")
    async def delete_report(
        report_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        doc = await db[COL_REPORTS].find_one({"id": report_id}, {"_id": 0, "candidate_id": 1})
        if not doc:
            raise HTTPException(status_code=404, detail="Report not found")
        cid = doc.get("candidate_id")
        if cid:
            await assert_candidate_access(db, current_user, cid)
        await db[COL_REPORTS].delete_one({"id": report_id})
        return {"ok": True, "id": report_id}

    @router.get("/summaries")
    async def get_summaries(
        candidate_ids: str = Query(..., description="Comma-separated candidate ids"),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        ids = [x.strip() for x in candidate_ids.split(",") if x.strip()]
        if not ids:
            return {"summaries": {}}

        allowed_ids = await allowed_candidate_ids(db, current_user)
        if allowed_ids is not None:
            allowed_set = set(allowed_ids)
            ids = [cid for cid in ids if cid in allowed_set]

        if not ids:
            return {"summaries": {}}

        rows = await db[COL_REPORTS].aggregate(
            [
                {"$match": {"candidate_id": {"$in": ids}}},
                {"$sort": {"created_at": -1}},
                {"$group": {"_id": "$candidate_id", "doc": {"$first": "$$ROOT"}}},
            ]
        ).to_list(len(ids))

        summaries: Dict[str, Any] = {}
        for row in rows:
            doc = row.get("doc")
            cid = row.get("_id")
            if doc and cid:
                summaries[str(cid)] = _trajectory_compare_summary(doc)
        return {"summaries": summaries}

    @router.get("/candidate/{candidate_id}")
    async def get_latest_by_candidate(
        candidate_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        await assert_candidate_access(db, current_user, candidate_id)
        latest = (
            await db[COL_REPORTS]
            .find({"candidate_id": candidate_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(1)
            .to_list(1)
        )
        if not latest:
            raise HTTPException(status_code=404, detail="No trajectory report for this candidate")
        return latest[0]

    @router.get("/candidate/{candidate_id}/interview-prep")
    async def get_interview_prep(
        candidate_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        await assert_candidate_access(db, current_user, candidate_id)
        latest = (
            await db[COL_REPORTS]
            .find({"candidate_id": candidate_id}, {"_id": 0, "recommended_interview_probes": 1, "id": 1})
            .sort("created_at", -1)
            .limit(1)
            .to_list(1)
        )
        doc = latest[0] if latest else None
        if not doc:
            raise HTTPException(status_code=404, detail="No trajectory report for interview prep")
        return {
            "candidate_id": candidate_id,
            "report_id": doc.get("id"),
            "probes": doc.get("recommended_interview_probes") or [],
        }

    @router.get("/candidates/phase1-ready")
    async def list_phase1_ready(
        limit: int = Query(200, ge=1, le=500),
        job_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        query: Dict[str, Any] = {"candidate_id": {"$exists": True, "$ne": None}}
        if job_id:
            query["job_id"] = job_id
        pipeline = [
            {"$match": query},
            {"$sort": {"created_at": -1}},
            {"$group": {"_id": "$candidate_id", "doc": {"$first": "$$ROOT"}}},
            {"$limit": limit},
        ]
        rows = await db[COL_REPORTS].aggregate(pipeline).to_list(limit)
        items: List[Dict[str, Any]] = []
        for row in rows:
            doc = row.get("doc") or {}
            cid = doc.get("candidate_id")
            if not cid:
                continue
            cand = await db.candidates.find_one(
                {"id": cid},
                {"_id": 0, "full_name": 1, "email": 1, "headline": 1},
            )
            scores = doc.get("scores") or {}
            overall = scores.get("overall_career_trajectory") or {}
            items.append(
                {
                    "candidate_id": cid,
                    "report_id": doc.get("id"),
                    "full_name": (cand or {}).get("full_name"),
                    "email": (cand or {}).get("email"),
                    "headline": (cand or {}).get("headline"),
                    "overall_score": overall.get("score"),
                    "primary_archetype": (doc.get("primary_archetype") or {}).get("name"),
                }
            )
        items.sort(
            key=lambda row: (
                str(row.get("full_name") or row.get("email") or row.get("candidate_id") or "").lower()
            )
        )
        return {"items": items}

    @router.post("/analyze")
    async def analyze_upload(
        file: UploadFile = File(...),
        candidate_id: Optional[str] = Form(None),
        job_id: Optional[str] = Form(None),
        resume_text: Optional[str] = Form(None),
        background: Optional[str] = Form(None),
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        if candidate_id:
            await assert_candidate_access(db, current_user, candidate_id)
        text = await _resolve_resume_text(
            candidate_id=candidate_id,
            resume_text=resume_text,
            file=file,
        )
        use_bg = str(background or "").lower() in ("true", "1", "yes")
        if use_bg:
            job = await create_analyze_job(
                db,
                resume_text=text,
                candidate_id=candidate_id,
                job_id=job_id,
            )
            schedule_analyze_job(db, job)
            return JSONResponse(status_code=202, content={"id": job["id"], "status": "pending"})
        report = analyze_resume_text(text, candidate_id=candidate_id, job_id=job_id)
        await _persist_report(report)
        if candidate_id:
            await db.candidates.update_one(
                {"id": candidate_id},
                {"$set": {"resume_text": text, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
        return report

    @router.post("/analyze-text")
    async def analyze_text(
        body: AnalyzeTextBody,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        if body.candidate_id:
            await assert_candidate_access(db, current_user, body.candidate_id, "candidate_write")
        text = (body.resume_text or "").strip()
        if len(text) < 50:
            raise HTTPException(status_code=400, detail="resume_text must be at least 50 characters")
        if body.background:
            job = await create_analyze_job(
                db,
                resume_text=text,
                candidate_id=body.candidate_id,
                job_id=body.job_id,
            )
            schedule_analyze_job(db, job)
            return JSONResponse(status_code=202, content={"id": job["id"], "status": "pending"})
        report = analyze_resume_text(
            text,
            candidate_id=body.candidate_id,
            job_id=body.job_id,
        )
        await _persist_report(report)
        return report

    @router.post("/reanalyze/{candidate_id}")
    async def reanalyze_candidate(
        candidate_id: str,
        background: bool = Query(False),
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        await assert_candidate_access(db, current_user, candidate_id, "candidate_write")
        cand = await db.candidates.find_one({"id": candidate_id}, {"_id": 0, "resume_text": 1})
        if not cand or not (cand.get("resume_text") or "").strip():
            raise HTTPException(status_code=400, detail="Candidate has no stored resume text to analyze")
        text = cand["resume_text"].strip()
        if background:
            job = await create_analyze_job(db, resume_text=text, candidate_id=candidate_id)
            schedule_analyze_job(db, job)
            return JSONResponse(status_code=202, content={"id": job["id"], "status": "pending"})
        report = analyze_resume_text(text, candidate_id=candidate_id)
        await _persist_report(report)
        return report

    @router.get("/analyze-jobs/{job_id}")
    async def get_job_status(
        job_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return await get_analyze_job(db, job_id)

    @router.post("/analyze-jobs/{job_id}/retry")
    async def retry_job(
        job_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        return await retry_analyze_job(db, job_id)

    @router.get("/config")
    async def get_config(current_user: dict = Depends(get_current_user)):
        require_read(current_user)
        doc = await _load_config()
        return {
            "overall_weights": doc.get("overall_weights") or doc.get("weights") or {},
            "sub_weights": doc.get("sub_weights") or {},
            "updated_at": doc.get("updated_at"),
        }

    @router.put("/config")
    async def update_config(
        body: ConfigUpdateBody,
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        now = datetime.now(timezone.utc).isoformat()
        await db[COL_CONFIG].update_one(
            {"id": DEFAULT_CONFIG_ID},
            {
                "$set": {
                    "overall_weights": body.overall_weights,
                    "sub_weights": body.sub_weights,
                    "updated_at": now,
                }
            },
            upsert=True,
        )
        return {"ok": True, "updated_at": now}

    @router.get("/fairness/summary")
    async def fairness_summary(
        limit: int = Query(500, ge=1, le=2000),
        days: int = Query(90, ge=1, le=365),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        return {"total_reports": await db[COL_REPORTS].count_documents({}), "passed": 0, "flagged": 0}

    @router.get("/report/{report_id}/export")
    async def export_report(
        report_id: str,
        format: str = Query("json"),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        doc = await db[COL_REPORTS].find_one({"id": report_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Report not found")
        if format == "json":
            return doc
        if format == "csv":
            line = f"id,candidate_id,overall,{doc.get('scores', {}).get('overall_career_trajectory', {}).get('score')}\n"
            return Response(content=line, media_type="text/csv")
        raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")

    @router.get("/candidate/{candidate_id}/fit-pack/export")
    async def export_fit_pack(
        candidate_id: str,
        format: str = Query("pdf"),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        await assert_candidate_access(db, current_user, candidate_id)
        latest = (
            await db[COL_REPORTS]
            .find({"candidate_id": candidate_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(1)
            .to_list(1)
        )
        doc = latest[0] if latest else None
        if not doc:
            raise HTTPException(status_code=404, detail="No trajectory report for fit pack")
        if format != "pdf":
            raise HTTPException(status_code=400, detail="Only pdf fit-pack export is supported in this build")
        try:
            from fpdf import FPDF

            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Helvetica", size=12)
            pdf.multi_cell(
                0,
                8,
                f"Career trajectory fit pack\nCandidate: {candidate_id}\nOverall: "
                f"{(doc.get('scores') or {}).get('overall_career_trajectory', {}).get('score')}",
            )
            raw = pdf.output()
            return Response(content=raw, media_type="application/pdf")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"PDF export failed: {exc}") from exc

    @router.post("/ml/train-calibration")
    async def train_ml_calibration(
        limit: int = Query(200, ge=1, le=5000),
        label_source: str = Query("trajectory"),
        current_user: dict = Depends(get_current_user),
    ):
        require_write(current_user)
        return {"ok": True, "trained": 0, "message": "ML calibration stub — heuristic scoring active"}

    @router.get("/reports/training-export")
    async def training_export(
        format: str = Query("csv"),
        limit: int = Query(200, ge=1, le=5000),
        current_user: dict = Depends(get_current_user),
    ):
        require_read(current_user)
        rows = await db[COL_REPORTS].find({}, {"_id": 0, "id": 1, "candidate_id": 1}).limit(limit).to_list(limit)
        if format == "csv":
            lines = ["id,candidate_id\n"] + [f"{r.get('id')},{r.get('candidate_id')}\n" for r in rows]
            return Response(content="".join(lines), media_type="text/csv")
        return {"items": rows}

    return router
