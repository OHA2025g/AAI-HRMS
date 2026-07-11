#!/usr/bin/env python3
"""
Seed Workforce Intelligence (M15) demo data.

Creates multi-month snapshots + drill-down records + forecasts + risk predictions + AI recs
so the /workforce-intelligence UI is visually rich on first boot.

Env:
  WFI_SEED_FORCE=1   delete WFI_DEMO rows then re-seed
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

from workforce_intelligence.constants import (  # noqa: E402
    COL_ACTIVITY_LOGS,
    COL_AI_RECOMMENDATIONS,
    COL_ATTRITION_PREDICTIONS,
    COL_BURNOUT_PREDICTIONS,
    COL_COMPLIANCE_RISK_PREDICTIONS,
    COL_COST_RISK_PREDICTIONS,
    COL_COPILOT_QUERIES,
    COL_COST_VISIBILITY_RECORDS,
    COL_COMPLIANCE_VISIBILITY_RECORDS,
    COL_DEMOGRAPHIC_SNAPSHOTS,
    COL_DEMAND_SUPPLY_RECORDS,
    COL_EXECUTIVE_SUMMARY_SNAPSHOTS,
    COL_FORECASTS,
    COL_HEADCOUNT_RECORDS,
    COL_ENGAGEMENT_VISIBILITY_RECORDS,
    COL_PERFORMANCE_VISIBILITY_RECORDS,
    COL_SNAPSHOT_RECORDS,
    COL_SKILL_RISK_PREDICTIONS,
    COL_SKILL_VISIBILITY_RECORDS,
    COL_STRATEGIC_OPPORTUNITY_SNAPSHOTS,
    COL_STRATEGIC_RISK_SNAPSHOTS,
    COL_UTILIZATION_SNAPSHOTS,
    COL_WORKFORCE_PLANS,
    COL_SCENARIO_MODELS,
    COL_MANAGER_EFFECTIVENESS_RECORDS,
)

SEED_MARKER = "WFI_M15_DEMO"


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


def _doc_id() -> str:
    return str(uuid.uuid4())


def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "aai_hrms")
    force = os.environ.get("WFI_SEED_FORCE", "0").strip() in ("1", "true", "yes")
    rng = Random(15)

    client = MongoClient(mongo_url)
    db = client[db_name]

    cols = [
        COL_SNAPSHOT_RECORDS,
        COL_HEADCOUNT_RECORDS,
        COL_DEMOGRAPHIC_SNAPSHOTS,
        COL_SKILL_VISIBILITY_RECORDS,
        COL_UTILIZATION_SNAPSHOTS,
        COL_ENGAGEMENT_VISIBILITY_RECORDS,
        COL_PERFORMANCE_VISIBILITY_RECORDS,
        COL_COMPLIANCE_VISIBILITY_RECORDS,
        COL_COST_VISIBILITY_RECORDS,
        COL_WORKFORCE_PLANS,
        COL_DEMAND_SUPPLY_RECORDS,
        COL_SCENARIO_MODELS,
        COL_MANAGER_EFFECTIVENESS_RECORDS,
        COL_FORECASTS,
        COL_ATTRITION_PREDICTIONS,
        COL_BURNOUT_PREDICTIONS,
        COL_SKILL_RISK_PREDICTIONS,
        COL_COST_RISK_PREDICTIONS,
        COL_COMPLIANCE_RISK_PREDICTIONS,
        COL_AI_RECOMMENDATIONS,
        COL_STRATEGIC_RISK_SNAPSHOTS,
        COL_STRATEGIC_OPPORTUNITY_SNAPSHOTS,
        COL_EXECUTIVE_SUMMARY_SNAPSHOTS,
        COL_COPILOT_QUERIES,
        COL_ACTIVITY_LOGS,
    ]

    if force:
        for c in cols:
            db[c].delete_many({"seed_marker": SEED_MARKER})

    # Only seed if not present
    if db[COL_SNAPSHOT_RECORDS].count_documents({"seed_marker": SEED_MARKER}) > 0:
        client.close()
        return 0

    now = _now()
    months = 9
    snapshot_dates = [(now - timedelta(days=30 * i)).date().isoformat() for i in range(months)][::-1]

    bus = ("Enterprise", "Delivery", "G&A")
    depts = ("Engineering", "HR", "Finance", "Sales", "Operations", "Product", "Customer Success")
    geos = ("India", "UK", "US", "APAC")
    skills = ("Python", "React", "Java", "Data Engineering", "AWS", "Kubernetes", "Salesforce", "Security", "Leadership", "QA")

    # A) Snapshot records
    snapshot_rows = []
    for sd in snapshot_dates:
        total = 420 + rng.randint(-30, 40) + snapshot_dates.index(sd) * 8
        active = int(total * rng.uniform(0.88, 0.94))
        inactive = total - active
        exits = rng.randint(2, 12)
        joiners = rng.randint(4, 18)
        bench = rng.randint(18, 55)
        util = round(rng.uniform(68.0, 86.0), 2)
        snapshot_rows.append(
            {
                "id": _doc_id(),
                "snapshot_id": _doc_id(),
                "snapshot_date": sd,
                "total_workforce": total,
                "active_workforce": active,
                "inactive_workforce": inactive,
                "new_joiners": joiners,
                "exits": exits,
                "bench_population": bench,
                "billable_population": int(active * rng.uniform(0.55, 0.7)),
                "non_billable_population": int(active * rng.uniform(0.25, 0.4)),
                "average_utilization": util,
                "critical_alert_count": rng.randint(1, 9),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )
    db[COL_SNAPSHOT_RECORDS].insert_many(snapshot_rows, ordered=False)

    # B) Headcount records
    headcount_rows = []
    for sd in snapshot_dates[-6:]:
        for bu in bus:
            for d in depts[:4]:
                geo = rng.choice(geos)
                current = rng.randint(25, 120)
                planned = current + rng.randint(-10, 20)
                approved = max(0, planned - rng.randint(0, 8))
                filled = max(0, current - rng.randint(0, 10))
                open_pos = max(0, approved - filled)
                headcount_rows.append(
                    {
                        "id": _doc_id(),
                        "record_id": _doc_id(),
                        "snapshot_date": sd,
                        "business_unit": bu,
                        "department": d,
                        "geography": geo,
                        "planned_headcount": planned,
                        "approved_headcount": approved,
                        "current_headcount": current,
                        "filled_positions": filled,
                        "open_positions": open_pos,
                        "variance_value": current - approved,
                        "created_at": _iso(now),
                        "seed_marker": SEED_MARKER,
                    }
                )
    db[COL_HEADCOUNT_RECORDS].insert_many(headcount_rows, ordered=False)

    # C) Demographics (dimension_type: gender, tenure_band, age_band)
    demo_rows = []
    for sd in snapshot_dates[-4:]:
        for dim_type, dim_vals in (
            ("gender", ("Female", "Male", "Non-binary")),
            ("tenure_band", ("0-1y", "1-3y", "3-5y", "5-10y", "10y+")),
            ("age_band", ("<25", "25-34", "35-44", "45-54", "55+")),
        ):
            total = 520
            remaining = total
            for i, v in enumerate(dim_vals):
                if i == len(dim_vals) - 1:
                    c = remaining
                else:
                    c = rng.randint(20, max(25, remaining // 2))
                    remaining -= c
                demo_rows.append(
                    {
                        "id": _doc_id(),
                        "demographic_id": _doc_id(),
                        "snapshot_date": sd,
                        "dimension_type": dim_type,
                        "dimension_value": v,
                        "employee_count": c,
                        "percentage": round((c / total) * 100, 2),
                        "created_at": _iso(now),
                        "seed_marker": SEED_MARKER,
                    }
                )
    db[COL_DEMOGRAPHIC_SNAPSHOTS].insert_many(demo_rows, ordered=False)

    # D) Skill visibility records
    skill_rows = []
    for sd in snapshot_dates[-4:]:
        for s in skills:
            skill_rows.append(
                {
                    "id": _doc_id(),
                    "skill_snapshot_id": _doc_id(),
                    "snapshot_date": sd,
                    "skill_name": s,
                    "skill_category": rng.choice(("Tech", "Domain", "Leadership")),
                    "competency_band": rng.choice(("Beginner", "Intermediate", "Advanced", "Expert")),
                    "employee_count": rng.randint(10, 140),
                    "criticality_flag": rng.choice([True, False]),
                    "scarce_flag": rng.choice([True, False]),
                    "certification_coverage_percent": round(rng.uniform(15, 85), 2),
                    "department": rng.choice(depts),
                    "geography": rng.choice(geos),
                    "seed_marker": SEED_MARKER,
                }
            )
    db[COL_SKILL_VISIBILITY_RECORDS].insert_many(skill_rows, ordered=False)

    # E) Utilization snapshots
    util_rows = []
    for sd in snapshot_dates[-6:]:
        for d in depts:
            util_rows.append(
                {
                    "id": _doc_id(),
                    "utilization_id": _doc_id(),
                    "snapshot_date": sd,
                    "department": d,
                    "billable_utilization": round(rng.uniform(55, 85), 2),
                    "non_billable_utilization": round(rng.uniform(10, 35), 2),
                    "over_utilized_count": rng.randint(0, 18),
                    "under_utilized_count": rng.randint(0, 35),
                    "deployable_capacity": rng.randint(5, 60),
                    "bench_count": rng.randint(0, 25),
                    "seed_marker": SEED_MARKER,
                }
            )
    db[COL_UTILIZATION_SNAPSHOTS].insert_many(util_rows, ordered=False)

    # F) Engagement/performance/compliance/cost visibility
    eng_rows, perf_rows, comp_rows, cost_rows = [], [], [], []
    for sd in snapshot_dates[-4:]:
        for d in depts:
            eng_rows.append(
                {
                    "id": _doc_id(),
                    "engagement_snapshot_id": _doc_id(),
                    "snapshot_date": sd,
                    "department": d,
                    "engagement_score": round(rng.uniform(58, 86), 2),
                    "satisfaction_score": round(rng.uniform(55, 88), 2),
                    "sentiment_score": round(rng.uniform(45, 85), 2),
                    "burnout_signal_score": round(rng.uniform(10, 70), 2),
                    "recognition_coverage_percent": round(rng.uniform(20, 90), 2),
                    "seed_marker": SEED_MARKER,
                }
            )
            perf_rows.append(
                {
                    "id": _doc_id(),
                    "performance_snapshot_id": _doc_id(),
                    "snapshot_date": sd,
                    "department": d,
                    "high_performer_count": rng.randint(5, 35),
                    "low_performer_count": rng.randint(0, 14),
                    "pip_count": rng.randint(0, 9),
                    "average_performance_score": round(rng.uniform(2.8, 4.4), 2),
                    "productivity_score": round(rng.uniform(55, 92), 2),
                    "manager_id": f"MGR-{rng.randint(1, 20):03d}",
                    "seed_marker": SEED_MARKER,
                }
            )
            comp_rows.append(
                {
                    "id": _doc_id(),
                    "compliance_snapshot_id": _doc_id(),
                    "snapshot_date": sd,
                    "department": d,
                    "document_completion_percent": round(rng.uniform(75, 98), 2),
                    "policy_acceptance_percent": round(rng.uniform(70, 99), 2),
                    "certification_compliance_percent": round(rng.uniform(55, 95), 2),
                    "statutory_compliance_percent": round(rng.uniform(80, 99), 2),
                    "exception_count": rng.randint(0, 12),
                    "audit_readiness_score": round(rng.uniform(60, 95), 2),
                    "seed_marker": SEED_MARKER,
                }
            )
            total_cost = round(rng.uniform(2_000_000, 6_000_000), 2)
            cost_rows.append(
                {
                    "id": _doc_id(),
                    "cost_snapshot_id": _doc_id(),
                    "snapshot_date": sd,
                    "department": d,
                    "geography": rng.choice(geos),
                    "total_cost": total_cost,
                    "salary_cost": round(total_cost * rng.uniform(0.7, 0.86), 2),
                    "benefits_cost": round(total_cost * rng.uniform(0.08, 0.2), 2),
                    "cost_per_employee": round(rng.uniform(4500, 14500), 2),
                    "cost_variance_percent": round(rng.uniform(-6, 12), 2),
                    "seed_marker": SEED_MARKER,
                }
            )
    db[COL_ENGAGEMENT_VISIBILITY_RECORDS].insert_many(eng_rows, ordered=False)
    db[COL_PERFORMANCE_VISIBILITY_RECORDS].insert_many(perf_rows, ordered=False)
    db[COL_COMPLIANCE_VISIBILITY_RECORDS].insert_many(comp_rows, ordered=False)
    db[COL_COST_VISIBILITY_RECORDS].insert_many(cost_rows, ordered=False)

    # Plans + demand/supply + scenarios + manager effectiveness
    plan_rows = []
    for bu in bus:
        plan_rows.append(
            {
                "id": _doc_id(),
                "plan_id": _doc_id(),
                "plan_name": f"{bu} FY{now.year} Workforce Plan",
                "plan_period": f"FY{now.year}",
                "business_unit": bu,
                "department": rng.choice(depts),
                "workforce_plan_type": rng.choice(("ANNUAL", "QUARTERLY")),
                "planned_headcount": rng.randint(120, 340),
                "internal_fulfillment_target": rng.randint(40, 80),
                "hiring_target": rng.randint(30, 120),
                "replacement_target": rng.randint(5, 35),
                "status": rng.choice(("DRAFT", "SUBMITTED", "APPROVED")),
                "created_by": "seed",
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )
    db[COL_WORKFORCE_PLANS].insert_many(plan_rows, ordered=False)

    ds_rows = []
    for sd in snapshot_dates[-3:]:
        for s in skills[:8]:
            demand = rng.randint(20, 140)
            supply = rng.randint(10, 150)
            fulfilled = min(demand, int(supply * rng.uniform(0.6, 0.95)))
            gap = max(0, demand - fulfilled)
            ds_rows.append(
                {
                    "id": _doc_id(),
                    "demand_supply_id": _doc_id(),
                    "snapshot_date": sd,
                    "skill_name_or_role": s,
                    "location": rng.choice(geos),
                    "demand_count": demand,
                    "supply_count": supply,
                    "fulfilled_count": fulfilled,
                    "gap_count": gap,
                    "escalation_flag": gap > 25,
                    "seed_marker": SEED_MARKER,
                }
            )
    db[COL_DEMAND_SUPPLY_RECORDS].insert_many(ds_rows, ordered=False)

    scenario_rows = []
    for i in range(6):
        scenario_rows.append(
            {
                "id": _doc_id(),
                "scenario_id": _doc_id(),
                "name": rng.choice(("Attrition Spike", "Hiring Delay", "Budget Constraint", "Skill Shortage", "Location Shift")),
                "inputs": {"attrition_pct": rng.randint(8, 22), "hiring_freeze": rng.choice([True, False]), "budget_delta_pct": rng.randint(-10, 10)},
                "outputs": {"stability_index": round(rng.uniform(0.45, 0.82), 2), "gap_delta": rng.randint(-20, 50)},
                "created_at": _iso(now - timedelta(days=rng.randint(0, 30))),
                "seed_marker": SEED_MARKER,
            }
        )
    db[COL_SCENARIO_MODELS].insert_many(scenario_rows, ordered=False)

    mgr_rows = []
    for sd in snapshot_dates[-3:]:
        for i in range(1, 13):
            mgr_rows.append(
                {
                    "id": _doc_id(),
                    "snapshot_date": sd,
                    "manager_id": f"MGR-{i:03d}",
                    "team_size": rng.randint(6, 28),
                    "team_engagement": round(rng.uniform(55, 90), 2),
                    "team_performance": round(rng.uniform(2.9, 4.5), 2),
                    "team_utilization": round(rng.uniform(55, 90), 2),
                    "attrition_risk": round(rng.uniform(0.05, 0.35), 3),
                    "recognition_coverage": round(rng.uniform(20, 92), 2),
                    "manager_effectiveness_score": round(rng.uniform(55, 92), 2),
                    "seed_marker": SEED_MARKER,
                }
            )
    db[COL_MANAGER_EFFECTIVENESS_RECORDS].insert_many(mgr_rows, ordered=False)

    # Forecasts + predictions + AI recommendations + strategic snapshots + exec snapshots
    forecast_rows = []
    for t in ("HEADCOUNT", "ATTRITION", "SKILL_SUPPLY", "SKILL_DEMAND", "COST"):
        for q in ("Q1", "Q2", "Q3", "Q4"):
            forecast_rows.append(
                {
                    "id": _doc_id(),
                    "forecast_id": _doc_id(),
                    "forecast_type": t,
                    "forecast_period": f"{now.year}-{q}",
                    "dimension_scope": rng.choice(("org", "Engineering", "Sales", "India")),
                    "forecast_payload": {"value": rng.randint(20, 120), "trend": rng.choice(("up", "down", "flat"))},
                    "confidence_score": round(rng.uniform(0.62, 0.92), 2),
                    "generated_on": _iso(now - timedelta(days=rng.randint(0, 10))),
                    "source_type": "mock",
                    "is_mock": True,
                    "seed_marker": SEED_MARKER,
                }
            )
    db[COL_FORECASTS].insert_many(forecast_rows, ordered=False)

    def _pred_rows(col: str, kind: str, n: int):
        rows = []
        for _ in range(n):
            rows.append(
                {
                    "id": _doc_id(),
                    "prediction_id": _doc_id(),
                    "employee_id_or_group": rng.choice(("Engineering", "Sales", "India", f"EMP-{rng.randint(1, 300):04d}")),
                    f"{kind}_score": round(rng.uniform(0.1, 0.95), 3),
                    "risk_factors_payload": {"top": rng.sample(("workload", "compensation", "manager_change", "skill_market", "engagement"), k=3)},
                    "confidence_score": round(rng.uniform(0.55, 0.92), 2),
                    "generated_at": _iso(now - timedelta(days=rng.randint(0, 14))),
                    "source_type": "mock",
                    "is_mock": True,
                    "seed_marker": SEED_MARKER,
                }
            )
        db[col].insert_many(rows, ordered=False)

    _pred_rows(COL_ATTRITION_PREDICTIONS, "predicted_attrition", 40)
    _pred_rows(COL_BURNOUT_PREDICTIONS, "burnout_risk", 40)
    _pred_rows(COL_SKILL_RISK_PREDICTIONS, "skill_risk", 30)
    _pred_rows(COL_COST_RISK_PREDICTIONS, "cost_risk", 25)
    _pred_rows(COL_COMPLIANCE_RISK_PREDICTIONS, "compliance_risk", 25)

    ai_rows = []
    for _ in range(50):
        ai_rows.append(
            {
                "id": _doc_id(),
                "recommendation_id": _doc_id(),
                "recommendation_type": rng.choice(("HIRING", "MOBILITY", "LEARNING", "RETENTION", "REDEPLOYMENT", "ORG_OPTIMIZATION")),
                "target_scope": rng.choice(("org", "Engineering", "India", "MGR-005")),
                "recommendation_payload": {"summary": "Mock recommendation", "actions": ["review gaps", "launch internal mobility", "accelerate training"]},
                "score": round(rng.uniform(0.4, 0.95), 3),
                "expected_impact": rng.choice(("LOW", "MEDIUM", "HIGH")),
                "generated_at": _iso(now - timedelta(days=rng.randint(0, 10))),
                "source_type": "mock",
                "is_mock": True,
                "seed_marker": SEED_MARKER,
            }
        )
    db[COL_AI_RECOMMENDATIONS].insert_many(ai_rows, ordered=False)

    strat_risk = []
    strat_opp = []
    for sd in snapshot_dates[-3:]:
        strat_risk.append(
            {
                "id": _doc_id(),
                "snapshot_date": sd,
                "risk_index": round(rng.uniform(0.35, 0.75), 3),
                "summary_payload": {"top_risks": ["attrition_hotspot", "skill_gap", "cost_pressure"], "notes": "Mock risk intelligence"},
                "seed_marker": SEED_MARKER,
            }
        )
        strat_opp.append(
            {
                "id": _doc_id(),
                "snapshot_date": sd,
                "opportunity_index": round(rng.uniform(0.35, 0.8), 3),
                "summary_payload": {"top_opportunities": ["internal mobility", "cross-skilling", "bench redeploy"], "notes": "Mock opportunity intelligence"},
                "seed_marker": SEED_MARKER,
            }
        )
    db[COL_STRATEGIC_RISK_SNAPSHOTS].insert_many(strat_risk, ordered=False)
    db[COL_STRATEGIC_OPPORTUNITY_SNAPSHOTS].insert_many(strat_opp, ordered=False)

    exec_rows = []
    for sd in snapshot_dates[-3:]:
        exec_rows.append(
            {
                "id": _doc_id(),
                "executive_snapshot_id": _doc_id(),
                "snapshot_date": sd,
                "summary_type": "CXO_WORKFORCE_SUMMARY",
                "summary_payload": {
                    "headline": "CXO workforce decision summary",
                    "kpis": {"utilization": round(rng.uniform(68, 86), 2), "bench": rng.randint(20, 55)},
                    "decisions": ["Approve targeted hiring for critical skills", "Increase internal mobility for bench reduction"],
                },
                "risk_index": round(rng.uniform(0.3, 0.75), 3),
                "opportunity_index": round(rng.uniform(0.35, 0.8), 3),
                "created_at": _iso(now),
                "seed_marker": SEED_MARKER,
            }
        )
    db[COL_EXECUTIVE_SUMMARY_SNAPSHOTS].insert_many(exec_rows, ordered=False)

    db[COL_ACTIVITY_LOGS].insert_one(
        {"id": _doc_id(), "ts": _iso(now), "user_id": "seed", "action": "seed", "entity": "workforce_intelligence", "entity_id": SEED_MARKER, "meta": {"months": months}, "seed_marker": SEED_MARKER}
    )

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

