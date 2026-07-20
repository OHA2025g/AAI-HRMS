"""Alert rules for Smart Hiring Dashboard."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, TYPE_CHECKING

from talent_acquisition.hiring_constants import pipeline_path_for_stage
from talent_acquisition.hiring_threshold_config import (
    get_low_fit_threshold,
    get_stage_sla_days,
    get_stuck_critical_count,
)

if TYPE_CHECKING:
    from talent_acquisition.hiring_dashboard_config import HiringDashboardConfig, DEFAULT_RULE_FLAGS


def build_hiring_alerts(
    *,
    stuck_by_stage: Dict[str, int],
    req_aging_over_60: int,
    req_aging_over_90: int,
    jobs_without_pipeline: int,
    low_fit_jobs: int,
    jobs_without_ai_matches: int = 0,
    high_fit_candidates_7d: int = 0,
    low_fit_job_id: str | None = None,
    stale_req_zero_interviews: int = 0,
    dashboard_config: Optional["HiringDashboardConfig"] = None,
) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    from talent_acquisition.hiring_dashboard_config import DEFAULT_RULE_FLAGS, rule_flag_enabled

    rule_flags = (
        dashboard_config.rule_flags
        if dashboard_config and getattr(dashboard_config, "rule_flags", None)
        else DEFAULT_RULE_FLAGS
    )
    stage_sla = (
        dashboard_config.stage_sla_days if dashboard_config else get_stage_sla_days()
    )
    stuck_critical = (
        dashboard_config.stuck_critical_count if dashboard_config else get_stuck_critical_count()
    )
    low_fit_threshold = (
        dashboard_config.low_fit_threshold if dashboard_config else get_low_fit_threshold()
    )

    if stale_req_zero_interviews > 0 and rule_flag_enabled(rule_flags, "stale_req"):
        alerts.append(
            {
                "id": "stale-req-zero-interviews",
                "severity": "critical",
                "title": "Stale reqs with no interviews",
                "message": (
                    f"{stale_req_zero_interviews} open job(s) older than "
                    f"{dashboard_config.stale_req_zero_interviews_days if dashboard_config else 90} days "
                    "with zero candidates in interview stages."
                ),
                "action_path": "/jobs?status=OPEN",
                "count": stale_req_zero_interviews,
            }
        )

    if rule_flag_enabled(rule_flags, "stale_req"):
        if req_aging_over_90 > 0:
            alerts.append(
                {
                    "id": "req-aging-over-90",
                    "severity": "critical",
                    "title": "Stale open requisitions",
                    "message": f"{req_aging_over_90} job(s) open more than 90 days with little progress.",
                    "action_path": "/jobs?status=OPEN",
                    "count": req_aging_over_90,
                }
            )
        elif req_aging_over_60 > 0:
            alerts.append(
                {
                    "id": "req-aging-over-60",
                    "severity": "warning",
                    "title": "Aging open requisitions",
                    "message": f"{req_aging_over_60} job(s) open more than 60 days.",
                    "action_path": "/jobs?status=OPEN",
                    "count": req_aging_over_60,
                }
            )

    if rule_flag_enabled(rule_flags, "stuck_stage"):
        for stage, sla in stage_sla.items():
            n = int(stuck_by_stage.get(stage) or 0)
            if n <= 0:
                continue
            sev = "critical" if n >= stuck_critical else "warning"
            label = stage.replace("_", " ").title()
            alerts.append(
                {
                    "id": f"stuck-{stage}",
                    "severity": sev,
                    "title": f"Stuck in {label}",
                    "message": f"{n} candidate(s) in {label} longer than {sla} days.",
                    "action_path": pipeline_path_for_stage(stage),
                    "count": n,
                }
            )

    if jobs_without_pipeline > 0 and rule_flag_enabled(rule_flags, "no_pipeline"):
        alerts.append(
            {
                "id": "jobs-without-pipeline",
                "severity": "info",
                "title": "Jobs without pipeline activity",
                "message": f"{jobs_without_pipeline} open job(s) have no applications yet.",
                "action_path": "/jobs?status=OPEN",
                "count": jobs_without_pipeline,
            }
        )

    if jobs_without_ai_matches > 0 and rule_flag_enabled(rule_flags, "no_ai_matches"):
        alerts.append(
            {
                "id": "jobs-without-ai-matches",
                "severity": "warning",
                "title": "Jobs without AI matches",
                "message": f"{jobs_without_ai_matches} open job(s) have no fit scores yet — run Find Matches.",
                "action_path": "/jobs?status=OPEN&without_matches=1",
                "count": jobs_without_ai_matches,
            }
        )

    if high_fit_candidates_7d > 0 and rule_flag_enabled(rule_flags, "high_fit_recent"):
        alerts.append(
            {
                "id": "new-high-fit-candidates-7d",
                "severity": "info",
                "title": "New high-fit candidates",
                "message": f"{high_fit_candidates_7d} candidate(s) with fit ≥ 90% applied in the last 7 days.",
                "action_path": "/candidates?fit_min=90",
                "count": high_fit_candidates_7d,
            }
        )

    if low_fit_jobs > 0 and rule_flag_enabled(rule_flags, "low_fit"):
        low_fit_path = (
            f"/jobs/{low_fit_job_id}?tab=matches"
            if low_fit_job_id
            else "/jobs?status=OPEN&low_fit=1"
        )
        alerts.append(
            {
                "id": "low-fit-jobs",
                "severity": "info",
                "title": "Low AI match quality",
                "message": f"{low_fit_jobs} open job(s) have average fit below {int(low_fit_threshold)}%.",
                "action_path": low_fit_path,
                "count": low_fit_jobs,
            }
        )

    return alerts[:8]


def compute_health_score(
    *,
    funnel_conversion_to_interview: float | None,
    avg_fit: float | None,
    req_aging_over_60: int,
    open_jobs: int,
    stuck_total: int,
) -> tuple[int | None, str | None]:
    """Return (score, status). When there is no hiring activity, return (None, None)
    so empty databases do not show a fabricated baseline of 72 / Moderate Risk.
    """
    has_activity = (
        funnel_conversion_to_interview is not None
        or avg_fit is not None
        or open_jobs > 0
        or stuck_total > 0
        or req_aging_over_60 > 0
    )
    if not has_activity:
        return None, None

    score = 72
    if funnel_conversion_to_interview is not None:
        if funnel_conversion_to_interview >= 15:
            score += 10
        elif funnel_conversion_to_interview < 5:
            score -= 12
    if avg_fit is not None:
        if avg_fit >= 70:
            score += 8
        elif avg_fit < 45:
            score -= 10
    if open_jobs > 0:
        aging_ratio = req_aging_over_60 / max(open_jobs, 1)
        score -= int(min(20, aging_ratio * 40))
    score -= min(15, stuck_total // 5)
    score = max(0, min(100, score))
    if score >= 75:
        status = "ok"
    elif score >= 55:
        status = "watch"
    else:
        status = "critical"
    return score, status
