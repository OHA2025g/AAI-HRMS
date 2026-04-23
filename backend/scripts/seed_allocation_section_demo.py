#!/usr/bin/env python3
"""
Idempotent demo seed for Allocation Section (M10 staffing bridge).

Run after QA + LCD50 seeds so employees/projects exist.

Env: ALLOCATION_SECTION_SEED_FORCE=1 to re-run.
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
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


MARKER = "_allocation_section_seed"
VERSION = 1

from m10_allocation_section.constants import (  # noqa: E402
    COL_ACTIVITY_LOGS,
    COL_AI_INSIGHTS,
    COL_ALERTS,
    COL_BENCH_MATCHES,
    COL_CHANGES,
    COL_CONFLICTS,
    COL_DOCUMENTS,
    COL_FORECAST_SNAPSHOTS,
    COL_NOTES,
    COL_RELEASES,
    COL_ROLL_EVENTS,
    COL_STAFFING_REQUEST_HISTORY,
    COL_STAFFING_REQUESTS,
    COL_WORKFLOW_APPROVALS,
)


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME required", file=sys.stderr)
        return 1
    force = os.environ.get("ALLOCATION_SECTION_SEED_FORCE", "").strip() in ("1", "true", "yes")

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        existing = await db[MARKER].find_one({"version": VERSION}, {"_id": 0})
        if existing and not force:
            print("Allocation Section seed already applied. Set ALLOCATION_SECTION_SEED_FORCE=1 to re-run.")
            return 0

        if force:
            await db[MARKER].delete_many({"version": VERSION})
            # Optional: clear prior demo rows tagged
            await db.allocations.delete_many({"seed_marker": "allocation_section_demo"})
            for col in (
                COL_STAFFING_REQUESTS,
                COL_STAFFING_REQUEST_HISTORY,
                COL_CONFLICTS,
                COL_ROLL_EVENTS,
                COL_CHANGES,
                COL_RELEASES,
                COL_WORKFLOW_APPROVALS,
                COL_BENCH_MATCHES,
                COL_NOTES,
                COL_DOCUMENTS,
                COL_ALERTS,
                COL_ACTIVITY_LOGS,
                COL_AI_INSIGHTS,
            ):
                await db[col].delete_many({"seed_marker": "allocation_section_demo"})

        now = datetime.now(timezone.utc).isoformat()
        emps = await db.employees.find({"status": "ACTIVE"}, {"_id": 0}).limit(200).to_list(200)
        projs = await db.projects.find({}, {"_id": 0}).limit(80).to_list(80)
        if len(emps) < 3 or len(projs) < 1:
            print("Not enough employees/projects to seed allocations; skipping.")
            await db[MARKER].insert_one({"version": VERSION, "skipped": True, "at": now})
            return 0

        types = ["FULL_TIME", "PARTIAL", "BILLABLE", "SHADOW", "BUFFER", "TRAINING", "CLIENT", "INTERNAL"]
        statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "PENDING"]
        approval = ["APPROVED", "APPROVED", "PENDING"]

        alloc_docs = []
        k = 0
        for ei, emp in enumerate(emps):
            if len(alloc_docs) >= 80:
                break
            for slot in range(4):
                if len(alloc_docs) >= 80:
                    break
                proj = projs[(ei + slot) % len(projs)]
                aid = str(uuid.uuid4())
                pct = 25
                alloc_docs.append(
                    {
                        "id": aid,
                        "allocation_code": f"ALC-SEED-{k+1:04d}",
                        "project_id": proj["id"],
                        "employee_id": emp["id"],
                        "role": emp.get("role_title") or "Consultant",
                        "allocation_percentage": pct,
                        "start_date": "2026-01-01",
                        "end_date": "2026-12-31",
                        "billable": k % 4 != 0,
                        "allocation_type": types[k % len(types)],
                        "billing_category": "T&M" if k % 4 != 0 else "INTERNAL",
                        "status": statuses[k % len(statuses)],
                        "approval_status": approval[k % len(approval)],
                        "primary_project_flag": k % 5 == 0,
                        "shadow_flag": k % 11 == 0,
                        "backup_flag": k % 13 == 0,
                        "reserve_flag": k % 17 == 0,
                        "cost_rate": 40.0 + (k % 10),
                        "billing_rate": 85.0 + (k % 15),
                        "manager_id": emp.get("manager_id"),
                        "remarks": "Seeded allocation for Allocation Section demo",
                        "request_id": None,
                        "created_by": "seed",
                        "updated_by": None,
                        "created_at": now,
                        "updated_at": None,
                        "deleted_at": None,
                        "approved_by": "seed" if approval[k % len(approval)] == "APPROVED" else None,
                        "approved_at": now if approval[k % len(approval)] == "APPROVED" else None,
                        "rejection_reason": None,
                        "seed_marker": "allocation_section_demo",
                    }
                )
                k += 1
        if alloc_docs:
            await db.allocations.insert_many(alloc_docs)

        # Staffing requests
        req_rows = []
        for r in range(14):
            pid = projs[r % len(projs)]["id"]
            rid = str(uuid.uuid4())
            req_rows.append(
                {
                    "id": rid,
                    "project_id": pid,
                    "request_title": f"Staffing need {r+1}: Cloud engineer",
                    "request_type": "STAFFING",
                    "required_role": "Senior Engineer",
                    "required_skill": "AWS",
                    "skill_category": "Cloud",
                    "competency_level": "L3",
                    "experience_required": "5+ yrs",
                    "certification_required": None,
                    "location_required": "Hybrid",
                    "work_mode": "HYBRID",
                    "billable_flag": True,
                    "billing_type": "T&M",
                    "requested_count": 1 + (r % 3),
                    "needed_from_date": "2026-02-01",
                    "needed_till_date": "2026-11-30",
                    "urgency": ["low", "medium", "high"][r % 3],
                    "priority": ["P3", "P2", "P1"][r % 3],
                    "justification": "Pipeline ramp for delivery milestone",
                    "request_status": ["OPEN", "IN_PROGRESS", "FULFILLED", "OPEN"][r % 4],
                    "approval_status": "APPROVED" if r % 2 == 0 else "PENDING",
                    "requested_by": "seed",
                    "remarks": None,
                    "created_at": now,
                    "updated_at": now,
                    "seed_marker": "allocation_section_demo",
                }
            )
        if req_rows:
            await db[COL_STAFFING_REQUESTS].insert_many(req_rows)
            for rq in req_rows:
                await db[COL_STAFFING_REQUEST_HISTORY].insert_one(
                    {
                        "id": str(uuid.uuid4()),
                        "request_id": rq["id"],
                        "event": "seeded",
                        "actor_id": "seed",
                        "at": now,
                        "meta": {},
                        "seed_marker": "allocation_section_demo",
                    }
                )

        # Conflicts + roll + approvals + changes + releases + alerts + AI
        sample_alloc_ids = [a["id"] for a in alloc_docs[:25]]
        conflicts = []
        for i, aid in enumerate(sample_alloc_ids[:10]):
            conflicts.append(
                {
                    "id": str(uuid.uuid4()),
                    "allocation_id": aid,
                    "project_id": alloc_docs[i]["project_id"],
                    "resource_id": alloc_docs[i]["employee_id"],
                    "conflict_type": ["OVER_ALLOCATION", "DATE_OVERLAP", "ROLE_MISMATCH"][i % 3],
                    "severity": ["HIGH", "MEDIUM", "LOW"][i % 3],
                    "description": "Auto-detected staffing overlap in demo seed",
                    "detected_on": now,
                    "resolution_status": "OPEN" if i % 2 == 0 else "RESOLVED",
                    "resolved_by": None if i % 2 == 0 else "seed",
                    "resolved_on": None if i % 2 == 0 else now,
                    "override_flag": False,
                    "remarks": None,
                    "seed_marker": "allocation_section_demo",
                }
            )
        if conflicts:
            await db[COL_CONFLICTS].insert_many(conflicts)

        rolls = []
        for i, aid in enumerate(sample_alloc_ids[:18]):
            rolls.append(
                {
                    "id": str(uuid.uuid4()),
                    "allocation_id": aid,
                    "project_id": alloc_docs[i]["project_id"],
                    "resource_id": alloc_docs[i]["employee_id"],
                    "planned_rollon_date": "2026-01-15",
                    "actual_rollon_date": "2026-01-16" if i % 2 == 0 else None,
                    "planned_rolloff_date": "2026-10-31",
                    "actual_rolloff_date": None,
                    "extension_flag": i % 5 == 0,
                    "early_rolloff_flag": False,
                    "rolloff_reason": None,
                    "readiness_status": ["GREEN", "AMBER", "RED"][i % 3],
                    "replacement_required_flag": i % 4 == 0,
                    "seed_marker": "allocation_section_demo",
                }
            )
        if rolls:
            await db[COL_ROLL_EVENTS].insert_many(rolls)

        approvals = []
        for i in range(9):
            approvals.append(
                {
                    "id": str(uuid.uuid4()),
                    "request_type": ["ALLOCATION", "RELEASE", "COMMERCIAL"][i % 3],
                    "project_id": projs[i % len(projs)]["id"],
                    "resource_id": emps[i % len(emps)]["id"],
                    "allocation_id": sample_alloc_ids[i % len(sample_alloc_ids)],
                    "submitted_by": "seed",
                    "submitted_at": now,
                    "current_stage": ["MANAGER", "PMO", "FINANCE"][i % 3],
                    "status": "PENDING" if i % 3 != 2 else "APPROVED",
                    "title": f"Approval queue item {i+1}",
                    "seed_marker": "allocation_section_demo",
                }
            )
        if approvals:
            await db[COL_WORKFLOW_APPROVALS].insert_many(approvals)

        changes = []
        releases = []
        for i, aid in enumerate(sample_alloc_ids[:12]):
            changes.append(
                {
                    "id": str(uuid.uuid4()),
                    "allocation_id": aid,
                    "change_type": "PCT_CHANGE",
                    "old_value_json": {"allocation_percentage": 20},
                    "new_value_json": {"allocation_percentage": 40},
                    "requested_by": "seed",
                    "approved_by": "seed" if i % 2 == 0 else None,
                    "approval_status": "APPROVED" if i % 2 == 0 else "PENDING",
                    "reason": "Re-balance capacity",
                    "changed_on": now,
                    "seed_marker": "allocation_section_demo",
                }
            )
            releases.append(
                {
                    "id": str(uuid.uuid4()),
                    "allocation_id": aid,
                    "release_type": "PLANNED",
                    "release_date": "2026-12-15",
                    "release_reason": "Contract end",
                    "kt_status": "IN_PROGRESS",
                    "access_release_status": "PENDING",
                    "replacement_handover_status": "NOT_REQUIRED",
                    "approval_status": "PENDING",
                    "closed_on": None,
                    "seed_marker": "allocation_section_demo",
                }
            )
        if changes:
            await db[COL_CHANGES].insert_many(changes)
        if releases:
            await db[COL_RELEASES].insert_many(releases)

        bench = []
        for i in range(10):
            bench.append(
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": emps[i % len(emps)]["id"],
                    "project_id": projs[i % len(projs)]["id"],
                    "match_score": 60 + i,
                    "status": "SUGGESTED" if i % 2 == 0 else "CONVERTED",
                    "seed_marker": "allocation_section_demo",
                }
            )
        if bench:
            await db[COL_BENCH_MATCHES].insert_many(bench)

        notes_docs = []
        for i in range(8):
            notes_docs.append(
                {
                    "id": str(uuid.uuid4()),
                    "allocation_id": sample_alloc_ids[i % len(sample_alloc_ids)],
                    "project_id": None,
                    "body": f"Staffing note {i+1}: KT scheduled with SME.",
                    "note_type": "handover",
                    "created_by": "seed",
                    "created_at": now,
                    "seed_marker": "allocation_section_demo",
                }
            )
        if notes_docs:
            await db[COL_NOTES].insert_many(notes_docs)

        docs = []
        for i in range(5):
            docs.append(
                {
                    "id": str(uuid.uuid4()),
                    "allocation_id": sample_alloc_ids[i % len(sample_alloc_ids)],
                    "file_name": f"sow-attachment-{i+1}.pdf",
                    "mime_type": "application/pdf",
                    "storage_url": None,
                    "created_at": now,
                    "created_by": "seed",
                    "seed_marker": "allocation_section_demo",
                }
            )
        if docs:
            await db[COL_DOCUMENTS].insert_many(docs)

        alerts = []
        for i in range(16):
            alerts.append(
                {
                    "id": str(uuid.uuid4()),
                    "severity": ["info", "warning", "critical"][i % 3],
                    "title": ["Roll-off reminder", "Approval pending", "Conflict detected", "Bench opportunity"][i % 4],
                    "body": "Demo alert for Allocation Section",
                    "allocation_id": sample_alloc_ids[i % len(sample_alloc_ids)] if i % 2 == 0 else None,
                    "acknowledged": i % 5 == 0,
                    "created_at": now,
                    "seed_marker": "allocation_section_demo",
                }
            )
        if alerts:
            await db[COL_ALERTS].insert_many(alerts)

        ai_rows = []
        for i in range(12):
            ai_rows.append(
                {
                    "id": str(uuid.uuid4()),
                    "allocation_id": sample_alloc_ids[i % len(sample_alloc_ids)],
                    "project_id": None,
                    "resource_id": None,
                    "insight_type": ["BEST_FIT", "OVER_ALLOC_RISK", "ROLLOFF_RISK", "MARGIN"][i % 4],
                    "insight_payload": {
                        "summary": "Mock insight — replace with model output",
                        "signals": {"score": 0.72 + (i * 0.01)},
                    },
                    "score": 0.72 + (i * 0.01),
                    "generated_at": now,
                    "source_type": "MOCK_RULE_ENGINE",
                    "is_mock": True,
                    "seed_marker": "allocation_section_demo",
                }
            )
        if ai_rows:
            await db[COL_AI_INSIGHTS].insert_many(ai_rows)

        await db[COL_FORECAST_SNAPSHOTS].update_one(
            {"id": "latest"},
            {
                "$set": {
                    "horizon_months": 6,
                    "projected_utilization_pct": 81.2,
                    "capacity_gap_fte": 11.5,
                    "bench_fte_forecast": 7.4,
                    "hiring_trigger_fte": 3.2,
                    "scenarios": [{"name": "Base", "utilization_pct": 81.2}],
                    "updated_at": now,
                    "seed_marker": "allocation_section_demo",
                }
            },
            upsert=True,
        )

        await db[COL_ACTIVITY_LOGS].insert_one(
            {
                "id": str(uuid.uuid4()),
                "actor_id": "seed",
                "action": "seed_complete",
                "entity_type": "allocation_section",
                "entity_id": "batch",
                "payload": {"allocations": len(alloc_docs)},
                "created_at": now,
                "seed_marker": "allocation_section_demo",
            }
        )

        await db[MARKER].insert_one({"version": VERSION, "at": now, "allocations": len(alloc_docs)})
        print(f"Allocation Section seed OK ({len(alloc_docs)} allocations).")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
