"""Smart Hiring Dashboard — application_stage_history indexes."""

from __future__ import annotations


async def up(db) -> None:
    await db.application_stage_history.create_index(
        [("application_id", 1), ("to_stage", 1), ("changed_at", -1)],
        name="ix_app_stage_hist_app_stage_changed",
    )
    await db.application_stage_history.create_index(
        [("to_stage", 1), ("changed_at", -1)],
        name="ix_app_stage_hist_stage_changed",
    )


async def down(db) -> None:
    await db.application_stage_history.drop_index("ix_app_stage_hist_app_stage_changed")
    await db.application_stage_history.drop_index("ix_app_stage_hist_stage_changed")
