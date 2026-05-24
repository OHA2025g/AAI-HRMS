"""Pydantic models for Smart Hiring assessments."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class AssessmentCreate(BaseModel):
    assessment_type: str = "CORE_SKILL"
    title: str
    duration_minutes: int = 60


class AssessmentUpdate(BaseModel):
    title: Optional[str] = None
    duration_minutes: Optional[int] = None
    questions: Optional[List[Dict[str, Any]]] = None
    rubric: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    is_primary: Optional[bool] = None


class AssessmentUsage(BaseModel):
    sent_count: int = 0
    cleared_count: int = 0
    invited_count: int = 0
    completed_count: int = 0
    pass_count: int = 0


class AssessmentResponse(BaseModel):
    id: str
    job_id: str
    assessment_type: str
    title: str
    duration_minutes: int
    total_marks: int
    questions: List[Dict[str, Any]] = []
    rubric: Optional[Dict[str, Any]] = None
    status: str = "DRAFT"
    is_primary: bool = False
    published_at: Optional[str] = None
    version: int = 1
    created_by: Optional[str] = None
    created_at: str
    usage: Optional[AssessmentUsage] = None


class AssessmentInviteRequest(BaseModel):
    application_id: Optional[str] = None
    candidate_id: Optional[str] = None
    job_id: Optional[str] = None
    move_to_assessment_sent: bool = True
    expires_in_hours: int = 72
    send_candidate_email: bool = True


class SubmissionAnswer(BaseModel):
    question_id: str
    response: str = ""


class SubmissionSubmitRequest(BaseModel):
    answers: List[SubmissionAnswer] = []


class SubmissionGradeRequest(BaseModel):
    score: Optional[float] = None
    answers: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
    passed: Optional[bool] = None
    auto_clear_pipeline: bool = True
    override_reason: Optional[str] = None


class AssessmentSubmissionResponse(BaseModel):
    id: str
    assessment_id: str
    job_id: str
    application_id: Optional[str] = None
    candidate_id: str
    status: str
    invited_by: Optional[str] = None
    invited_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    expires_at: Optional[str] = None
    score: Optional[float] = None
    score_pct: Optional[float] = None
    passed: Optional[bool] = None
    answers: List[Dict[str, Any]] = []
    graded_by: Optional[str] = None
    graded_at: Optional[str] = None
    notes: Optional[str] = None
    override_reason: Optional[str] = None
    access_token: Optional[str] = None
    take_url: Optional[str] = None
    created_at: str
    updated_at: str
    assessment_title: Optional[str] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_email_sent: Optional[bool] = None
    candidate_email_queued: Optional[bool] = None
    email_status: Optional[str] = None
    reminder_sent_at: Optional[str] = None


class MetricValue(BaseModel):
    value: float | int
    prior_value: float | int | None = None
    delta_pct: float | None = None


class AssessmentAlert(BaseModel):
    id: str
    severity: Literal["critical", "warning", "info"]
    title: str
    message: str
    action_path: str | None = None
    count: int | None = None


class AssessmentTypeBreakdown(BaseModel):
    assessment_type: str
    count: int
    pct: float
    pass_rate_pct: float | None = None


class AssessmentJobRow(BaseModel):
    job_id: str
    title: str
    assessment_count: int
    sent: int
    cleared: int
    invited: int
    completed: int
    pass_rate_pct: float | None = None
    has_assessment: bool


class AssessmentHeadline(BaseModel):
    total_assessments: MetricValue
    assessments_on_open_jobs: MetricValue
    jobs_missing_assessment: MetricValue
    candidates_in_assessment_sent: MetricValue
    candidates_assessment_cleared: MetricValue
    clearance_rate_pct: float | None = None
    clearance_rate_delta_pct: float | None = None
    completion_rate_pct: float | None = None
    completion_rate_delta_pct: float | None = None
    pass_rate_pct: float | None = None
    pass_rate_delta_pct: float | None = None
    median_time_to_complete_minutes: float | None = None
    median_time_delta_pct: float | None = None
    avg_questions_per_assessment: float | None = None
    avg_duration_minutes: float | None = None
    pass_threshold_pct: float | None = None
    active_submissions: MetricValue


class AssessmentVersionSnapshot(BaseModel):
    version: int
    saved_at: str
    actor_id: str | None = None
    action: str
    title: str
    duration_minutes: int | None = None
    total_marks: int | None = None
    question_count: int = 0
    questions: List[Dict[str, Any]] = []
    rubric: Dict[str, Any] | None = None


class SubmissionDraftRequest(BaseModel):
    answers: List[SubmissionAnswer] = []


class AssessmentAnalyticsSummary(BaseModel):
    as_of: str
    window_days: int
    headline: AssessmentHeadline
    by_type: List[AssessmentTypeBreakdown] = []
    by_job: List[AssessmentJobRow] = []
    alerts: List[AssessmentAlert] = []


class AssessmentCoverageJob(BaseModel):
    job_id: str
    title: str
    pipeline_active: bool = False


class AssessmentCoverageCell(BaseModel):
    job_id: str
    assessment_type: str
    assessment_count: int = 0
    invited: int = 0
    completed: int = 0
    intensity: float = 0.0


class AssessmentCoverageMatrix(BaseModel):
    as_of: str
    window_days: int
    types: List[str] = []
    jobs: List[AssessmentCoverageJob] = []
    cells: List[AssessmentCoverageCell] = []


class AssessmentFeatureFlags(BaseModel):
    command_center: bool = True
    public_take: bool = True
    ai_grading: bool = True
    auto_clear_pipeline: bool = True
    reminder_emails: bool = True
    outcome_analytics: bool = True
    coverage_heatmap: bool = True
    email_delivery_ready: bool = False


class AssessmentOpsStatus(BaseModel):
    smtp_configured: bool = False
    public_base_url: str | None = None
    public_base_url_explicit: bool = False
    cron_configured: bool = False
    ready_to_send: bool = False
    warnings: List[str] = []


class FunnelStep(BaseModel):
    stage: str
    label: str
    count: int
    conversion_from_prev_pct: float | None = None


class PassRateByType(BaseModel):
    assessment_type: str
    invited: int
    completed: int
    passed: int
    pass_rate_pct: float | None = None


class ScoreBucket(BaseModel):
    bucket: str
    min_score: float
    max_score: float
    count: int


class ScoreDistributionResult(BaseModel):
    buckets: List[ScoreBucket]
    pass_threshold_pct: float = 70.0


class TimeVsScorePoint(BaseModel):
    candidate_id: str
    candidate_name: str
    minutes: float
    score_pct: float


class CalibrationQuestionRow(BaseModel):
    assessment_id: str
    assessment_title: str
    question_id: str
    question_text: str
    pct_correct: float | None = None
    flag: str | None = None


class CalibrationInsights(BaseModel):
    low_pass_assessments: List[Dict[str, Any]] = []
    stale_unused_assessments: List[Dict[str, Any]] = []
    hardest_questions: List[CalibrationQuestionRow] = []


class OutcomeCorrelation(BaseModel):
    scored: int = 0
    passed: int = 0
    reached_interview: int = 0
    hired: int = 0
    pass_to_interview_pct: float | None = None
    scored_to_interview_pct: float | None = None
    pass_to_hire_pct: float | None = None


class PassThresholdSuggestion(BaseModel):
    current_pass_threshold_pct: float
    suggested_pass_threshold_pct: float
    method: Literal["score_distribution", "llm", "default"]
    rationale: str
    sample_size: int = 0


class AssessmentAuditEntry(BaseModel):
    id: str
    action: str
    actor_id: str | None = None
    actor_name: str | None = None
    assessment_id: str | None = None
    submission_id: str | None = None
    detail: Dict[str, Any] = {}
    created_at: str


class TrendPoint(BaseModel):
    period: str
    label: str
    invited: int = 0
    completed: int = 0
    pass_rate_pct: float | None = None


class SkillBreakdownRow(BaseModel):
    skill: str
    attempts: int
    avg_score_pct: float | None = None


class FitVsScorePoint(BaseModel):
    candidate_id: str
    candidate_name: str
    fit_score: float
    assessment_score_pct: float
    quadrant: str


class QuestionItemAnalysis(BaseModel):
    question_id: str
    question_text: str
    question_type: str
    skill_tested: str | None = None
    attempts: int
    avg_marks: float | None = None
    max_marks: int
    pct_correct: float | None = None
    flag: str | None = None


class PublicTakeAssessment(BaseModel):
    submission_id: str
    title: str
    duration_minutes: int
    total_marks: int
    questions: List[Dict[str, Any]]
    status: str
    expires_at: Optional[str] = None
    saved_answers: List[SubmissionAnswer] = []
    draft_saved_at: Optional[str] = None
