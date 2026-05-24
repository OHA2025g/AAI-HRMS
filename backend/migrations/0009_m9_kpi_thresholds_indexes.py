"""M9 KPI threshold overrides — unique kpi_id index."""

from m9_analytics.constants import COL_M9_KPI_THRESHOLDS


async def up(db):
    await db[COL_M9_KPI_THRESHOLDS].create_index("kpi_id", unique=True, name="uq_m9_kpi_threshold_id")


async def down(db):
    await db[COL_M9_KPI_THRESHOLDS].drop_index("uq_m9_kpi_threshold_id")
