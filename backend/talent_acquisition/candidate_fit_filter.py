"""Filter candidates by best fit score across all job applications."""

from typing import Any, Dict, List, Optional


async def candidate_ids_matching_fit_range(
    db,
    fit_min: Optional[float] = None,
    fit_max: Optional[float] = None,
) -> Optional[List[str]]:
    """Return candidate IDs whose max fit_scores.final_score is within range, or None if no filter."""
    if fit_min is None and fit_max is None:
        return None

    score_filter: Dict[str, Any] = {}
    if fit_min is not None and fit_max is not None:
        score_filter = {"$gte": float(fit_min), "$lte": float(fit_max)}
    elif fit_min is not None:
        score_filter = {"$gte": float(fit_min)}
    else:
        score_filter = {"$lte": float(fit_max)}

    pipeline = [
        {
            "$group": {
                "_id": "$candidate_id",
                "best_score": {"$max": "$final_score"},
            }
        },
        {"$match": {"best_score": score_filter, "_id": {"$nin": [None, ""]}}},
        {"$project": {"_id": 0, "candidate_id": "$_id"}},
    ]
    rows = await db.fit_scores.aggregate(pipeline).to_list(10000)
    return [str(r["candidate_id"]) for r in rows if r.get("candidate_id")]


async def best_fit_scores_for_candidates(
    db,
    candidate_ids: List[str],
) -> Dict[str, float]:
    """Return each candidate's highest fit_scores.final_score across all jobs."""
    ids = [str(cid) for cid in candidate_ids if cid]
    if not ids:
        return {}

    pipeline = [
        {"$match": {"candidate_id": {"$in": ids}}},
        {
            "$group": {
                "_id": "$candidate_id",
                "best_score": {"$max": "$final_score"},
            }
        },
    ]
    rows = await db.fit_scores.aggregate(pipeline).to_list(len(ids))
    out: Dict[str, float] = {}
    for row in rows:
        cid = row.get("_id")
        score = row.get("best_score")
        if cid and score is not None:
            out[str(cid)] = round(float(score), 2)
    return out
