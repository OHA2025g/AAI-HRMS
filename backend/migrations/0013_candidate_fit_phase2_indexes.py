"""Phase 2 fit simulation report indexes."""

from __future__ import annotations

from candidate_fit_phase2.constants import COL_PHASE2_REPORTS


async def up(db) -> None:
    await db[COL_PHASE2_REPORTS].create_index("id", unique=True, name="uq_phase2_fit_id")
    await db[COL_PHASE2_REPORTS].create_index("candidate_id", name="ix_phase2_fit_candidate")
    await db[COL_PHASE2_REPORTS].create_index(
        [("candidate_id", 1), ("created_at", -1)],
        name="ix_phase2_fit_candidate_created",
    )
    await db[COL_PHASE2_REPORTS].create_index("trajectory_report_id", name="ix_phase2_fit_traj")


async def down(db) -> None:
    pass
