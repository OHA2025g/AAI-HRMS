#!/usr/bin/env python3
"""
Seed demo assessment submissions for Smart Hiring Command Center dashboards.

Creates scored / in-progress submissions tied to existing assessments and applications.
Idempotent via seed_marker on submissions.

Run from backend/:
  python scripts/seed_assessment_submissions_demo.py
"""

from __future__ import annotations

import asyncio
import os
import secrets
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

SEED_MARKER = "assessment_submissions_demo_v1"


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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sample_questions() -> List[Dict[str, Any]]:
    return [
        {
            "id": str(uuid.uuid4()),
            "question_text": "What is the time complexity of binary search?",
            "question_type": "MCQ",
            "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
            "answer_key": "O(log n)",
            "max_marks": 10,
            "difficulty": "MEDIUM",
            "skill_tested": "Algorithms",
        },
        {
            "id": str(uuid.uuid4()),
            "question_text": "Explain REST vs GraphQL in one paragraph.",
            "question_type": "SHORT_ANSWER",
            "max_marks": 10,
            "difficulty": "MEDIUM",
            "skill_tested": "API Design",
        },
        {
            "id": str(uuid.uuid4()),
            "question_text": "Which SQL clause filters groups after aggregation?",
            "question_type": "MCQ",
            "options": ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
            "answer_key": "HAVING",
            "max_marks": 10,
            "difficulty": "EASY",
            "skill_tested": "SQL",
        },
    ]


async def _ensure_assessment(db, job: Dict[str, Any]) -> Dict[str, Any]:
    from talent_acquisition.assessments_constants import COL_ASSESSMENTS

    existing = await db[COL_ASSESSMENTS].find_one(
        {"job_id": job["id"], "seed_marker": SEED_MARKER}, {"_id": 0}
    )
    if existing:
        return existing

    questions = _sample_questions()
    now = _now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "job_id": job["id"],
        "assessment_type": "CORE_SKILL",
        "title": f"{job.get('title', 'Role')} — Technical Assessment",
        "duration_minutes": 45,
        "total_marks": sum(q["max_marks"] for q in questions),
        "questions": questions,
        "rubric": {"pass_threshold": 70, "grading_guide": "Auto + manual review"},
        "status": "ACTIVE",
        "is_primary": True,
        "published_at": now,
        "version": 1,
        "created_by": "seed",
        "created_at": now,
        "updated_at": now,
        "seed_marker": SEED_MARKER,
    }
    await db[COL_ASSESSMENTS].insert_one(doc)
    return doc


def _answers_for_assessment(assessment: Dict[str, Any], pass_all: bool) -> List[Dict[str, Any]]:
    from talent_acquisition.assessments_service import auto_score_mcq

    answers = []
    for q in assessment.get("questions") or []:
        qtype = (q.get("question_type") or "").upper()
        if qtype == "MCQ":
            key = q.get("answer_key") or ""
            response = key if pass_all else "wrong"
            ratio, _ = auto_score_mcq(key, response)
            marks = round(ratio * float(q.get("max_marks") or 10), 2)
            answers.append(
                {
                    "question_id": q["id"],
                    "response": response,
                    "marks_awarded": marks,
                    "auto_scored": True,
                    "max_marks": int(q.get("max_marks") or 10),
                }
            )
        else:
            marks = float(q.get("max_marks") or 10) if pass_all else 3.0
            answers.append(
                {
                    "question_id": q["id"],
                    "response": "Sample written response for demo seed.",
                    "marks_awarded": marks,
                    "auto_scored": False,
                    "max_marks": int(q.get("max_marks") or 10),
                }
            )
    return answers


