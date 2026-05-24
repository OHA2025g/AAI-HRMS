"""Seed default Smart Hiring Dashboard config document."""

from __future__ import annotations

from talent_acquisition.hiring_dashboard_config import (
    COL_HIRING_DASHBOARD_CONFIG,
    CONFIG_DOC_ID,
    config_to_json,
    HiringDashboardConfig,
)


async def up(db) -> None:
    existing = await db[COL_HIRING_DASHBOARD_CONFIG].find_one({"id": CONFIG_DOC_ID}, {"_id": 1})
    if existing:
        return
    await db[COL_HIRING_DASHBOARD_CONFIG].insert_one(config_to_json(HiringDashboardConfig()))


async def down(db) -> None:
    await db[COL_HIRING_DASHBOARD_CONFIG].delete_one({"id": CONFIG_DOC_ID})
