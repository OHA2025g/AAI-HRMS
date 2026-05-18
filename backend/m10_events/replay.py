"""Admin replay — reset events to PENDING and optionally clear idempotency (M10-2)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from m10_events.constants import COL_M10_EVENTS, COL_M10_IDEMPOTENCY, CONSUMER_NAME
from m10_events.schemas import M10ReplayRequest


async def replay_events(db, req: M10ReplayRequest, *, clear_idempotency: bool = False) -> Dict[str, Any]:
    q: Dict[str, Any] = {}
    if req.event_ids:
        q["event_id"] = {"$in": req.event_ids}
    else:
        if req.topic:
            q["topic"] = req.topic
        if req.since_iso:
            q["created_at"] = {"$gte": req.since_iso}

    if not q:
        return {"matched": 0, "updated": 0, "error": "specify event_ids or topic+since_iso"}

    cursor = db[COL_M10_EVENTS].find(q, {"_id": 0, "event_id": 1, "envelope": 1}).limit(req.limit)
    rows = await cursor.to_list(req.limit)
    ids = [r["event_id"] for r in rows if r.get("event_id")]
    if not ids:
        return {"matched": 0, "updated": 0}

    now = datetime.now(timezone.utc).isoformat()
    res = await db[COL_M10_EVENTS].update_many(
        {"event_id": {"$in": ids}},
        {
            "$set": {
                "status": "PENDING",
                "last_error": None,
                "processed_at": None,
                "replay_at": now,
            }
        },
    )

    idem_removed = 0
    if clear_idempotency:
        for r in rows:
            env = r.get("envelope") or {}
            ik = env.get("idempotency_key")
            topic = env.get("topic")
            if ik and topic:
                d = await db[COL_M10_IDEMPOTENCY].delete_many(
                    {"consumer": CONSUMER_NAME, "topic": topic, "idempotency_key": str(ik)}
                )
                idem_removed += d.deleted_count

    return {
        "matched": len(ids),
        "updated": res.modified_count,
        "event_ids": ids,
        "idempotency_records_removed": idem_removed,
    }
