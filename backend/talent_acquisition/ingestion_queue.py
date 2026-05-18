"""
Unified ingestion job tracking (M1-2).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional

INGESTION_JOBS_COLLECTION = "ingestion_jobs"


async def run_unified_ingestion(
    db,
    job: Dict[str, Any],
    total_limit: int,
    sources: List[str],
    runner: Callable[[str, Dict[str, Any], int], Awaitable[List[Dict[str, Any]]]],
    created_by: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Runs ingestion per source with isolated errors. Persists an ingestion_jobs document.
    """
    job_id = job.get("id") or ""
    ingest_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc: Dict[str, Any] = {
        "id": ingest_id,
        "job_id": job_id,
        "sources": sources,
        "status": "RUNNING",
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
        "per_source": {},
        "errors": {},
    }
    await db[INGESTION_JOBS_COLLECTION].insert_one(doc)

    n_sources = max(1, len(sources))
    per = max(1, total_limit // n_sources)
    for src in sources:
        try:
            got = await runner(src, job, per)
            doc["per_source"][src] = {"count": len(got)}
        except Exception as e:
            doc["errors"][src] = str(e)[:2000]
            doc["per_source"][src] = {"count": 0, "error": str(e)[:500]}

    doc["status"] = "COMPLETED" if not doc["errors"] else "COMPLETED_WITH_ERRORS"
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db[INGESTION_JOBS_COLLECTION].update_one(
        {"id": ingest_id},
        {
            "$set": {
                "status": doc["status"],
                "updated_at": doc["updated_at"],
                "per_source": doc["per_source"],
                "errors": doc["errors"],
            }
        },
    )
    return doc
