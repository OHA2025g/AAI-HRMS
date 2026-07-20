"""Rule-based insights and derived metrics for Smart Hiring Dashboard revamp."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from talent_acquisition.hiring_alerts import compute_health_score
from talent_acquisition.hiring_dashboard_schemas import (
    AiInsightItem,
    AiRecommendation,
    AnalyticsSummaryItem,
    DepartmentRiskRow,
    HeroRiskMetrics,
    OfferInsight,
    OfferPriorityAction,
    RecruiterPerformanceRow,
    SignalRecommendation,
    SignalStrengthItem,
    SmartActionItem,
    TabKpis,
    TabKpisAnalytics,
    TabKpisInterviews,
    TabKpisOffers,
    TabKpisPipeline,
    TalentIntelligenceItem,
    TalentQualityOverview,
)
from talent_acquisition.hiring_threshold_config import get_monthly_hire_target
from talent_acquisition.job_org_fields import effective_job_org


def department_label_from_job(job: Dict[str, Any]) -> str:
    org = effective_job_org(job)
    return str(
        org.get("business_department")
        or org.get("department")
        or job.get("business_department")
        or job.get("department")
        or "Unassigned"
    )


def _val(obj: Any, key: str, default: Any = None) -> Any:
    """Read a field from a dict or Pydantic model without falsy-value fallthrough bugs."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def shorten_action_label(label: str, max_words: int = 3) -> str:
    """Keep CTA buttons compact (2–3 words) for dashboard insight cards."""
    text = " ".join(str(label or "View Details").split()).strip()
    if not text:
        return "View Details"
    words = text.split(" ")
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words])


def build_hero_risk_metrics(
    *,
    over_60: int,
    over_90: int,
    stale_zero_interviews: int,
    high_fit_awaiting: int,
) -> HeroRiskMetrics:
    return HeroRiskMetrics(
        reqs_at_risk=over_60 + over_90,
        jobs_miss_sla=stale_zero_interviews,
        high_fit_awaiting_review=high_fit_awaiting,
    )


def build_ai_recommendation(alerts: List[Dict[str, Any]], impact_days: int = 14) -> Optional[AiRecommendation]:
    if not alerts:
        return None
    top = alerts[0]
    return AiRecommendation(
        title=str(top.get("title") or "Take action on hiring pipeline"),
        message=str(top.get("message") or ""),
        impact_days=impact_days,
        action_path=top.get("action_path"),
    )


def build_ai_insights(alerts: List[Dict[str, Any]], limit: int = 4) -> List[AiInsightItem]:
    severity_map = {"critical": "red", "warning": "orange", "info": "blue"}
    out: List[AiInsightItem] = []
    for alert in alerts[:limit]:
        sev = alert.get("severity") or "info"
        out.append(
            AiInsightItem(
                severity=severity_map.get(sev, "blue"),
                title=str(alert.get("title") or ""),
                message=str(alert.get("message") or ""),
                action_label=shorten_action_label("Take Action" if sev == "critical" else "View Details"),
                action_path=alert.get("action_path"),
            )
        )
    if len(out) < limit and out:
        last = out[-1]
        out.append(
            AiInsightItem(
                severity="green",
                title="Continue monitoring hiring health",
                message="Review trends weekly to catch regressions early.",
                action_label="View Trend",
                action_path="/dashboard?tab=analytics",
            )
        )
    return out[:limit]


def compute_offer_acceptance_pct(offer_status_counts: List[Any]) -> Optional[float]:
    counts = {_val(r, "status"): int(_val(r, "count") or 0) for r in offer_status_counts}
    accepted = int(counts.get("ACCEPTED") or 0)
    declined = int(counts.get("DECLINED") or 0)
    sent = int(counts.get("SENT") or 0)
    denom = accepted + declined + sent
    if denom <= 0:
        return None
    return round(100.0 * accepted / denom, 2)


def compute_expected_hires(
    *,
    window_days: int,
    hires_in_window: int,
    pending_offers: int,
    interview_ready: int,
    monthly_target: Optional[int] = None,
) -> int:
    # Empty pipeline: do not invent expected hires from the monthly target alone.
    if hires_in_window <= 0 and pending_offers <= 0 and interview_ready <= 0:
        return 0
    target = monthly_target if monthly_target is not None else get_monthly_hire_target()
    prorated = max(hires_in_window, int(round(target * window_days / 30.0)))
    forecast = pending_offers + max(0, int(interview_ready * 0.35))
    return max(prorated, forecast)


