"""M9: unique leadership snapshot per period + scope (cron idempotency)."""

from __future__ import annotations

from analytics.constants import COL_M9_LEADERSHIP_SNAPSHOTS


async def up(db) -> None:
    await db[COL_M9_LEADERSHIP_SNAPSHOTS].create_index(
        [("period", 1), ("snapshot_scope", 1)],
        unique=True,
        name="uq_m9_snapshot_period_scope",
        partialFilterExpression={"snapshot_scope": {"$exists": True, "$type": "string"}},
    )


async def down(db) -> None:
    pass
