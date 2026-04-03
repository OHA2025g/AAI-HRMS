r"""
MongoDB migration runner (M0-4).

- Migration files live in backend/migrations/
- Filename pattern: ^[0-9]{4}_.+\.py$ (e.g. 0001_init.py)
- Each file must define: async def up(db) -> None
- Optional: async def down(db) -> None (manual / future CLI use)
- Applied migrations recorded in collection _schema_migrations { id, applied_at, checksum? }
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import importlib.util
import logging
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent
MIGRATIONS_DIR = BACKEND_DIR / "migrations"
MIGRATION_ID_RE = re.compile(r"^[0-9]{4}_.+\.py$")
SCHEMA_COLLECTION = "_schema_migrations"


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    from secrets_loader import apply_secret_store

    apply_secret_store()


def _list_migration_files() -> List[Path]:
    if not MIGRATIONS_DIR.is_dir():
        return []
    files = []
    for p in sorted(MIGRATIONS_DIR.iterdir()):
        if not p.is_file():
            continue
        if p.suffix != ".py":
            continue
        if p.name.startswith("_") or p.name.startswith("."):
            continue
        if p.name.endswith(".example"):
            continue
        if not MIGRATION_ID_RE.match(p.name):
            continue
        files.append(p)
    return files


def _file_checksum(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()[:16]


def _load_module(path: Path) -> Any:
    name = f"migration_{path.stem}"
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load migration module {path}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


async def _applied_ids(db) -> Set[str]:
    cursor = db[SCHEMA_COLLECTION].find({}, {"id": 1})
    out: Set[str] = set()
    async for doc in cursor:
        mid = doc.get("id")
        if isinstance(mid, str):
            out.add(mid)
    return out


async def run_migrations_up(*, dry_run: bool = False) -> List[str]:
    import os

    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise RuntimeError("MONGO_URL and DB_NAME must be set")

    applied: List[str] = []
    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        done = await _applied_ids(db)
        for path in _list_migration_files():
            mid = path.stem
            if mid in done:
                continue
            mod = _load_module(path)
            if not hasattr(mod, "up") or not callable(mod.up):
                raise RuntimeError(f"Migration {path.name} must define async def up(db)")
            chk = _file_checksum(path)
            logger.info("Applying migration %s", mid)
            if dry_run:
                applied.append(f"{mid} (dry-run)")
                continue
            await mod.up(db)
            await db[SCHEMA_COLLECTION].insert_one(
                {
                    "id": mid,
                    "applied_at": datetime.now(timezone.utc).isoformat(),
                    "checksum": chk,
                    "path": path.name,
                }
            )
            applied.append(mid)
    finally:
        client.close()
    return applied


async def migration_status() -> List[Dict[str, Any]]:
    _load_env()
    import os

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise RuntimeError("MONGO_URL and DB_NAME must be set")

    files = [p.stem for p in _list_migration_files()]
    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        done = await _applied_ids(db)
        rows = []
        for stem in files:
            rows.append({"id": stem, "applied": stem in done})
        return rows
    finally:
        client.close()


async def cmd_main(argv: List[str]) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="AAI-HRMS MongoDB migrations (M0-4)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_up = sub.add_parser("up", help="Apply pending migrations")
    p_up.add_argument("--dry-run", action="store_true", help="Print pending migrations without applying")

    sub.add_parser("status", help="List migration files and applied state")

    args = parser.parse_args(argv)

    try:
        if args.command == "up":
            applied = await run_migrations_up(dry_run=args.dry_run)
            if not applied:
                print("No pending migrations.")
            else:
                for a in applied:
                    print("Applied:", a)
            return 0
        if args.command == "status":
            for row in await migration_status():
                state = "applied" if row["applied"] else "pending"
                print(f"{row['id']}: {state}")
            return 0
    except Exception as e:
        logger.error("%s", e)
        return 1
    return 0
