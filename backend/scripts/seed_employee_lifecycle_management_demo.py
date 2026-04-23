#!/usr/bin/env python3
"""
Seed Employee Lifecycle Management (M14) demo data.

Creates an additional cohort of employees (optional) and populates ELM collections so the
/employee-lifecycle-management UI has data on first boot.

Env:
  ELM_SEED_FORCE=1         delete ELM_DEMO rows then re-seed
  ELM_EMPLOYEE_COUNT=220   number of demo employees to create (default 220)
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from random import Random

from pymongo import MongoClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from m14_employee_lifecycle_management.constants import (  # noqa: E402
    COL_ACCESS_PROVISIONING,
    COL_AI_INSIGHTS,
    COL_APPROVAL_REQUESTS,
    COL_BGV,
    COL_CLEARANCE,
    COL_EMPLOYEE_DOCUMENTS,
    COL_FORECASTS,
    COL_LIFECYCLE_NOTES,
    COL_NOTICE,
    COL_ONBOARDING,
    COL_PAYROLL_LINKAGE,
    COL_POLICY_CONSENTS,
    COL_PREBOARDING,
    COL_PROBATION,
    COL_RESIGNATION,
    COL_RETENTION_SIGNALS,
)


SEED_MARKER = "ELM_M14_DEMO"
EMP_PREFIX = "ELM220"
FIRST = ("Aarav", "Priya", "Jordan", "Sofia", "Wei", "Emma", "Lucas", "Maya", "Diego", "Yuki", "Noah", "Aisha", "Ethan", "Zara", "Arjun", "Chloe")
LAST = ("Patel", "Garcia", "Nguyen", "Khan", "Silva", "Brown", "Lee", "Singh", "Martinez", "Chen", "Wilson", "Kumar")
DEPTS = ("Engineering", "HR", "Finance", "Sales", "Operations", "Product", "Customer Success")
LOCATIONS = ("Remote", "Bengaluru", "Hyderabad", "Mumbai", "London", "New York", "Singapore")


def _load_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(BACKEND_DIR / ".env")
    except Exception:
        pass
    try:
        from secrets_loader import apply_secret_store

        apply_secret_store()
    except Exception:
        pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _employee_code(i: int) -> str:
    return f"{EMP_PREFIX}-{i:03d}"


def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "aai_hrms")
    force = os.environ.get("ELM_SEED_FORCE", "0").strip() in ("1", "true", "yes")
    n = int(os.environ.get("ELM_EMPLOYEE_COUNT", "220"))
    n = max(0, min(n, 500))

    rng = Random(14)
    client = MongoClient(mongo_url)
    db = client[db_name]

    if force:
        db.employees.delete_many({"seed_marker": SEED_MARKER})
        for col in (
            COL_PREBOARDING,
            COL_ONBOARDING,
            COL_PROBATION,
            COL_EMPLOYEE_DOCUMENTS,
            COL_BGV,
            COL_POLICY_CONSENTS,
            COL_ACCESS_PROVISIONING,
            COL_PAYROLL_LINKAGE,
            COL_APPROVAL_REQUESTS,
            COL_RETENTION_SIGNALS,
            COL_RESIGNATION,
            COL_NOTICE,
            COL_CLEARANCE,
            COL_LIFECYCLE_NOTES,
            COL_FORECASTS,
            COL_AI_INSIGHTS,
        ):
            db[col].delete_many({"seed_marker": SEED_MARKER})

    existing = db.employees.count_documents({"seed_marker": SEED_MARKER})
    if existing == 0 and n > 0:
        now = _now()
        docs = []
        for i in range(1, n + 1):
            fn = rng.choice(FIRST)
            ln = rng.choice(LAST)
            dept = rng.choice(DEPTS)
            loc = rng.choice(LOCATIONS)
            join = (now - timedelta(days=14 + (i * 9) % 1600)).date().isoformat()
            code = _employee_code(i)
            docs.append(
                {
                    "id": str(uuid.uuid4()),
                    "employee_code": code,
                    "first_name": fn,
                    "last_name": ln,
                    "full_name": f"{fn} {ln}",
                    "official_email": f"{code.lower()}@demo.company",
                    "department": dept,
                    "business_unit": "Enterprise",
                    "designation": "Associate" if i % 4 else "Senior Associate",
                    "role_title": "IC",
                    "grade": "G" + str(3 + (i % 4)),
                    "band": "B" + str(1 + (i % 3)),
                    "location": loc,
                    "work_mode": rng.choice(("Remote", "Hybrid", "Onsite")),
                    "joining_date": join,
                    "status": rng.choice(("ACTIVE", "ONBOARDING", "INACTIVE")),
                    "skills": rng.sample(("Python", "React", "SQL", "Communication", "Leadership", "MongoDB", "AWS"), k=3),
                    "created_at": _iso(now),
                    "updated_at": _iso(now),
                    "seed_marker": SEED_MARKER,
                }
            )
        if docs:
            db.employees.insert_many(docs, ordered=False)

    # Fetch demo + LCD50 employees to populate workflow records
    employee_ids = [e["id"] for e in db.employees.find({"seed_marker": {"$in": [SEED_MARKER, "lcd50_seed"]}}, {"_id": 0, "id": 1}).limit(1000)]
    if not employee_ids:
        employee_ids = [e["id"] for e in db.employees.find({}, {"_id": 0, "id": 1}).limit(200)]

    now = _now()

    def insert_many(col: str, rows: list[dict]):
        if not rows:
            return
        for r in rows:
            r.setdefault("seed_marker", SEED_MARKER)
        db[col].insert_many(rows, ordered=False)

    # Only seed once per collection unless force requested
    if db[COL_PREBOARDING].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_PREBOARDING,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "offer_accepted_on": (now - timedelta(days=rng.randint(5, 60))).date().isoformat(),
                    "joining_date_confirmed": (now + timedelta(days=rng.randint(3, 30))).date().isoformat(),
                    "preboarding_status": rng.choice(("OPEN", "IN_PROGRESS", "COMPLETED")),
                    "checklist_payload": {"docs_collected": rng.choice([True, False]), "welcome_kit": rng.choice(["PENDING", "READY"])},
                    "communication_status": rng.choice(("PENDING", "SENT", "ACK")),
                    "asset_readiness_flag": rng.choice([True, False]),
                    "created_at": _iso(now),
                    "updated_at": _iso(now),
                }
                for eid in employee_ids[: min(200, len(employee_ids))]
            ],
        )

    if db[COL_ONBOARDING].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_ONBOARDING,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "onboarding_start_date": (now - timedelta(days=rng.randint(1, 45))).date().isoformat(),
                    "onboarding_end_date": None,
                    "onboarding_status": rng.choice(("IN_PROGRESS", "COMPLETED", "PENDING")),
                    "hr_induction_status": rng.choice(("PENDING", "DONE")),
                    "department_induction_status": rng.choice(("PENDING", "DONE")),
                    "role_onboarding_status": rng.choice(("PENDING", "DONE")),
                    "policy_ack_status": rng.choice(("PENDING", "DONE")),
                    "access_status": rng.choice(("PENDING", "DONE")),
                    "asset_status": rng.choice(("PENDING", "DONE")),
                    "checklist_payload": {"it_access": rng.choice(["PENDING", "DONE"]), "buddy_assigned": True},
                    "created_at": _iso(now),
                    "updated_at": _iso(now),
                }
                for eid in employee_ids[: min(220, len(employee_ids))]
            ],
        )

    if db[COL_PROBATION].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_PROBATION,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "probation_start_date": (now - timedelta(days=rng.randint(30, 180))).date().isoformat(),
                    "probation_end_date": (now + timedelta(days=rng.randint(15, 120))).date().isoformat(),
                    "review_date": (now + timedelta(days=rng.randint(5, 40))).date().isoformat(),
                    "probation_status": rng.choice(("IN_PROGRESS", "EXTENDED", "COMPLETED")),
                    "extension_flag": False,
                    "created_at": _iso(now),
                    "updated_at": _iso(now),
                }
                for eid in employee_ids[: min(180, len(employee_ids))]
            ],
        )

    if db[COL_EMPLOYEE_DOCUMENTS].count_documents({"seed_marker": SEED_MARKER}) == 0:
        rows = []
        for eid in employee_ids[: min(240, len(employee_ids))]:
            for _ in range(2):
                rows.append(
                    {
                        "id": str(uuid.uuid4()),
                        "employee_id": eid,
                        "document_category": rng.choice(("ID", "ADDRESS", "EDUCATION", "EXPERIENCE")),
                        "title": rng.choice(("Aadhaar", "Passport", "Degree", "Relieving Letter")),
                        "file_name": "demo.pdf",
                        "file_url_or_storage_key": "s3://demo/placeholder",
                        "expiry_date": None,
                        "verification_status": rng.choice(("PENDING", "VERIFIED", "REVIEW")),
                        "visibility": "HR",
                        "uploaded_by": "seed",
                        "uploaded_at": (now - timedelta(days=rng.randint(0, 180))).date().isoformat(),
                    }
                )
        insert_many(COL_EMPLOYEE_DOCUMENTS, rows)

    if db[COL_BGV].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_BGV,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "bgv_vendor": rng.choice(("AuthBridge", "SpringVerify", "Internal")),
                    "identity_status": rng.choice(("PENDING", "VERIFIED")),
                    "education_status": rng.choice(("PENDING", "VERIFIED")),
                    "employment_status_check": rng.choice(("PENDING", "VERIFIED")),
                    "address_status": rng.choice(("PENDING", "VERIFIED")),
                    "criminal_check_status": rng.choice(("PENDING", "VERIFIED")),
                    "bgv_overall_status": rng.choice(("PENDING", "IN_PROGRESS", "COMPLETED")),
                    "risk_flag": rng.choice([True, False]),
                    "completed_on": (now - timedelta(days=rng.randint(0, 120))).date().isoformat(),
                }
                for eid in employee_ids[: min(160, len(employee_ids))]
            ],
        )

    if db[COL_POLICY_CONSENTS].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_POLICY_CONSENTS,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "policy_type": rng.choice(("CODE_OF_CONDUCT", "PRIVACY", "REMOTE_WORK", "ASSET_USAGE")),
                    "accepted_flag": rng.choice([True, False]),
                    "accepted_on": (now - timedelta(days=rng.randint(0, 365))).date().isoformat(),
                    "renewal_due_date": (now + timedelta(days=rng.randint(30, 365))).date().isoformat(),
                    "exception_flag": False,
                    "remarks": None,
                }
                for eid in employee_ids[: min(260, len(employee_ids))]
            ],
        )

    if db[COL_ACCESS_PROVISIONING].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_ACCESS_PROVISIONING,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "email_provisioned_flag": rng.choice([True, False]),
                    "id_card_issued_flag": rng.choice([True, False]),
                    "system_access_payload": {"vpn": rng.choice(["PENDING", "DONE"]), "hrms": "DONE"},
                    "device_allocated_flag": rng.choice([True, False]),
                    "provisioning_status": rng.choice(("PENDING", "IN_PROGRESS", "COMPLETED")),
                    "completed_on": (now - timedelta(days=rng.randint(0, 40))).date().isoformat(),
                    "remarks": None,
                }
                for eid in employee_ids[: min(220, len(employee_ids))]
            ],
        )

    if db[COL_PAYROLL_LINKAGE].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_PAYROLL_LINKAGE,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "payroll_enrolled_flag": True,
                    "bank_setup_flag": rng.choice([True, False]),
                    "tax_declared_flag": rng.choice([True, False]),
                    "statutory_setup_flag": rng.choice([True, False]),
                    "benefits_enrolled_flag": rng.choice([True, False]),
                    "payroll_readiness_status": rng.choice(("READY", "PENDING")),
                    "updated_on": (now - timedelta(days=rng.randint(0, 30))).date().isoformat(),
                }
                for eid in employee_ids[: min(260, len(employee_ids))]
            ],
        )

    if db[COL_APPROVAL_REQUESTS].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_APPROVAL_REQUESTS,
            [
                {
                    "id": str(uuid.uuid4()),
                    "request_type": rng.choice(("JOINING_APPROVAL", "CONFIRMATION_APPROVAL", "DOCUMENT_APPROVAL")),
                    "employee_id": eid,
                    "submitted_by": "seed",
                    "submitted_at": (now - timedelta(days=rng.randint(0, 20))).date().isoformat(),
                    "current_stage": rng.choice(("HR", "MANAGER", "FINANCE")),
                    "status": rng.choice(("PENDING", "APPROVED", "REJECTED")),
                }
                for eid in employee_ids[: min(140, len(employee_ids))]
            ],
        )

    if db[COL_RETENTION_SIGNALS].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_RETENTION_SIGNALS,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "signal_type": rng.choice(("BURNOUT", "ENGAGEMENT_DROP", "PROMOTION_DELAY", "COMP_RISK")),
                    "signal_value": rng.randint(1, 100),
                    "severity": rng.choice(("LOW", "MEDIUM", "HIGH", "CRITICAL")),
                    "detected_on": (now - timedelta(days=rng.randint(0, 45))).date().isoformat(),
                    "resolved_flag": rng.choice([True, False]),
                    "resolution_notes": None,
                }
                for eid in employee_ids[: min(220, len(employee_ids))]
            ],
        )

    if db[COL_RESIGNATION].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_RESIGNATION,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "resignation_submitted_on": (now - timedelta(days=rng.randint(0, 30))).date().isoformat(),
                    "last_working_day": (now + timedelta(days=rng.randint(15, 75))).date().isoformat(),
                    "reason_primary": rng.choice(("CAREER_GROWTH", "COMPENSATION", "RELOCATION", "OTHER")),
                    "reason_secondary": None,
                    "approval_status": rng.choice(("PENDING", "APPROVED")),
                    "withdrawal_flag": False,
                    "exit_status": rng.choice(("IN_PROGRESS", "COMPLETED")),
                    "created_at": _iso(now),
                    "updated_at": _iso(now),
                }
                for eid in employee_ids[: min(35, len(employee_ids))]
            ],
        )

    if db[COL_NOTICE].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_NOTICE,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "notice_start_date": (now - timedelta(days=rng.randint(0, 10))).date().isoformat(),
                    "notice_end_date": (now + timedelta(days=rng.randint(20, 90))).date().isoformat(),
                    "early_release_flag": False,
                    "buyout_flag": False,
                    "leave_during_notice_flag": rng.choice([True, False]),
                    "handover_status": rng.choice(("PENDING", "IN_PROGRESS", "COMPLETED")),
                    "notice_status": rng.choice(("IN_PROGRESS", "COMPLETED")),
                }
                for eid in employee_ids[: min(30, len(employee_ids))]
            ],
        )

    if db[COL_CLEARANCE].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_CLEARANCE,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "hr_clearance": rng.choice(("PENDING", "DONE")),
                    "finance_clearance": rng.choice(("PENDING", "DONE")),
                    "it_clearance": rng.choice(("PENDING", "DONE")),
                    "admin_clearance": rng.choice(("PENDING", "DONE")),
                    "training_clearance": rng.choice(("PENDING", "DONE")),
                    "legal_clearance": rng.choice(("PENDING", "DONE")),
                    "final_exit_approval": rng.choice(("PENDING", "APPROVED")),
                    "closed_on": None,
                }
                for eid in employee_ids[: min(30, len(employee_ids))]
            ],
        )

    if db[COL_LIFECYCLE_NOTES].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_LIFECYCLE_NOTES,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id": eid,
                    "note_type": rng.choice(("HR_NOTE", "MANAGER_NOTE", "COMPLIANCE_NOTE")),
                    "title": rng.choice(("Check-in", "Policy exception", "Onboarding follow-up")),
                    "body": {"text": "Demo note"},
                    "status": rng.choice(("OPEN", "COMPLETED")),
                    "created_at": _iso(now),
                    "updated_at": _iso(now),
                    "created_by": "seed",
                }
                for eid in employee_ids[: min(180, len(employee_ids))]
            ],
        )

    if db[COL_FORECASTS].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_FORECASTS,
            [
                {
                    "id": str(uuid.uuid4()),
                    "forecast_id": str(uuid.uuid4()),
                    "forecast_type": rng.choice(("ATTRITION", "HEADCOUNT", "RETIREMENT", "SKILL_SUPPLY")),
                    "department_or_bu": rng.choice(("Engineering", "Sales", "Enterprise")),
                    "forecast_period": f"{now.year}-Q{1 + (now.month - 1)//3}",
                    "forecast_payload": {"value": rng.randint(5, 40), "confidence": rng.choice((0.6, 0.7, 0.8, 0.9))},
                    "generated_on": _iso(now),
                    "source_type": "mock",
                    "is_mock": True,
                }
                for _ in range(12)
            ],
        )

    if db[COL_AI_INSIGHTS].count_documents({"seed_marker": SEED_MARKER}) == 0:
        insert_many(
            COL_AI_INSIGHTS,
            [
                {
                    "id": str(uuid.uuid4()),
                    "employee_id_or_group": rng.choice(employee_ids),
                    "insight_type": rng.choice(("JOINING_DROPOFF_RISK", "CONFIRMATION_RISK", "ATTRITION_RISK", "BURNOUT_ALERT")),
                    "insight_payload": {"summary": "Mock AI insight", "drivers": ["workload", "manager_change"]},
                    "score": rng.randint(40, 95),
                    "generated_at": _iso(now - timedelta(days=rng.randint(0, 14))),
                    "source_type": "mock",
                    "is_mock": True,
                }
                for _ in range(40)
            ],
        )

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

