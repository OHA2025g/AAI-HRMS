"""Pytest hooks for async Motor client (per-test event loop)."""

from __future__ import annotations

import os

import pytest_asyncio
from motor.motor_asyncio import AsyncIOMotorClient

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "aai_hrms_test")
os.environ.setdefault("JWT_SECRET", "test-secret-key-32-bytes-minimum!!")


@pytest_asyncio.fixture
async def bind_motor_to_current_loop():
    """Re-bind module-level Motor client when pytest-asyncio uses a new loop per test."""
    import server

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "aai_hrms_test")
    client = AsyncIOMotorClient(mongo_url)
    server.client = client
    server.db = client[db_name]
    yield
    # Keep client open until loop teardown; closing early breaks subsequent Motor ops in the same test.
