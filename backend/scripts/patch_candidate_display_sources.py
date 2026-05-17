#!/usr/bin/env python3
"""Normalize candidate `source` for UI tags: Talent Pool (excel/DB) and LinkedIn (AI fit seeds)."""

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

        talent_pool = await db.candidates.update_many(
            {
                "$or": [
                    {"seed_marker": "excel_candidates_v1"},
                    {"import_source_file": {"$exists": True, "$ne": None}},
                    {"source": {"$in": ["EXCEL_IMPORT", "BULK_SEED", "DIRECT_UPLOAD"]}, "seed_marker": "excel_candidates_v1"},
                    {"source": "BULK_SEED"},
                ]
            },
            {"$set": {"source": "TALENT_POOL"}},
        )

        linkedin_ai = await db.candidates.update_many(
            {
                "$and": [
                    {
                        "$or": [
                            {"seed_marker": "job_posting_fit_candidates_v1"},
                            {"source": {"$in": ["FIT_SEED", "DEMO"]}},
                            {"email": {"$regex": r"^fitseed\..*@aai-hrms\.local$", "$options": "i"}},
                            {
                                "email": {
                                    "$regex": r"@aai-hrms\.local$",
                                    "$options": "i",
                                    "$nin": list(ADMIN_EMAILS),
                                }
                            },
                        ]
                    },
                    {"seed_marker": {"$ne": "excel_candidates_v1"}},
                    {"source": {"$ne": "TALENT_POOL"}},
                ]
            },
            {"$set": {"source": "LINKEDIN"}},
        )

        print(
            f"Candidate source patch: talent_pool={talent_pool.modified_count} "
            f"linkedin_ai={linkedin_ai.modified_count} db={db_name}",
            flush=True,
        )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
