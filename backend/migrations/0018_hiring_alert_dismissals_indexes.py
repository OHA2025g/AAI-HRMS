"""Indexes for per-user hiring dashboard alert dismissals."""

from __future__ import annotations

from talent_acquisition.hiring_alert_dismissals import COL_HIRING_ALERT_DISMISSALS


async def up(db) -> None:
    await db[COL_HIRING_ALERT_DISMISSALS].create_index(
        [("user_id", 1), ("alert_id", 1)],
        unique=True,
        name="ix_hiring_alert_dismiss_user_alert",
    )
    await db[COL_HIRING_ALERT_DISMISSALS].create_index(
        [("user_id", 1), ("dismissed_at", -1)],
        name="ix_hiring_alert_dismiss_user_ts",
    )


async def down(db) -> None:
    await db[COL_HIRING_ALERT_DISMISSALS].drop_index("ix_hiring_alert_dismiss_user_alert")
    await db[COL_HIRING_ALERT_DISMISSALS].drop_index("ix_hiring_alert_dismiss_user_ts")
