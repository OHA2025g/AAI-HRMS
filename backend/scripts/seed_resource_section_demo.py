#!/usr/bin/env python3
"""Idempotent Resource Section demo seed (M11). Run after employees exist."""

from __future__ import annotations

import asyncio
import os
import random
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    try:
        from secrets_loader import apply_secret_store

        apply_secret_store()
    except Exception:
        pass


MARKER = "_resource_section_seed"
VERSION = 1

from m11_resource_section.constants import (  # noqa: E402
    COL_ACTIVITY,
    COL_AI_INSIGHTS,
    COL_APPROVALS,
    COL_ATTENDANCE_IMPACT,
    COL_AVAILABILITY,
    COL_BENCH_RECORDS,
    COL_CAREER,
    COL_CERTIFICATIONS,
    COL_CLASSIFICATIONS,
    COL_COMPLIANCE,
    COL_COST_PROFILES,
    COL_DEMAND_MATCHES,
    COL_DOCUMENTS,
    COL_FORECASTS,
    COL_LEARNING,
    COL_MOBILITY,
    COL_NOTES,
    COL_PROFILES,
    COL_READINESS,
    COL_SKILL_RECORDS,
    COL_UTIL_SNAPSHOTS,
)


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME required", file=sys.stderr)
        return 1
    force = os.environ.get("RESOURCE_SECTION_SEED_FORCE", "").strip() in ("1", "true", "yes")

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        existing = await db[MARKER].find_one({"version": VERSION}, {"_id": 0})
        if existing and not force:
            print("Resource Section seed already applied. Set RESOURCE_SECTION_SEED_FORCE=1 to re-run.")
            return 0

        if force:
            await db[MARKER].delete_many({"version": VERSION})
            for col in (
                COL_PROFILES,
                COL_CLASSIFICATIONS,
                COL_SKILL_RECORDS,
                COL_AVAILABILITY,
                COL_UTIL_SNAPSHOTS,
                COL_BENCH_RECORDS,
                COL_READINESS,
                COL_DEMAND_MATCHES,
                COL_MOBILITY,
                COL_CAREER,
                COL_LEARNING,
                COL_CERTIFICATIONS,
                COL_COST_PROFILES,
                COL_ATTENDANCE_IMPACT,
                COL_DOCUMENTS,
                COL_COMPLIANCE,
                COL_NOTES,
                COL_ACTIVITY,
                COL_APPROVALS,
                COL_FORECASTS,
                COL_AI_INSIGHTS,
            ):
                await db[col].delete_many({"seed_marker": "resource_section_demo"})

        now = datetime.now(timezone.utc).isoformat()
        emps = await db.employees.find({"status": "ACTIVE"}, {"_id": 0}).limit(220).to_list(220)
        if len(emps) < 5:
            print("Not enough employees; skipping Resource Section seed.")
            await db[MARKER].insert_one({"version": VERSION, "skipped": True, "at": now})
            return 0

        skills_pool = ["Python", "Java", "React", "AWS", "Kubernetes", "SQL", "Security", "Data", "PM", "Salesforce"]
        tags_pool = ["BILLABLE", "TECHNICAL", "HIGH_POTENTIAL", "BENCH_POOL", "CLIENT_READY", "LEADERSHIP_PIPELINE"]

        for i, e in enumerate(emps):
            rid = e["id"]
            prof = {
                "resource_id": rid,
                "employment_type": random.choice(["PERMANENT", "CONTRACT", "CONSULTANT"]),
                "resource_category": random.choice(["TECHNICAL", "FUNCTIONAL", "MANAGERIAL"]),
                "sub_department": e.get("department", "Core") + " Sub",
                "designation": e.get("role_title", "Consultant"),
                "grade": f"G{5 + (i % 5)}",
                "band": f"B{(i % 4) + 1}",
                "geography": random.choice(["IN", "US", "EU", "APAC"]),
                "work_mode": random.choice(["ONSITE", "HYBRID", "REMOTE"]),
                "cost_center": f"CC-{(i % 20) + 1000}",
                "profile_summary": "Demo profile overlay for Resource Section.",
                "billable_classification": random.choice(["BILLABLE", "NON_BILLABLE", "MIXED"]),
                "current_primary_skill": (e.get("skills") or ["General"])[0],
                "current_secondary_skills": list(e.get("skills") or [])[:4],
                "updated_at": now,
                "updated_by": "seed",
                "seed_marker": "resource_section_demo",
            }
            await db[COL_PROFILES].update_one({"resource_id": rid}, {"$set": prof}, upsert=True)

            if i % 4 == 0:
                await db[COL_CLASSIFICATIONS].insert_one(
                    {
                        "id": str(uuid.uuid4()),
                        "resource_id": rid,
                        "tag": random.choice(tags_pool),
                        "created_at": now,
                        "created_by": "seed",
                        "seed_marker": "resource_section_demo",
                    }
                )

            for s in range(2):
                await db[COL_SKILL_RECORDS].insert_one(
                    {
                        "id": str(uuid.uuid4()),
                        "resource_id": rid,
                        "skill_name": random.choice(skills_pool),
                        "skill_category": "TECH",
                        "skill_type": "PRIMARY" if s == 0 else "SECONDARY",
                        "competency_level": f"L{2 + (i % 3)}",
                        "proficiency_level": random.choice(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
                        "experience_years": float(1 + (i % 12)),
                        "verified_flag": i % 3 == 0,
                        "created_at": now,
                        "created_by": "seed",
                        "seed_marker": "resource_section_demo",
                    }
                )

            await db[COL_AVAILABILITY].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "current_availability_percent": max(5, 100 - (i % 5) * 15),
                    "available_from_date": "2026-01-01",
                    "occupied_till_date": None,
                    "tentative_flag": i % 7 == 0,
                    "deployable_capacity": 0.5 + (i % 4) * 0.25,
                    "current_status": "AVAILABLE" if i % 6 != 0 else "LIMITED",
                    "override_flag": False,
                    "updated_on": now,
                    "seed_marker": "resource_section_demo",
                }
            )

            await db[COL_UTIL_SNAPSHOTS].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "snapshot_period": "2026-Q1",
                    "overall_utilization": 60 + (i % 40),
                    "billable_utilization": 40 + (i % 35),
                    "non_billable_utilization": 10 + (i % 15),
                    "training_utilization": 5,
                    "shadow_utilization": 2,
                    "admin_utilization": 3,
                    "internal_project_utilization": 8,
                    "client_project_utilization": 35 + (i % 20),
                    "over_utilized_flag": i % 17 == 0,
                    "under_utilized_flag": i % 19 == 0,
                    "seed_marker": "resource_section_demo",
                }
            )

            if i % 9 == 0:
                await db[COL_BENCH_RECORDS].insert_one(
                    {
                        "id": str(uuid.uuid4()),
                        "resource_id": rid,
                        "bench_start_date": "2026-01-10",
                        "bench_end_date": None,
                        "bench_age_days": 20 + (i % 40),
                        "bench_category": "SKILL_GAP",
                        "ready_to_deploy_flag": i % 2 == 0,
                        "bench_cost": 4500 + (i % 10) * 200,
                        "redeployment_status": "IN_PROGRESS",
                        "risk_level": random.choice(["LOW", "MEDIUM", "HIGH"]),
                        "remarks": "Demo bench",
                        "seed_marker": "resource_section_demo",
                    }
                )

            await db[COL_READINESS].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "deployment_readiness_score": 55 + (i % 40),
                    "role_readiness": 60 + (i % 30),
                    "skill_readiness": 58 + (i % 35),
                    "certification_readiness": 50 + (i % 40),
                    "experience_suitability": 62,
                    "project_fitment": 57,
                    "availability_fitment": 70,
                    "client_readiness": 52,
                    "location_readiness": 80,
                    "work_mode_readiness": 75,
                    "backup_readiness": 40,
                    "successor_readiness": 35,
                    "calculated_on": now,
                    "seed_marker": "resource_section_demo",
                }
            )

            await db[COL_DEMAND_MATCHES].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "demand_id": f"demand-demo-{i % 30}",
                    "project_demand_id": None,
                    "fit_score": 50 + (i % 45),
                    "skill_score": 55 + (i % 40),
                    "experience_score": 48 + (i % 35),
                    "availability_score": 60,
                    "location_score": 70,
                    "certification_score": 45,
                    "eligibility_score": 58,
                    "recommendation_rank": 1 + (i % 5),
                    "match_status": "OPEN" if i % 4 == 0 else "SHORTLISTED",
                    "generated_on": now,
                    "seed_marker": "resource_section_demo",
                }
            )

            await db[COL_MOBILITY].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "event_type": random.choice(["TRANSFER", "ROLE_CHANGE", "LOCATION_CHANGE"]),
                    "event_date": "2025-08-15",
                    "from_value": "Dept-A",
                    "to_value": "Dept-B",
                    "approved_flag": True,
                    "seed_marker": "resource_section_demo",
                }
            )

            await db[COL_CAREER].update_one(
                {"resource_id": rid},
                {
                    "$set": {
                        "resource_id": rid,
                        "mobility_preference": random.choice(["STAY", "OPEN", "GLOBAL"]),
                        "career_aspiration": "Principal / Lead track",
                        "leadership_track": i % 11 == 0,
                        "seed_marker": "resource_section_demo",
                    }
                },
                upsert=True,
            )

            await db[COL_LEARNING].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "program_name": "Cloud foundations",
                    "status": random.choice(["COMPLETED", "IN_PROGRESS", "PLANNED"]),
                    "hours": 8 + (i % 16),
                    "completed_on": now if i % 2 == 0 else None,
                    "seed_marker": "resource_section_demo",
                }
            )

            await db[COL_CERTIFICATIONS].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "certification_name": random.choice(["AWS SAA", "PMP", "Scrum Master", "CKA"]),
                    "issuing_body": "Demo Body",
                    "issue_date": "2024-06-01",
                    "expiry_date": "2027-06-01" if i % 3 else "2026-05-01",
                    "mandatory_flag": i % 5 == 0,
                    "status": "ACTIVE",
                    "document_link": None,
                    "seed_marker": "resource_section_demo",
                }
            )

            await db[COL_COST_PROFILES].update_one(
                {"resource_id": rid},
                {
                    "$set": {
                        "resource_id": rid,
                        "internal_cost_rate": 42.0 + (i % 10),
                        "billing_rate": 95.0 + (i % 15),
                        "margin_contribution_pct": 32.0,
                        "cost_category": "STANDARD",
                        "seed_marker": "resource_section_demo",
                    }
                },
                upsert=True,
            )

            await db[COL_ATTENDANCE_IMPACT].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "period": "2026-03",
                    "attendance_pct": 92 + (i % 7),
                    "planned_leave_days": i % 5,
                    "unplanned_leave_days": 0 if i % 8 else 1,
                    "availability_adjustment_pct": -1 * (i % 3),
                    "seed_marker": "resource_section_demo",
                }
            )

            await db[COL_DOCUMENTS].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "document_category": "RESUME",
                    "title": "CV",
                    "file_name": f"cv-{rid[:8]}.pdf",
                    "file_url": None,
                    "expiry_date": None,
                    "compliance_status": "OK",
                    "visibility": "INTERNAL",
                    "uploaded_by": "seed",
                    "uploaded_at": now,
                    "seed_marker": "resource_section_demo",
                }
            )

            await db[COL_COMPLIANCE].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "checklist_item": "NDA on file",
                    "status": "COMPLETE" if i % 4 else "PENDING",
                    "due_date": None,
                    "seed_marker": "resource_section_demo",
                }
            )

            if i % 6 == 0:
                await db[COL_NOTES].insert_one(
                    {
                        "id": str(uuid.uuid4()),
                        "resource_id": rid,
                        "note_type": "HR",
                        "title": "Check-in",
                        "content": "Demo HR note for deployability review.",
                        "is_pinned": False,
                        "created_by": "seed",
                        "created_at": now,
                        "visibility_scope": "INTERNAL",
                        "seed_marker": "resource_section_demo",
                    }
                )

            await db[COL_ACTIVITY].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "action": "profile_sync",
                    "actor_id": "seed",
                    "payload": {"i": i},
                    "created_at": now,
                    "seed_marker": "resource_section_demo",
                }
            )

            if i % 10 == 0:
                await db[COL_APPROVALS].insert_one(
                    {
                        "id": str(uuid.uuid4()),
                        "resource_id": rid,
                        "approval_type": "SKILL_VALIDATION",
                        "submitted_by": "seed",
                        "submitted_on": now,
                        "current_stage": "MANAGER",
                        "status": "PENDING",
                        "approver_id": None,
                        "decision": None,
                        "decision_reason": None,
                        "acted_at": None,
                        "seed_marker": "resource_section_demo",
                    }
                )

            await db[COL_AI_INSIGHTS].insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "resource_id": rid,
                    "insight_type": random.choice(["BENCH_RISK", "UPSKILL", "BEST_PROJECT_FIT", "ATTRITION_HINT"]),
                    "insight_payload": {"summary": "Mock AI insight", "confidence": 0.74},
                    "score": 0.7 + (i % 10) * 0.02,
                    "generated_at": now,
                    "source_type": "MOCK",
                    "is_mock": True,
                    "seed_marker": "resource_section_demo",
                }
            )

        await db[COL_FORECASTS].update_one(
            {"id": "latest"},
            {
                "$set": {
                    "id": "latest",
                    "horizon_months": 6,
                    "bench_fte_forecast": 16.5,
                    "capacity_gap_fte": 11.0,
                    "hiring_need_fte": 6.0,
                    "skill_hotspots": ["cloud", "security", "data"],
                    "scenarios": [{"name": "Base", "supply_gap_fte": 11.0}],
                    "updated_at": now,
                    "seed_marker": "resource_section_demo",
                }
            },
            upsert=True,
        )

        await db[MARKER].insert_one({"version": VERSION, "at": now, "employees_seeded": len(emps)})
        print(f"Resource Section seed OK ({len(emps)} employees enriched).")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
