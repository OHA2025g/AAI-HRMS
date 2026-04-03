"""M9 Mongo collections and defaults."""

COL_M9_KPI_DEFINITIONS = "m9_kpi_definitions"
COL_M9_LEADERSHIP_SNAPSHOTS = "m9_leadership_snapshots"
COL_M9_DRILL_CACHE_META = "m9_drill_cache_meta"  # optional audit; primary cache is in-process

# Default SLA max age (hours) when not overridden on a KPI definition row
DEFAULT_SOURCE_SLA_HOURS = {
    "employees": 24,
    "workforce_skills": 48,
    "employee_engagement_responses": 72,
    "workflow_runs": 24,
    "composite": 24,
}

# In-process TTL for drill dashboard (seconds)
DRILL_DASHBOARD_CACHE_TTL_SEC = 45

CATALOG_VERSION = "1.1.0"
