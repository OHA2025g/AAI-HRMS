#!/usr/bin/env python3
"""
Seed 50 demo employees (prefix LCD50-) with full field coverage for M2 lifecycle exploration.

Populates:
  - employees: all EmployeeCreate/Response fields incl. M8 (comp band, promotions, HRIS, etc.)
  - employee_lifecycle_events: processed history + a few PENDING approval samples
  - employee_compliance_documents: mix of PENDING_VERIFY / VERIFIED / SLA states
  - employee_lifecycle_audit_logs: light audit rows for demo readability
  - Cross-module (same LCD50 cohort): M5 training assignments + certifications + LMS catalog rows,
    M6 pulse survey + responses, M4 demo project + skill demands/allocations, M8 attrition scores,
    workforce_skills upserts for common demo skills

Requires: MONGO_URL, DB_NAME (same as API). Optional secrets via secrets_loader.

Env:
  LCD50_SEED_REPLACE=1   Delete existing LCD50-* demo rows (incl. training, engagement, M8, M4 project) then re-seed
  LCD50_COUNT=50         Number of employees (default 50, max 200)
  LCD50_SKIP_CROSS=1     Skip cross-module seed/sync (employees/lifecycle only)
  LCD50_FORCE_CROSS_SYNC=1  Re-run cross-module sync even if already applied
  (no replace)           If LCD50 employees exist: cross-module sync runs once unless LCD50_FORCE_CROSS_SYNC=1

Run from repo:
  cd backend && python scripts/seed_employees_lifecycle_demo.py
"""

from __future__ import annotations

import asyncio
import os
import re
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

EMP_PREFIX = "LCD50"
CROSS_SYNC_MARKER_COLLECTION = "_lcd50_cross_sync"
CROSS_SYNC_VERSION = 1
COMPLIANCE_COLLECTION = "employee_compliance_documents"
AUDIT_COLLECTION = "employee_lifecycle_audit_logs"
EVENTS_COLLECTION = "employee_lifecycle_events"

# Cross-module demo artifacts (M4/M5/M6/M8) — tied to LCD50 cohort
DEMO_PROJECT_NAME = "LCD50 — Cross-Module Demo Program"
DEMO_PULSE_TITLE = "LCD50 — Pulse Check (Demo)"
DEMO_LMS_PROVIDER = "lcd50_seed"

FIRST_NAMES = (
    "Aarav", "Priya", "Jordan", "Sofia", "Wei", "Emma", "Lucas", "Maya", "Diego", "Yuki",
    "Olivia", "Noah", "Aisha", "Ethan", "Zara", "Mia", "Arjun", "Chloe", "Hassan", "Lily",
    "Ryan", "Nina", "Kai", "Elena", "Marcus", "Fatima", "Ben", "Hannah", "Omar", "Grace",
    "Alex", "Riya", "Sam", "Tara", "Chris", "Leah", "Dan", "Amy", "Matt", "Sara",
    "James", "Kim", "Tom", "Zoe", "Paul", "Ana", "Eric", "Beth", "Luke", "Mira",
)

LAST_NAMES = (
    "Patel", "Garcia", "Nguyen", "Khan", "Silva", "Brown", "Lee", "Singh", "Martinez", "Chen",
    "Wilson", "Kumar", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson",
)

DEPTS = (
    "Engineering", "Engineering", "HR", "Finance", "Sales", "Operations",
    "Legal", "Product", "Customer Success", "Engineering",
)

LOCATIONS = ("Remote", "Bengaluru", "Hyderabad", "Mumbai", "London", "New York", "Singapore", "Dubai")

ROLE_BY_DEPT = {
    "Engineering": ("Staff Engineer", "Senior Engineer", "Engineering Manager", "QA Engineer", "DevOps Engineer"),
    "HR": ("HR Business Partner", "Talent Partner", "HR Analyst"),
    "Finance": ("Financial Analyst", "Controller", "Accountant"),
    "Sales": ("Account Executive", "Sales Manager", "SDR"),
    "Operations": ("Operations Analyst", "Program Manager"),
    "Legal": ("Corporate Counsel", "Paralegal"),
    "Product": ("Product Manager", "Product Analyst"),
    "Customer Success": ("CSM", "Implementation Specialist"),
}

