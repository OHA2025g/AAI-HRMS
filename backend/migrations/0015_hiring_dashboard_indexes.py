"""Indexes for Smart Hiring Dashboard aggregations."""

from __future__ import annotations

from talent_acquisition.hiring_snapshots import COL_SNAPSHOTS


async def up(db) -> None:
    await db.applications.create_index([("stage", 1), ("updated_at", -1)], name="ix_app_stage_updated")
    await db.applications.create_index([("created_at", -1)], name="ix_app_created_at")
    await db.applications.create_index([("job_id", 1), ("stage", 1)], name="ix_app_job_stage")
    await db.jobs.create_index([("status", 1), ("created_at", -1)], name="ix_jobs_status_created")
    await db.candidates.create_index([("created_at", -1)], name="ix_candidates_created_at")
    await db.fit_scores.create_index([("computed_at", -1)], name="ix_fit_scores_computed_at")
    await db.fit_scores.create_index([("job_id", 1)], name="ix_fit_scores_job_id")
    await db[COL_SNAPSHOTS].create_index("period", unique=True, name="uq_hiring_dashboard_snapshot_period")


async def down(db) -> None:
    await db.applications.drop_index("ix_app_stage_updated")
    await db.applications.drop_index("ix_app_created_at")
    await db.applications.drop_index("ix_app_job_stage")
    await db.jobs.drop_index("ix_jobs_status_created")
    await db.candidates.drop_index("ix_candidates_created_at")
    await db.fit_scores.drop_index("ix_fit_scores_computed_at")
    await db.fit_scores.drop_index("ix_fit_scores_job_id")
    await db[COL_SNAPSHOTS].drop_index("uq_hiring_dashboard_snapshot_period")
