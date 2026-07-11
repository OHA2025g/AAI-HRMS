"""M9: KPI definition overrides + leadership snapshot indexes."""

from __future__ import annotations

from analytics.constants import COL_M9_KPI_DEFINITIONS, COL_M9_LEADERSHIP_SNAPSHOTS


async def up(db) -> None:
    await db[COL_M9_KPI_DEFINITIONS].create_index("kpi_id", unique=True, name="uq_m9_kpi_definition_id")
    await db[COL_M9_LEADERSHIP_SNAPSHOTS].create_index("id", unique=True, name="uq_m9_leadership_snapshot_id")
    await db[COL_M9_LEADERSHIP_SNAPSHOTS].create_index(
        [("period", 1), ("created_at", -1)],
        name="ix_m9_snapshot_period_created",
    )


async def down(db) -> None:
    pass
