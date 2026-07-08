"""Backfill jobs.business_pillar / business_department / business_sub_department from title inference."""

from __future__ import annotations

from talent_acquisition.job_org_fields import backfill_org_update


async def up(db) -> None:
    cursor = db.jobs.find(
        {
            "status": "OPEN",
            "$or": [
                {"business_pillar": {"$in": [None, ""]}},
                {"business_pillar": {"$exists": False}},
            ],
        },
        {
            "_id": 0,
            "id": 1,
            "title": 1,
            "domain": 1,
            "business_pillar": 1,
            "business_department": 1,
            "department": 1,
            "business_sub_department": 1,
        },
    )
    updated = 0
    async for job in cursor:
        patch = backfill_org_update(job)
        if not patch:
            continue
        await db.jobs.update_one({"id": job["id"]}, {"$set": patch})
        updated += 1
    if updated:
        print(f"job_org_fields_backfill: updated {updated} open job(s).")


async def down(db) -> None:
    pass