async def _ensure_histogram_buckets(
    db,
    job: Dict[str, Any],
    assessment: Dict[str, Any],
    apps: List[Dict[str, Any]],
) -> None:
    """Extra scored submissions so analytics histogram + E2E drilldown have bar data."""
    from talent_acquisition.assessments_constants import COL_ASSESSMENT_SUBMISSIONS

    if not apps:
        return
    now = datetime.now(timezone.utc)
    target_scores = [42.0, 58.0, 72.0, 88.0]
    app = apps[0]
    for i, score_pct in enumerate(target_scores):
        sub_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{SEED_MARKER}:hist:{job['id']}:{i}"))
        existing = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": sub_id}, {"_id": 0, "id": 1})
        if existing:
            continue
        completed_at = (now - timedelta(days=i + 2)).isoformat()
        await db[COL_ASSESSMENT_SUBMISSIONS].insert_one(
            {
                "id": sub_id,
                "assessment_id": assessment["id"],
                "job_id": job["id"],
                "application_id": app.get("id"),
                "candidate_id": app["candidate_id"],
                "status": "SCORED",
                "invited_by": "seed",
                "invited_at": completed_at,
                "started_at": completed_at,
                "completed_at": completed_at,
                "expires_at": (now + timedelta(days=7)).isoformat(),
                "access_token": secrets.token_urlsafe(32),
                "seed_marker": SEED_MARKER,
                "answers": [],
                "score": score_pct,
                "score_pct": score_pct,
                "passed": score_pct >= 70,
                "graded_by": "seed",
                "graded_at": completed_at,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        )


async def _ensure_e2e_clearance_candidate(
    db,
    job: Dict[str, Any],
    assessment: Dict[str, Any],
    apps: List[Dict[str, Any]],
) -> None:
    """Guarantee one ASSESSMENT_SENT candidate with a failed score for pipeline E2E."""
    from talent_acquisition.assessments_constants import COL_ASSESSMENT_SUBMISSIONS

    if len(apps) < 2:
        return
    app = apps[1]
    sub_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{SEED_MARKER}:e2e-clearance:{app['id']}"))
    now = datetime.now(timezone.utc)
    invited_at = (now - timedelta(days=3)).isoformat()
    completed_at = (now - timedelta(days=2)).isoformat()
    base: Dict[str, Any] = {
        "id": sub_id,
        "assessment_id": assessment["id"],
        "job_id": job["id"],
        "application_id": app.get("id"),
        "candidate_id": app["candidate_id"],
        "status": "SCORED",
        "invited_by": "seed",
        "invited_at": invited_at,
        "started_at": invited_at,
        "completed_at": completed_at,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "access_token": secrets.token_urlsafe(32),
        "seed_marker": SEED_MARKER,
        "answers": [],
        "score": 45.0,
        "score_pct": 45.0,
        "passed": False,
        "graded_by": "seed",
        "graded_at": completed_at,
        "updated_at": _now_iso(),
    }
    existing = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": sub_id}, {"_id": 0})
    if existing:
        await db[COL_ASSESSMENT_SUBMISSIONS].update_one({"id": sub_id}, {"$set": base})
    else:
        base["created_at"] = _now_iso()
        await db[COL_ASSESSMENT_SUBMISSIONS].insert_one(base)
    await db.applications.update_one(
        {"id": app["id"]},
        {"$set": {"stage": "ASSESSMENT_SENT", "updated_at": _now_iso()}},
    )


async def main() -> None:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "aai_hrms")

    from motor.motor_asyncio import AsyncIOMotorClient
    from talent_acquisition.assessments_constants import COL_ASSESSMENT_SUBMISSIONS

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    jobs = await db.jobs.find({"status": "OPEN"}, {"_id": 0}).to_list(20)
    if not jobs:
        print("No open jobs found — skipping seed.")
        return

    created = 0
    updated = 0
    now = datetime.now(timezone.utc)

    for job in jobs[:8]:
        assessment = await _ensure_assessment(db, job)
        apps = await db.applications.find({"job_id": job["id"]}, {"_id": 0}).to_list(12)
        if not apps:
            continue

        scenarios = [
            ("SCORED", True, "ASSESSMENT_CLEARED"),
            ("SCORED", False, "ASSESSMENT_SENT"),
            ("IN_PROGRESS", None, "ASSESSMENT_SENT"),
            ("INVITED", None, "ASSESSMENT_SENT"),
        ]

        for idx, app in enumerate(apps[:4]):
            status, passed, stage = scenarios[idx % len(scenarios)]
            sub_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{SEED_MARKER}:{app['id']}:{assessment['id']}"))
            existing = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": sub_id}, {"_id": 0})
            invited_at = (now - timedelta(days=idx + 1)).isoformat()
            token = secrets.token_urlsafe(32)

            base: Dict[str, Any] = {
                "id": sub_id,
                "assessment_id": assessment["id"],
                "job_id": job["id"],
                "application_id": app.get("id"),
                "candidate_id": app["candidate_id"],
                "status": status,
                "invited_by": "seed",
                "invited_at": invited_at,
                "started_at": invited_at if status != "INVITED" else None,
                "expires_at": (now + timedelta(days=7)).isoformat(),
                "access_token": token,
                "seed_marker": SEED_MARKER,
                "updated_at": _now_iso(),
            }

            if status == "SCORED":
                answers = _answers_for_assessment(assessment, bool(passed))
                raw = sum(float(a.get("marks_awarded") or 0) for a in answers)
                total = float(assessment.get("total_marks") or 1)
                score_pct = round(100.0 * raw / total, 2)
                completed_at = (now - timedelta(hours=idx * 3)).isoformat()
                base.update(
                    {
                        "answers": answers,
                        "score": raw,
                        "score_pct": score_pct,
                        "passed": passed,
                        "completed_at": completed_at,
                        "graded_by": "seed",
                        "graded_at": completed_at,
                    }
                )
            else:
                base.update({"answers": [], "score": None, "score_pct": None, "passed": None})

            if existing:
                await db[COL_ASSESSMENT_SUBMISSIONS].update_one({"id": sub_id}, {"$set": base})
                updated += 1
            else:
                base["created_at"] = _now_iso()
                await db[COL_ASSESSMENT_SUBMISSIONS].insert_one(base)
                created += 1

            await db.applications.update_one(
                {"id": app["id"]},
                {"$set": {"stage": stage, "updated_at": _now_iso()}},
            )

        if job is jobs[0]:
            await _ensure_histogram_buckets(db, job, assessment, apps)
            await _ensure_e2e_clearance_candidate(db, job, assessment, apps)

    print(f"Assessment submissions seed complete: created={created}, updated={updated}")


if __name__ == "__main__":
    asyncio.run(main())
