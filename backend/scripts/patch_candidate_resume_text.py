#!/usr/bin/env python3
"""Backfill resume_text and structured experience for Excel-imported candidates."""

from __future__ import annotations

import asyncio
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from candidate_resume_compose import compose_resume_text, is_education_only_resume, parse_education_cell
from experience_parser import normalize_experience_list


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
        query = {
            "$or": [
                {"seed_marker": "excel_candidates_v1"},
                {"import_source_file": {"$exists": True, "$ne": None}},
            ]
        }
        updated = 0
        async for doc in db.candidates.find(query, {"_id": 0}):
            education = doc.get("education") if isinstance(doc.get("education"), list) else []
            education_cell = None
            rt = doc.get("resume_text")
            if is_education_only_resume(rt):
                education_cell = re.sub(
                    r"^Education:?\s*", "", (rt or "").strip(), flags=re.IGNORECASE
                )
            if not education and education_cell:
                education = parse_education_cell(education_cell)

            experience = normalize_experience_list(doc.get("experience") or [])

            composed = compose_resume_text(
                resume_text=None if is_education_only_resume(rt) else rt,
                headline=doc.get("headline"),
                location=doc.get("location"),
                total_experience_years=doc.get("total_experience_years"),
                skills=doc.get("skills"),
                experience=experience,
                education=education,
                education_cell=education_cell,
            )
            if not composed:
                continue

            set_doc = {
                "experience": experience,
                "resume_text": composed,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            if education:
                set_doc["education"] = education

            await db.candidates.update_one({"id": doc["id"]}, {"$set": set_doc})
            updated += 1

        print(f"Resume text patch complete. updated={updated} db={db_name}", flush=True)
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