SKILL_POOL = (
    "Python", "JavaScript", "React", "MongoDB", "AWS", "Kubernetes", "SQL", "Leadership",
    "Communication", "Negotiation", "Excel", "Financial Modeling", "Compliance", "Salesforce",
    "Stakeholder Mgmt", "Data Analysis", "Scrum", "API Design", "Security", "Hiring",
)

COMP_BANDS = ("LOW", "MID", "HIGH", "LEAD")
HRIS_SOURCES = ("Workday", "SAP SuccessFactors", "BambooHR", "Darwinbox", "Manual CSV", "HiBob")


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    try:
        from secrets_loader import apply_secret_store

        apply_secret_store()
    except Exception:
        pass


def _code(n: int) -> str:
    return f"{EMP_PREFIX}-{n:03d}"


def _join_date_for_index(i: int, now: datetime) -> str:
    """Spread join dates over ~6 years."""
    days_ago = 40 + (i * 47) % (6 * 365)
    d = now - timedelta(days=days_ago)
    return d.date().isoformat()


def _promo_at(join_iso: str, i: int) -> str | None:
    if i % 5 == 0:
        return None
    try:
        jd = datetime.fromisoformat(join_iso).replace(tzinfo=timezone.utc)
    except Exception:
        return None
    return (jd + timedelta(days=180 + (i % 400))).date().isoformat()


async def _lcd50_replace_related(db, prefix_re: re.Pattern[str]) -> None:
    """Remove LCD50-tagged rows outside core employee collections (idempotent)."""
    proj = await db.projects.find_one({"name": DEMO_PROJECT_NAME}, {"_id": 0, "id": 1})
    if proj and proj.get("id"):
        pid = proj["id"]
        da = await db.project_skill_allocations.delete_many({"project_id": pid})
        dd = await db.project_skill_demands.delete_many({"project_id": pid})
        dp = await db.projects.delete_one({"id": pid})
        print(
            f"LCD50 replace: removed demo project allocations={da.deleted_count}, "
            f"demands={dd.deleted_count}, project={dp.deleted_count}"
        )

    m8 = await db.m8_attrition_scores_latest.delete_many({"employee_code": prefix_re})
    if m8.deleted_count:
        print(f"LCD50 replace: removed m8_attrition_scores_latest={m8.deleted_count}")

    ta = await db.training_employee_assignments.delete_many({"employee_code": prefix_re})
    if ta.deleted_count:
        print(f"LCD50 replace: removed training_employee_assignments={ta.deleted_count}")

    tc = await db.training_certifications.delete_many({"employee_code": prefix_re})
    if tc.deleted_count:
        print(f"LCD50 replace: removed training_certifications={tc.deleted_count}")

    er = await db.employee_engagement_responses.delete_many({"employee_code": prefix_re})
    if er.deleted_count:
        print(f"LCD50 replace: removed employee_engagement_responses={er.deleted_count}")

    es = await db.employee_engagement_surveys.delete_many({"title": DEMO_PULSE_TITLE})
    if es.deleted_count:
        print(f"LCD50 replace: removed employee_engagement_surveys={es.deleted_count}")

    lc = await db.training_lms_courses.delete_many({"provider": DEMO_LMS_PROVIDER})
    if lc.deleted_count:
        print(f"LCD50 replace: removed training_lms_courses (lcd50_seed)={lc.deleted_count}")


