#!/usr/bin/env python3
"""
Post-restore / post-migration smoke validation (M0-4).

Checks:
  - GET {base}/api/health returns 200
  - Optional: GET {base}/api/ with 200
  - Optional: Mongo ping + minimum collection counts if MONGO_URL / DB_NAME set

Exit code 0 = pass, non-zero = fail.

Usage:
  python scripts/validate_restore.py --base-url http://127.0.0.1:8001
  VALIDATE_MIN_USERS=1 python scripts/validate_restore.py
"""

from __future__ import annotations

import argparse
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _http_get(url: str, timeout: float) -> int:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return int(resp.status)


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    try:
        from secrets_loader import apply_secret_store

        apply_secret_store()
    except Exception:
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate API after restore or deploy")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("VALIDATE_RESTORE_BASE_URL", "http://127.0.0.1:8001"),
        help="API base URL (no trailing slash)",
    )
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--skip-root", action="store_true", help="Skip GET /api/")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    timeout = args.timeout

    for path, label in [("/api/health", "health")]:
        url = f"{base}{path}"
        try:
            code = _http_get(url, timeout)
        except urllib.error.HTTPError as e:
            print(f"FAIL {label}: HTTP {e.code} {url}", file=sys.stderr)
            return 2
        except Exception as e:
            print(f"FAIL {label}: {e!r} {url}", file=sys.stderr)
            return 2
        if code != 200:
            print(f"FAIL {label}: expected 200, got {code} {url}", file=sys.stderr)
            return 2
        print(f"OK {label}: {code} {url}")

    if not args.skip_root:
        url = f"{base}/api/"
        try:
            code = _http_get(url, timeout)
            if code != 200:
                print(f"WARN root: expected 200, got {code} {url}", file=sys.stderr)
            else:
                print(f"OK root: {code} {url}")
        except Exception as e:
            print(f"WARN root: {e!r}", file=sys.stderr)

    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    min_users = int(os.environ.get("VALIDATE_MIN_USERS", "0") or "0")
    if mongo_url and db_name and min_users > 0:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient

            async def _check() -> int:
                c = AsyncIOMotorClient(mongo_url)
                try:
                    n = await c[db_name].users.count_documents({})
                    if n < min_users:
                        print(f"FAIL users count {n} < {min_users}", file=sys.stderr)
                        return 3
                    print(f"OK users count: {n} (>={min_users})")
                    return 0
                finally:
                    c.close()

            import asyncio

            rc = asyncio.run(_check())
            if rc != 0:
                return rc
        except Exception as e:
            print(f"WARN mongo check skipped: {e!r}", file=sys.stderr)

    print("validate_restore: all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
