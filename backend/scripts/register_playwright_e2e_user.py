#!/usr/bin/env python3
"""Upsert Playwright E2E admin user directly in Mongo (no API boot required)."""

from __future__ import annotations

import asyncio
import os
import sys

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import server as srv  # noqa: E402


async def main() -> None:
    email = (os.environ.get("PLAYWRIGHT_USER_EMAIL") or "ci_e2e@example.com").strip().lower()
    password = os.environ.get("PLAYWRIGHT_USER_PASSWORD") or "secret123"
    uid = "playwright-e2e-admin"
    doc = {
        "id": uid,
        "email": email,
        "full_name": "E2E User",
        "role": "admin",
        "password": srv.hash_password(password),
        "is_active": True,
    }
    await srv.db.users.delete_many({"email": email, "id": {"$ne": uid}})
    await srv.db.users.update_one({"id": uid}, {"$set": doc}, upsert=True)
    print(f"Upserted E2E admin: {email}")


if __name__ == "__main__":
    asyncio.run(main())
