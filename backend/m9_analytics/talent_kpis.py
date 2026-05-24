"""Week-4 executive talent acquisition KPIs (source mix, dedup audit volume, fit-score precision proxy)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

CANDIDATES_COLLECTION = "candidates"
CANDIDATE_DEDUP_AUDIT_COLLECTION = "candidate_dedup_audit"
FIT_SCORES_COLLECTION = "fit_scores"


def _window_start_iso(window_days: int) -> str:
    wd = max(1, min(int(window_days or 30), 365))
    cutoff = datetime.now(timezone.utc) - timedelta(days=wd)
    return cutoff.isoformat()


async def compute_talent_acquisition_metrics(
    db, window_days: int = 30, job_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    - source_mix: count of candidates created in window by uppercased `source`
    - dedup_audit_events: rows in candidate_dedup_audit in window
    - top_match_precision_proxy_pct: share of fit_scores in window with must_have_ok and final_score >= 65
    """
    cutoff_s = _window_start_iso(window_days)
    gen = datetime.now(timezone.utc).isoformat()

    if job_ids is not None:
        scoped_ids = job_ids or ["__none__"]
        app_rows = await db.applications.find(
            {"job_id": {"$in": scoped_ids}, "created_at": {"$gte": cutoff_s}},
            {"_id": 0, "candidate_id": 1},
        ).to_list(10000)
        candidate_ids = list({r["candidate_id"] for r in app_rows if r.get("candidate_id")})
        if candidate_ids:
            mix_rows = await db[CANDIDATES_COLLECTION].aggregate(
                [
                    {"$match": {"id": {"$in": candidate_ids}}},
                    {
                        "$group": {
                            "_id": {"$toUpper": {"$ifNull": ["$source", "UNKNOWN"]}},
                            "count": {"$sum": 1},
                        }
                    },
                    {"$sort": {"count": -1}},
                ]
            ).to_list(200)
        else:
            mix_rows = []
        candidates_in_window = len(candidate_ids)
    else:
        mix_pipeline: List[Dict[str, Any]] = [
            {"$match": {"created_at": {"$gte": cutoff_s}}},
            {
                "$group": {
                    "_id": {"$toUpper": {"$ifNull": ["$source", "UNKNOWN"]}},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
        ]
        mix_rows = await db[CANDIDATES_COLLECTION].aggregate(mix_pipeline).to_list(200)
        candidates_in_window = sum(int(r.get("count") or 0) for r in mix_rows)

    by_source = {str(r["_id"]): int(r["count"]) for r in mix_rows}

    dedup_n = await db[CANDIDATE_DEDUP_AUDIT_COLLECTION].count_documents({"created_at": {"$gte": cutoff_s}})

    score_filter: Dict[str, Any] = {"computed_at": {"$gte": cutoff_s}}
    if job_ids is not None:
        score_filter["job_id"] = {"$in": job_ids or ["__none__"]}
    scores = await db[FIT_SCORES_COLLECTION].find(
        score_filter,
        {"_id": 0, "final_score": 1, "must_have_ok": 1},
    ).to_list(8000)
    n_scores = len(scores)
    if n_scores == 0:
        precision_proxy = None
    else:
        ok = 0
        for s in scores:
            try:
                fs = float(s.get("final_score") or 0.0)
            except (TypeError, ValueError):
                fs = 0.0
            if s.get("must_have_ok") is True and fs >= 65.0:
                ok += 1
        precision_proxy = round(100.0 * ok / n_scores, 2)

    top_share_pct = None
    if candidates_in_window > 0 and by_source:
        top = max(by_source.values())
        top_share_pct = round(100.0 * top / candidates_in_window, 2)

    return {
        "as_of": gen,
        "window_days": max(1, min(int(window_days or 30), 365)),
        "source_mix_by_channel": by_source,
        "candidates_created_in_window": candidates_in_window,
        "dedup_audit_events_in_window": int(dedup_n),
        "fit_scores_in_window": n_scores,
        "top_match_precision_proxy_pct": precision_proxy,
        "primary_source_concentration_pct": top_share_pct,
    }
