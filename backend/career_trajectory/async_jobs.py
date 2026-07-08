"""Career trajectory background analyze jobs."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, Optional

from fastapi import HTTPException

from career_trajectory.constants import COL_REPORTS
from career_trajectory.report_generator import analyze_resume_text

COL_JOBS = "career_trajectory_analyze_jobs"
STALE_SECONDS = 900


async def create_analyze_job(
    db,
    *,
    resume_text: str,
    candidate_id: Optional[str] = None,
    job_id: Optional[str] = None,
) -> Dict[str, Any]:
    job_id_str = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": job_id_str,
        "status": "pending",
        "candidate_id": candidate_id,
        "job_id": job_id,
        "resume_text": resume_text,
        "report_id": None,
        "error": None,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_JOBS].insert_one(doc)
    return doc


async def run_analyze_job(db, job: Dict[str, Any]) -> Dict[str, Any]:
    job_id = job["id"]
    now = datetime.now(timezone.utc).isoformat()
    await db[COL_JOBS].update_one(
        {"id": job_id},
        {"$set": {"status": "running", "updated_at": now}},
    )
    try:
        report = analyze_resume_text(
            job.get("resume_text") or "",
            candidate_id=job.get("candidate_id"),
            job_id=job.get("job_id"),
        )
        await db[COL_REPORTS].insert_one(dict(report))
        await db[COL_JOBS].update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "report_id": report["id"],
                    "error": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return report
    except Exception as exc:
        await db[COL_JOBS].update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": "failed",
                    "error": str(exc),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        raise


def schedule_analyze_job(db, job: Dict[str, Any]) -> None:
    async def _runner():
        try:
            await run_analyze_job(db, job)
        except Exception:
            pass

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_runner())
    except RuntimeError:
        asyncio.run(_runner())


async def get_analyze_job(db, job_id: str) -> Dict[str, Any]:
    job = await db[COL_JOBS].find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Analyze job not found")
    return job


async def retry_analyze_job(db, job_id: str) -> Dict[str, Any]:
    job = await get_analyze_job(db, job_id)
    if job.get("status") == "running":
        raise HTTPException(status_code=409, detail="Job is already running")
    job = {**job, "status": "pending", "error": None}
    await db[COL_JOBS].update_one(
        {"id": job_id},
        {"$set": {"status": "pending", "error": None, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    schedule_analyze_job(db, job)
    return await get_analyze_job(db, job_id)


async def recover_stale_analyze_jobs(db, *, max_jobs: int = 20) -> int:
    """Re-queue jobs stuck in running/pending."""
    cursor = db[COL_JOBS].find(
        {"status": {"$in": ["pending", "running"]}},
        {"_id": 0},
    ).limit(max_jobs)
    rows = await cursor.to_list(max_jobs)
    recovered = 0
    for job in rows:
        schedule_analyze_job(db, job)
        recovered += 1
    return recovered


def recover_stale_analyze_jobs_sync(db, *, max_jobs: int = 20) -> int:
    return asyncio.get_event_loop().run_until_complete(recover_stale_analyze_jobs(db, max_jobs=max_jobs))
