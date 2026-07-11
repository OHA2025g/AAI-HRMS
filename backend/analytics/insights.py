"""Rule-based executive insights for M9 dashboard."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def _insight(severity: str, title: str, body: str, *, kpi_id: Optional[str] = None, link_path: Optional[str] = None) -> Dict[str, Any]:
    return {
        "severity": severity,
        "title": title,
        "body": body,
        "kpi_id": kpi_id,
        "link_path": link_path,
    }


def generate_insights(
    *,
    dashboard: Dict[str, Any],
    freshness: Optional[Dict[str, Any]] = None,
    talent: Optional[Dict[str, Any]] = None,
    compare: Optional[Dict[str, Any]] = None,
    skill_coverage_scope: str = "org",
) -> List[Dict[str, Any]]:
    insights: List[Dict[str, Any]] = []
    d = dashboard or {}
    ta = talent or {}

    for check in (freshness or {}).get("checks") or []:
        if not check.get("sla_ok"):
            insights.append(
                _insight(
                    "high",
                    f"Stale data: {check.get('source')}",
                    "KPIs depending on this source may be understated. Refresh upstream feeds before leadership review.",
                    link_path="/executive-kpis",
                )
            )

    attrition = float(d.get("attrition_rate_pct") or 0)
    if attrition >= 12:
        insights.append(
            _insight(
                "high",
                "Elevated attrition",
                f"Attrition rate is {attrition}% of total headcount. Review exit trends and retention plans.",
                kpi_id="attrition_rate_pct",
                link_path="/high-skill-talent-retention/dashboard",
            )
        )
    elif attrition >= 8:
        insights.append(
            _insight(
                "medium",
                "Attrition trending high",
                f"Attrition rate is {attrition}%. Monitor critical roles and engagement.",
                kpi_id="attrition_rate_pct",
            )
        )

    coverage = d.get("skill_coverage_pct")
    if coverage is not None:
        cov = float(coverage)
        scope_note = " (filtered scope)" if skill_coverage_scope == "filtered" else ""
        if cov < 60:
            insights.append(
                _insight(
                    "high",
                    "Critical skill coverage gap",
                    f"Skill coverage is {cov}%{scope_note}. Prioritize hiring and upskilling on top gap skills.",
                    kpi_id="skill_coverage_pct",
                    link_path="/workforce-intelligence/dashboard",
                )
            )
        elif cov < 75:
            insights.append(
                _insight(
                    "medium",
                    "Skill coverage below target",
                    f"Coverage at {cov}%{scope_note}. Review workforce skills inventory.",
                    kpi_id="skill_coverage_pct",
                    link_path="/workforce-intelligence/dashboard",
                )
            )

    fgap = int(d.get("forecast_gap_total") or 0)
    if fgap >= 50:
        insights.append(
            _insight(
                "high",
                "Forecast capacity risk",
                f"Forecast skill gap total is {fgap} over the selected horizon. Align hiring plan with WFI.",
                kpi_id="forecast_gap_total",
                link_path="/workforce-intelligence/executive-intelligence",
            )
        )

    pulse = int(d.get("engagement_last_30_days_responses") or 0)
    win = int(d.get("analytics_window_days") or d.get("drill_window_days") or 30)
    if pulse < 30:
        insights.append(
            _insight(
                "medium",
                "Low engagement sample",
                f"Only {pulse} pulse responses in the last {win} days. Engagement average may not be representative.",
                kpi_id="engagement_avg_rating",
                link_path="/employee-satisfaction-engagement/dashboard",
            )
        )

    risk_avg = float(d.get("retention_avg_risk_score") or 0)
    if risk_avg >= 0.65:
        insights.append(
            _insight(
                "high",
                "High retention risk (critical skills)",
                f"Average retention risk score is {risk_avg:.2f}. Review top at-risk employees.",
                kpi_id="retention_avg_risk_score",
                link_path="/high-skill-talent-retention/dashboard",
            )
        )

    ok_r = int(d.get("automation_runs_succeeded_30d") or 0)
    fail_r = int(d.get("automation_runs_failed_30d") or 0)
    total_r = ok_r + fail_r
    if total_r > 0 and fail_r / total_r >= 0.1:
        insights.append(
            _insight(
                "medium",
                "Automation reliability",
                f"{fail_r} failed runs vs {ok_r} successful in window. Check COA automation logs.",
                link_path="/cost-optimization-automation/executive-decision-support",
            )
        )

    conc = ta.get("primary_source_concentration_pct")
    if conc is not None and float(conc) >= 70:
        insights.append(
            _insight(
                "medium",
                "Hiring source concentration",
                f"{conc}% of new candidates come from a single channel. Diversify sourcing.",
                kpi_id="talent_acq_primary_source_concentration_pct",
                link_path="/candidates",
            )
        )

    prec = ta.get("top_match_precision_proxy_pct")
    if prec is not None and float(prec) < 50:
        insights.append(
            _insight(
                "medium",
                "Match quality proxy low",
                f"Top-match precision proxy is {prec}%. Review job requirements and fit scoring.",
                kpi_id="talent_acq_top_match_precision_proxy_pct",
                link_path="/jobs",
            )
        )

    for row in (compare or {}).get("deltas") or []:
        kid = row.get("kpi_id")
        dp = row.get("delta_pct")
        if dp is None:
            continue
        try:
            pct = float(dp)
        except (TypeError, ValueError):
            continue
        if kid == "attrition_rate_pct" and pct >= 15:
            insights.append(
                _insight(
                    "high",
                    "Attrition increased vs prior period",
                    f"Attrition rate up {pct}% compared to {compare.get('against_period')}.",
                    kpi_id=kid,
                )
            )
        if kid == "forecast_gap_total" and pct >= 20:
            insights.append(
                _insight(
                    "medium",
                    "Forecast gap widening",
                    f"Forecast gap up {pct}% vs {compare.get('against_period')}.",
                    kpi_id=kid,
                )
            )

    order = {"high": 0, "medium": 1, "low": 2}
    insights.sort(key=lambda x: order.get(x.get("severity"), 9))
    return insights[:12]
