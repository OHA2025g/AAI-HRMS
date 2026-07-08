"""Admin-only MongoDB flush helpers."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

FLUSH_CONFIRM_PHRASE = "FLUSH ALL DATA"
MIGRATION_REGISTRY = "_schema_migrations"


def is_db_flush_enabled() -> bool:
    raw = (os.environ.get("ALLOW_DB_FLUSH") or "1").strip().lower()
    return raw not in ("0", "false", "no", "off")


async def get_database_stats(db) -> Dict[str, Any]:
    names = sorted(await db.list_collection_names())
    collections: List[Dict[str, Any]] = []
    total_docs = 0
    for name in names:
        count = await db[name].count_documents({})
        total_docs += int(count)
        collections.append({"name": name, "document_count": int(count)})
    return {
        "db_name": db.name,
        "collection_count": len(collections),
        "document_count": total_docs,
        "collections": collections,
        "flush_enabled": is_db_flush_enabled(),
        "flush_confirm_phrase": FLUSH_CONFIRM_PHRASE,
    }


async def flush_database(
    db,
    *,
    confirm: str,
    preserve_migration_registry: bool = True,
    preserve_user_ids: Optional[List[str]] = None,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    if not is_db_flush_enabled():
        raise HTTPException(
            status_code=403,
            detail="Database flush is disabled (set ALLOW_DB_FLUSH=1 to enable).",
        )
    if (confirm or "").strip() != FLUSH_CONFIRM_PHRASE:
        raise HTTPException(
            status_code=400,
            detail=f'Confirmation must exactly match: "{FLUSH_CONFIRM_PHRASE}"',
        )

    preserve_user_ids = [uid for uid in (preserve_user_ids or []) if uid]
    skip = {MIGRATION_REGISTRY} if preserve_migration_registry else set()

    saved_users: List[Dict[str, Any]] = []
    if preserve_user_ids:
        saved_users = await db["users"].find({"id": {"$in": preserve_user_ids}}, {"_id": 0}).to_list(
            len(preserve_user_ids)
        )

    preserve_users = bool(saved_users)
    names = await db.list_collection_names()
    dropped: List[str] = []
    for name in names:
        if name in skip:
            continue
        if name == "users" and preserve_users:
            await db["users"].delete_many({})
            continue
        await db.drop_collection(name)
        dropped.append(name)

    if saved_users:
        await db["users"].insert_many(saved_users)

    return {
        "ok": True,
        "db_name": db.name,
        "dropped_collections": sorted(dropped),
        "preserved_collections": sorted(skip),
        "preserved_users": len(saved_users),
        "actor_id": actor_id,
        "flushed_at": datetime.now(timezone.utc).isoformat(),
    }