def build_department_risk(
    jobs: List[Dict[str, Any]],
    stuck_by_dept: Dict[str, int],
    req_age_by_dept: Dict[str, float],
    empty_pipeline_by_dept: Dict[str, int] | None = None,
) -> List[DepartmentRiskRow]:
    empty_pipeline_by_dept = empty_pipeline_by_dept or {}
    depts: Dict[str, Dict[str, Any]] = {}
    for job in jobs:
        if str(job.get("status") or "").upper() != "OPEN":
            continue
        dept = department_label_from_job(job)
        depts.setdefault(dept, {"open": 0})
        depts[dept]["open"] += 1
    rows: List[DepartmentRiskRow] = []
    for dept, meta in sorted(depts.items(), key=lambda x: -x[1]["open"]):
        stuck = int(stuck_by_dept.get(dept) or 0)
        avg_age = float(req_age_by_dept.get(dept) or 0)
        empty_jobs = int(empty_pipeline_by_dept.get(dept) or 0)
        open_count = int(meta["open"])
        score = stuck * 2
        if avg_age > 60:
            score += 3
        elif avg_age > 45:
            score += 2
        elif avg_age > 30:
            score += 1
        score += min(3, empty_jobs)
        if open_count >= 15:
            score += 2
        elif open_count >= 8:
            score += 1
        if score >= 6:
            level, dots = "high", 5
        elif score >= 3:
            level, dots = "medium", 3
        else:
            level, dots = "low", max(1, min(3, open_count))
        rows.append(DepartmentRiskRow(department=dept, risk_level=level, dot_count=dots, open_jobs=open_count))
    return rows[:10]


def build_talent_intelligence(skill_counts: Dict[str, int], limit: int = 5) -> List[TalentIntelligenceItem]:
    if not skill_counts:
        return []
    max_count = max(skill_counts.values()) or 1
    items = sorted(skill_counts.items(), key=lambda x: -x[1])[:limit]
    return [
        TalentIntelligenceItem(skill=name, count=count, pct=round(100.0 * count / max_count, 2))
        for name, count in items
    ]


def build_recruiter_performance(
    rows: List[Dict[str, Any]],
) -> List[RecruiterPerformanceRow]:
    out: List[RecruiterPerformanceRow] = []
    for row in rows:
        out.append(
            RecruiterPerformanceRow(
                recruiter_id=str(row.get("recruiter_id") or ""),
                recruiter_name=str(row.get("recruiter_name") or "Recruiter"),
                reqs=int(row.get("reqs") or 0),
                fill_rate_pct=row.get("fill_rate_pct"),
                health_score=int(row.get("health_score") or 70),
            )
        )
    return sorted(out, key=lambda r: -r.health_score)[:10]


def build_smart_actions(
    *,
    pending_offers: int,
    high_fit_count: int,
    schedule_interviews: int,
    escalate_delays: int,
    hiring_risks: int,
) -> List[SmartActionItem]:
    return [
        SmartActionItem(
            id="approve-offers",
            label="Approve Offers",
            count=pending_offers,
            status="pending",
            action_path="/pipeline?stage=SALARY",
        ),
        SmartActionItem(
            id="review-high-fit",
            label="Review High-Fit",
            count=high_fit_count,
            status="pending",
            action_path="/candidates?fit_min=90",
        ),
        SmartActionItem(
            id="schedule-interviews",
            label="Schedule Interviews",
            count=schedule_interviews,
            status="pending",
            action_path="/pipeline?stage=INTERVIEW",
        ),
        SmartActionItem(
            id="escalate-delays",
            label="Escalate Delays",
            count=escalate_delays,
            status="pending",
            action_path="/jobs?status=OPEN",
        ),
        SmartActionItem(
            id="hiring-risks",
            label="Hiring Risks",
            count=hiring_risks,
            status="pending",
            action_path="/dashboard?tab=pipeline",
        ),
    ]


def build_talent_quality(fit_distribution: List[Any], ai_recommended: int) -> TalentQualityOverview:
    counts = {_val(b, "bucket"): int(_val(b, "count") or 0) for b in fit_distribution}
    return TalentQualityOverview(
        high_fit_count=int(counts.get("90+") or 0),
        good_fit_count=int(counts.get("70-90") or 0),
        ai_recommended_count=ai_recommended,
    )


