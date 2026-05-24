"""
Shared strategic / executive dashboard aggregation (M9).

Used by GET /executive/strategic-dashboard, drill-down, KPI pack, and leadership snapshots.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Set

from m7_automation.constants import COL_MANUAL_WORKFLOW_BASELINES, COL_WORKFLOW_RUNS
from m7_automation.savings import baseline_map, compute_savings_totals


def _risk_label(score: float) -> str:
    if score >= 0.7:
        return "HIGH"
    if score >= 0.4:
        return "MEDIUM"
    return "LOW"


async def _merged_skill_rows(db, scope_ids: Optional[Set[str]]) -> List[Dict[str, Any]]:
    skills = await db.workforce_skills.find({}, {"_id": 0, "skill_name_lc": 0}).sort("gap", -1).to_list(500)
    q: Dict[str, Any] = {}
    if scope_ids is not None:
        if not scope_ids:
            return []
        q["id"] = {"$in": list(scope_ids)}
    employees = await db.employees.find(q, {"_id": 0, "skills": 1}).to_list(5000)

    derived_supply: Dict[str, int] = {}
    for e in employees:
        uniq = {s.strip().lower() for s in (e.get("skills") or []) if isinstance(s, str) and s.strip()}
        for s in uniq:
            derived_supply[s] = derived_supply.get(s, 0) + 1

    out: List[Dict[str, Any]] = []
    for row in skills:
        skill_key = (row.get("skill_name") or "").strip().lower()
        auto_supply = derived_supply.get(skill_key, 0)
        manual_supply = max(0, int(row.get("supply_count") or 0))
        merged_supply = max(manual_supply, auto_supply)
        demand = max(0, int(row.get("demand_count") or 0))
        gap = max(0, demand - merged_supply)
        out.append(
            {
                "skill_name": row.get("skill_name"),
                "demand_count": demand,
                "supply_count": merged_supply,
                "gap": gap,
                "priority": str(row.get("priority") or "MEDIUM").upper(),
            }
        )
    out.sort(key=lambda x: x["gap"], reverse=True)
    return out


def _skill_coverage_from_rows(skill_rows: List[Dict[str, Any]]) -> float:
    demand_total = sum(max(0, int(s.get("demand_count") or 0)) for s in skill_rows)
    supply_total = sum(max(0, int(s.get("supply_count") or 0)) for s in skill_rows)
    return round((supply_total / demand_total) * 100, 2) if demand_total else 100.0


async def build_strategic_dashboard_data(
    db,
    *,
    horizon_months: int = 3,
    window_days: int = 30,
    scope_employee_ids: Optional[Set[str]] = None,
    m7_scope: str = "ORG",
) -> Dict[str, Any]:
    """
    m7_scope:
      - ORG: automation totals across all runs (default for scoped drill context).
      - SCOPED: not implemented against runs (no employee on run) — falls back to ORG.
    """
    _ = m7_scope
    horizon_months = max(1, int(horizon_months or 3))
    window_days = max(1, min(int(window_days or 30), 365))
    generated_at = datetime.now(timezone.utc).isoformat()
    now = datetime.now(timezone.utc)
    start_window = (now - timedelta(days=window_days)).isoformat()

    emp_query: Dict[str, Any] = {}
    if scope_employee_ids is not None:
        if not scope_employee_ids:
            # empty scope — zeroed dashboard
            return {
                "generated_at": generated_at,
                "employee_count": 0,
                "active_employee_count": 0,
                "attrition_count": 0,
                "attrition_rate_pct": 0.0,
                "avg_skills_per_employee": 0.0,
                "top_skill_gaps": [],
                "workforce_horizon_months": horizon_months,
                "forecast_gap_total": 0,
                "resource_total_shortage": 0,
                "resource_total_bench": 0,
                "engagement_total_responses": 0,
                "engagement_avg_rating": 0.0,
                "engagement_last_30_days_responses": 0,
                "engagement_sentiment_counts": {"POSITIVE": 0, "NEUTRAL": 0, "NEGATIVE": 0},
                "retention_total_high_skill_employees": 0,
                "retention_avg_risk_score": 0.0,
                "retention_top_risk_employees": [],
                "automation_runs_succeeded_30d": 0,
                "automation_runs_failed_30d": 0,
                "cost_optimization_baselines_count": 0,
                "estimated_manual_minutes_saved_30d": 0.0,
                "estimated_cost_saved_usd_30d": 0.0,
                "drill_window_days": window_days,
                "analytics_window_days": window_days,
                "skill_coverage_pct": 0.0,
                "skill_coverage_scope": "filtered",
            }
        emp_query["id"] = {"$in": list(scope_employee_ids)}

    employee_count = await db.employees.count_documents(emp_query)
    active_employee_count = await db.employees.count_documents(
        {**emp_query, "status": {"$in": ["ACTIVE", "ONBOARDING"]}}
    )
    attrition_count = await db.employees.count_documents({**emp_query, "status": "EXITED"})
    attrition_rate_pct = round((attrition_count / employee_count) * 100, 2) if employee_count else 0.0

    employees_skill_rows = await db.employees.find(emp_query, {"_id": 0, "skills": 1}).to_list(5000)
    total_skill_entries = 0
    for e in employees_skill_rows:
        total_skill_entries += len([s for s in (e.get("skills") or []) if isinstance(s, str) and s.strip()])
    avg_skills_per_employee = round(total_skill_entries / employee_count, 2) if employee_count else 0.0

    skill_rows = await _merged_skill_rows(db, scope_employee_ids)

    top_skill_gaps = [
        {
            "skill_name": s["skill_name"],
            "demand_count": s["demand_count"],
            "supply_count": s["supply_count"],
            "gap": s["gap"],
            "priority": s["priority"],
        }
        for s in skill_rows[:10]
    ]

    priority_mult = {"HIGH": 1.15, "MEDIUM": 1.08, "LOW": 1.03}
    horizon_growth = 1 + min(0.35, 0.06 * max(0, horizon_months - 1))

    forecast_gap_total = 0
    resource_total_shortage = 0
    resource_total_bench = 0

    for s in skill_rows:
        demand_current = max(0, int(s["demand_count"] or 0))
        supply_count = max(0, int(s["supply_count"] or 0))
        priority = str(s["priority"] or "MEDIUM").upper()
        pm = priority_mult.get(priority, 1.08)

        shortage = max(0, demand_current - supply_count)
        bench = max(0, supply_count - demand_current)
        resource_total_shortage += shortage
        resource_total_bench += bench

        gap_ratio = (shortage / (demand_current + 1)) if demand_current > 0 else 0.0
        demand_forecast = int(round(demand_current * pm * (1 + 0.2 * gap_ratio) * horizon_growth))
        forecast_gap_total += max(0, demand_forecast - supply_count)

    # Engagement
    scoped_codes: Optional[Set[str]] = None
    if scope_employee_ids is not None:
        code_rows = await db.employees.find(emp_query, {"_id": 0, "employee_code": 1}).to_list(5000)
        scoped_codes = {str(r.get("employee_code") or "") for r in code_rows if r.get("employee_code")}

    if scoped_codes is not None:
        if not scoped_codes:
            engagement_total_responses = 0
            engagement_last_30_days_responses = 0
            sample = []
            engagement_sentiment_counts = {"POSITIVE": 0, "NEUTRAL": 0, "NEGATIVE": 0}
        else:
            eng_base = {"employee_code": {"$in": list(scoped_codes)}}
            engagement_total_responses = await db.employee_engagement_responses.count_documents(eng_base)
            engagement_last_30_days_responses = await db.employee_engagement_responses.count_documents(
                {**eng_base, "created_at": {"$gte": start_window}}
            )
            sample = (
                await db.employee_engagement_responses.find(eng_base, {"_id": 0, "rating": 1})
                .sort("created_at", -1)
                .limit(5000)
                .to_list(5000)
            )
            engagement_sentiment_counts = {}
            for label in ["POSITIVE", "NEUTRAL", "NEGATIVE"]:
                engagement_sentiment_counts[label] = await db.employee_engagement_responses.count_documents(
                    {**eng_base, "sentiment_label": label}
                )
    else:
        engagement_total_responses = await db.employee_engagement_responses.count_documents({})
        engagement_last_30_days_responses = await db.employee_engagement_responses.count_documents(
            {"created_at": {"$gte": start_window}}
        )
        sample = (
            await db.employee_engagement_responses.find({}, {"_id": 0, "rating": 1})
            .sort("created_at", -1)
            .limit(5000)
            .to_list(5000)
        )
        engagement_sentiment_counts = {}
        for label in ["POSITIVE", "NEUTRAL", "NEGATIVE"]:
            engagement_sentiment_counts[label] = await db.employee_engagement_responses.count_documents(
                {"sentiment_label": label}
            )

    ratings = [int(x.get("rating") or 0) for x in sample]
    engagement_avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0.0

    # Retention heuristic (same as server MVP)
    critical = await db.workforce_skills.find(
        {"priority": "HIGH"},
        {"_id": 0, "skill_name": 1, "priority": 1, "demand_count": 1, "supply_count": 1, "gap": 1},
    ).to_list(200)
    if not critical:
        critical = (
            await db.workforce_skills.find(
                {},
                {"_id": 0, "skill_name": 1, "priority": 1, "demand_count": 1, "supply_count": 1, "gap": 1},
            )
            .sort("gap", -1)
            .limit(5)
            .to_list(50)
        )

    critical_by_name: Dict[str, Dict[str, Any]] = {}
    for c in critical:
        name = (c.get("skill_name") or "").strip().lower()
        demand = max(0, int(c.get("demand_count") or 0))
        supply = max(0, int(c.get("supply_count") or 0))
        shortage = max(0, demand - supply)
        shortage_ratio = round(shortage / demand, 3) if demand > 0 else 0.0
        if name:
            critical_by_name[name] = {"risk_score": shortage_ratio}

    employees_for_risk = await db.employees.find(
        emp_query,
        {"_id": 0, "employee_code": 1, "full_name": 1, "skills": 1},
    ).to_list(5000)

    risk_employees: List[Dict[str, Any]] = []
    for e in employees_for_risk:
        emp_skills = {s.strip().lower() for s in (e.get("skills") or []) if isinstance(s, str) and s.strip()}
        matched_scores = [m["risk_score"] for key, m in critical_by_name.items() if key in emp_skills]
        if not matched_scores:
            continue
        avg_risk = round(sum(matched_scores) / len(matched_scores), 3)
        risk_employees.append(
            {
                "employee_code": e.get("employee_code") or "",
                "full_name": e.get("full_name") or "",
                "risk_label": _risk_label(avg_risk),
                "risk_score": avg_risk,
                "critical_skills_matched": len(matched_scores),
            }
        )

    risk_employees.sort(key=lambda x: x["risk_score"], reverse=True)
    retention_total_high_skill_employees = len(risk_employees)
    retention_avg_risk_score = (
        round(sum(x["risk_score"] for x in risk_employees) / len(risk_employees), 3) if risk_employees else 0.0
    )
    retention_top_risk_employees = risk_employees[:10]

    # M7 — org-wide (runs not attributed to employees in v1)
    since_w = (now - timedelta(days=window_days)).isoformat()
    baselines_m7 = await db[COL_MANUAL_WORKFLOW_BASELINES].find({}, {"_id": 0}).to_list(500)
    bmap_m7 = baseline_map(baselines_m7)
    runs_m7 = await db[COL_WORKFLOW_RUNS].find({"created_at": {"$gte": since_w}}, {"_id": 0}).to_list(5000)
    ok_m7 = [r for r in runs_m7 if (r.get("status") or "").upper() == "SUCCESS"]
    fail_m7 = [r for r in runs_m7 if (r.get("status") or "").upper() == "FAILED"]
    totals_m7 = compute_savings_totals(successful_runs=ok_m7, baselines=bmap_m7)

    skill_coverage_pct = _skill_coverage_from_rows(skill_rows)
    skill_coverage_scope = "filtered" if scope_employee_ids is not None else "org"

    return {
        "generated_at": generated_at,
        "employee_count": employee_count,
        "active_employee_count": active_employee_count,
        "attrition_count": attrition_count,
        "attrition_rate_pct": attrition_rate_pct,
        "avg_skills_per_employee": avg_skills_per_employee,
        "top_skill_gaps": top_skill_gaps,
        "workforce_horizon_months": horizon_months,
        "forecast_gap_total": forecast_gap_total,
        "resource_total_shortage": resource_total_shortage,
        "resource_total_bench": resource_total_bench,
        "engagement_total_responses": engagement_total_responses,
        "engagement_avg_rating": engagement_avg_rating,
        "engagement_last_30_days_responses": engagement_last_30_days_responses,
        "engagement_sentiment_counts": engagement_sentiment_counts,
        "retention_total_high_skill_employees": retention_total_high_skill_employees,
        "retention_avg_risk_score": retention_avg_risk_score,
        "retention_top_risk_employees": retention_top_risk_employees,
        "automation_runs_succeeded_30d": len(ok_m7),
        "automation_runs_failed_30d": len(fail_m7),
        "cost_optimization_baselines_count": len(baselines_m7),
        "estimated_manual_minutes_saved_30d": float(totals_m7["estimated_minutes_saved"]),
        "estimated_cost_saved_usd_30d": float(totals_m7["estimated_cost_saved_usd"]),
        "drill_window_days": window_days,
        "analytics_window_days": window_days,
        "skill_coverage_pct": skill_coverage_pct,
        "skill_coverage_scope": skill_coverage_scope,
    }