async def _seed_lcd50_cross_module(
    db,
    rows: list[dict],
    *,
    admin_id: str,
    now: datetime,
    now_iso: str,
) -> None:
    """Training, engagement, M4 project, M8 scores, workforce skills, LMS catalog."""
    from training.catalog_normalize import normalize_course_record
    from training.constants import COL_ASSIGNMENTS, COL_CERTIFICATIONS
    from training.lms_sync import upsert_normalized_course
    from training.recommendation_rules import default_path_steps
    from engagement.sentiment import compute_sentiment
    from engagement.topics import classify_topic
    from retention.constants import ATTRITION_MODEL_VERSION, FEATURE_KEYS
    from retention.model_v1 import risk_band
    from retention.segments import compute_segments, default_segment_settings

    prefix_re = re.compile(f"^{re.escape(EMP_PREFIX)}-")

    # Idempotent: clear prior M5 rows for this cohort so repeated seed / "employees already exist" path does not duplicate.
    da = await db[COL_ASSIGNMENTS].delete_many({"employee_code": prefix_re})
    dc = await db[COL_CERTIFICATIONS].delete_many({"employee_code": prefix_re})
    if da.deleted_count or dc.deleted_count:
        print(
            f"LCD50 cross-module: removed prior training assignments={da.deleted_count}, "
            f"certifications={dc.deleted_count}"
        )

    # --- M6: one active pulse survey + one response per employee ---
    survey = await db.employee_engagement_surveys.find_one({"title": DEMO_PULSE_TITLE}, {"_id": 0})
    if not survey:
        survey_id = str(uuid.uuid4())
        survey = {
            "id": survey_id,
            "title": DEMO_PULSE_TITLE,
            "question": "How supported do you feel by your manager and team this week?",
            "rating_min": 1,
            "rating_max": 5,
            "active": True,
            "target_all": True,
            "target_departments": [],
            "created_at": now_iso,
        }
        await db.employee_engagement_surveys.insert_one(survey)
        print("Inserted demo pulse survey (M6)")
    survey_id = survey["id"]

    await db.employee_engagement_responses.delete_many({"survey_id": survey_id, "employee_code": prefix_re})
    resp_docs: list[dict] = []
    sample_texts = (
        "Great collaboration and clear priorities.",
        "Workload spikes — could use more staffing.",
        "Manager gives helpful feedback regularly.",
        "Unclear expectations on deliverables.",
        "Enjoying the learning opportunities.",
    )
    for i, r in enumerate(rows):
        code = r["employee_code"]
        rating = 2 + (i % 4)  # 2..5 spread
        if i % 11 == 0:
            rating = 1
        text = sample_texts[i % len(sample_texts)]
        sent = compute_sentiment(rating, text)
        resp_docs.append(
            {
                "id": str(uuid.uuid4()),
                "survey_id": survey_id,
                "employee_code": code,
                "rating": rating,
                "response_text": text,
                "sentiment_label": sent["sentiment_label"],
                "sentiment_score": sent["sentiment_score"],
                "sentiment_pipeline_version": sent.get("sentiment_pipeline_version"),
                "topic_primary": classify_topic(text),
                "created_at": (now - timedelta(hours=3 + (i % 48))).isoformat(),
                "updated_at": None,
            }
        )
    if resp_docs:
        await db.employee_engagement_responses.insert_many(resp_docs)
        print(f"Inserted {len(resp_docs)} pulse responses (M6)")

    # --- M5: assignments (2 skills / employee, mixed progress) + some certifications ---
    assign_docs: list[dict] = []
    for i, r in enumerate(rows):
        code = r["employee_code"]
        skills = list(r.get("skills") or [])
        if len(skills) < 2:
            skills = list(SKILL_POOL[:2])
        for j, sk in enumerate(skills[:2]):
            sk = str(sk).strip()
            if not sk:
                continue
            sk_lc = sk.lower()
            st = "IN_PROGRESS" if (i + j) % 3 else "ASSIGNED"
            prog = float(35 + (i * 11 + j * 17) % 60) if st == "IN_PROGRESS" else 0.0
            if st == "ASSIGNED":
                prog = 0.0
            completed_at = None
            if i % 13 == j and r.get("status") == "ACTIVE":
                st = "COMPLETED"
                prog = 100.0
                completed_at = (now - timedelta(days=7 + i % 20)).isoformat()
            assign_docs.append(
                {
                    "id": str(uuid.uuid4()),
                    "employee_code": code,
                    "skill_name": sk,
                    "skill_name_lc": sk_lc,
                    "path_snapshot": default_path_steps(sk),
                    "status": st,
                    "progress_pct": prog,
                    "assigned_by": admin_id,
                    "assigned_at": (now - timedelta(days=14 + (i % 30))).isoformat(),
                    "updated_at": now_iso,
                    "completed_at": completed_at,
                }
            )
    if assign_docs:
        await db[COL_ASSIGNMENTS].insert_many(assign_docs)
        print(f"Inserted {len(assign_docs)} training assignments (M5)")

    cert_docs: list[dict] = []
    for i, r in enumerate(rows):
        if i % 5 != 0:
            continue
        code = r["employee_code"]
        cert_docs.append(
            {
                "id": str(uuid.uuid4()),
                "employee_code": code,
                "title": "Cloud Security Awareness (annual)",
                "issued_at": (now - timedelta(days=120 + i)).date().isoformat(),
                "expires_at": (now + timedelta(days=200 + i)).date().isoformat(),
                "created_by": admin_id,
                "created_at": now_iso,
                "expiry_reminder_sent_at": None,
            }
        )
    if cert_docs:
        await db[COL_CERTIFICATIONS].insert_many(cert_docs)
        print(f"Inserted {len(cert_docs)} training certifications (M5)")

    # --- Stub LMS catalog rows (filterable by skill in UI) ---
    seed_courses = [
        {"external_id": "lcd50-python-101", "title": "Python for HRMS Integrations", "skills": ["Python", "API Design"]},
        {"external_id": "lcd50-react-201", "title": "React Dashboard Patterns", "skills": ["React", "JavaScript"]},
        {"external_id": "lcd50-aws-310", "title": "AWS Foundations for Teams", "skills": ["AWS", "Kubernetes"]},
        {"external_id": "lcd50-lead-120", "title": "Leadership Essentials", "skills": ["Leadership", "Communication"]},
    ]
    for raw in seed_courses:
        norm = normalize_course_record(raw, provider=DEMO_LMS_PROVIDER)
        await upsert_normalized_course(db, norm)
    print(f"Upserted {len(seed_courses)} LMS catalog courses ({DEMO_LMS_PROVIDER})")

    # --- M4: project + skill demands + allocations ---
    ex_proj = await db.projects.find_one({"name": DEMO_PROJECT_NAME}, {"_id": 0})
    if ex_proj:
        project_id = ex_proj["id"]
    else:
        project_id = str(uuid.uuid4())
        await db.projects.insert_one(
            {
                "id": project_id,
                "name": DEMO_PROJECT_NAME,
                "description": "Synthetic project to exercise skill demand vs allocation views for the LCD50 demo cohort.",
                "status": "ACTIVE",
                "start_date": (now - timedelta(days=90)).date().isoformat(),
                "end_date": None,
                "created_at": now_iso,
                "updated_at": None,
            }
        )
        print("Inserted demo project (M4)")

    demand_specs = [
        ("Python", 12, "HIGH"),
        ("React", 10, "HIGH"),
        ("AWS", 8, "MEDIUM"),
        ("Leadership", 6, "MEDIUM"),
    ]
    for skill_name, demand_count, priority in demand_specs:
        key = skill_name.lower()
        existing = await db.project_skill_demands.find_one({"project_id": project_id, "skill_name_lc": key}, {"_id": 0})
        if existing:
            continue
        ts = now_iso
        await db.project_skill_demands.insert_one(
            {
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "skill_name": skill_name,
                "skill_name_lc": key,
                "demand_count": demand_count,
                "priority": priority,
                "demand_min": demand_count,
                "demand_max": demand_count + 4,
                "constraint_type": "HARD",
                "created_at": ts,
                "updated_at": ts,
            }
        )
    alloc_specs = [("Python", 7), ("React", 6), ("AWS", 5), ("Leadership", 4)]
    for skill_name, allocated_count in alloc_specs:
        key = skill_name.lower()
        existing = await db.project_skill_allocations.find_one({"project_id": project_id, "skill_name_lc": key}, {"_id": 0})
        if existing:
            continue
        ts = now_iso
        await db.project_skill_allocations.insert_one(
            {
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "skill_name": skill_name,
                "skill_name_lc": key,
                "allocated_count": allocated_count,
                "created_at": ts,
                "updated_at": ts,
            }
        )
    print("Ensured demo project skill demands + allocations (M4)")

    # --- M8: latest attrition scores (keyed by employee UUID) ---
    seg_settings = default_segment_settings()
    score_docs: list[dict] = []
    for i, r in enumerate(rows):
        eid = r["id"]
        code = r["employee_code"]
        base = 0.22 + (i % 17) * 0.028
        if r.get("status") == "EXITED":
            base = min(0.92, base + 0.35)
        elif r.get("status") == "INACTIVE":
            base = min(0.78, base + 0.18)
        risk = round(min(0.97, max(0.03, base)), 4)
        features = {k: round(0.15 + ((i + ord(k[0])) % 13) / 20.0, 4) for k in FEATURE_KEYS}
        meta = {"completeness": 0.85, "notes": "lcd50_seed"}
        score_docs.append(
            {
                "employee_id": eid,
                "employee_code": code,
                "full_name": r.get("full_name") or "",
                "department": r.get("department"),
                "role_title": r.get("role_title"),
                "attrition_risk": risk,
                "risk_band": risk_band(risk),
                "confidence": 0.72,
                "logit": 0.0,
                "attrition_risk_linear": risk,
                "top_factors": [
                    {"feature": "engagement_gap", "contribution": 0.12, "direction": "increases_risk"},
                    {"feature": "market_exposure", "contribution": 0.08, "direction": "increases_risk"},
                ],
                "shap_linear": [],
                "gb_explanation_top": None,
                "model_kind": "linear",
                "ensemble_mode": "linear",
                "features": features,
                "feature_meta": meta,
                "segments": compute_segments(r, risk, seg_settings),
                "model_version": ATTRITION_MODEL_VERSION,
                "computed_at": now_iso,
            }
        )
    for doc in score_docs:
        await db.m8_attrition_scores_latest.update_one({"employee_id": doc["employee_id"]}, {"$set": doc}, upsert=True)
    print(f"Upserted {len(score_docs)} M8 attrition score rows")

    # --- Workforce skills (upsert; complements employee-derived supply in API) ---
    wf_specs = [
        ("Python", 30, 12, "HIGH", "Demo demand spike"),
        ("React", 28, 11, "HIGH", "Product roadmap"),
        ("AWS", 24, 10, "MEDIUM", "Infra programs"),
        ("Kubernetes", 18, 6, "MEDIUM", "Platform"),
        ("Leadership", 16, 5, "MEDIUM", "People managers"),
        ("SQL", 20, 8, "MEDIUM", "Analytics"),
        ("Communication", 14, 6, "LOW", "Cross-functional"),
        ("Security", 12, 4, "HIGH", "Compliance"),
    ]
    for name, demand, supply, priority, notes in wf_specs:
        key = name.lower()
        gap = max(0, demand - supply)
        await db.workforce_skills.update_one(
            {"skill_name_lc": key},
            {
                "$set": {
                    "skill_name": name,
                    "skill_name_lc": key,
                    "demand_count": demand,
                    "supply_count": supply,
                    "gap": gap,
                    "category": "LCD50_DEMO",
                    "priority": priority,
                    "notes": notes,
                    "updated_at": now_iso,
                }
            },
            upsert=True,
        )
    print(f"Upserted {len(wf_specs)} workforce_skills rows (LCD50 demo)")

    await db[CROSS_SYNC_MARKER_COLLECTION].update_one(
        {"_id": "v1"},
        {
            "$set": {
                "version": CROSS_SYNC_VERSION,
                "synced_at": now_iso,
                "employee_count": len(rows),
            }
        },
        upsert=True,
    )