def build_tab_kpis(
    *,
    stage_counts: Dict[str, int],
    active_pipeline: int,
    stuck_assessment: int,
    offer_status_counts: List[Any],
    offer_aging: List[Any],
    interview_round_metrics: List[Any],
    new_apps: int,
    avg_fit: Optional[float],
    high_fit_pct: Optional[float],
    funnel_to_offer_pct: Optional[float],
    avg_stage_age: Optional[float],
) -> TabKpis:
    sourced = int(stage_counts.get("SOURCED") or 0)
    assessment_pending = int(stage_counts.get("ASSESSMENT_SENT") or 0)
    interview_ready = int(stage_counts.get("ASSESSMENT_CLEARED") or 0) + int(stage_counts.get("INTERVIEW_1") or 0)
    active_offers = sum(int(_val(r, "count") or 0) for r in offer_status_counts)
    avg_offer_age = None
    if offer_aging:
        ages = [int(_val(r, "days_in_offer") or 0) for r in offer_aging]
        avg_offer_age = round(sum(ages) / len(ages), 1)
    at_risk = sum(1 for r in offer_aging if _val(r, "sla_breached"))
    active_interviews = sum(int(_val(m, "active_count") or 0) for m in interview_round_metrics)
    avg_interview_age = None
    conv = None
    if interview_round_metrics:
        first = interview_round_metrics[0]
        avg_interview_age = _val(first, "avg_days")
        conv = _val(first, "conversion_to_next_pct")
    ready_for_offer = int(stage_counts.get("HR_ROUND") or 0)
    return TabKpis(
        pipeline=TabKpisPipeline(
            total=active_pipeline,
            sourced=sourced,
            assessment_pending=assessment_pending,
            interview_ready=interview_ready,
            stuck_assessment=stuck_assessment,
        ),
        offers=TabKpisOffers(
            active_offers=active_offers,
            acceptance_rate_pct=compute_offer_acceptance_pct(offer_status_counts),
            avg_age_days=avg_offer_age,
            at_risk=at_risk,
        ),
        interviews=TabKpisInterviews(
            active=active_interviews,
            avg_age_days=avg_interview_age,
            next_stage_conversion_pct=conv,
            ready_for_offer=ready_for_offer,
        ),
        analytics=TabKpisAnalytics(
            applications=new_apps,
            avg_fit_pct=avg_fit,
            offer_conversion_pct=funnel_to_offer_pct,
            avg_stage_age_days=avg_stage_age,
            high_fit_pct=high_fit_pct,
        ),
    )


def build_offer_insight(offer_aging: List[Any], at_risk: int) -> OfferInsight:
    if not offer_aging:
        return OfferInsight(
            headline="No active offers",
            message="When offers are sent, monitor ageing and follow up within SLA.",
            healthy=True,
        )
    if at_risk > 0:
        return OfferInsight(
            headline=f"{at_risk} offer(s) breached SLA",
            message="Prioritize follow-up to reduce drop-off risk.",
            healthy=False,
        )
    return OfferInsight(
        headline="Offers are healthy",
        message="Send personalized follow-ups to maintain response rates.",
        healthy=True,
    )


def build_offer_priority_actions(offer_aging: List[Any], limit: int = 5) -> List[OfferPriorityAction]:
    out: List[OfferPriorityAction] = []
    for row in offer_aging[:limit]:
        app_id = _val(row, "application_id")
        days = int(_val(row, "days_in_offer") or 0)
        out.append(
            OfferPriorityAction(
                application_id=str(app_id or ""),
                candidate_name=str(_val(row, "candidate_name") or "Candidate"),
                job_title=str(_val(row, "job_title") or ""),
                subtitle=f"Offer sent · {days}d",
                action_label="Send",
                action_path=f"/pipeline?application_id={app_id}" if app_id else "/pipeline?stage=SALARY",
            )
        )
    return out


def build_signal_strength(
    *,
    ai_adoption_pct: Optional[float],
    avg_fit: Optional[float],
    trajectory_coverage_pct: Optional[float],
    referral_share_pct: Optional[float],
) -> List[SignalStrengthItem]:
    return [
        SignalStrengthItem(category="Fit scoring", pct=ai_adoption_pct or 0),
        SignalStrengthItem(category="Skills match", pct=avg_fit or 0),
        SignalStrengthItem(category="Career trajectory", pct=trajectory_coverage_pct or 0),
        SignalStrengthItem(category="Referral signal", pct=referral_share_pct or 0),
    ]


