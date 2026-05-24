#!/usr/bin/env python3
"""Recompute persisted fit_scores for all applications (uses compute_basic_fit_score)."""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import compute_basic_fit_score, compute_match_score, db  # noqa: E402


async def main() -> int:
    apps = await db.applications.find({}, {"_id": 0}).to_list(5000)
    updated = 0
    skipped = 0
    now = datetime.now(timezone.utc).isoformat()

    for app in apps:
        fs_id = app.get("fit_score_id")
        job_id = app.get("job_id")
        candidate_id = app.get("candidate_id")
        if not fs_id or not job_id or not candidate_id:
            skipped += 1
            continue
        job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
        candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
        if not job or not candidate:
            skipped += 1
            continue
        fit_result = compute_basic_fit_score(job, candidate)
        det = compute_match_score(job, candidate)
        fit_result["ranking_explainability"] = {
            "score_source": fit_result.get("score_source", "basic"),
            "weights_applied": (job.get("scoring_rubric") or {}).get("weights") or {},
            "deterministic_match": det,
            "score_factors": fit_result.get("score_factors"),
            "narrative": fit_result.get("explanation"),
        }
        await db.fit_scores.update_one(
            {"id": fs_id},
            {"$set": {**fit_result, "job_id": job_id, "candidate_id": candidate_id, "computed_at": now}},
        )
        updated += 1

    print(f"Rescored {updated} fit_scores ({skipped} skipped).")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
