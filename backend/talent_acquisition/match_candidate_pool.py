"""Build a diverse candidate pool for job AI matching (Excel, talent pool, AI fit seeds)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set

from talent_acquisition.candidate_source import is_ai_generated_candidate

FIT_SEED_MARKER = "job_posting_fit_candidates_v1"
EXCEL_MARKER = "excel_candidates_v1"


def applied_ids_excluding_fit_seeds(applications: List[Dict[str, Any]]) -> Set[str]:
    """Fit-seed applications stay visible in AI Matches (demo pipeline)."""
    applied: Set[str] = set()
    for app in applications:
        cid = app.get("candidate_id")
        if not cid:
            continue
        if app.get("seed_marker") == FIT_SEED_MARKER:
            continue
        applied.add(cid)
    return applied


def _append_unique(
    dest: List[Dict[str, Any]],
    rows: List[Dict[str, Any]],
    seen: Set[str],
    applied: Set[str],
    limit: int,
) -> None:
    for c in rows:
        if len(dest) >= limit:
            return
        cid = c.get("id")
        if not cid or cid in seen or cid in applied:
            continue
        seen.add(cid)
        dest.append(c)


def _excel_marker_clause() -> Dict[str, Any]:
    return {
        "$or": [
            {"seed_marker": EXCEL_MARKER},
            {"import_source_file": {"$exists": True, "$ne": None}},
            {"import_stable_id": {"$exists": True, "$ne": None}},
            {"source": "EXCEL_IMPORT"},
        ]
    }


async def gather_job_match_candidates(
    db,
    job: Dict[str, Any],
    job_id: str,
    applied_ids: Set[str],
    skill_or: List[Dict[str, Any]],
    *,
    per_bucket: int = 200,
    max_total: int = 600,
) -> List[Dict[str, Any]]:
    """
    Pull candidates from three sources so matching can interleave:
    per-job AI fit seeds, internal talent pool (BULK_SEED), then Excel imports.

    Talent and AI buckets are fetched without skill filters so executive / sparse-skill
    jobs still get grid diversity; Excel uses skills when present for relevance.
    """
    seen: Set[str] = set()
    out: List[Dict[str, Any]] = []

    # 1) Per-job AI fit seeds (always include for this job — scores 70–90% in fit_scores)
    ai_rows = await (
        db.candidates.find({"seed_job_id": job_id}, {"_id": 0})
        .sort("seed_slot", 1)
        .limit(per_bucket)
        .to_list(per_bucket)
    )
    _append_unique(out, ai_rows, seen, applied_ids, max_total)

    if len(ai_rows) < 5:
        ai_extra = await (
            db.candidates.find(
                {
                    "$or": [
                        {"seed_marker": FIT_SEED_MARKER},
                        {"email": {"$regex": r"^fitseed\..*@aai-hrms\.local$", "$options": "i"}},
                    ]
                },
                {"_id": 0},
            )
            .sort("created_at", -1)
            .limit(per_bucket)
            .to_list(per_bucket)
        )
        _append_unique(out, ai_extra, seen, applied_ids, max_total)

    # 2) Talent pool (BULK_SEED) — not filtered by job skills
    talent_rows = await (
        db.candidates.find({"source": "BULK_SEED"}, {"_id": 0})
        .sort([("pin_rank", -1), ("created_at", -1)])
        .limit(per_bucket)
        .to_list(per_bucket)
    )
    _append_unique(out, talent_rows, seen, applied_ids, max_total)

    # Non-Excel talent pool rows (legacy TALENT_POOL source)
    talent_legacy = await (
        db.candidates.find(
            {
                "source": {"$in": ["TALENT_POOL", "EXCEL_IMPORT"]},
                "seed_marker": {"$ne": EXCEL_MARKER},
                "$or": [
                    {"import_source_file": {"$exists": False}},
                    {"import_source_file": None},
                ],
            },
            {"_id": 0},
        )
        .sort([("pin_rank", -1), ("created_at", -1)])
        .limit(per_bucket)
        .to_list(per_bucket)
    )
    _append_unique(out, talent_legacy, seen, applied_ids, max_total)

    # 3) Excel imports — prefer skill overlap when job has skills
    excel_marker = _excel_marker_clause()
    if skill_or:
        excel_filter: Dict[str, Any] = {"$and": [{"$or": skill_or}, excel_marker]}
        excel_rows = await (
            db.candidates.find(excel_filter, {"_id": 0})
            .sort([("pin_rank", -1), ("created_at", -1)])
            .limit(per_bucket)
            .to_list(per_bucket)
        )
        _append_unique(out, excel_rows, seen, applied_ids, max_total)

    excel_all = await (
        db.candidates.find(excel_marker, {"_id": 0})
        .sort([("pin_rank", -1), ("created_at", -1)])
        .limit(per_bucket)
        .to_list(per_bucket)
    )
    _append_unique(out, excel_all, seen, applied_ids, max_total)

    # 4) Skill-based filler when the pool is still thin
    if len(out) < 100 and skill_or:
        filler = await (
            db.candidates.find({"$or": skill_or}, {"_id": 0})
            .sort("created_at", -1)
            .limit(max_total)
            .to_list(max_total)
        )
        _append_unique(out, filler, seen, applied_ids, max_total)

    return out[:max_total]


async def load_persisted_fit_score(
    db, job_id: str, candidate_id: str
) -> Optional[Dict[str, Any]]:
    doc = await db.fit_scores.find_one(
        {"job_id": job_id, "candidate_id": candidate_id},
        {"_id": 0},
        sort=[("computed_at", -1)],  # type: ignore[arg-type]
    )
    return doc


def merge_fit_with_seed_persisted(
    job_id: str,
    candidate: Dict[str, Any],
    computed: Dict[str, Any],
    persisted: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """Prefer stored fit scores for per-job AI fit seeds (targets 70–90%)."""
    if not persisted:
        return computed

    seed_job = candidate.get("seed_job_id")
    is_job_fit_seed = (
        candidate.get("seed_marker") == FIT_SEED_MARKER
        or (seed_job is not None and str(seed_job) == str(job_id))
        or is_ai_generated_candidate(candidate)
    )
    if not is_job_fit_seed:
        return computed
    if seed_job is not None and str(seed_job) != str(job_id):
        return computed

    merged = {**computed}
    for key in (
        "title_score",
        "skill_match_pct",
        "activity_match_pct",
        "experience_score",
        "final_score",
        "must_have_ok",
        "score_source",
        "score_factors",
        "explanation",
    ):
        if persisted.get(key) is not None:
            merged[key] = persisted[key]
    if persisted.get("final_score") is not None:
        merged["final_score"] = round(float(persisted["final_score"]), 2)
        merged["score_source"] = persisted.get("score_source") or "seed"
    return merged
