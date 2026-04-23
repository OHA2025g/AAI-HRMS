"""Mongo collection names and singleton ids for M4 resource optimization."""

COL_ALLOCATION_SETTINGS = "allocation_optimization_settings"
COL_ALLOCATION_SCENARIOS = "allocation_optimization_scenarios"

SETTINGS_DOC_ID = "default"

DEFAULT_SETTINGS: dict = {
    "_id": SETTINGS_DOC_ID,
    "max_projects_per_employee": 3,
    "max_seats_per_employee_per_project": 1,
    "shortage_penalty_hard": 10.0,
    "shortage_penalty_soft": 3.0,
    "utilization_weight": 4.0,
    "target_utilization_pct": 85.0,
}
