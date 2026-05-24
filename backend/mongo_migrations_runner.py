"""MongoDB migration runner for backend/migrations/*.py modules."""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
from pathlib import Path
from typing import Any, List

from motor.motor_asyncio import AsyncIOMotorClient

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
REGISTRY = "_schema_migrations"


def _migration_ids() -> List[str]:
    ids: List[str] = []
    for path in sorted(MIGRATIONS_DIR.glob("[0-9]*_*.py")):
        ids.append(path.stem)
    return ids


def _load_module(migration_id: str):
    path = MIGRATIONS_DIR / f"{migration_id}.py"
    spec = importlib.util.spec_from_file_location(f"migrations.{migration_id}", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load migration {migration_id}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


async def _applied_ids(db) -> set[str]:
    rows = await db[REGISTRY].find({}, {"_id": 0, "id": 1}).to_list(10000)
    return {r["id"] for r in rows if r.get("id")}


async def migrate_up(db) -> None:
    applied = await _applied_ids(db)
    for mid in _migration_ids():
        if mid in applied:
            continue
        mod = _load_module(mid)
        fn = getattr(mod, "up", None)
        if fn is None:
            raise RuntimeError(f"Migration {mid} has no up()")
        await fn(db)
        await db[REGISTRY].insert_one({"id": mid, "applied_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()})


async def migrate_down(db, steps: int = 1) -> None:
    applied = sorted(await _applied_ids(db), reverse=True)
    for mid in applied[:steps]:
        mod = _load_module(mid)
        fn = getattr(mod, "down", None)
        if fn is not None:
            await fn(db)
        await db[REGISTRY].delete_one({"id": mid})


async def migrate_status(db) -> None:
    applied = await _applied_ids(db)
    for mid in _migration_ids():
        mark = "applied" if mid in applied else "pending"
        print(f"  {mid}: {mark}")


async def cmd_main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="MongoDB migrations")
    parser.add_argument("command", choices=["up", "down", "status"])
    parser.add_argument("--steps", type=int, default=1)
    args = parser.parse_args(argv)

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "aai_hrms")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    try:
        if args.command == "up":
            await migrate_up(db)
            print("Migrations applied.")
        elif args.command == "down":
            await migrate_down(db, steps=max(1, args.steps))
            print("Migrations rolled back.")
        else:
            print("Migration status:")
            await migrate_status(db)
    finally:
        client.close()
    return 0
