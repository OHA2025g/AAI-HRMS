#!/usr/bin/env python3
"""
Idempotent QA baseline data (M0-4).

Requires: MONGO_URL, DB_NAME (and optional SECRET_STORE like the API).

Creates / updates:
  - Admin user (login for QA)
  - One employee, one workforce skill, one OPEN job (marked with seed_marker)

Env:
  QA_SEED_ADMIN_EMAIL   (default: qa_admin@aai-hrms.local)
  QA_SEED_ADMIN_PASSWORD (default: QA_Seed_ChangeMe!)
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
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    from secrets_loader import apply_secret_store

    apply_secret_store()


SEED_VERSION = 1
SEED_MARKER = "qa_baseline_v1"
SEED_COLLECTION = "_qa_seed"


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME required", file=sys.stderr)
        return 1

    from motor.motor_asyncio import AsyncIOMotorClient

    email = (os.environ.get("QA_SEED_ADMIN_EMAIL") or "qa_admin@aai-hrms.local").strip().lower()
    password = os.environ.get("QA_SEED_ADMIN_PASSWORD") or "QA_Seed_ChangeMe!"
    force = os.environ.get("QA_SEED_FORCE", "").strip() in ("1", "true", "yes")

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        existing = await db[SEED_COLLECTION].find_one({"version": SEED_VERSION}, {"_id": 0})
        if existing and not force:
            print(f"QA seed v{SEED_VERSION} already applied. Set QA_SEED_FORCE=1 to re-run.")
            return 0

        now = datetime.now(timezone.utc).isoformat()

        # --- Admin user ---
        pw_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if user:
            admin_id = user["id"]
            await db.users.update_one(
                {"id": admin_id},
                {"$set": {"password": pw_hash, "role": "admin", "full_name": user.get("full_name") or "QA Admin"}},
            )
            print("Updated QA admin user:", email)
        else:
            admin_id = str(uuid.uuid4())
            await db.users.insert_one(
                {
                    "id": admin_id,
                    "email": email,
                    "password": pw_hash,
                    "full_name": "QA Admin",
                    "role": "admin",
                    "created_at": now,
                }
            )
            print("Created QA admin user:", email)

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

        # --- Job (no AI) ---
        if not await db.jobs.find_one({"seed_marker": SEED_MARKER}, {"_id": 0}):
            job_id = str(uuid.uuid4())
            await db.jobs.insert_one(
                {
                    "id": job_id,
                    "title": "QA Seed — Software Engineer",
                    "normalized_title": "software engineer",
                    "description": "Baseline job for QA. Safe to delete or close.",
                    "seniority": "MID",
                    "domain": "Engineering",
                    "location": "Remote",
                    "work_mode": "remote",
                    "status": "OPEN",
                    "skills": [
                        {"skill_name": "Python", "skill_type": "MUST_HAVE", "weight": 1.0},
                    ],
                    "activities": [],
                    "scoring_rubric": None,
                    "created_by": admin_id,
                    "created_at": now,
                    "seed_marker": SEED_MARKER,
                }
            )
            print("Created QA seed job", job_id)

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
