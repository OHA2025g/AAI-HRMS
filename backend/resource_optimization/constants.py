"""M4 resource optimization collection names and default settings singleton."""

COL_ALLOCATION_SCENARIOS = "allocation_scenarios"
COL_ALLOCATION_SETTINGS = "allocation_settings"
SETTINGS_DOC_ID = "default"

DEFAULT_SETTINGS = {
    "_id": SETTINGS_DOC_ID,
    "max_projects_per_employee": 3,
    "max_seats_per_employee_per_project": 1,
    "shortage_penalty_hard": 10.0,
    "shortage_penalty_soft": 3.0,
    "utilization_weight": 4.0,
    "target_utilization_pct": 85.0,
}
