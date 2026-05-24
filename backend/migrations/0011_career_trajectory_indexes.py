"""Career Trajectory Analyzer — indexes."""

from __future__ import annotations

from career_trajectory.constants import COL_REPORTS


async def up(db) -> None:
    await db[COL_REPORTS].create_index("id", unique=True, name="uq_career_traj_report_id")
    await db[COL_REPORTS].create_index([("candidate_id", 1), ("created_at", -1)], name="ix_career_traj_candidate_created")
    await db[COL_REPORTS].create_index([("job_id", 1), ("created_at", -1)], name="ix_career_traj_job_created")
    await db[COL_REPORTS].create_index("primary_archetype.name", name="ix_career_traj_archetype")
    await db[COL_REPORTS].create_index("decision_gate.category", name="ix_career_traj_decision_gate")


async def down(db) -> None:
    pass
