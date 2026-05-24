"""Indexes for optional hiring analytics events (Find Matches adoption)."""

from __future__ import annotations

from talent_acquisition.hiring_analytics_events import COL_HIRING_ANALYTICS_EVENTS


async def up(db) -> None:
    await db[COL_HIRING_ANALYTICS_EVENTS].create_index([("type", 1), ("ts", -1)], name="ix_hiring_analytics_type_ts")
    await db[COL_HIRING_ANALYTICS_EVENTS].create_index([("job_id", 1), ("ts", -1)], name="ix_hiring_analytics_job_ts")


async def down(db) -> None:
    await db[COL_HIRING_ANALYTICS_EVENTS].drop_index("ix_hiring_analytics_type_ts")
    await db[COL_HIRING_ANALYTICS_EVENTS].drop_index("ix_hiring_analytics_job_ts")
