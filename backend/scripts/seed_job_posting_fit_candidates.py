#!/usr/bin/env python3
"""
For every job requisition, ensure ten synthetic candidates are linked with
applications and persisted fit scores whose overall match (final_score) spans
approximately 90% down to 70%.

Idempotent:
- Deterministic candidate IDs per (job_id, slot 0..9) via UUID5.
- Applications carry seed_marker so re-runs update scores instead of duplicating.

Requires:
  MONGO_URL
  DB_NAME (defaults to aai_hrms)

Optional:
  FIT_SEED_PER_JOB=10   (default 10)
  FIT_SEED_MAX_SCORE=90
  FIT_SEED_MIN_SCORE=70
  FIT_SEED_JOB_STATUS=OPEN   (comma-separated statuses to include, or ALL)

Run from backend/:
  python scripts/seed_job_posting_fit_candidates.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _load_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(BACKEND_DIR / ".env")
    except ImportError:
        pass
    try:
        from secrets_loader import apply_secret_store

        apply_secret_store()
    except ImportError:
        pass


SEED_MARKER = "job_posting_fit_candidates_v1"
SEED_SOURCE = "LINKEDIN"


def _weights(job: Dict[str, Any]) -> Dict[str, float]:
    rubric = job.get("scoring_rubric") or {}
    w = rubric.get("weights") or {}
    return {
        "title": float(w.get("title", 0.2)),
        "skill": float(w.get("skill", 0.4)),
        "activity": float(w.get("activity", 0.3)),
        "experience": float(w.get("experience", 0.1)),
    }


def _weight_sum(weights: Dict[str, float]) -> float:
    return sum(weights.values()) or 1.0


def _fit_components_for_target_final(job: Dict[str, Any], target_final: float) -> Dict[str, Any]:
    """
    Choose equal title/skill/activity/experience scores so the weighted sum equals
    target_final (given job rubric weights).
    """
    weights = _weights(job)
    wsum = _weight_sum(weights)
    v = round(float(target_final) / wsum, 2)
    v = max(0.0, min(100.0, v))

    title_score = skill_match_pct = activity_match_pct = experience_score = v
    final_score = round(
        title_score * weights["title"]
        + skill_match_pct * weights["skill"]
        + activity_match_pct * weights["activity"]
        + experience_score * weights["experience"],
        2,
    )
    return {
        "title_score": title_score,
        "skill_match_pct": skill_match_pct,
        "activity_match_pct": activity_match_pct,
        "experience_score": experience_score,
        "final_score": final_score,
        "must_have_ok": True,
        "score_source": "seed",
        "score_factors": {
            "title_weighted": round(title_score * weights["title"], 3),
            "skill_weighted": round(skill_match_pct * weights["skill"], 3),
            "activity_weighted": round(activity_match_pct * weights["activity"], 3),
            "experience_weighted": round(experience_score * weights["experience"], 3),
        },
        "explanation": {
            "matched_skills": [s.get("skill_name") for s in (job.get("skills") or []) if s.get("skill_name")],
            "missing_must_have": [],
            "matched_activities": [],
            "strengths": ["Seeded profile for pipeline / ranking demos."],
            "concerns": [],
        },
    }


def _linear_scores(lo: float, hi: float, n: int) -> List[float]:
    if n <= 1:
        return [round(hi, 2)]
    return [round(hi - (hi - lo) * i / (n - 1), 2) for i in range(n)]


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = (os.environ.get("DB_NAME") or "aai_hrms").strip() or "aai_hrms"
    if not mongo_url:
        print("MONGO_URL is required", file=sys.stderr)
        return 1

    per_job = int(os.environ.get("FIT_SEED_PER_JOB", "10"))
    hi = float(os.environ.get("FIT_SEED_MAX_SCORE", "90"))
    lo = float(os.environ.get("FIT_SEED_MIN_SCORE", "70"))
    status_filter = (os.environ.get("FIT_SEED_JOB_STATUS") or "OPEN").strip()

    if per_job < 1:
        per_job = 1
    if per_job > 50:
        per_job = 50

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        now = datetime.now(timezone.utc).isoformat()

        admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
        changed_by = (admin or {}).get("id") or str(uuid.uuid4())

        job_query: Dict[str, Any] = {}
        if status_filter.upper() != "ALL":
            statuses: Set[str] = {s.strip() for s in status_filter.split(",") if s.strip()}
            if len(statuses) == 1:
                job_query["status"] = next(iter(statuses))
            elif statuses:
                job_query["status"] = {"$in": list(statuses)}

        jobs = await db.jobs.find(job_query, {"_id": 0}).to_list(10_000)
        targets = _linear_scores(lo, hi, per_job)

        first_names = [
            "Aarav",
            "Diya",
            "Vihaan",
            "Anaya",
            "Riya",
            "Kabir",
            "Ishaan",
            "Saanvi",
            "Arjun",
            "Meera",
        ]
        last_names = [
            "Sharma",
            "Patel",
            "Singh",
            "Gupta",
            "Verma",
            "Khan",
            "Das",
            "Iyer",
            "Nair",
            "Chopra",
        ]

        jobs_touched = 0
        candidates_upserted = 0
        apps_created = 0
        apps_updated = 0

        for job in jobs:
            job_id = job.get("id")
            if not job_id:
                continue

            job_skills = job.get("skills") or []
            skill_objs = []
            for s in job_skills:
                if isinstance(s, dict) and s.get("skill_name"):
                    skill_objs.append(
                        {
                            "skill_name": s["skill_name"],
                            "proficiency": s.get("proficiency"),
                        }
                    )

            jobs_touched += 1
            for slot in range(per_job):
                target_final = targets[slot]
                email = f"fitseed.{job_id[:12]}.{slot}@aai-hrms.local".lower()
                candidate_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"aai-hrms.fit-seed::{job_id}::{slot}"))

                full_name = f"{first_names[slot % len(first_names)]} {last_names[(slot * 3) % len(last_names)]}"
                headline = f"{(job.get('title') or 'Role')} — Seeded candidate {slot + 1}"

                candidate_doc: Dict[str, Any] = {
                    "id": candidate_id,
                    "full_name": full_name,
                    "email": email,
                    "phone": None,
                    "location": job.get("location"),
                    "headline": headline,
                    "total_experience_years": 3.0 + (slot % 8),
                    "skills": skill_objs,
                    "source": SEED_SOURCE,
                    "experience": [],
                    "resume_text": f"Seeded applicant for job {job_id}. Overall fit target ~{target_final}%.",
                    "created_at": now,
                    "seed_marker": SEED_MARKER,
                    "seed_job_id": job_id,
                    "seed_slot": slot,
                }

                await db.candidates.update_one(
                    {"id": candidate_id},
                    {"$set": candidate_doc},
                    upsert=True,
                )
                candidates_upserted += 1

                fit_core = _fit_components_for_target_final(job, target_final)
                fs_id: Optional[str] = None

                existing_app = await db.applications.find_one(
                    {"job_id": job_id, "candidate_id": candidate_id},
                    {"_id": 0},
                )

                if existing_app:
                    fs_id = existing_app.get("fit_score_id")
                    if fs_id:
                        await db.fit_scores.update_one(
                            {"id": fs_id},
                            {
                                "$set": {
                                    **fit_core,
                                    "job_id": job_id,
                                    "candidate_id": candidate_id,
                                    "computed_at": now,
                                }
                            },
                        )
                    else:
                        fs_id = str(uuid.uuid4())
                        await db.fit_scores.insert_one(
                            {
                                "id": fs_id,
                                "job_id": job_id,
                                "candidate_id": candidate_id,
                                **fit_core,
                                "computed_at": now,
                            }
                        )
                        await db.applications.update_one(
                            {"id": existing_app["id"]},
                            {"$set": {"fit_score_id": fs_id, "updated_at": now, "seed_marker": SEED_MARKER}},
                        )
                    if existing_app.get("seed_marker") != SEED_MARKER:
                        await db.applications.update_one(
                            {"id": existing_app["id"]},
                            {"$set": {"seed_marker": SEED_MARKER, "updated_at": now}},
                        )
                    apps_updated += 1
                else:
                    fs_id = str(uuid.uuid4())
                    await db.fit_scores.insert_one(
                        {
                            "id": fs_id,
                            "job_id": job_id,
                            "candidate_id": candidate_id,
                            **fit_core,
                            "computed_at": now,
                        }
                    )
                    app_id = str(uuid.uuid4())
                    await db.applications.insert_one(
                        {
                            "id": app_id,
                            "job_id": job_id,
                            "candidate_id": candidate_id,
                            "stage": "SOURCED",
                            "status": "ACTIVE",
                            "fit_score_id": fs_id,
                            "created_at": now,
                            "updated_at": now,
                            "seed_marker": SEED_MARKER,
                            "seed_slot": slot,
                        }
                    )
                    await db.application_stage_history.insert_one(
                        {
                            "id": str(uuid.uuid4()),
                            "application_id": app_id,
                            "from_stage": None,
                            "to_stage": "SOURCED",
                            "changed_by": changed_by,
                            "changed_at": now,
                        }
                    )
                    apps_created += 1

        print(
            f"Fit-candidate seed complete. jobs={jobs_touched} per_job={per_job} "
            f"score_range={hi:.0f}-{lo:.0f} candidates_upserted={candidates_upserted} "
            f"applications_created={apps_created} applications_updated={apps_updated} db={db_name}",
            flush=True,
        )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
