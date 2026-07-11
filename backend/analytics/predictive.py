"""ML-style predictive views for executive dashboard (M9): attrition + retention forecasts."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from retention.constants import COL_ATTRITION_SCORES_LATEST
from analytics.drill_scope import resolve_drill_scope_ids
from analytics.trends import get_kpi_trends

PREDICTIVE_MODEL_VERSION = "m9-predictive-v1-linear-m8"


def _period_add_months(period: str, delta: int) -> str:
    y, m = int(period[:4]), int(period[5:7])
    m += delta
    while m > 12:
        m -= 12
        y += 1
    while m < 1:
        m += 12
        y -= 1
    return f"{y:04d}-{m:02d}"


def _linear_forecast(values: List[float], periods_ahead: int) -> Tuple[List[float], str]:
    """Least-squares line on index 0..n-1; returns projected values and direction."""
    n = len(values)
    if n < 2:
        base = values[-1] if values else 0.0
        return [base] * periods_ahead, "stable"
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    num = sum((xs[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    den = sum((xs[i] - mean_x) ** 2 for i in range(n)) or 1.0
    slope = num / den
    intercept = mean_y - slope * mean_x
    out = []
    for i in range(periods_ahead):
        x = n + i
        out.append(round(intercept + slope * x, 2))
    if slope > 0.15:
        direction = "rising"
    elif slope < -0.15:
        direction = "falling"
    else:
        direction = "stable"
    return out, direction


def _build_attrition_forecast(
    *,
    trends: Dict[str, Any],
    horizon_months: int,
    active_headcount: int,
) -> Dict[str, Any]:
    series = trends.get("series") or []
    history: List[Dict[str, Any]] = []
    rates: List[float] = []
    for row in series:
        p = row.get("period")
        rate = row.get("attrition_rate_pct")
        if p is None or rate is None:
            continue
        history.append(
            {
                "period": p,
                "attrition_rate_pct": rate,
                "active_employee_count": row.get("active_employee_count"),
                "kind": "actual",
            }
        )
        rates.append(float(rate))

    horizon_months = max(1, min(int(horizon_months or 3), 12))
    last_period = history[-1]["period"] if history else datetime.now(timezone.utc).strftime("%Y-%m")
    current_rate = rates[-1] if rates else 0.0

    if len(rates) >= 2:
        projected_rates, direction = _linear_forecast(rates, horizon_months)
    else:
        projected_rates = [current_rate] * horizon_months
        direction = "stable"

    projections: List[Dict[str, Any]] = []
    for i, rate in enumerate(projected_rates):
        period = _period_add_months(last_period, i + 1)
        predicted_exits = (
            max(0, int(round((rate / 100.0) * max(active_headcount, 1))))
            if active_headcount
            else None
        )
        projections.append(
            {
                "period": period,
                "attrition_rate_pct": rate,
                "predicted_exits": predicted_exits,
                "kind": "forecast",
                "confidence": "medium" if len(rates) >= 4 else "low",
            }
        )

    return {
        "method": "linear_trend_on_monthly_snapshots",
        "history": history,
        "projections": projections,
        "current_rate_pct": current_rate,
        "projected_rate_pct": projected_rates[-1] if projected_rates else current_rate,
        "trend_direction": direction,
        "horizon_months": horizon_months,
    }


async def _build_retention_forecast(
    db,
    *,
    scope_ids: Optional[Set[str]],
    horizon_months: int,
    window_days: int,
) -> Dict[str, Any]:
    """Aggregate M8 attrition scores; fallback to empty with note if unscored."""
    emp_query: Dict[str, Any] = {"status": {"$in": ["ACTIVE", "ONBOARDING"]}}
    if scope_ids is not None:
        emp_query["id"] = {"$in": list(scope_ids)}

    employees = await db.employees.find(
        emp_query,
        {"_id": 0, "id": 1, "employee_code": 1, "department": 1, "full_name": 1},
    ).to_list(5000)
    emp_ids = {str(e["id"]) for e in employees if e.get("id")}
    id_to_dept = {str(e["id"]): e.get("department") or "Unknown" for e in employees if e.get("id")}

    score_query: Dict[str, Any] = {}
    if emp_ids:
        score_query["employee_id"] = {"$in": list(emp_ids)}

    scores = await db[COL_ATTRITION_SCORES_LATEST].find(
        score_query,
        {"_id": 0, "employee_id": 1, "attrition_risk": 1, "risk_band": 1, "department": 1},
    ).to_list(5000)

    band_counts: Dict[str, int] = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    dept_risk_sum: Dict[str, float] = {}
    dept_count: Dict[str, int] = {}
    risk_sum = 0.0

    for s in scores:
        risk = float(s.get("attrition_risk") or 0)
        band = str(s.get("risk_band") or "LOW").upper()
        if band not in band_counts:
            band = "LOW"
        band_counts[band] = band_counts.get(band, 0) + 1
        risk_sum += risk
        eid = str(s.get("employee_id") or "")
        dept = s.get("department") or id_to_dept.get(eid, "Unknown")
        dept_risk_sum[dept] = dept_risk_sum.get(dept, 0.0) + risk
        dept_count[dept] = dept_count.get(dept, 0) + 1

    scored = len(scores)
    active_n = len(employees)
    avg_risk = round(risk_sum / scored, 3) if scored else None

    # 90-day exit proxy: sum of individual risks * active headcount calibration
    horizon_months = max(1, min(int(horizon_months or 3), 12))
    days = min(int(window_days or 30), 365)
    horizon_factor = horizon_months / 3.0
    if scored:
        predicted_exits = max(0, int(round(sum(float(s.get("attrition_risk") or 0) for s in scores) * horizon_factor * 0.35)))
        low = max(0, int(predicted_exits * 0.7))
        high = max(predicted_exits, int(predicted_exits * 1.35) + 1)
    else:
        predicted_exits = low = high = 0

    dept_forecasts: List[Dict[str, Any]] = []
    for dept, cnt in sorted(dept_count.items(), key=lambda x: -x[1]):
        avg = dept_risk_sum[dept] / cnt
        dept_forecasts.append(
            {
                "department": dept,
                "scored_employees": cnt,
                "avg_attrition_risk": round(avg, 3),
                "predicted_exits": max(0, int(round(avg * cnt * horizon_factor * 0.35))),
            }
        )

    method = "m8_attrition_risk_aggregate"
    if scored == 0:
        method = "m8_scores_unavailable"

    return {
        "method": method,
        "model_source": "m8_attrition_scores_latest",
        "active_employees": active_n,
        "scored_employees": scored,
        "avg_attrition_risk": avg_risk,
        "high_risk_count": band_counts.get("HIGH", 0),
        "medium_risk_count": band_counts.get("MEDIUM", 0),
        "low_risk_count": band_counts.get("LOW", 0),
        "risk_band_distribution": [{"band": k, "count": v} for k, v in band_counts.items()],
        "prediction_window_days": days,
        "predicted_exits_window": predicted_exits,
        "predicted_exits_window_low": low,
        "predicted_exits_window_high": high,
        "predicted_exits_horizon_months": horizon_months,
        "department_forecasts": dept_forecasts[:8],
    }


def _predictive_insights(
    attrition: Dict[str, Any],
    retention: Dict[str, Any],
) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    direction = attrition.get("trend_direction")
    proj = attrition.get("projected_rate_pct")
    cur = attrition.get("current_rate_pct")
    if direction == "rising" and proj is not None and cur is not None and proj > cur + 0.5:
        items.append(
            {
                "severity": "warn",
                "title": "Attrition forecast rising",
                "message": f"Linear trend projects attrition from {cur}% to {proj}% over the forecast horizon.",
                "kpi_id": "attrition_rate_pct",
            }
        )
    high = retention.get("high_risk_count") or 0
    if high >= 5:
        items.append(
            {
                "severity": "warn",
                "title": "Elevated high-risk population",
                "message": f"{high} employees scored HIGH attrition risk on the latest M8 model run.",
                "kpi_id": "retention_avg_risk_score",
            }
        )
    if retention.get("method") == "m8_scores_unavailable":
        items.append(
            {
                "severity": "info",
                "title": "Run retention scoring",
                "message": "No M8 attrition scores found for this scope. Run POST /workforce/retention/v1/score-run to enable retention forecasts.",
                "kpi_id": "retention_avg_risk_score",
            }
        )
    return items


async def get_executive_predictive_views(
    db,
    *,
    horizon_months: int = 3,
    window_days: int = 30,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
    trends_months: int = 12,
) -> Dict[str, Any]:
    scope_ids = await resolve_drill_scope_ids(
        db,
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )
    trends = await get_kpi_trends(
        db,
        months=trends_months,
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )

    emp_query: Dict[str, Any] = {"status": {"$in": ["ACTIVE", "ONBOARDING"]}}
    if scope_ids is not None:
        emp_query["id"] = {"$in": list(scope_ids)}
    active_headcount = await db.employees.count_documents(emp_query)

    attrition_fc = _build_attrition_forecast(
        trends=trends,
        horizon_months=horizon_months,
        active_headcount=active_headcount,
    )
    retention_fc = await _build_retention_forecast(
        db,
        scope_ids=scope_ids,
        horizon_months=horizon_months,
        window_days=window_days,
    )

    scope_label = "organization"
    if department:
        scope_label = f"department:{department}"
    elif manager_root_id:
        scope_label = "manager_subtree"
    elif role_title_contains:
        scope_label = "role_filter"

    return {
        "model_version": PREDICTIVE_MODEL_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "horizon_months": horizon_months,
        "window_days": window_days,
        "scope_label": scope_label,
        "active_headcount": active_headcount,
        "attrition_forecast": attrition_fc,
        "retention_forecast": retention_fc,
        "insights": _predictive_insights(attrition_fc, retention_fc),
    }
