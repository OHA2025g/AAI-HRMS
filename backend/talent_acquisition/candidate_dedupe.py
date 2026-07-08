"""Deduplicate candidate records that share an email (Excel import artifacts)."""

from __future__ import annotations

import json
import re
import time
from typing import Any, Dict, List, Tuple

from talent_acquisition.candidate_source import is_synthetic_demo_candidate

_DEDUPE_PAGE_CACHE: Dict[str, Tuple[float, Tuple[List[Dict[str, Any]], int]]] = {}
_DEDUPE_CACHE_TTL_SEC = 45


def _quality_score(doc: Dict[str, Any]) -> int:
    score = 0
    name = (doc.get("full_name") or "").strip()
    cid = str(doc.get("id") or "")
    if name and not re.fullmatch(r"\d+", name):
        score += 1000 + min(len(name), 100)
    if not re.fullmatch(r"\d+", cid):
        score += 100
    if doc.get("email"):
        score += 10
    if doc.get("skills"):
        score += 5
    return score


def dedupe_candidate_dicts(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    by_email: Dict[str, Dict[str, Any]] = {}
    without_email: List[Dict[str, Any]] = []

    for row in rows:
        if not row.get("id"):
            continue
        email = (row.get("email") or "").strip().lower()
        if email:
            prev = by_email.get(email)
            if prev is None or _quality_score(row) > _quality_score(prev):
                by_email[email] = row
            continue
        name = (row.get("full_name") or "").strip()
        cid = str(row.get("id") or "")
        if re.fullmatch(r"\d+", name) and re.fullmatch(r"\d+", cid):
            continue
        without_email.append(row)

    by_id: Dict[str, Dict[str, Any]] = {}
    for row in without_email:
        prev = by_id.get(row["id"])
        if prev is None or _quality_score(row) > _quality_score(prev):
            by_id[row["id"]] = row

    return list(by_email.values()) + list(by_id.values())


def dedupe_candidates_for_select(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    UI dropdown dedupe: drop AI fit-seed/demo rows, dedupe by email, then by display name.
    Fit seeds reuse the same full_name across jobs (e.g. many \"Aarav Sharma\" rows).
    """
    real_rows = [row for row in rows if not is_synthetic_demo_candidate(row)]
    email_deduped = dedupe_candidate_dicts(real_rows)

    by_name: Dict[str, Dict[str, Any]] = {}
    without_real_name: List[Dict[str, Any]] = []
    for row in email_deduped:
        name = (row.get("full_name") or "").strip()
        if not name or re.fullmatch(r"\d+", name):
            without_real_name.append(row)
            continue
        key = name.lower()
        prev = by_name.get(key)
        if prev is None or _quality_score(row) > _quality_score(prev):
            by_name[key] = row

    merged = list(by_name.values()) + without_real_name
    merged.sort(key=lambda row: (row.get("full_name") or row.get("email") or "").lower())
    return merged


def trajectory_select_candidate_filter() -> Dict[str, Any]:
    """Mongo filter: real candidates suitable for trajectory analyze dropdowns."""
    return {
        "full_name": {"$exists": True, "$ne": ""},
        "$and": [
            {"email": {"$not": {"$regex": r"^fitseed\.", "$options": "i"}}},
            {"email": {"$not": {"$regex": r"@bulkseed\.example$", "$options": "i"}}},
            {"seed_marker": {"$ne": "job_posting_fit_candidates_v1"}},
            {"source": {"$ne": "BULK_SEED"}},
            {
                "full_name": {
                    "$not": {"$regex": r"^Bulk Seed (Candidate|Employee) \d+$", "$options": "i"}
                }
            },
        ],
    }


def _merge_query_with_junk_exclusion(query: Dict[str, Any]) -> Dict[str, Any]:
    """Drop orphan import rows (numeric full_name + numeric id, no usable identity)."""
    junk = {
        "$nor": [
            {
                "$and": [
                    {"full_name": {"$regex": r"^\d+$"}},
                    {"id": {"$regex": r"^\d+$"}},
                ]
            }
        ]
    }
    if not query:
        return junk
    return {"$and": [query, junk]}


def _dedupe_pipeline_stages() -> List[Dict[str, Any]]:
    return [
        {
            "$addFields": {
                "_dedupe_key": {
                    "$let": {
                        "vars": {
                            "em": {
                                "$trim": {"input": {"$ifNull": ["$email", ""]}},
                            }
                        },
                        "in": {
                            "$cond": [
                                {"$gt": [{"$strLenCP": "$$em"}, 0]},
                                {"$toLower": "$$em"},
                                {"$concat": ["id:", {"$ifNull": ["$id", ""]}]},
                            ]
                        },
                    }
                },
                "_name_score": {
                    "$cond": [
                        {
                            "$regexMatch": {
                                "input": {"$ifNull": ["$full_name", ""]},
                                "regex": r"^\d+$",
                            }
                        },
                        0,
                        {
                            "$min": [
                                {
                                    "$strLenCP": {
                                        "$trim": {
                                            "input": {"$ifNull": ["$full_name", ""]},
                                        }
                                    }
                                },
                                100,
                            ]
                        },
                    ]
                },
            }
        },
        {"$sort": {"_name_score": -1, "pin_rank": -1, "created_at": -1}},
        {"$group": {"_id": "$_dedupe_key", "doc": {"$first": "$$ROOT"}}},
        {"$replaceRoot": {"newRoot": "$doc"}},
        {
            "$project": {
                "_id": 0,
                "_dedupe_key": 0,
                "_name_score": 0,
            }
        },
        {"$sort": {"pin_rank": -1, "created_at": -1}},
    ]


async def count_deduped_candidates(db: Any, query: Dict[str, Any]) -> int:
    """Count unique candidates (one per email, best row wins)."""
    match_q = _merge_query_with_junk_exclusion(query)
    pipeline = [{"$match": match_q}, *_dedupe_pipeline_stages(), {"$count": "total"}]
    rows = await db.candidates.aggregate(pipeline).to_list(1)
    return int(rows[0]["total"]) if rows else 0


async def find_deduped_candidates_paged(
    db: Any,
    query: Dict[str, Any],
    page: int,
    page_size: int,
) -> Tuple[List[Dict[str, Any]], int]:
    """Return deduplicated candidate page and unique total for the same filters."""
    cache_key = json.dumps({"query": query, "page": page, "page_size": page_size}, sort_keys=True, default=str)
    now = time.monotonic()
    cached = _DEDUPE_PAGE_CACHE.get(cache_key)
    if cached and now - cached[0] < _DEDUPE_CACHE_TTL_SEC:
        return cached[1]

    match_q = _merge_query_with_junk_exclusion(query)
    skip = max(0, (page - 1) * page_size)
    pipeline = [
        {"$match": match_q},
        *_dedupe_pipeline_stages(),
        {
            "$facet": {
                "meta": [{"$count": "total"}],
                "items": [{"$skip": skip}, {"$limit": page_size}],
            }
        },
    ]
    rows = await db.candidates.aggregate(pipeline, allowDiskUse=True).to_list(1)
    if not rows:
        result: Tuple[List[Dict[str, Any]], int] = ([], 0)
    else:
        block = rows[0]
        total = int(block["meta"][0]["total"]) if block.get("meta") else 0
        items = block.get("items") or []
        result = (items, total)

    _DEDUPE_PAGE_CACHE[cache_key] = (now, result)
    if len(_DEDUPE_PAGE_CACHE) > 128:
        stale_before = now - _DEDUPE_CACHE_TTL_SEC
        for key, (ts, _) in list(_DEDUPE_PAGE_CACHE.items()):
            if ts < stale_before:
                _DEDUPE_PAGE_CACHE.pop(key, None)
    return result
