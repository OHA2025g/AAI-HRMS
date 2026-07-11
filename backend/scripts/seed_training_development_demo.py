#!/usr/bin/env python3
"""Seed Training & Development (M12) demo — programs, batches, sessions, enrollments, analytics-ready records."""

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


MARKER = "td_training_dev_seed"
VERSION = 2

from training_development.constants import (  # noqa: E402
    COL_APPROVAL_REQUESTS,
    COL_ASSESSMENT_RESULTS,
    COL_ASSESSMENTS,
    COL_CATALOG_ITEMS,
    COL_EXTENDED_RECORDS,
    COL_TRAINING_ATTENDANCE,
    COL_TRAINING_BATCHES,
    COL_TRAINING_ENROLLMENTS,
    COL_TRAINING_PROGRAMS,
    COL_TRAINING_SESSIONS,
)


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME required", file=sys.stderr)
        return 1
    force = os.environ.get("TD_SEED_FORCE", "").strip() in ("1", "true", "yes")

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        existing = await db[MARKER].find_one({"version": VERSION}, {"_id": 0})
        if existing and not force:
            print("Training Development seed already applied. Set TD_SEED_FORCE=1 to re-run.")
            return 0

        if force:
            await db[MARKER].delete_many({"version": VERSION})
            for col in (
                COL_TRAINING_PROGRAMS,
                COL_TRAINING_BATCHES,
                COL_TRAINING_SESSIONS,
                COL_TRAINING_ENROLLMENTS,
                COL_TRAINING_ATTENDANCE,
                COL_CATALOG_ITEMS,
                COL_EXTENDED_RECORDS,
                COL_APPROVAL_REQUESTS,
                COL_ASSESSMENTS,
                COL_ASSESSMENT_RESULTS,
            ):
                await db[col].delete_many({"seed_marker": "td_m12_demo"})

        emps = await db.employees.find({"status": "ACTIVE"}, {"_id": 0, "id": 1, "department": 1}).limit(240).to_list(240)
        if len(emps) < 8:
            print("Not enough employees to seed training demo (need 8+).", file=sys.stderr)
            return 0

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        cats = ["TECHNICAL", "COMPLIANCE", "LEADERSHIP", "BEHAVIORAL", "ONBOARDING", "DOMAIN"]
        types = ["COURSE", "WORKSHOP", "WEBINAR", "E_LEARNING", "BLENDED"]
        modes = ["CLASSROOM", "VIRTUAL", "HYBRID", "SELF_PACED"]

        programs: list[dict] = []
        n_programs = 72
        for i in range(n_programs):
            tid = str(uuid.uuid4())
            code = f"TD-{i+1:04d}"
            programs.append(
                {
                    "id": tid,
                    "training_code": code,
                    "training_name": f"Program {i+1}: {cats[i % len(cats)]} excellence",
                    "training_category": cats[i % len(cats)],
                    "training_type": types[i % len(types)],
                    "level": ["L1", "L2", "L3", "ALL"][i % 4],
                    "delivery_mode": modes[i % len(modes)],
                    "duration_hours": float(4 + (i % 12) * 2),
                    "credits": float(0.5 + (i % 5)),
                    "description": "Seeded enterprise curriculum item for M12 dashboards.",
                    "objectives": "Close capability gaps; improve delivery quality.",
                    "learning_outcomes": "Demonstrate applied skills in role context.",
                    "target_audience": "IC and people managers",
                    "linked_skills": [["python", "sql"], ["leadership"], ["communication"]][i % 3],
                    "linked_roles": [["Engineer"], ["Manager"], ["Consultant"]][i % 3],
                    "compliance_flag": i % 7 == 0,
                    "certification_flag": i % 9 == 0,
                    "mandatory_flag": i % 11 == 0,
                    "active_flag": True,
                    "version": 1,
                    "status": "ACTIVE" if i % 5 else "DRAFT",
                    "created_by": "seed",
                    "updated_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "deleted_at": None,
                    "seed_marker": "td_m12_demo",
                }
            )

        await db[COL_TRAINING_PROGRAMS].insert_many(programs)

        batches: list[dict] = []
        sessions: list[dict] = []
        enrollments: list[dict] = []
        attendance: list[dict] = []
        assessments: list[dict] = []
        results: list[dict] = []

        for pi, p in enumerate(programs):
            if p["status"] != "ACTIVE":
                continue
            bid = str(uuid.uuid4())
            batches.append(
                {
                    "id": bid,
                    "training_id": p["id"],
                    "batch_code": f"{p['training_code']}-B1",
                    "batch_name": f"Batch 1 — {p['training_name'][:40]}",
                    "capacity": 24 + (pi % 8),
                    "status": "OPEN",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
            start = now + timedelta(days=3 + (pi % 20), hours=(pi % 5) * 2)
            end = start + timedelta(hours=float(p["duration_hours"]))
            sid = str(uuid.uuid4())
            sessions.append(
                {
                    "id": sid,
                    "training_id": p["id"],
                    "batch_id": bid,
                    "session_title": f"Session — {p['training_code']}",
                    "start_datetime": start.isoformat(),
                    "end_datetime": end.isoformat(),
                    "trainer_id": emps[pi % len(emps)]["id"],
                    "venue_or_link": "https://meet.example.com/td-session",
                    "delivery_mode": p["delivery_mode"],
                    "capacity": 24 + (pi % 8),
                    "session_status": "SCHEDULED" if pi % 3 else "CONFIRMED",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
            aid = str(uuid.uuid4())
            assessments.append(
                {
                    "id": aid,
                    "training_id": p["id"],
                    "assessment_type": "QUIZ",
                    "title": f"Knowledge check — {p['training_code']}",
                    "passing_marks": 60.0,
                    "max_marks": 100.0,
                    "grading_logic": "LINEAR",
                    "active_flag": True,
                    "seed_marker": "td_m12_demo",
                }
            )
            n_enr = 4 + (pi % 5)
            for j in range(n_enr):
                emp = emps[(pi + j) % len(emps)]
                eid = str(uuid.uuid4())
                st = ["ENROLLED", "COMPLETED", "IN_PROGRESS", "PENDING"][j % 4]
                appr = "APPROVED" if st != "PENDING" else "PENDING"
                meta = {"compliance": bool(p.get("compliance_flag"))}
                enrollments.append(
                    {
                        "id": eid,
                        "training_id": p["id"],
                        "batch_id": bid,
                        "employee_id": emp["id"],
                        "nomination_type": ["SELF", "MANAGER", "HR"][j % 3],
                        "enrollment_status": st,
                        "approval_status": appr,
                        "waitlist_flag": False,
                        "enrolled_on": (now - timedelta(days=j + 1)).isoformat(),
                        "cancelled_on": None,
                        "remarks": None,
                        "metadata": meta,
                        "created_by": "seed",
                        "created_at": now_iso,
                        "updated_at": now_iso,
                        "seed_marker": "td_m12_demo",
                    }
                )
                if st in ("ENROLLED", "COMPLETED", "IN_PROGRESS"):
                    attendance.append(
                        {
                            "id": str(uuid.uuid4()),
                            "session_id": sid,
                            "training_id": p["id"],
                            "employee_id": emp["id"],
                            "attendance_status": "PRESENT" if j % 4 else "ABSENT",
                            "join_time": start.isoformat(),
                            "exit_time": end.isoformat(),
                            "participation_score": float(60 + random.randint(0, 35)),
                            "remarks": None,
                            "seed_marker": "td_m12_demo",
                        }
                    )
                    results.append(
                        {
                            "id": str(uuid.uuid4()),
                            "assessment_id": aid,
                            "employee_id": emp["id"],
                            "training_id": p["id"],
                            "score": float(55 + random.randint(0, 40)),
                            "grade": "B",
                            "pass_flag": random.choice([True, True, False]),
                            "evaluated_on": now_iso,
                            "seed_marker": "td_m12_demo",
                        }
                    )

        await db[COL_TRAINING_BATCHES].insert_many(batches)
        await db[COL_TRAINING_SESSIONS].insert_many(sessions)
        for chunk_start in range(0, len(enrollments), 400):
            await db[COL_TRAINING_ENROLLMENTS].insert_many(enrollments[chunk_start : chunk_start + 400])
        for chunk_start in range(0, len(attendance), 500):
            await db[COL_TRAINING_ATTENDANCE].insert_many(attendance[chunk_start : chunk_start + 500])
        await db[COL_ASSESSMENTS].insert_many(assessments)
        for chunk_start in range(0, len(results), 500):
            await db[COL_ASSESSMENT_RESULTS].insert_many(results[chunk_start : chunk_start + 500])

        catalog = []
        for i in range(40):
            catalog.append(
                {
                    "id": str(uuid.uuid4()),
                    "training_id": programs[i % len(programs)]["id"] if i % 2 == 0 else None,
                    "catalog_type": ["INTERNAL", "EXTERNAL", "WEBINAR", "CERTIFICATION"][i % 4],
                    "title": f"Catalog item {i+1}",
                    "description": "Seeded catalog entry",
                    "skill_tags": ["python", "leadership", "delivery"][i % 3 : i % 3 + 1],
                    "role_tags": ["Engineer"],
                    "source_type": "INTERNAL",
                    "provider_name": "AAI Academy",
                    "duration_hours": float(2 + i % 6),
                    "mode": modes[i % len(modes)],
                    "mandatory_flag": i % 6 == 0,
                    "status": "ACTIVE",
                    "visibility": "ORG",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
        await db[COL_CATALOG_ITEMS].insert_many(catalog)

        ext = []
        for i in range(30):
            ext.append(
                {
                    "id": str(uuid.uuid4()),
                    "record_type": "training_need",
                    "title": f"Need #{i+1}",
                    "body": {"source": "manager", "skill": "python"},
                    "employee_id": emps[i % len(emps)]["id"],
                    "department_id": None,
                    "priority": ["LOW", "MEDIUM", "HIGH"][i % 3],
                    "status": "OPEN",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
        for i in range(25):
            ext.append(
                {
                    "id": str(uuid.uuid4()),
                    "record_type": "forecast",
                    "title": f"Forecast window Q{(i % 4) + 1}",
                    "body": {"period": f"2026-Q{(i % 4) + 1}", "load": 120 + i, "is_mock": True},
                    "employee_id": None,
                    "department_id": None,
                    "priority": "MEDIUM",
                    "status": "ACTIVE",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
        for i in range(40):
            ext.append(
                {
                    "id": str(uuid.uuid4()),
                    "record_type": "ai_learning_recommendation",
                    "title": f"AI recommendation {i+1}",
                    "body": {
                        "courses": [f"TD-{(i+j)%72+1:04d}" for j in range(2)],
                        "score": round(0.5 + random.random(), 3),
                        "is_mock": True,
                    },
                    "employee_id": emps[i % len(emps)]["id"],
                    "department_id": None,
                    "priority": "MEDIUM",
                    "status": "NEW",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
        for i in range(35):
            ext.append(
                {
                    "id": str(uuid.uuid4()),
                    "record_type": "ai_skill_gap_prediction",
                    "title": f"Predicted gap {i+1}",
                    "body": {"skills": ["kubernetes", "stakeholder_mgmt"], "severity": 0.2 + (i % 7) * 0.1, "is_mock": True},
                    "employee_id": emps[i % len(emps)]["id"],
                    "department_id": None,
                    "priority": "HIGH" if i % 5 == 0 else "MEDIUM",
                    "status": "OPEN",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
        ext.append(
            {
                "id": str(uuid.uuid4()),
                "record_type": "compliance_audit",
                "title": "Certification expiry sweep",
                "body": {"alert_type": "CERT_EXPIRING", "count": 4},
                "employee_id": None,
                "department_id": None,
                "priority": "HIGH",
                "status": "OPEN",
                "created_by": "seed",
                "created_at": now_iso,
                "updated_at": now_iso,
                "seed_marker": "td_m12_demo",
            }
        )
        for i in range(20):
            ext.append(
                {
                    "id": str(uuid.uuid4()),
                    "record_type": "budget_line",
                    "title": f"Budget FY line {i+1}",
                    "body": {"allocated": 50_000 + i * 1000, "spent": 20_000 + i * 800},
                    "employee_id": None,
                    "department_id": None,
                    "priority": "MEDIUM",
                    "status": "ACTIVE",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
        for p in programs[:15]:
            ext.append(
                {
                    "id": str(uuid.uuid4()),
                    "record_type": "feedback",
                    "title": f"Feedback — {p['training_code']}",
                    "body": {"training_id": p["id"], "rating": 4 + (hash(p["id"]) % 2), "comments": "Seeded learner feedback."},
                    "employee_id": emps[0]["id"],
                    "department_id": None,
                    "priority": "LOW",
                    "status": "SUBMITTED",
                    "created_by": "seed",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "seed_marker": "td_m12_demo",
                }
            )
        await db[COL_EXTENDED_RECORDS].insert_many(ext)

        apprs = []
        for i in range(12):
            apprs.append(
                {
                    "id": str(uuid.uuid4()),
                    "request_type": "NOMINATION",
                    "training_id": programs[i % len(programs)]["id"],
                    "employee_id": emps[i % len(emps)]["id"],
                    "submitted_by": emps[(i + 1) % len(emps)]["id"],
                    "submitted_at": now_iso,
                    "current_stage": "L1",
                    "status": "PENDING" if i % 3 == 0 else "APPROVED",
                    "seed_marker": "td_m12_demo",
                }
            )
        await db[COL_APPROVAL_REQUESTS].insert_many(apprs)

        await db[MARKER].insert_one({"version": VERSION, "seeded_at": now_iso, "programs": n_programs})
        print(f"M12 Training Development seed OK ({n_programs} programs, enrollments/attendance/results generated).")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
