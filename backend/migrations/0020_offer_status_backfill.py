"""Backfill offer_status=SENT for applications already in OFFER stage."""

from __future__ import annotations


async def up(db) -> None:
    await db.applications.update_many(
        {
            "stage": "OFFER",
            "$or": [
                {"offer_status": {"$exists": False}},
                {"offer_status": None},
                {"offer_status": ""},
            ],
        },
        {"$set": {"offer_status": "SENT"}},
    )


async def down(db) -> None:
    # Non-destructive: do not strip offer_status on rollback.
    pass
