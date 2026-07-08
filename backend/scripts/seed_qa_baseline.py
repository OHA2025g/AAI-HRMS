#!/usr/bin/env python3
"""
Idempotent QA baseline data (M0-4).

Requires: MONGO_URL, DB_NAME (and optional SECRET_STORE like the API).

Creates / updates:
  - Admin user (login for QA)
  - One employee, one workforce skill, one OPEN job (marked with seed_marker)

Env:
  QA_SEED_ADMIN_EMAIL   (default: aghoreshwar@hotmail.com via docker-compose)
  QA_SEED_ADMIN_PASSWORD (default: Prince@1804 via docker-compose)
  QA_SEED_FORCE         (set to 1 to re-apply even if version recorded)

Run from backend/:
  python scripts/seed_qa_baseline.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt

BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = BACKEND_DIR / "scripts"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from set_user_password import upsert_user_password


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    from secrets_loader import apply_secret_store

    apply_secret_store()


SEED_VERSION = 2
SEED_MARKER = "qa_baseline_v1"
SEED_COLLECTION = "_qa_seed"
# Stable ids for E2E / RBAC offer-proposal flows
QA_SEED_JOB_ID = "qa-seed-job-0001"
QA_SEED_CAND_INTERVIEW_ID = "qa-seed-cand-interview"
QA_SEED_APP_INTERVIEW_ID = "qa-seed-app-interview"


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME required", file=sys.stderr)
        return 1

    from motor.motor_asyncio import AsyncIOMotorClient

    email = (os.environ.get("QA_SEED_ADMIN_EMAIL") or "aghoreshwar@hotmail.com").strip().lower()
    password = os.environ.get("QA_SEED_ADMIN_PASSWORD") or "Prince@1804"
    force = os.environ.get("QA_SEED_FORCE", "").strip() in ("1", "true", "yes")

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]

        # Always sync admin credentials from env (idempotent on every API boot).
        admin_id = await upsert_user_password(
            email=email,
            password=password,
            role="admin",
            full_name="QA Admin",
        )

        existing = await db[SEED_COLLECTION].find_one({"version": SEED_VERSION}, {"_id": 0})
        if existing and not force:
            print(f"QA seed v{SEED_VERSION} already applied. Set QA_SEED_FORCE=1 to re-run.")
            return 0

        now = datetime.now(timezone.utc).isoformat()
        pw_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # --- Employee ---
        code = "QASEED001"
        if not await db.employees.find_one({"employee_code": code}, {"_id": 0}):
            await db.employees.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "employee_code": code,
                    "full_name": "QA Seed Employee",
                    "email": "qa.employee@aai-hrms.local",
                    "department": "Engineering",
                    "role_title": "Engineer",
                    "manager_id": None,
                    "location": "Remote",
                    "status": "ACTIVE",
                    "skills": ["Python"],
                    "join_date": now[:10],
                    "created_at": now,
                    "updated_at": now,
                }
            )
            print("Created employee", code)

        # --- Workforce skill ---
        sk = "python"
        if not await db.workforce_skills.find_one({"skill_name_lc": sk}, {"_id": 0}):
            await db.workforce_skills.insert_one(
                {
                    "skill_name": "Python",
                    "skill_name_lc": sk,
                    "demand_count": 3,
                    "supply_count": 2,
                    "gap": 1,
                    "category": "Engineering",
                    "priority": "MEDIUM",
                    "notes": "QA seed",
                    "updated_at": now,
                }
            )
            print("Created workforce skill Python")

        # --- Hiring role demo users (HM / TM / PM) ---
        role_users = [
            ("qa_hm@aai-hrms.local", "QA Hiring Manager", "hiring_manager"),
            ("qa_tm@aai-hrms.local", "QA Technical Manager", "technical_manager"),
            ("qa_pm@aai-hrms.local", "QA Project Manager", "project_manager"),
        ]
        role_ids: dict[str, str] = {}
        for em, name, role in role_users:
            existing_u = await db.users.find_one({"email": em}, {"_id": 0})
            if existing_u:
                role_ids[role] = existing_u["id"]
                await db.users.update_one(
                    {"id": existing_u["id"]},
                    {"$set": {"password": pw_hash, "role": role, "full_name": name}},
                )
            else:
                uid = str(uuid.uuid4())
                role_ids[role] = uid
                await db.users.insert_one(
                    {
                        "id": uid,
                        "email": em,
                        "password": pw_hash,
                        "full_name": name,
                        "role": role,
                        "created_at": now,
                    }
                )
            print(f"QA role user ready: {em} ({role})")

        # --- Job + interview-stage application (RBAC / offer-proposal E2E) ---
        job_doc = {
            "id": QA_SEED_JOB_ID,
            "title": "QA Seed — Software Engineer",
            "normalized_title": "software engineer",
            "description": "Baseline job for QA. Safe to delete or close.",
            "seniority": "MID",
            "domain": "Engineering",
            "location": "Remote",
            "work_mode": "remote",
            "status": "OPEN",
            "skills": [{"skill_name": "Python", "skill_type": "MUST_HAVE", "weight": 1.0}],
            "activities": [],
            "scoring_rubric": None,
            "created_by": admin_id,
            "seed_marker": SEED_MARKER,
            "hiring_team": {
                "hiring_manager_id": role_ids.get("hiring_manager"),
                "technical_manager_id": role_ids.get("technical_manager"),
                "project_manager_id": role_ids.get("project_manager"),
                "recruiter_id": admin_id,
            },
            "updated_at": now,
        }
        legacy = await db.jobs.find_one(
            {"seed_marker": SEED_MARKER, "id": {"$ne": QA_SEED_JOB_ID}},
            {"_id": 0, "id": 1},
        )
        if legacy:
            await db.applications.update_many(
                {"job_id": legacy["id"]},
                {"$set": {"job_id": QA_SEED_JOB_ID}},
            )
            await db.jobs.delete_one({"id": legacy["id"]})
        await db.jobs.update_one(
            {"id": QA_SEED_JOB_ID},
            {"$set": job_doc, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        print("Upserted QA seed job", QA_SEED_JOB_ID)

        cand_doc = {
            "id": QA_SEED_CAND_INTERVIEW_ID,
            "full_name": "QA Seed Interview Candidate",
            "email": "qa.seed.interview@aai-hrms.local",
            "headline": "Senior Python Engineer",
            "source": "MANUAL",
            "created_at": now,
            "updated_at": now,
        }
        await db.candidates.update_one({"id": QA_SEED_CAND_INTERVIEW_ID}, {"$set": cand_doc}, upsert=True)

        app_doc = {
            "id": QA_SEED_APP_INTERVIEW_ID,
            "job_id": QA_SEED_JOB_ID,
            "candidate_id": QA_SEED_CAND_INTERVIEW_ID,
            "stage": "INTERVIEW_1",
            "status": "ACTIVE",
            "updated_at": now,
        }
        await db.applications.update_one({"id": QA_SEED_APP_INTERVIEW_ID}, {"$set": app_doc}, upsert=True)
        await db.offer_stage_proposals.delete_many(
            {"application_id": QA_SEED_APP_INTERVIEW_ID, "status": "PENDING"}
        )
        print("Upserted QA interview application for offer-proposal E2E")

        await db[SEED_COLLECTION].update_one(
            {"version": SEED_VERSION},
            {
                "$set": {
                    "version": SEED_VERSION,
                    "applied_at": now,
                    "admin_email": email,
                    "seed_marker": SEED_MARKER,
                }
            },
            upsert=True,
        )
        print("QA baseline seed complete (version", SEED_VERSION, ").")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
