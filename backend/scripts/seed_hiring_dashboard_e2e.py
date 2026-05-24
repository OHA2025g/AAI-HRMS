#!/usr/bin/env python3
"""Idempotent seed data so Smart Hiring Dashboard E2E always has drillable alerts."""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

SEED_MARKER = "hiring_dashboard_e2e_v1"
COL = "_hiring_dashboard_e2e_seed"


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    from secrets_loader import apply_secret_store

    apply_secret_store()


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME required", file=sys.stderr)
        return 1

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        if await db[COL].find_one({"marker": SEED_MARKER}, {"_id": 0}) and os.environ.get("HIRING_E2E_SEED_FORCE") != "1":
            print(f"Hiring dashboard E2E seed already applied ({SEED_MARKER}).")
            return 0

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        old_job_created = (now - timedelta(days=95)).isoformat()
        stuck_entered = (now - timedelta(days=20)).isoformat()

        admin = await db.users.find_one({"role": "admin"}, {"_id": 0, "id": 1})
        created_by = (admin or {}).get("id") or str(uuid.uuid4())

        job = await db.jobs.find_one({"seed_marker": SEED_MARKER}, {"_id": 0, "id": 1})
        job_id = job["id"] if job else str(uuid.uuid4())
        if not job:
            await db.jobs.insert_one(
                {
                    "id": job_id,
                    "title": "E2E Stale Req — QA Engineer",
                    "normalized_title": "qa engineer",
                    "description": "Deterministic hiring dashboard E2E seed job.",
                    "status": "OPEN",
                    "location": "Remote",
                    "work_mode": "remote",
                    "skills": [{"skill_name": "Python", "skill_type": "MUST_HAVE", "weight": 1.0}],
                    "created_by": created_by,
                    "created_at": old_job_created,
                    "seed_marker": SEED_MARKER,
                }
            )
            print("Created E2E stale open job", job_id)
        else:
            await db.jobs.update_one(
                {"id": job_id},
                {"$set": {"status": "OPEN", "created_at": old_job_created}},
            )

        candidate = await db.candidates.find_one({"seed_marker": SEED_MARKER}, {"_id": 0, "id": 1})
        candidate_id = candidate["id"] if candidate else str(uuid.uuid4())
        if not candidate:
            await db.candidates.insert_one(
                {
                    "id": candidate_id,
                    "full_name": "E2E Stuck Candidate",
                    "email": "e2e.stuck.candidate@aai-hrms.local",
                    "source": "DIRECT_UPLOAD",
                    "created_at": now_iso,
                    "seed_marker": SEED_MARKER,
                }
            )

        app = await db.applications.find_one({"seed_marker": SEED_MARKER}, {"_id": 0, "id": 1})
        app_id = app["id"] if app else str(uuid.uuid4())
        if not app:
            await db.applications.insert_one(
                {
                    "id": app_id,
                    "job_id": job_id,
                    "candidate_id": candidate_id,
                    "stage": "SCREENING",
                    "created_at": stuck_entered,
                    "updated_at": stuck_entered,
                    "seed_marker": SEED_MARKER,
                }
            )
        else:
            await db.applications.update_one(
                {"id": app_id},
                {"$set": {"stage": "SCREENING", "updated_at": stuck_entered, "job_id": job_id}},
            )

        await db.application_stage_history.delete_many({"application_id": app_id, "seed_marker": SEED_MARKER})
        await db.application_stage_history.insert_one(
            {
                "id": str(uuid.uuid4()),
                "application_id": app_id,
                "from_stage": "SOURCED",
                "to_stage": "SCREENING",
                "changed_at": stuck_entered,
                "seed_marker": SEED_MARKER,
            }
        )

        await db[COL].update_one(
            {"marker": SEED_MARKER},
            {
                "$set": {
                    "marker": SEED_MARKER,
                    "job_id": job_id,
                    "application_id": app_id,
                    "applied_at": now_iso,
                }
            },
            upsert=True,
        )
        print("Hiring dashboard E2E seed complete.")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
