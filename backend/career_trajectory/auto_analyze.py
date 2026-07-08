"""Optional auto-analyze when candidates gain resume text."""

from __future__ import annotations

import os

from career_trajectory.constants import COL_REPORTS
from career_trajectory.report_generator import analyze_resume_text


def _auto_enabled() -> bool:
    raw = (os.environ.get("CAREER_TRAJECTORY_AUTO_ANALYZE") or "true").strip().lower()
    return raw not in ("0", "false", "no", "off")


async def trigger_auto_analyze_if_eligible(
    db,
    candidate_id: str,
    resume_text: str | None = None,
    *,
    created_by: str | None = None,
) -> None:
    if not _auto_enabled() or not candidate_id:
        return
    existing = await db[COL_REPORTS].find_one({"candidate_id": candidate_id}, {"_id": 1, "id": 1})
    if existing:
        return
    text = (resume_text or "").strip()
    if len(text) < 50:
        cand = await db.candidates.find_one({"id": candidate_id}, {"_id": 0, "resume_text": 1})
        text = ((cand or {}).get("resume_text") or "").strip()
    if len(text) < 50:
        return
    report = analyze_resume_text(text, candidate_id=candidate_id)
    await db[COL_REPORTS].insert_one(dict(report))


def trigger_auto_analyze_if_eligible_sync(db, candidate_id: str, resume_text: str | None = None) -> None:
    import asyncio

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(trigger_auto_analyze_if_eligible(db, candidate_id, resume_text))
    except RuntimeError:
        asyncio.run(trigger_auto_analyze_if_eligible(db, candidate_id, resume_text))
