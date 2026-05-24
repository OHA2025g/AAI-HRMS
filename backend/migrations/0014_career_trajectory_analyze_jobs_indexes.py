"""Indexes for background career trajectory analyze jobs."""

from __future__ import annotations

from career_trajectory.async_jobs import COL_JOBS


async def up(db) -> None:
    await db[COL_JOBS].create_index("id", unique=True, name="uq_ct_analyze_job_id")
    await db[COL_JOBS].create_index("candidate_id", name="ix_ct_analyze_job_candidate")
    await db[COL_JOBS].create_index(
        [("status", 1), ("created_at", -1)],
        name="ix_ct_analyze_job_status_created",
    )


async def down(db) -> None:
    pass
