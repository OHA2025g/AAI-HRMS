"""M9 orchestration: KPI pack, merged definitions, cached drill dashboard."""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Dict, List, Optional, Tuple

from analytics.constants import COL_M9_KPI_DEFINITIONS, DRILL_DASHBOARD_CACHE_TTL_SEC, CATALOG_VERSION
from analytics.drill_scope import resolve_drill_scope_ids
from analytics.freshness import compute_source_freshness
from analytics.kpi_catalog import default_kpi_definitions
from analytics.strategic_aggregate import _merged_skill_rows, build_strategic_dashboard_data
from analytics.compare import compare_snapshots
from analytics.insights import generate_insights
from analytics.talent_kpis import compute_talent_acquisition_metrics
from analytics.threshold_config import load_merged_threshold_rules
from analytics.thresholds import attach_status_to_values, automation_fail_rate_pct, evaluate_status

_drill_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}


def _cache_key(parts: Dict[str, Any]) -> str:
    raw = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def load_merged_kpi_definitions(db) -> List[Dict[str, Any]]:
    defaults = {d["kpi_id"]: dict(d) for d in default_kpi_definitions()}
    overrides = await db[COL_M9_KPI_DEFINITIONS].find({}, {"_id": 0}).to_list(500)
    override_ids = {row.get("kpi_id") for row in overrides if row.get("kpi_id")}
    for row in overrides:
        kid = row.get("kpi_id")
        if not kid:
            continue
        base = defaults.get(kid, {"kpi_id": kid})
        merged = {**base, **{k: v for k, v in row.items() if v is not None and k != "_id"}}
        merged["has_override"] = True
        defaults[kid] = merged
    for kid, row in defaults.items():
        row.setdefault("has_override", kid in override_ids)
    return sorted(defaults.values(), key=lambda x: x["kpi_id"])


async def get_kpi_pack(db, *, horizon_months: int = 3, window_days: int = 30) -> Dict[str, Any]:
    definitions = await load_merged_kpi_definitions(db)
    data = await build_strategic_dashboard_data(
        db,
        horizon_months=horizon_months,
        window_days=window_days,
        scope_employee_ids=None,
    )
    rows = await _merged_skill_rows(db, None)
    hiring_demand_total = sum(max(0, int(s["demand_count"] or 0)) for s in rows)
    workforce_supply_total = sum(max(0, int(s["supply_count"] or 0)) for s in rows)
    skill_coverage_pct = (
        round((workforce_supply_total / hiring_demand_total) * 100, 2) if hiring_demand_total else 100.0
    )

    freshness = await compute_source_freshness(db)
    talent = await compute_talent_acquisition_metrics(db, window_days=window_days)
    gen = data["generated_at"]
    values: Dict[str, Any] = {
        "headcount_total": {"value": data["employee_count"], "unit": "count", "as_of": gen, "source": "employees"},
        "headcount_active": {
            "value": data["active_employee_count"],
            "unit": "count",
            "as_of": gen,
            "source": "employees",
        },
        "attrition_rate_pct": {
            "value": data["attrition_rate_pct"],
            "unit": "percent",
            "as_of": gen,
            "source": "employees",
        },
        "skill_coverage_pct": {
            "value": skill_coverage_pct,
            "unit": "percent",
            "as_of": gen,
            "source": "workforce_skills+employees",
        },
        "forecast_gap_total": {
            "value": data["forecast_gap_total"],
            "unit": "count",
            "as_of": gen,
            "source": "composite",
        },
        "engagement_avg_rating": {
            "value": data["engagement_avg_rating"],
            "unit": "score",
            "as_of": gen,
            "source": "employee_engagement_responses",
        },
        "retention_avg_risk_score": {
            "value": data["retention_avg_risk_score"],
            "unit": "score",
            "as_of": gen,
            "source": "composite",
        },
        "automation_estimated_usd_saved_30d": {
            "value": data["estimated_cost_saved_usd_30d"],
            "unit": "usd",
            "as_of": gen,
            "source": "workflow_automation_runs",
            "note": f"Window is {window_days} days (field id kept for backward compatibility).",
        },
        "talent_acq_dedup_audit_count_window": {
            "value": talent["dedup_audit_events_in_window"],
            "unit": "count",
            "as_of": talent["as_of"],
            "source": "candidate_dedup_audit",
            "note": f"Window {talent['window_days']}d",
        },
        "talent_acq_primary_source_concentration_pct": {
            "value": talent["primary_source_concentration_pct"],
            "unit": "percent",
            "as_of": talent["as_of"],
            "source": "candidates",
            "note": "null if no candidates in window",
        },
        "talent_acq_top_match_precision_proxy_pct": {
            "value": talent["top_match_precision_proxy_pct"],
            "unit": "percent",
            "as_of": talent["as_of"],
            "source": "fit_scores",
            "note": "null if no fit_scores in window",
        },
    }
    fail_rate = automation_fail_rate_pct(
        data["automation_runs_succeeded_30d"],
        data["automation_runs_failed_30d"],
    )
    if fail_rate is not None:
        values["automation_fail_rate_pct"] = {
            "value": fail_rate,
            "unit": "percent",
            "as_of": gen,
            "source": "workflow_automation_runs",
        }

    threshold_rules = await load_merged_threshold_rules(db)
    values_with_status = attach_status_to_values(values, threshold_rules)
    insights = generate_insights(
        dashboard=data,
        freshness=freshness,
        talent=talent,
        skill_coverage_scope="org",
    )

    return {
        "catalog_version": CATALOG_VERSION,
        "definitions": definitions,
        "values": values_with_status,
        "freshness": freshness,
        "horizon_months": horizon_months,
        "window_days": window_days,
        "talent_acquisition": talent,
        "insights": insights,
        "strategic_summary": {
            "generated_at": gen,
            "skill_coverage_pct": skill_coverage_pct,
            "skill_coverage_scope": "org",
        },
    }


