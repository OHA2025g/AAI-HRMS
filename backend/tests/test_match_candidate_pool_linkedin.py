"""LinkedIn RSC export bucket in job match candidate pool."""

from __future__ import annotations

from typing import Any, Dict, List

import pytest

from talent_acquisition.match_candidate_pool import gather_job_match_candidates


class _MemCursor:
    def __init__(self, rows: List[Dict[str, Any]]):
        self._rows = rows

    def sort(self, *args, **kwargs):
        return self

    def limit(self, n: int):
        self._rows = self._rows[:n]
        return self

    async def to_list(self, length: int = 0):
        return list(self._rows)


class _MemCollection:
    def __init__(self, rows: List[Dict[str, Any]]):
        self._rows = rows

    def find(self, query: Dict[str, Any], projection=None):
        matched = []
        for row in self._rows:
            if self._matches(row, query):
                matched.append({k: v for k, v in row.items() if k != "_id"})
        return _MemCursor(matched)

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        if "$and" in query:
            return all(self._matches(doc, part) for part in query["$and"])
        if "$or" in query:
            return any(self._matches(doc, part) for part in query["$or"])
        for key, cond in query.items():
            if key.startswith("$"):
                continue
            val = doc.get(key)
            if isinstance(cond, dict):
                if "$ne" in cond and val == cond["$ne"]:
                    return False
                if "$in" in cond and val not in cond["$in"]:
                    return False
                if "$exists" in cond:
                    exists = val is not None
                    if cond["$exists"] and not exists:
                        return False
                    if not cond["$exists"] and exists:
                        return False
                if "$not" in cond:
                    import re

                    rx = cond["$not"].get("$regex")
                    if rx and val and re.search(rx, str(val), re.I):
                        return False
            elif val != cond:
                return False
        return True


class _MemDb:
    def __getitem__(self, name: str):
        return self._collections[name]

    def __getattr__(self, name: str):
        return self._collections[name]

    def __init__(self, candidates: List[Dict[str, Any]]):
        self._collections = {
            "candidates": _MemCollection(candidates),
            "applications": _MemCollection([]),
            "fit_scores": _MemCollection([]),
        }


@pytest.mark.asyncio
async def test_gather_includes_linkedin_rsc_export_for_job():
    job = {"id": "job-1", "job_code": "ENG-001"}
    db = _MemDb(
        [
            {
                "id": "li-real",
                "source": "LINKEDIN",
                "email": "real@example.com",
                "linkedin_external_job_id": "ENG-001",
            },
            {"id": "bulk-1", "source": "BULK_SEED", "email": "bulk@example.com"},
        ]
    )
    out = await gather_job_match_candidates(
        db, job, "job-1", set(), [], per_bucket=50, max_total=50
    )
    ids = {c["id"] for c in out}
    assert "li-real" in ids


@pytest.mark.asyncio
async def test_gather_includes_org_wide_linkedin_when_not_job_scoped():
    job = {"id": "job-2", "job_code": "OTHER"}
    db = _MemDb(
        [
            {
                "id": "li-other",
                "source": "LINKEDIN",
                "email": "other@example.com",
                "linkedin_external_job_id": "REMOTE-99",
            },
        ]
    )
    out = await gather_job_match_candidates(
        db, job, "job-2", set(), [], per_bucket=50, max_total=50
    )
    assert any(c["id"] == "li-other" for c in out)
