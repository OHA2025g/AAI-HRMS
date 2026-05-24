"""Classify candidates by ingestion source (mirrors frontend `candidateSource.js`)."""

from __future__ import annotations

from typing import Any, Dict

_HRMS_LOCAL_ADMIN_EMAILS = frozenset(
    {
        "qa_admin@aai-hrms.local",
        "qa.employee@aai-hrms.local",
        "excel.import.admin@aai-hrms.local",
        "seed.admin@aai-hrms.local",
    }
)


def is_excel_imported_candidate(candidate: Dict[str, Any] | None) -> bool:
    if not candidate:
        return False
    source = str(candidate.get("source") or "").strip().upper()
    marker = str(candidate.get("seed_marker") or "").strip()
    if marker == "excel_candidates_v1":
        return True
    if candidate.get("import_source_file") or candidate.get("import_stable_id"):
        return True
    if source == "EXCEL_IMPORT":
        return True
    return False


def is_talent_pool_only_candidate(candidate: Dict[str, Any] | None) -> bool:
    if not candidate or is_excel_imported_candidate(candidate):
        return False
    if is_ai_generated_candidate(candidate):
        return False
    source = str(candidate.get("source") or "").strip().upper()
    if source == "BULK_SEED":
        return True
    return is_talent_pool_candidate(candidate)


def is_talent_pool_candidate(candidate: Dict[str, Any] | None) -> bool:
    if not candidate:
        return False
    source = str(candidate.get("source") or "").strip().upper()
    marker = str(candidate.get("seed_marker") or "").strip()
    if marker == "excel_candidates_v1":
        return True
    if candidate.get("import_source_file") or candidate.get("import_stable_id"):
        return True
    if source in ("TALENT_POOL", "EXCEL_IMPORT", "BULK_SEED"):
        return True
    return False


def is_linkedin_sourced_candidate(candidate: Dict[str, Any] | None) -> bool:
    """LinkedIn connector or AI-generated fit/demo seeds (not talent pool)."""
    if not candidate or is_talent_pool_candidate(candidate):
        return False

    source = str(candidate.get("source") or "").strip().upper()
    marker = str(candidate.get("seed_marker") or "").strip()
    email = str(candidate.get("email") or "").strip().lower()

    if marker == "job_posting_fit_candidates_v1":
        return True
    if candidate.get("seed_job_id") is not None and candidate.get("seed_slot") is not None:
        return True
    if source in ("FIT_SEED", "DEMO", "LINKEDIN"):
        return True
    if email.startswith("fitseed.") and email.endswith("@aai-hrms.local"):
        return True
    if email.endswith("@aai-hrms.local") and email not in _HRMS_LOCAL_ADMIN_EMAILS:
        return True
    if source == "LINKEDIN" and (
        "fitseed" in email or email.endswith("@aai-hrms.local")
    ):
        return True
    return False


def is_ai_generated_candidate(candidate: Dict[str, Any] | None) -> bool:
    """Alias for UI label “AI generated” / LinkedIn fit seeds."""
    return is_linkedin_sourced_candidate(candidate)


def _talent_pool_ex_mongo_filter() -> Dict[str, Any]:
    return {
        "$or": [
            {"seed_marker": "excel_candidates_v1"},
            {"import_source_file": {"$exists": True, "$ne": None}},
            {"import_stable_id": {"$exists": True, "$ne": None}},
            {"source": {"$regex": "^EXCEL_IMPORT$", "$options": "i"}},
        ]
    }


def _talent_pool_only_mongo_filter() -> Dict[str, Any]:
    """Non-Excel talent pool (DB bulk seed / legacy TALENT_POOL rows)."""
    return {
        "$and": [
            {"source": {"$regex": "^(BULK_SEED|TALENT_POOL)$", "$options": "i"}},
            {"seed_marker": {"$ne": "excel_candidates_v1"}},
            {
                "$or": [
                    {"import_source_file": {"$exists": False}},
                    {"import_source_file": None},
                ]
            },
        ]
    }


def all_talent_pool_mongo_filter() -> Dict[str, Any]:
    """Excel + DB talent pool (combined inventory for source filter)."""
    return {"$or": [_talent_pool_ex_mongo_filter(), _talent_pool_only_mongo_filter()]}


def display_channel_mongo_filter(channel: str) -> Dict[str, Any]:
    """Mongo filter for dashboard display channels (Talent Pool-Ex / Talent Pool / LinkedIn)."""
    ch = str(channel or "").strip().lower()
    if ch in ("talent_pool_ex", "talent_pool-ex"):
        return _talent_pool_ex_mongo_filter()
    if ch in ("talent_pool", "talent_pool_all", "all_talent_pool"):
        if ch in ("talent_pool_all", "all_talent_pool"):
            return all_talent_pool_mongo_filter()
        return _talent_pool_only_mongo_filter()
    if ch == "linkedin":
        return {
            "$or": [
                {"seed_marker": "job_posting_fit_candidates_v1"},
                {"source": {"$regex": "^(FIT_SEED|DEMO|LINKEDIN)$", "$options": "i"}},
                {"email": {"$regex": "^fitseed\\.", "$options": "i"}},
            ]
        }
    return {}
