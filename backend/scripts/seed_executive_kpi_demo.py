#!/usr/bin/env python3
"""
Synthetic data for the Executive KPI Dashboard (M9).

Populates underlying sources so hero KPIs, filters, freshness, insights, and charts
have realistic values. Also seeds monthly leadership snapshots for trends + compare.

Env:
  EXEC_KPI_SEED_FORCE=1   remove prior EXEC_KPI-marked rows and re-seed

Run from backend/:
  python scripts/seed_executive_kpi_demo.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from random import Random
from typing import Any, Dict, List

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

SEED_MARKER = "EXEC_KPI_DEMO_V1"
SEED_COLLECTION = "_executive_kpi_seed"
CATALOG_VERSION = "1.1.0"

from engagement.sentiment import compute_sentiment  # noqa: E402
from automation.constants import COL_MANUAL_WORKFLOW_BASELINES, COL_WORKFLOW_RUNS  # noqa: E402
from retention.constants import COL_ATTRITION_MODEL_STATE, COL_ATTRITION_SCORES_LATEST  # noqa: E402
from retention.model_v1 import default_model_state  # noqa: E402
from analytics.constants import COL_M9_LEADERSHIP_SNAPSHOTS  # noqa: E402
from analytics.freshness import compute_source_freshness  # noqa: E402
from analytics.strategic_aggregate import build_strategic_dashboard_data  # noqa: E402


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    try:
        from secrets_loader import apply_secret_store

        apply_secret_store()
    except Exception:
        pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _doc_id() -> str:
    return str(uuid.uuid4())


SKILL_GAPS = [
    ("Cloud Architecture", "cloud architecture", 14, 4, "HIGH"),
    ("Kubernetes", "kubernetes", 12, 5, "HIGH"),
    ("Generative AI", "generative ai", 10, 3, "HIGH"),
    ("Data Engineering", "data engineering", 11, 6, "MEDIUM"),
    ("Python", "python", 9, 7, "MEDIUM"),
    ("React", "react", 8, 5, "MEDIUM"),
    ("Product Strategy", "product strategy", 7, 4, "LOW"),
    ("Stakeholder Management", "stakeholder management", 6, 5, "LOW"),
]

EMPLOYEE_ROWS: List[Dict[str, Any]] = [
    # managers
    {"code": "EKPI-VP", "name": "Alex Morgan", "dept": "Engineering", "role": "VP Engineering", "manager": None, "skills": ["Cloud Architecture", "Stakeholder Management"], "status": "ACTIVE"},
    {"code": "EKPI-MGR-ENG", "name": "Priya Nair", "dept": "Engineering", "role": "Engineering Manager", "manager": "EKPI-VP", "skills": ["Python", "Kubernetes"], "status": "ACTIVE"},
    {"code": "EKPI-MGR-DATA", "name": "James Chen", "dept": "Data & Analytics", "role": "Data Engineering Manager", "manager": "EKPI-VP", "skills": ["Data Engineering", "Python"], "status": "ACTIVE"},
    {"code": "EKPI-MGR-PROD", "name": "Sofia Alvarez", "dept": "Product", "role": "Director of Product", "manager": None, "skills": ["Product Strategy", "Stakeholder Management"], "status": "ACTIVE"},
    # ICs — Engineering
    {"code": "EKPI-101", "name": "Ravi Kumar", "dept": "Engineering", "role": "Senior Software Engineer", "manager": "EKPI-MGR-ENG", "skills": ["Python", "Kubernetes", "React"], "status": "ACTIVE"},
    {"code": "EKPI-102", "name": "Emily Watson", "dept": "Engineering", "role": "Staff Engineer", "manager": "EKPI-MGR-ENG", "skills": ["Cloud Architecture", "Kubernetes"], "status": "ACTIVE"},
    {"code": "EKPI-103", "name": "Marcus Lee", "dept": "Engineering", "role": "Software Engineer", "manager": "EKPI-MGR-ENG", "skills": ["Python", "React"], "status": "ACTIVE"},
    {"code": "EKPI-104", "name": "Aisha Rahman", "dept": "Engineering", "role": "Platform Engineer", "manager": "EKPI-MGR-ENG", "skills": ["Kubernetes", "Cloud Architecture"], "status": "ACTIVE"},
    {"code": "EKPI-105", "name": "Tom Bradley", "dept": "Engineering", "role": "Engineer", "manager": "EKPI-MGR-ENG", "skills": ["Python"], "status": "EXITED"},
    # Data
    {"code": "EKPI-201", "name": "Nina Patel", "dept": "Data & Analytics", "role": "Senior Data Engineer", "manager": "EKPI-MGR-DATA", "skills": ["Data Engineering", "Python", "Generative AI"], "status": "ACTIVE"},
    {"code": "EKPI-202", "name": "Oliver Grant", "dept": "Data & Analytics", "role": "ML Engineer", "manager": "EKPI-MGR-DATA", "skills": ["Generative AI", "Python"], "status": "ACTIVE"},
    {"code": "EKPI-203", "name": "Hannah Kim", "dept": "Data & Analytics", "role": "Analytics Engineer", "manager": "EKPI-MGR-DATA", "skills": ["Data Engineering"], "status": "ACTIVE"},
    {"code": "EKPI-204", "name": "Diego Santos", "dept": "Data & Analytics", "role": "Data Analyst", "manager": "EKPI-MGR-DATA", "skills": ["Python", "Stakeholder Management"], "status": "EXITED"},
    # Product & People
    {"code": "EKPI-301", "name": "Liam O'Brien", "dept": "Product", "role": "Product Manager", "manager": "EKPI-MGR-PROD", "skills": ["Product Strategy", "Stakeholder Management"], "status": "ACTIVE"},
    {"code": "EKPI-302", "name": "Yuki Tanaka", "dept": "Product", "role": "Associate PM", "manager": "EKPI-MGR-PROD", "skills": ["Product Strategy"], "status": "ACTIVE"},
    {"code": "EKPI-401", "name": "Grace Miller", "dept": "People Operations", "role": "HR Business Partner", "manager": None, "skills": ["Stakeholder Management"], "status": "ACTIVE"},
    {"code": "EKPI-402", "name": "Noah Williams", "dept": "People Operations", "role": "Talent Partner", "manager": None, "skills": ["Stakeholder Management"], "status": "ACTIVE"},
]

CANDIDATE_SOURCES = [
    ("LINKEDIN", 18),
    ("REFERRAL", 12),
    ("NAUKRI", 8),
    ("DIRECT_UPLOAD", 6),
    ("INDEED", 4),
]

TREND_MONTHS = [
    ("2025-12", 118, 6.2, 68, 42),
    ("2026-01", 121, 6.8, 70, 45),
    ("2026-02", 124, 7.4, 71, 48),
    ("2026-03", 127, 8.0, 73, 52),
    ("2026-04", 130, 8.6, 74, 55),
    ("2026-05", 132, 9.1, 76, 58),
]


async def _delete_marked(db) -> None:
    await db.employees.delete_many({"seed_marker": SEED_MARKER})
    await db.workforce_skills.delete_many({"seed_marker": SEED_MARKER})
    await db.employee_engagement_responses.delete_many({"seed_marker": SEED_MARKER})
    await db.candidates.delete_many({"seed_marker": SEED_MARKER})
    await db.candidate_dedup_audit.delete_many({"seed_marker": SEED_MARKER})
    await db.fit_scores.delete_many({"seed_marker": SEED_MARKER})
    await db[COL_WORKFLOW_RUNS].delete_many({"seed_marker": SEED_MARKER})
    await db[COL_MANUAL_WORKFLOW_BASELINES].delete_many({"seed_marker": SEED_MARKER})
    await db[COL_M9_LEADERSHIP_SNAPSHOTS].delete_many({"seed_marker": SEED_MARKER})
    await db[COL_ATTRITION_SCORES_LATEST].delete_many({"seed_marker": SEED_MARKER})
    await db[COL_ATTRITION_MODEL_STATE].delete_many({"seed_marker": SEED_MARKER})


async def _seed_workforce_skills(db, now: datetime) -> None:
    ts = _iso(now)
    for name, lc, demand, supply, priority in SKILL_GAPS:
        gap = max(0, demand - supply)
        await db.workforce_skills.update_one(
            {"skill_name_lc": lc},
            {
                "$set": {
                    "skill_name": name,
                    "skill_name_lc": lc,
                    "demand_count": demand,
                    "supply_count": supply,
                    "gap": gap,
                    "category": "Engineering",
                    "priority": priority,
                    "notes": "Executive KPI demo seed",
                    "updated_at": ts,
                    "seed_marker": SEED_MARKER,
                },
                "$setOnInsert": {"created_at": ts},
            },
            upsert=True,
        )
    print(f"Upserted {len(SKILL_GAPS)} workforce skills")


async def _seed_employees(db, now: datetime) -> Dict[str, str]:
    """Returns code -> employee id."""
    ts = _iso(now)
    id_by_code: Dict[str, str] = {}
    for row in EMPLOYEE_ROWS:
        eid = _doc_id()
        id_by_code[row["code"]] = eid
    for row in EMPLOYEE_ROWS:
        mgr = row.get("manager")
        await db.employees.update_one(
            {"employee_code": row["code"]},
            {
                "$set": {
                    "id": id_by_code[row["code"]],
                    "employee_code": row["code"],
                    "full_name": row["name"],
                    "email": f"{row['code'].lower().replace('-', '.')}@demo.aai-hrms.local",
                    "department": row["dept"],
                    "role_title": row["role"],
                    "manager_id": id_by_code.get(mgr) if mgr else None,
                    "location": "Hybrid",
                    "status": row["status"],
                    "skills": row["skills"],
                    "join_date": (now - timedelta(days=400)).date().isoformat(),
                    "updated_at": ts,
                    "created_at": ts,
                    "seed_marker": SEED_MARKER,
                },
            },
            upsert=True,
        )
    print(f"Upserted {len(EMPLOYEE_ROWS)} demo employees (filters: 4 depts, 3 manager roots)")
    return id_by_code


async def _seed_engagement(db, now: datetime) -> None:
    survey = await db.employee_engagement_surveys.find_one({"title": "Executive KPI Demo Pulse"}, {"_id": 0})
    if not survey:
        survey_id = _doc_id()
        await db.employee_engagement_surveys.insert_one(
            {
                "id": survey_id,
                "title": "Executive KPI Demo Pulse",
                "question": "How supported do you feel this week?",
                "rating_min": 1,
                "rating_max": 5,
                "active": True,
                "target_all": True,
                "target_departments": [],
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )
    else:
        survey_id = survey["id"]

    active_codes = [r["code"] for r in EMPLOYEE_ROWS if r["status"] == "ACTIVE"]
    texts = [
        "Strong collaboration across teams.",
        "Workload is heavy — need more capacity.",
        "Manager support has improved.",
        "Unclear priorities on the roadmap.",
        "Learning opportunities are excellent.",
    ]
    docs: List[Dict[str, Any]] = []
    for i in range(72):
        code = active_codes[i % len(active_codes)]
        rating = 2 + (i % 4)
        if i % 9 == 0:
            rating = 1
        text = texts[i % len(texts)]
        sent = compute_sentiment(rating, text)
        created = now - timedelta(days=i % 28, hours=i % 12)
        docs.append(
            {
                "id": _doc_id(),
                "survey_id": survey_id,
                "employee_code": code,
                "rating": rating,
                "response_text": text,
                "sentiment_label": sent["sentiment_label"],
                "sentiment_score": sent["sentiment_score"],
                "created_at": _iso(created),
                "seed_marker": SEED_MARKER,
            }
        )
    if docs:
        await db.employee_engagement_responses.insert_many(docs)
    print(f"Inserted {len(docs)} engagement responses (sentiment donut + engagement KPI)")


async def _seed_talent_acquisition(db, now: datetime, rnd: Random) -> None:
    ts = _iso(now)
    cand_docs: List[Dict[str, Any]] = []
    idx = 0
    for source, count in CANDIDATE_SOURCES:
        for _ in range(count):
            idx += 1
            created = now - timedelta(days=rnd.randint(0, 25), hours=rnd.randint(0, 20))
            cid = _doc_id()
            cand_docs.append(
                {
                    "id": cid,
                    "full_name": f"Demo Candidate {idx}",
                    "email": f"cand.{idx}@demo.aai-hrms.local",
                    "source": source,
                    "status": "ACTIVE",
                    "created_at": _iso(created),
                    "updated_at": _iso(created),
                    "seed_marker": SEED_MARKER,
                }
            )
    if cand_docs:
        await db.candidates.insert_many(cand_docs)

    dedup_docs = [
        {
            "id": _doc_id(),
            "candidate_id": cand_docs[i % len(cand_docs)]["id"],
            "action": "MERGE",
            "created_at": _iso(now - timedelta(days=rnd.randint(0, 20))),
            "seed_marker": SEED_MARKER,
        }
        for i in range(14)
    ]
    if dedup_docs:
        await db.candidate_dedup_audit.insert_many(dedup_docs)

    score_docs = []
    for i, c in enumerate(cand_docs[:30]):
        score = rnd.uniform(55, 92)
        score_docs.append(
            {
                "id": _doc_id(),
                "candidate_id": c["id"],
                "job_id": None,
                "final_score": round(score, 1),
                "must_have_ok": score >= 65 or i % 4 == 0,
                "computed_at": _iso(now - timedelta(days=rnd.randint(0, 18))),
                "seed_marker": SEED_MARKER,
            }
        )
    if score_docs:
        await db.fit_scores.insert_many(score_docs)
    print(f"Inserted {len(cand_docs)} candidates, {len(dedup_docs)} dedup events, {len(score_docs)} fit scores")


async def _seed_automation(db, now: datetime, rnd: Random) -> None:
    ts = _iso(now)
    baselines = [
        {"workflow_key": "ONBOARDING_PACKET", "minutes_per_run": 45.0, "hourly_fully_loaded_cost_usd": 55.0},
        {"workflow_key": "PAYROLL_RECON", "minutes_per_run": 30.0, "hourly_fully_loaded_cost_usd": 60.0},
        {"workflow_key": "LEAVE_SYNC", "minutes_per_run": 12.0, "hourly_fully_loaded_cost_usd": 50.0},
    ]
    for b in baselines:
        await db[COL_MANUAL_WORKFLOW_BASELINES].update_one(
            {"workflow_key": b["workflow_key"], "seed_marker": SEED_MARKER},
            {"$set": {**b, "updated_at": ts, "seed_marker": SEED_MARKER}, "$setOnInsert": {"id": _doc_id(), "created_at": ts}},
            upsert=True,
        )

    runs: List[Dict[str, Any]] = []
    keys = [b["workflow_key"] for b in baselines]
    for i in range(24):
        ok = i % 7 != 0
        wk = keys[i % len(keys)]
        runs.append(
            {
                "id": _doc_id(),
                "workflow_key": wk,
                "action_type": wk,
                "savings_workflow_key": wk,
                "status": "SUCCESS" if ok else "FAILED",
                "created_at": _iso(now - timedelta(days=rnd.randint(0, 28), hours=i)),
                "seed_marker": SEED_MARKER,
            }
        )
    if runs:
        await db[COL_WORKFLOW_RUNS].insert_many(runs)
    print(f"Inserted {len(baselines)} M7 baselines and {len(runs)} workflow runs")


def _synthetic_strategic(
    *,
    period: str,
    active: int,
    attrition_pct: float,
    coverage: float,
    forecast_gap: int,
    generated_at: str,
) -> Dict[str, Any]:
    """Minimal strategic_dashboard blob for historical snapshots."""
    top_gaps = [
        {
            "skill_name": name,
            "demand_count": d,
            "supply_count": s,
            "gap": max(0, d - s),
            "priority": p,
        }
        for name, _lc, d, s, p in SKILL_GAPS[:6]
    ]
    risk_rows = [
        {
            "employee_code": "EKPI-102",
            "full_name": "Emily Watson",
            "risk_label": "HIGH",
            "risk_score": 0.72,
            "critical_skills_matched": 2,
        },
        {
            "employee_code": "EKPI-201",
            "full_name": "Nina Patel",
            "risk_label": "MEDIUM",
            "risk_score": 0.48,
            "critical_skills_matched": 2,
        },
    ]
    return {
        "generated_at": generated_at,
        "employee_count": active + max(2, int(active * attrition_pct / 100)),
        "active_employee_count": active,
        "attrition_count": max(1, int(active * attrition_pct / 100)),
        "attrition_rate_pct": attrition_pct,
        "avg_skills_per_employee": 2.4,
        "top_skill_gaps": top_gaps,
        "workforce_horizon_months": 3,
        "forecast_gap_total": forecast_gap,
        "resource_total_shortage": 28,
        "resource_total_bench": 6,
        "engagement_total_responses": 72,
        "engagement_avg_rating": 3.65,
        "engagement_last_30_days_responses": 48,
        "engagement_sentiment_counts": {"POSITIVE": 32, "NEUTRAL": 28, "NEGATIVE": 12},
        "retention_total_high_skill_employees": len(risk_rows),
        "retention_avg_risk_score": 0.52,
        "retention_top_risk_employees": risk_rows,
        "automation_runs_succeeded_30d": 21,
        "automation_runs_failed_30d": 3,
        "cost_optimization_baselines_count": 3,
        "estimated_manual_minutes_saved_30d": 540.0,
        "estimated_cost_saved_usd_30d": 495.0,
        "drill_window_days": 30,
        "analytics_window_days": 30,
        "skill_coverage_pct": coverage,
        "skill_coverage_scope": "org",
    }


def _kpi_values_from_strategic(sd: Dict[str, Any], generated_at: str) -> Dict[str, Any]:
    def row(val, unit, source):
        return {"value": val, "unit": unit, "as_of": generated_at, "source": source}

    return {
        "headcount_active": row(sd["active_employee_count"], "count", "employees"),
        "attrition_rate_pct": row(sd["attrition_rate_pct"], "percent", "employees"),
        "skill_coverage_pct": row(sd["skill_coverage_pct"], "percent", "workforce_skills+employees"),
        "forecast_gap_total": row(sd["forecast_gap_total"], "count", "composite"),
        "engagement_avg_rating": row(sd["engagement_avg_rating"], "score", "employee_engagement_responses"),
        "retention_avg_risk_score": row(sd["retention_avg_risk_score"], "score", "composite"),
    }


async def _seed_m8_attrition_scores(db, now: datetime, id_by_code: Dict[str, str]) -> None:
    """M8 scores for EKPI employees — powers retention predictive views."""
    ts = _iso(now)
    state = default_model_state()
    await db[COL_ATTRITION_MODEL_STATE].update_one(
        {"id": "default"},
        {
            "$set": {
                **state,
                "id": "default",
                "seed_marker": SEED_MARKER,
                "updated_at": ts,
            }
        },
        upsert=True,
    )

    # Risk profile by employee code (demo narrative: eng + sales elevated)
    risk_by_code = {
        "EKPI-101": 0.72,
        "EKPI-102": 0.58,
        "EKPI-103": 0.41,
        "EKPI-201": 0.68,
        "EKPI-202": 0.55,
        "EKPI-203": 0.38,
        "EKPI-301": 0.49,
        "EKPI-302": 0.44,
        "EKPI-401": 0.36,
        "EKPI-402": 0.33,
    }

    def band(r: float) -> str:
        if r >= 0.65:
            return "HIGH"
        if r >= 0.4:
            return "MEDIUM"
        return "LOW"

    n = 0
    for row in EMPLOYEE_ROWS:
        code = row["code"]
        eid = id_by_code.get(code)
        if not eid:
            continue
        risk = risk_by_code.get(code, 0.45)
        await db[COL_ATTRITION_SCORES_LATEST].update_one(
            {"employee_id": eid},
            {
                "$set": {
                    "employee_id": eid,
                    "employee_code": code,
                    "full_name": row["name"],
                    "department": row["dept"],
                    "role_title": row["role"],
                    "attrition_risk": risk,
                    "risk_band": band(risk),
                    "confidence": 0.82,
                    "model_kind": "linear_v1",
                    "model_version": "m8-attrition-v1-linear",
                    "computed_at": ts,
                    "seed_marker": SEED_MARKER,
                    "segments": ["HIGH_ATTRITION_RISK"] if risk >= 0.65 else [],
                }
            },
            upsert=True,
        )
        n += 1
    print(f"Upserted {n} M8 attrition scores (predictive retention forecast)")


async def _seed_leadership_snapshots(db, now: datetime) -> None:
    freshness = await compute_source_freshness(db)
    live = await build_strategic_dashboard_data(db, horizon_months=3, window_days=30, scope_employee_ids=None)

    for period, active, attrition, coverage, fgap in TREND_MONTHS:
        gen = _iso(now)
        if period == TREND_MONTHS[-1][0]:
            sd = live
        else:
            sd = _synthetic_strategic(
                period=period,
                active=active,
                attrition_pct=attrition,
                coverage=coverage,
                forecast_gap=fgap,
                generated_at=gen,
            )
        payload = {
            "snapshot_kind": "MONTHLY_LEADERSHIP",
            "period": period,
            "generated_at": gen,
            "strategic_dashboard": sd,
            "kpi_pack": {
                "catalog_version": CATALOG_VERSION,
                "values": _kpi_values_from_strategic(sd, gen),
            },
            "freshness": freshness,
            "kpi_definition_count": 12,
            "seed_marker": SEED_MARKER,
        }
        if period in {p for p, *_ in TREND_MONTHS[-3:]}:
            eng_active = max(1, int(round((sd.get("active_employee_count") or 0) * 0.38)))
            payload["drill_filters"] = {
                "department": "Engineering",
                "manager_root_id": "",
                "role_title_contains": "",
            }
            payload["scoped_strategic_dashboard"] = {
                **sd,
                "active_employee_count": eng_active,
                "employee_count": eng_active,
                "skill_coverage_scope": "filtered",
            }
        await db[COL_M9_LEADERSHIP_SNAPSHOTS].update_one(
            {"period": period, "seed_marker": SEED_MARKER},
            {
                "$set": {
                    "id": _doc_id(),
                    "period": period,
                    "created_at": gen,
                    "payload": payload,
                    "seed_marker": SEED_MARKER,
                }
            },
            upsert=True,
        )
    print(f"Upserted {len(TREND_MONTHS)} leadership snapshots (trends + compare dropdown)")


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or os.environ.get("MONGO_DB") or "aai_hrms"
    if not mongo_url:
        print("MONGO_URL required", file=sys.stderr)
        return 1

    force = os.environ.get("EXEC_KPI_SEED_FORCE", "").strip().lower() in ("1", "true", "yes")
    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        existing = await db[SEED_COLLECTION].find_one({"marker": SEED_MARKER}, {"_id": 0})
        if existing and not force:
            print(f"Executive KPI demo seed already applied. Set EXEC_KPI_SEED_FORCE=1 to re-run.")
            return 0

        if force:
            await _delete_marked(db)
            print("Cleared prior EXEC_KPI-marked documents")

        now = _now()
        rnd = Random(42)

        await _seed_workforce_skills(db, now)
        id_by_code = await _seed_employees(db, now)
        await _seed_m8_attrition_scores(db, now, id_by_code)
        await _seed_engagement(db, now)
        await _seed_talent_acquisition(db, now, rnd)
        await _seed_automation(db, now, rnd)
        await _seed_leadership_snapshots(db, now)

        await db[SEED_COLLECTION].update_one(
            {"marker": SEED_MARKER},
            {"$set": {"marker": SEED_MARKER, "applied_at": _iso(now), "version": 1}},
            upsert=True,
        )

        print("Executive KPI demo seed complete.")
        print("  → Open /executive-kpis (compare: 2026-05 vs earlier month; filters: Engineering / EKPI managers)")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
