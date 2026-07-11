"""Rule-based executive narrative for leadership review (M9)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def build_executive_narrative(
    *,
    dashboard: Optional[Dict[str, Any]] = None,
    insights: Optional[List[Dict[str, Any]]] = None,
    compare: Optional[Dict[str, Any]] = None,
    trends: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Deterministic narrative (no LLM). Suitable for UI panel and PDF export.
    """
    d = dashboard or {}
    bullets: List[str] = []
    highlights: List[str] = []

    active = d.get("active_employee_count")
    attrition = d.get("attrition_rate_pct")
    coverage = d.get("skill_coverage_pct")
    engagement = d.get("engagement_avg_rating")
    retention = d.get("retention_avg_risk_score")
    forecast_gap = d.get("forecast_gap_total")

    if active is not None:
        highlights.append(f"Active headcount is {active} with {d.get('employee_count', '—')} total employee records in scope.")
    if attrition is not None:
        bullets.append(
            f"Attrition rate stands at {attrition}%"
            + (" — above leadership watch levels." if float(attrition) >= 8 else ".")
        )
    if coverage is not None:
        scope = d.get("skill_coverage_scope") or "org"
        bullets.append(
            f"Skill coverage is {coverage}% ({'filtered scope' if scope == 'filtered' else 'organization-wide'})."
        )
    if engagement is not None:
        pulses = d.get("engagement_last_30_days_responses") or 0
        bullets.append(f"Engagement averages {engagement} across {pulses} pulse responses in the analytics window.")
    if retention is not None:
        bullets.append(f"Average retention risk score is {retention} among high-skill profiles.")
    if forecast_gap is not None:
        bullets.append(f"Forecast skill gap totals {forecast_gap} over the selected horizon.")

    # Compare deltas
    if compare and compare.get("found") and compare.get("deltas"):
        notable = []
        for row in compare["deltas"]:
            kid = row.get("kpi_id")
            dp = row.get("delta_pct")
            if dp is None or kid in ("employee_count", "headcount_active", "active_employee_count"):
                continue
            if abs(float(dp)) >= 5:
                notable.append(f"{kid} moved {dp:+.1f}% vs {compare.get('against_period') or 'prior period'}")
        if notable:
            bullets.append("Period-over-period: " + "; ".join(notable[:4]) + ".")

    series = (trends or {}).get("series") or []
    if len(series) >= 2:
        first, last = series[0], series[-1]
        if first.get("active_employee_count") and last.get("active_employee_count"):
            highlights.append(
                f"Headcount trend from {first.get('period')} ({first.get('active_employee_count')}) "
                f"to {last.get('period')} ({last.get('active_employee_count')})."
            )

    insight_items = insights or []
    if insight_items:
        bullets.append(
            f"{len(insight_items)} item(s) need attention — top priority: {insight_items[0].get('title', 'review insights')}."
        )
    else:
        bullets.append("No critical insight alerts for the current scope and period.")

    summary = " ".join(highlights) if highlights else "Executive KPI snapshot for the selected filters and reporting window."
    if not bullets:
        bullets.append("All primary indicators are within configured thresholds.")

    return {
        "generated_by": "rule_based_v1",
        "summary": summary,
        "bullets": bullets[:8],
        "insight_count": len(insight_items),
    }