def build_signal_recommendations(
    *,
    trajectory_coverage_pct: Optional[float],
    ai_adoption_pct: Optional[float],
    referral_share_pct: Optional[float],
) -> List[SignalRecommendation]:
    recs: List[SignalRecommendation] = []
    if (trajectory_coverage_pct or 0) < 10:
        recs.append(
            SignalRecommendation(
                title="Prioritize career data enrichment",
                message="Career trajectory coverage is low. Add LinkedIn/resume timeline parsing.",
            )
        )
    if (ai_adoption_pct or 0) >= 80:
        recs.append(
            SignalRecommendation(
                title="Use fit score for shortlist automation",
                message="AI fit is available on most open roles. Use top-fit thresholds for queue prioritization.",
            )
        )
    if (referral_share_pct or 0) < 1:
        recs.append(
            SignalRecommendation(
                title="Boost referral capture",
                message="No referrals visible in the current window. Add referral tags during ingestion.",
            )
        )
    return recs[:5]


def _fit_score_label(score: float | None) -> str:
    if score is None:
        return ""
    rounded = round(float(score))
    if rounded >= 90:
        return f"{rounded}% excellent fit"
    if rounded >= 70:
        return f"{rounded}% good fit"
    return f"{rounded}% fit"


def build_interview_action_queue(
    interview_round_metrics: List[Any],
    smart_actions: List[Any],
    *,
    limit: int = 5,
) -> List[Any]:
    from talent_acquisition.hiring_dashboard_schemas import InterviewActionItem

    out: List[InterviewActionItem] = []
    for metric in interview_round_metrics or []:
        active = int(_val(metric, "active_count") or 0)
        if active <= 0:
            continue
        stage = str(_val(metric, "stage") or "")
        label = str(_val(metric, "label") or "Interview round")
        avg_days = _val(metric, "avg_days")
        subtitle = f"{active} active candidate{'s' if active != 1 else ''}"
        if avg_days is not None:
            subtitle = f"{subtitle} · avg {avg_days}d"
        out.append(
            InterviewActionItem(
                id=f"clear-{stage.lower()}" if stage else f"clear-{len(out)}",
                label=f"Clear {label} decisions",
                subtitle=subtitle,
                action_label="Review",
                action_path=f"/pipeline?stage={stage}" if stage else "/pipeline",
                primary=len(out) == 0,
            )
        )

    for action in smart_actions or []:
        action_id = str(_val(action, "id") or "")
        count = int(_val(action, "count") or 0)
        if action_id not in ("schedule-interviews", "review-high-fit") or count <= 0:
            continue
        out.append(
            InterviewActionItem(
                id=action_id,
                label=str(_val(action, "label") or "Review"),
                subtitle=f"{count} pending",
                action_label="Schedule" if action_id == "schedule-interviews" else "Review",
                action_path=_val(action, "action_path"),
                primary=False,
            )
        )

    return out[:limit]


def build_analytics_summary(
    *,
    new_apps: int,
    prior_new_apps: int,
    sourced_avg_days: Optional[float],
    sourced_count: int,
    median_fit: Optional[float],
) -> List[AnalyticsSummaryItem]:
    items: List[AnalyticsSummaryItem] = []
    if prior_new_apps and new_apps > prior_new_apps * 1.5:
        items.append(
            AnalyticsSummaryItem(
                icon="warning",
                title="Pipeline spike detected",
                message="Applications rose sharply in the selected window; recruiter load should be reviewed.",
            )
        )
    if sourced_count > 0 and (sourced_avg_days or 0) >= 15:
        items.append(
            AnalyticsSummaryItem(
                icon="clock",
                title="Sourced ageing risk",
                message=f"{sourced_count} candidates concentrated in sourced stage with {sourced_avg_days:.0f}d average age.",
            )
        )
    if median_fit and median_fit >= 70:
        items.append(
            AnalyticsSummaryItem(
                icon="target",
                title="Quality remains healthy",
                message=f"{median_fit:.0f}% median fit score with a strong high-fit candidate pool.",
            )
        )
    items.append(
        AnalyticsSummaryItem(
            icon="check",
            title="Recommended action",
            message="Prioritize candidates aged 15–30 days and route high-fit profiles to screening.",
            action_path="/candidates?fit_min=70",
        )
    )
    return items[:4]


def recruiter_health_score(stuck: int, over_60: int) -> int:
    score, _ = compute_health_score(
        funnel_conversion_to_interview=None,
        avg_fit=None,
        req_aging_over_60=over_60,
        open_jobs=max(1, stuck),
        stuck_total=stuck,
    )
    return int(score if score is not None else 70)