async def get_drill_dashboard_cached(
    db,
    *,
    horizon_months: int,
    window_days: int,
    department: Optional[str],
    manager_root_id: Optional[str],
    role_title_contains: Optional[str],
    compare_period: Optional[str] = None,
    compare_against: Optional[str] = None,
) -> Dict[str, Any]:
    key = _cache_key(
        {
            "v": 2,
            "h": horizon_months,
            "w": window_days,
            "d": department,
            "m": manager_root_id,
            "r": role_title_contains,
            "cp": compare_period,
            "ca": compare_against,
        }
    )
    now = time.monotonic()
    hit = _drill_cache.get(key)
    if hit and (now - hit[0]) < DRILL_DASHBOARD_CACHE_TTL_SEC:
        out = dict(hit[1])
        out["cache"] = {"hit": True, "ttl_sec": DRILL_DASHBOARD_CACHE_TTL_SEC}
        return out

    scope_ids = await resolve_drill_scope_ids(
        db,
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )
    data = await build_strategic_dashboard_data(
        db,
        horizon_months=horizon_months,
        window_days=window_days,
        scope_employee_ids=scope_ids,
    )
    talent = await compute_talent_acquisition_metrics(db, window_days=window_days)
    freshness = await compute_source_freshness(db)

    compare = None
    if compare_period:
        compare = await compare_snapshots(db, period=compare_period, against_period=compare_against)

    threshold_rules = await load_merged_threshold_rules(db)
    metric_status = {
        "attrition_rate_pct": evaluate_status("attrition_rate_pct", data.get("attrition_rate_pct"), threshold_rules),
        "skill_coverage_pct": evaluate_status("skill_coverage_pct", data.get("skill_coverage_pct"), threshold_rules),
        "forecast_gap_total": evaluate_status("forecast_gap_total", data.get("forecast_gap_total"), threshold_rules),
        "retention_avg_risk_score": evaluate_status(
            "retention_avg_risk_score", data.get("retention_avg_risk_score"), threshold_rules
        ),
        "engagement_avg_rating": evaluate_status(
            "engagement_avg_rating", data.get("engagement_avg_rating"), threshold_rules
        ),
    }

    insights = generate_insights(
        dashboard=data,
        freshness=freshness,
        talent=talent,
        compare=compare,
        skill_coverage_scope=str(data.get("skill_coverage_scope") or "org"),
    )

    payload = {
        "filters": {
            "department": department,
            "manager_root_id": manager_root_id,
            "role_title_contains": role_title_contains,
        },
        "scope_employee_count": len(scope_ids) if scope_ids is not None else None,
        "dashboard": data,
        "talent_acquisition": talent,
        "freshness": freshness,
        "insights": insights,
        "metric_status": metric_status,
        "compare": compare,
        "cache": {"hit": False, "ttl_sec": DRILL_DASHBOARD_CACHE_TTL_SEC},
    }
    _drill_cache[key] = (now, payload)
    return payload


async def drill_filter_options(db) -> Dict[str, Any]:
    depts = await db.employees.distinct("department")
    depts = sorted({str(d).strip() for d in depts if d and str(d).strip()})

    all_emp = await db.employees.find({}, {"_id": 0, "id": 1, "full_name": 1, "department": 1, "manager_id": 1}).to_list(
        10000
    )
    has_reports: Set[str] = set()
    for e in all_emp:
        mid = e.get("manager_id")
        if mid and str(mid):
            has_reports.add(str(mid))

    managers: List[Dict[str, Any]] = []
    for e in all_emp:
        eid = str(e.get("id") or "")
        if eid and eid in has_reports:
            managers.append(
                {
                    "id": eid,
                    "full_name": e.get("full_name") or "",
                    "department": e.get("department") or "",
                }
            )
    managers.sort(key=lambda x: (x.get("department") or "", x.get("full_name") or ""))
    return {"departments": depts, "manager_roots": managers[:200]}
