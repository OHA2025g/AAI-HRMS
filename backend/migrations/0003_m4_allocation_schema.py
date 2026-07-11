"""
M4-1: finalize project_skill_demands constraint fields + default optimization settings.

Backfill:
- demand_min / demand_max default to current demand_count
- constraint_type defaults to HARD

Idempotent: only updates docs missing demand_min.
"""

from __future__ import annotations

from resource_optimization.constants import COL_ALLOCATION_SETTINGS, DEFAULT_SETTINGS


async def up(db) -> None:
    cursor = db.project_skill_demands.find({"demand_min": {"$exists": False}}, {"_id": 1, "demand_count": 1})
    async for doc in cursor:
        d = max(0, int(doc.get("demand_count") or 0))
        await db.project_skill_demands.update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "demand_min": d,
                    "demand_max": d,
                    "constraint_type": "HARD",
                }
            },
        )

    await db[COL_ALLOCATION_SETTINGS].update_one(
        {"_id": DEFAULT_SETTINGS["_id"]},
        {"$setOnInsert": DEFAULT_SETTINGS},
        upsert=True,
    )


async def down(db) -> None:
    """Document only — no automatic field removal."""
    pass
