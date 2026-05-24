"""Career Trajectory — scoring config collection index."""

from __future__ import annotations

from career_trajectory.constants import COL_CONFIG, DEFAULT_CONFIG_ID


async def up(db) -> None:
    await db[COL_CONFIG].create_index("id", unique=True, name="uq_career_traj_config_id")
    existing = await db[COL_CONFIG].find_one({"id": DEFAULT_CONFIG_ID})
    if not existing:
        from career_trajectory.config_loader import default_config_document

        await db[COL_CONFIG].insert_one(default_config_document())


async def down(db) -> None:
    pass
