#!/usr/bin/env python3
"""Upsert or update a user's bcrypt password in MongoDB."""

from __future__ import annotations

import argparse
import asyncio
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / ".env")
    from secrets_loader import apply_secret_store

    apply_secret_store()


def _email_query(email: str) -> dict:
    em = str(email or "").strip().lower()
    if not em:
        return {"email": "__no_match__"}
    return {"email": {"$regex": f"^{re.escape(em)}$", "$options": "i"}}


async def upsert_user_password(
    *,
    email: str,
    password: str,
    role: str = "admin",
    full_name: str | None = None,
) -> str:
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise RuntimeError("MONGO_URL and DB_NAME required")

    from motor.motor_asyncio import AsyncIOMotorClient

    email_norm = email.strip().lower()
    pw_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now = datetime.now(timezone.utc).isoformat()

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        user = await db.users.find_one(_email_query(email_norm), {"_id": 0})
        if user:
            await db.users.update_one(
                {"id": user["id"]},
                {
                    "$set": {
                        "email": email_norm,
                        "password": pw_hash,
                        "role": role,
                        "full_name": full_name or user.get("full_name") or email_norm.split("@")[0],
                        "updated_at": now,
                    }
                },
            )
            action = "Updated"
            user_id = user["id"]
        else:
            user_id = str(uuid.uuid4())
            await db.users.insert_one(
                {
                    "id": user_id,
                    "email": email_norm,
                    "password": pw_hash,
                    "full_name": full_name or email_norm.split("@")[0],
                    "role": role,
                    "created_at": now,
                    "updated_at": now,
                }
            )
            action = "Created"
        print(f"{action} user {email_norm} (role={role})")
        return user_id
    finally:
        client.close()


async def main() -> int:
    _load_env()
    parser = argparse.ArgumentParser(description="Set a user's password (bcrypt hash in MongoDB).")
    parser.add_argument("email")
    parser.add_argument("password")
    parser.add_argument("--role", default="admin")
    parser.add_argument("--full-name", default=None)
    args = parser.parse_args()
    await upsert_user_password(
        email=args.email,
        password=args.password,
        role=args.role,
        full_name=args.full_name,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
