#!/usr/bin/env python3
"""Docker entrypoint helper: run demo seeds once per Mongo volume unless forced."""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

MARKER_COLLECTION = "_docker_bootstrap"
MARKER_ID = "demo_seeds_v1"


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    try:
        from secrets_loader import apply_secret_store

        apply_secret_store()
    except Exception:
        pass


def is_complete() -> bool:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        return False
    from pymongo import MongoClient

    db = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)[db_name]
    return db[MARKER_COLLECTION].find_one({"_id": MARKER_ID}) is not None


def mark_complete() -> None:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise RuntimeError("MONGO_URL and DB_NAME required")
    from pymongo import MongoClient

    db = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)[db_name]
    now = datetime.now(timezone.utc).isoformat()
    db[MARKER_COLLECTION].update_one(
        {"_id": MARKER_ID},
        {"$set": {"completed_at": now, "version": 1}},
        upsert=True,
    )


def clear_marker() -> None:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        return
    from pymongo import MongoClient

    MongoClient(mongo_url, serverSelectionTimeoutMS=5000)[db_name][MARKER_COLLECTION].delete_one(
        {"_id": MARKER_ID}
    )


if __name__ == "__main__":
    cmd = (sys.argv[1] if len(sys.argv) > 1 else "check").strip().lower()
    if cmd == "check":
        raise SystemExit(0 if is_complete() else 1)
    if cmd == "mark":
        mark_complete()
        print("Docker demo bootstrap marker recorded.")
        raise SystemExit(0)
    if cmd == "clear":
        clear_marker()
        print("Docker demo bootstrap marker cleared.")
        raise SystemExit(0)
    print(f"Unknown command: {cmd}", file=sys.stderr)
    raise SystemExit(2)