async def _lcd50_cross_already_synced(db) -> bool:
    doc = await db[CROSS_SYNC_MARKER_COLLECTION].find_one(
        {"_id": "v1", "version": CROSS_SYNC_VERSION},
        {"_id": 1},
    )
    return doc is not None


def default_sla_due(uploaded_at_iso: str, days: int = 14) -> str:
    try:
        raw = uploaded_at_iso.replace("Z", "+00:00")
        up = datetime.fromisoformat(raw)
        if up.tzinfo is None:
            up = up.replace(tzinfo=timezone.utc)
    except Exception:
        up = datetime.now(timezone.utc)
    return (up + timedelta(days=days)).isoformat()


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("MONGO_URL and DB_NAME required", file=sys.stderr)
        return 1

    replace = os.environ.get("LCD50_SEED_REPLACE", "").strip().lower() in ("1", "true", "yes")
    skip_cross = os.environ.get("LCD50_SKIP_CROSS", "").strip().lower() in ("1", "true", "yes")
    count = min(200, max(1, int(os.environ.get("LCD50_COUNT", "50"))))

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    prefix_re = re.compile(f"^{re.escape(EMP_PREFIX)}-")

    force_cross = os.environ.get("LCD50_FORCE_CROSS_SYNC", "").strip().lower() in ("1", "true", "yes")

    if replace:
        await db[CROSS_SYNC_MARKER_COLLECTION].delete_many({})
        await _lcd50_replace_related(db, prefix_re)
        r0 = await db.employees.delete_many({"employee_code": prefix_re})
        r1 = await db[EVENTS_COLLECTION].delete_many({"employee_code": prefix_re})
        r2 = await db[COMPLIANCE_COLLECTION].delete_many({"employee_code": prefix_re})
        r3 = await db[AUDIT_COLLECTION].delete_many({"employee_code": prefix_re})
        print(
            f"LCD50 replace: removed employees={r0.deleted_count}, events={r1.deleted_count}, "
            f"compliance={r2.deleted_count}, audit={r3.deleted_count}"
        )

    existing_emp = await db.employees.count_documents({"employee_code": prefix_re})
    if existing_emp > 0 and not replace:
        # Root-cause fix: previously we exited here and never ran cross-module again. That left users
        # with 50 employees but no training/M6/M4/M8 after a failed first run, and never healed on restart.
        print(
            f"Demo employees already present ({existing_emp} with prefix {EMP_PREFIX}-). "
            f"Syncing cross-module demo data (M4/M5/M6/M8, skills). "
            f"Use LCD50_SEED_REPLACE=1 for full wipe + re-seed of employees + lifecycle."
        )
        admin = await db.users.find_one({"role": "admin"}, {"_id": 0, "id": 1})
        admin_id = (admin or {}).get("id") or "seed-system"
        rows_existing = (
            await db.employees.find({"employee_code": prefix_re}, {"_id": 0}).sort("employee_code", 1).to_list(500)
        )
        if skip_cross:
            print("LCD50_SKIP_CROSS=1 — skipped cross-module sync for existing cohort")
        elif await _lcd50_cross_already_synced(db) and not force_cross:
            print(
                "LCD50 cross-module already synced for this database. "
                "Use LCD50_FORCE_CROSS_SYNC=1 to re-run training/engagement/M4/M8 sync."
            )
        elif rows_existing:
            await _seed_lcd50_cross_module(db, rows_existing, admin_id=admin_id, now=now, now_iso=now_iso)
        return 0

    admin = await db.users.find_one({"role": "admin"}, {"_id": 0, "id": 1})
    admin_id = (admin or {}).get("id") or "seed-system"

    # --- Build employee rows (manager_id filled in second pass) ---
    rows: list[dict] = []
    for i in range(count):
        n = i + 1
        code = _code(n)
        dept = DEPTS[i % len(DEPTS)]
        titles = ROLE_BY_DEPT.get(dept, ("Professional",))
        role_title = titles[i % len(titles)]
        fn = FIRST_NAMES[i % len(FIRST_NAMES)]
        ln = LAST_NAMES[i % len(LAST_NAMES)]
        full_name = f"{fn} {ln}"
        email = f"lcd50.{n:03d}@demo.aai-hrms.local"

        if i < 8:
            status = "ONBOARDING"
        elif i < 36:
            status = "ACTIVE"
        elif i < 42:
            status = "INACTIVE"
        else:
            status = "EXITED"

        join_date = _join_date_for_index(i, now)
        band = COMP_BANDS[i % len(COMP_BANDS)]
        skills = [SKILL_POOL[(i + j) % len(SKILL_POOL)] for j in range(3 + (i % 4))]

        doc = {
            "id": str(uuid.uuid4()),
            "employee_code": code,
            "full_name": full_name,
            "email": email,
            "department": dept,
            "role_title": role_title,
            "manager_id": None,
            "location": LOCATIONS[i % len(LOCATIONS)],
            "status": status,
            "skills": skills,
            "join_date": join_date,
            "created_at": now_iso,
            "updated_at": now_iso,
            "compensation_band": band,
            "last_promotion_at": _promo_at(join_date, i),
            "high_performer": (i % 7 != 0),
            "critical_role": (i % 11 == 0),
            "comp_market_percentile": round(35.0 + (i * 2.17) % 55.0, 1),
            "hris_last_sync_at": (now - timedelta(hours=12 + (i % 48))).isoformat(),
            "hris_comp_source": HRIS_SOURCES[i % len(HRIS_SOURCES)],
        }
        rows.append(doc)

    # First 5 are people managers (no manager)
    manager_ids_by_index = {j: rows[j]["id"] for j in range(min(5, count))}
    for i, doc in enumerate(rows):
        if i < 5:
            doc["manager_id"] = None
        else:
            doc["manager_id"] = manager_ids_by_index[i % 5]

    await db.employees.insert_many(rows)
    print(f"Inserted {len(rows)} employees ({EMP_PREFIX}-001 .. {EMP_PREFIX}-{count:03d})")

    # --- Lifecycle events (processed history) ---
    ev_docs: list[dict] = []

    def ev(
        code: str,
        et: str,
        created_offset_days: int,
        *,
        proc: str = "PROCESSED",
        appr: str | None = None,
        details: dict | None = None,
        requires_approval: bool = False,
    ) -> dict:
        ts = (now - timedelta(days=created_offset_days)).isoformat()
        return {
            "id": str(uuid.uuid4()),
            "employee_code": code,
            "event_type": et,
            "effective_date": ts[:10],
            "details": details or {},
            "created_at": ts,
            "updated_at": ts,
            "processing_status": proc,
            "attempts": 1,
            "processed_at": ts if proc == "PROCESSED" else None,
            "processing_error": None,
            "requires_approval": requires_approval,
            "approval_status": appr,
            "approved_by": admin_id if appr == "APPROVED" else None,
            "approved_at": ts if appr == "APPROVED" else None,
            "rejection_reason": None,
            "escalated_at": None,
        }

    for i, r in enumerate(rows):
        code = r["employee_code"]
        st = r["status"]
        # Everyone: onboarding event in the past
        ev_docs.append(ev(code, "ONBOARDED", 60 + (i % 20)))

        if st in ("ACTIVE", "INACTIVE", "EXITED"):
            ev_docs.append(ev(code, "ACTIVATED", 55 + (i % 15)))

        if i % 9 == 3 and st != "EXITED":
            ev_docs.append(
                ev(
                    code,
                    "ROLE_CHANGED",
                    30,
                    details={
                        "role_title": r["role_title"] + " (prior title in details)",
                        "manager_id": r.get("manager_id"),
                        "note": "Promotion / title alignment",
                        "previous_title": "Individual Contributor",
                    },
                )
            )

        if i % 6 == 2:
            ev_docs.append(
                ev(
                    code,
                    "DOCUMENT_ADDED",
                    14,
                    details={"document_type": "NDA", "title": "Mutual NDA v2024", "storage_uri": "s3://demo-docs/nda"},
                )
            )

        if st == "EXITED":
            ev_docs.append(
                ev(
                    code,
                    "EXITED",
                    3 + (i % 5),
                    details={"reason": "Voluntary", "last_working_day": (now - timedelta(days=2)).date().isoformat()},
                )
            )

    # Pending approval samples (employees still ACTIVE)
    pending_codes = [r["employee_code"] for r in rows if r["status"] == "ACTIVE"][:4]
    if len(pending_codes) >= 2:
        c0 = pending_codes[0]
        ev_docs.append(
            {
                "id": str(uuid.uuid4()),
                "employee_code": c0,
                "event_type": "EXITED",
                "effective_date": (now + timedelta(days=14)).date().isoformat(),
                "details": {"reason": "Resignation — pending HR approval", "proposed_lwd": (now + timedelta(days=21)).date().isoformat()},
                "created_at": (now - timedelta(days=1)).isoformat(),
                "updated_at": None,
                "processing_status": "PENDING",
                "attempts": 0,
                "processed_at": None,
                "processing_error": None,
                "requires_approval": True,
                "approval_status": "PENDING",
                "approved_by": None,
                "approved_at": None,
                "rejection_reason": None,
                "escalated_at": None,
            }
        )
        c1 = pending_codes[1]
        emp1 = next(rr for rr in rows if rr["employee_code"] == c1)
        ev_docs.append(
            {
                "id": str(uuid.uuid4()),
                "employee_code": c1,
                "event_type": "ROLE_CHANGED",
                "effective_date": now.date().isoformat(),
                "details": {
                    "role_title": f"Senior {emp1['role_title']}",
                    "manager_id": emp1["manager_id"],
                    "note": "Pending approval: ladder change",
                },
                "created_at": (now - timedelta(hours=6)).isoformat(),
                "updated_at": None,
                "processing_status": "PENDING",
                "attempts": 0,
                "processed_at": None,
                "processing_error": None,
                "requires_approval": True,
                "approval_status": "PENDING",
                "approved_by": None,
                "approved_at": None,
                "rejection_reason": None,
                "escalated_at": None,
            }
        )

    if ev_docs:
        await db[EVENTS_COLLECTION].insert_many(ev_docs)
        print(f"Inserted {len(ev_docs)} lifecycle events (incl. pending approval samples)")

    # --- Compliance documents ---
    cd_docs: list[dict] = []
    doc_types = ("ID_PROOF", "BACKGROUND_CHECK", "I9", "CONTRACT", "POLICY_ACK", "VISA")
    for i, r in enumerate(rows[:18]):
        code = r["employee_code"]
        uploaded = (now - timedelta(days=5 + i)).isoformat()
        dtype = doc_types[i % len(doc_types)]
        doc_id = str(uuid.uuid4())
        if i % 3 == 0:
            status = "PENDING_VERIFY"
            verified_at = None
            verified_by = None
        elif i % 3 == 1:
            status = "VERIFIED"
            verified_at = (now - timedelta(days=1)).isoformat()
            verified_by = admin_id
        else:
            status = "PENDING_VERIFY"
            verified_at = None
            verified_by = None
        cd_docs.append(
            {
                "id": doc_id,
                "employee_code": code,
                "document_type": dtype,
                "title": f"{dtype.replace('_', ' ').title()} — {code}",
                "storage_uri": f"https://demo-storage.invalid/{code}/{doc_id}.pdf",
                "content_base64": None,
                "status": status,
                "uploaded_by": admin_id,
                "uploaded_at": uploaded,
                "verified_at": verified_at,
                "verified_by": verified_by,
                "expires_at": (now + timedelta(days=365 - i * 10)).date().isoformat() if i % 2 == 0 else None,
                "sla_due_at": default_sla_due(uploaded, 14),
                "reminder_sent_at": None,
                "sla_breached_at": None,
                "updated_at": uploaded,
            }
        )

    if cd_docs:
        await db[COMPLIANCE_COLLECTION].insert_many(cd_docs)
        print(f"Inserted {len(cd_docs)} compliance documents")

    # --- Light audit trail ---
    audit_rows = []
    for r in rows[:15]:
        audit_rows.append(
            {
                "id": str(uuid.uuid4()),
                "employee_code": r["employee_code"],
                "action": "SEED_DEMO_BASELINE",
                "from_status": None,
                "to_status": r["status"],
                "event_type": None,
                "event_id": None,
                "actor_id": admin_id,
                "notes": "seed_employees_lifecycle_demo.py — demo dataset for lifecycle UI",
                "created_at": now_iso,
            }
        )
    if audit_rows:
        await db[AUDIT_COLLECTION].insert_many(audit_rows)
        print(f"Inserted {len(audit_rows)} audit log rows")

    if not skip_cross:
        await _seed_lcd50_cross_module(db, rows, admin_id=admin_id, now=now, now_iso=now_iso)
    else:
        print("LCD50_SKIP_CROSS=1 — skipped training / engagement / M4 / M8 / workforce_skills seed")

    print("Done. Filter employees by code prefix", EMP_PREFIX, "in UI/API.")
    print("Sample codes:", _code(1), _code(8), _code(36), _code(42), _code(50) if count >= 50 else _code(count))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
