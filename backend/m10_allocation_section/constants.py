"""Mongo collection names for the Allocation Section."""

COL_STAFFING_REQUESTS = "allocation_staffing_requests"
COL_STAFFING_REQUEST_HISTORY = "allocation_staffing_request_history"
COL_CONFLICTS = "allocation_conflicts"
COL_ROLL_EVENTS = "allocation_rollon_rolloff"
COL_CHANGES = "allocation_changes"
COL_RELEASES = "allocation_releases"
COL_WORKFLOW_APPROVALS = "allocation_workflow_approvals"
COL_BENCH_MATCHES = "allocation_bench_matches"
COL_NOTES = "allocation_notes"
COL_DOCUMENTS = "allocation_documents"
COL_ALERTS = "allocation_alerts"
COL_ACTIVITY_LOGS = "allocation_activity_logs"
COL_POLICY_RULES = "allocation_policy_rules"
COL_FORECAST_SNAPSHOTS = "allocation_forecast_snapshots"
COL_AI_INSIGHTS = "allocation_ai_insights"

ALLOCATION_TYPES = [
    "FULL_TIME",
    "PARTIAL",
    "BILLABLE",
    "NON_BILLABLE",
    "INTERNAL",
    "CLIENT",
    "BUFFER",
    "SHADOW",
    "TRAINING",
    "TRANSITION",
    "SUPPORT",
    "TEMPORARY",
    "EMERGENCY",
]

CONFLICT_TYPES = [
    "OVER_ALLOCATION",
    "DOUBLE_BOOKING",
    "DATE_OVERLAP",
    "LEAVE_CONFLICT",
    "SKILL_MISMATCH",
    "ROLE_MISMATCH",
    "COMPLIANCE",
    "OTHER",
]
