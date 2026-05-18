#!/usr/bin/env python3
"""CLI for MongoDB migrations. Run from repo: python backend/scripts/mongo_migrate.py (cwd=backend)."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def main() -> int:
    from mongo_migrations_runner import cmd_main

    return asyncio.run(cmd_main(sys.argv[1:]))


if __name__ == "__main__":
    raise SystemExit(main())
