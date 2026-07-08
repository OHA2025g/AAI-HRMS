"""Backfill jobs.hiring_team from legacy created_by."""

from __future__ import annotations


async def up(db) -> None:
    cursor = db.jobs.find(
        {
            "$or": [
                {"hiring_team": {"$exists": False}},
                {"hiring_team": None},
                {"hiring_team": {}},
            ]
        },
        {"_id": 0, "id": 1, "created_by": 1},
    )
    async for job in cursor:
        creator = job.get("created_by")
        if not creator:
            continue
        await db.jobs.update_one(
            {"id": job["id"]},
            {
                "$set": {
                    "hiring_team": {
                        "hiring_manager_id": None,
                        "technical_manager_id": None,
                        "project_manager_id": None,
                        "recruiter_id": creator,
                    }
                }
            },
        )


async def down(db) -> None:
    pass
