"""Pydantic models for Smart Hiring Dashboard (hiring-pack + trends)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class DeltaMetric(BaseModel):
    value: float | int
    prior_value: float | int | None = None
    delta_pct: float | None = None


class SourceMixItem(BaseModel):
    label: str
    channel: str
    count: int
    pct: float


class FunnelStage(BaseModel):
    stage: str
    label: str
    count: int
    conversion_from_prev_pct: float | None = None


class FitBucket(BaseModel):
    bucket: str
    count: int
    pct: float


class ReqAgingBucket(BaseModel):
    label: str
    min_days: int
    max_days: int | None = None
    count: int


class TopJobRow(BaseModel):
    job_id: str
    title: str
    status: str
    open_days: int
    pipeline_count: int
    avg_fit_score: float | None = None


class HiringAlert(BaseModel):
    id: str
    severity: Literal["critical", "warning", "info"]
    title: str
    message: str
    action_path: str | None = None
    count: int | None = None


class TrendPoint(BaseModel):
    period: str
    label: str
    new_applications: int = 0
    hires: int = 0
    avg_fit_score: float | None = None
    open_jobs: int = 0
    active_pipeline: int = 0
    high_fit_pct: float | None = None
    funnel_conversion_to_interview: float | None = None
    hire_target: int | None = None
    pending_offers: int = 0
    median_offer_dwell_days: float | None = None
    median_interview_dwell_days: float | None = None
    time_to_fill_days: float | None = None
    time_to_hire_days: float | None = None
    offer_acceptance_pct: float | None = None


class StageAgingCell(BaseModel):
    stage: str
    label: str
    bucket: str
    count: int


class StageAgingSummary(BaseModel):
    stage: str
    label: str
    avg_days: float | None = None
    count: int = 0


class OfferAgingRow(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    job_id: str
    job_title: str
    days_in_offer: int
    entered_offer_at: str
    sla_days: int
    sla_breached: bool = False
    offer_status: str | None = None
    offer_value: float | None = None
    action_path: str | None = None


class OfferAgingBucket(BaseModel):
    label: str
    min_days: int
    max_days: int | None = None
    count: int


class InterviewRoundMetric(BaseModel):
    stage: str
    label: str
    active_count: int = 0
    avg_days: float | None = None
    conversion_to_next_pct: float | None = None


class ConversionBottleneckStage(BaseModel):
    stage: str
    label: str
    median_days: float | None = None
    avg_days: float | None = None
    sample_size: int = 0


class BottleneckSlowHireRow(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    job_title: str
    stage: str
    label: str
    days: float
    sla_days: int
    over_sla_days: float
    joined_at: str


class HireJourneyStageDwell(BaseModel):
    stage: str
    label: str
    days: float


class HireJourneyRow(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    job_id: str
    job_title: str
    total_days: float
    bottleneck_stage: str | None = None
    bottleneck_label: str | None = None
    bottleneck_days: float | None = None
    stage_breakdown: List[HireJourneyStageDwell] = Field(default_factory=list)
    joined_at: str


class InterviewJourneyRow(BaseModel):
    application_id: str
    candidate_id: str
    candidate_name: str
    job_title: str = ""
    stage: str
    stage_label: str
    fit_score: float | None = None
    fit_label: str = ""
    status: str = "In progress"
    status_tone: Literal["green", "orange", "warn"] = "orange"
    path: str = ""


class InterviewActionItem(BaseModel):
    id: str
    label: str
    subtitle: str = ""
    action_label: str = "Review"
    action_path: str | None = None
    primary: bool = False


class OfferStatusCount(BaseModel):
    status: str
    label: str
    count: int


class ApplicationStageHistoryEntry(BaseModel):
    from_stage: str | None = None
    to_stage: str
    changed_at: str
    days_in_stage: float | None = None
    reason: str | None = None
    offer_status: str | None = None


class AiMatchAdoption(BaseModel):
    adoption_pct: float | None = None
    open_jobs: int = 0
    jobs_with_matches: int = 0
    jobs_without_matches_count: int = 0
    jobs_without_matches: List[Dict[str, str]] = Field(default_factory=list)


class ReferralMetrics(BaseModel):
    referrals_in_window: int = 0
    referral_share_pct: float | None = None
    hires_from_referrals_in_window: int = 0


class CareerTrajectoryCoverage(BaseModel):
    candidates_with_report: int = 0
    active_pipeline_candidates: int = 0
    coverage_pct: float | None = None


class AssessmentFunnelStep(BaseModel):
    stage: str
    label: str
    count: int
    conversion_from_prev_pct: float | None = None


class AssessmentHiringSlice(BaseModel):
    funnel: List[AssessmentFunnelStep] = Field(default_factory=list)
    completion_rate_pct: float | None = None
    pass_rate_pct: float | None = None
    command_center_path: str = "/assessments?tab=overview"


class HiringDashboardHeadline(BaseModel):
    open_jobs: DeltaMetric
    active_pipeline: DeltaMetric
    new_applications: DeltaMetric
    hires: DeltaMetric
    avg_fit_score: DeltaMetric
    high_fit_pct: DeltaMetric
    good_fit_pct: DeltaMetric
    median_fit_score: float | None = None
    interview_yield_pct: float | None = None
    assessment_pass_pct: float | None = None
    assessment_clearance_pct: float | None = None
    time_to_fill_days: DeltaMetric | None = None
    time_to_hire_days: DeltaMetric | None = None
    pending_offers: DeltaMetric | None = None
    expected_hires: DeltaMetric | None = None
    offer_acceptance_pct: DeltaMetric | None = None


class HeroRiskMetrics(BaseModel):
    reqs_at_risk: int = 0
    jobs_miss_sla: int = 0
    high_fit_awaiting_review: int = 0


class AiRecommendation(BaseModel):
    title: str
    message: str = ""
    impact_days: int = 0
    action_path: str | None = None


class AiInsightItem(BaseModel):
    severity: Literal["red", "orange", "blue", "green"] = "blue"
    title: str
    message: str = ""
    action_label: str = "View details"
    action_path: str | None = None


class DepartmentRiskRow(BaseModel):
    department: str
    risk_level: Literal["high", "medium", "low"] = "low"
    dot_count: int = 1
    open_jobs: int = 0


class TalentIntelligenceItem(BaseModel):
    skill: str
    count: int = 0
    pct: float = 0


class RecruiterPerformanceRow(BaseModel):
    recruiter_id: str
    recruiter_name: str
    reqs: int = 0
    fill_rate_pct: float | None = None
    health_score: int = 70


class SmartActionItem(BaseModel):
    id: str
    label: str
    count: int = 0
    status: Literal["pending", "done"] = "pending"
    action_path: str | None = None


class TalentQualityOverview(BaseModel):
    high_fit_count: int = 0
    good_fit_count: int = 0
    ai_recommended_count: int = 0


class TabKpisPipeline(BaseModel):
    total: int = 0
    sourced: int = 0
    assessment_pending: int = 0
    interview_ready: int = 0
    stuck_assessment: int = 0


class TabKpisOffers(BaseModel):
    active_offers: int = 0
    acceptance_rate_pct: float | None = None
    avg_age_days: float | None = None
    at_risk: int = 0


class TabKpisInterviews(BaseModel):
    active: int = 0
    avg_age_days: float | None = None
    next_stage_conversion_pct: float | None = None
    ready_for_offer: int = 0


class TabKpisAnalytics(BaseModel):
    applications: int = 0
    avg_fit_pct: float | None = None
    offer_conversion_pct: float | None = None
    avg_stage_age_days: float | None = None
    high_fit_pct: float | None = None


class TabKpis(BaseModel):
    pipeline: TabKpisPipeline = Field(default_factory=TabKpisPipeline)
    offers: TabKpisOffers = Field(default_factory=TabKpisOffers)
    interviews: TabKpisInterviews = Field(default_factory=TabKpisInterviews)
    analytics: TabKpisAnalytics = Field(default_factory=TabKpisAnalytics)


class OfferInsight(BaseModel):
    headline: str
    message: str = ""
    healthy: bool = True


class OfferPriorityAction(BaseModel):
    application_id: str
    candidate_name: str
    job_title: str = ""
    subtitle: str = ""
    action_label: str = "Send"
    action_path: str | None = None


class SignalStrengthItem(BaseModel):
    category: str
    pct: float = 0


class SignalRecommendation(BaseModel):
    title: str
    message: str = ""


class AnalyticsSummaryItem(BaseModel):
    icon: Literal["warning", "clock", "target", "check"] = "check"
    title: str
    message: str = ""
    action_path: str | None = None


class DashboardFilterOptions(BaseModel):
    pillars: List[str] = Field(default_factory=list)
    departments: List[str] = Field(default_factory=list)
    sub_departments: List[str] = Field(default_factory=list)
    project_ids: List[str] = Field(default_factory=list)


class HiringDashboardPack(BaseModel):
    as_of: str
    window_days: int
    data_freshness: str = "live"
    scope: str = "all"
    department: str | None = None
    business_pillar: str | None = None
    business_sub_department: str | None = None
    project_id: str | None = None
    job_id: str | None = None
    owner_id: str | None = None
    health_score: int
    health_status: Literal["ok", "watch", "critical"]
    headline: HiringDashboardHeadline
    pipeline_by_stage: Dict[str, int]
    pipeline_by_stage_window: Dict[str, int] = Field(default_factory=dict)
    funnel: List[FunnelStage]
    offer_funnel: List[FunnelStage] = Field(default_factory=list)
    source_mix: List[SourceMixItem]
    fit_distribution: List[FitBucket]
    quality_by_source: List[Dict[str, Any]]
    stage_aging: List[StageAgingCell] = Field(default_factory=list)
    stage_aging_summary: List[StageAgingSummary] = Field(default_factory=list)
    offer_aging: List[OfferAgingRow] = Field(default_factory=list)
    offer_aging_buckets: List[OfferAgingBucket] = Field(default_factory=list)
    offer_status_counts: List[OfferStatusCount] = Field(default_factory=list)
    interview_round_metrics: List[InterviewRoundMetric] = Field(default_factory=list)
    conversion_bottleneck: List[ConversionBottleneckStage] = Field(default_factory=list)
    bottleneck_slow_hires: List[BottleneckSlowHireRow] = Field(default_factory=list)
    hire_journeys: List[HireJourneyRow] = Field(default_factory=list)
    interview_journeys: List[InterviewJourneyRow] = Field(default_factory=list)
    interview_action_queue: List[InterviewActionItem] = Field(default_factory=list)
    req_aging: List[ReqAgingBucket]
    top_jobs: List[TopJobRow]
    alerts: List[HiringAlert]
    talent_acquisition: Dict[str, Any] = Field(default_factory=dict)
    ai_match_adoption: AiMatchAdoption = Field(default_factory=AiMatchAdoption)
    referral_metrics: ReferralMetrics = Field(default_factory=ReferralMetrics)
    career_trajectory_coverage: CareerTrajectoryCoverage = Field(default_factory=CareerTrajectoryCoverage)
    assessment: AssessmentHiringSlice | None = None
    recent_activities: List[Dict[str, Any]] = Field(default_factory=list)
    hero_risk_metrics: HeroRiskMetrics = Field(default_factory=HeroRiskMetrics)
    ai_recommendation: AiRecommendation | None = None
    ai_insights: List[AiInsightItem] = Field(default_factory=list)
    ai_insights_source: Literal["rule_based", "llm"] = "rule_based"
    department_risk: List[DepartmentRiskRow] = Field(default_factory=list)
    talent_intelligence: List[TalentIntelligenceItem] = Field(default_factory=list)
    recruiter_performance: List[RecruiterPerformanceRow] = Field(default_factory=list)
    smart_actions: List[SmartActionItem] = Field(default_factory=list)
    talent_quality: TalentQualityOverview = Field(default_factory=TalentQualityOverview)
    tab_kpis: TabKpis = Field(default_factory=TabKpis)
    offer_insight: OfferInsight | None = None
    offer_priority_actions: List[OfferPriorityAction] = Field(default_factory=list)
    signal_strength: List[SignalStrengthItem] = Field(default_factory=list)
    signal_recommendations: List[SignalRecommendation] = Field(default_factory=list)
    analytics_summary: List[AnalyticsSummaryItem] = Field(default_factory=list)
    # Legacy compat fields
    total_jobs: int = 0
    total_candidates: int = 0
    total_applications: int = 0
    applications_by_stage: Dict[str, int] = Field(default_factory=dict)
    trends: Optional["HiringDashboardTrends"] = None


class HiringAlertDismissRequest(BaseModel):
    alert_id: str


class HiringAlertDismissalsResponse(BaseModel):
    dismissed: List[str] = Field(default_factory=list)


class HiringDashboardConfigUpdate(BaseModel):
    stage_sla_days: Dict[str, int] | None = None
    low_fit_threshold: float | None = None
    stuck_critical_count: int | None = None
    monthly_hire_target: int | None = None
    stale_req_zero_interviews_days: int | None = None
    rule_flags: Dict[str, bool] | None = None
    llm_insights_enabled: bool | None = None


class HiringDashboardConfigAuditEntry(BaseModel):
    id: str
    user_name: str = "Admin"
    summary: str
    created_at: str
    changes: Dict[str, Any] = Field(default_factory=dict)


class HiringDashboardConfigResponse(BaseModel):
    id: str = "default"
    stage_sla_days: Dict[str, int]
    low_fit_threshold: float
    stuck_critical_count: int
    monthly_hire_target: int
    stale_req_zero_interviews_days: int = 90
    rule_flags: Dict[str, bool] = Field(default_factory=dict)
    llm_insights_enabled: bool = False
    updated_at: str | None = None
    audit_trail: List[HiringDashboardConfigAuditEntry] = Field(default_factory=list)


class HiringDashboardTrends(BaseModel):
    as_of: str
    months: int
    data_source: Literal["snapshots", "seeded", "mixed", "synthetic"] = "synthetic"
    points: List[TrendPoint]
    snapshot_count: int = 0
    live_snapshot_count: int = 0
    last_live_snapshot_at: str | None = None


class HiringSnapshotHealth(BaseModel):
    status: Literal["ok", "no_snapshots", "seeded_only", "stale"] = "no_snapshots"
    as_of: str
    snapshot_count: int = 0
    live_snapshot_count: int = 0
    seeded_snapshot_count: int = 0
    last_live_snapshot_at: str | None = None
    cron_token_configured: bool = False
    snapshot_on_boot_enabled: bool = False


HiringDashboardPack.model_rebuild()
