#!/usr/bin/env python3
"""Set source=LINKEDIN for AI-generated candidates on @aai-hrms.local (excludes QA/admin accounts)."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

ADMIN_EMAILS = frozenset(
    {
        "qa_admin@aai-hrms.local",
        "qa.employee@aai-hrms.local",
        "excel.import.admin@aai-hrms.local",
        "seed.admin@aai-hrms.local",
    }
)


def _load_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(BACKEND_DIR / ".env")
    except ImportError:
        pass


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = (os.environ.get("DB_NAME") or "aai_hrms").strip() or "aai_hrms"
    if not mongo_url:
        print("MONGO_URL required", file=sys.stderr)
        return 1

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        res = await db.candidates.update_many(
            {
                "$and": [
                    {"email": {"$regex": r"@aai-hrms\.local$", "$options": "i"}},
                    {"email": {"$nin": list(ADMIN_EMAILS)}},
                ]
            },
            {"$set": {"source": "LINKEDIN"}},
        )
        print(
            f"AI candidate source patch: matched={res.matched_count} modified={res.modified_count} db={db_name}",
            flush=True,
        )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
