"""Performance budget for build_hiring_dashboard_pack (plan: p95 < 800ms on demo dataset)."""

from __future__ import annotations

import os
import time

import pytest

pytestmark = pytest.mark.skipif(
    not os.environ.get("MONGO_URL"),
    reason="Set MONGO_URL to run hiring-pack performance test",
)


@pytest.mark.asyncio
async def test_hiring_pack_build_under_800ms():
    from motor.motor_asyncio import AsyncIOMotorClient

    from talent_acquisition.hiring_dashboard import build_hiring_dashboard_pack

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ.get("DB_NAME", "test_database")
    budget_sec = float(os.environ.get("HIRING_PACK_PERF_BUDGET_SEC", "0.8"))

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    try:
        durations = []
        for _ in range(3):
            start = time.perf_counter()
            await build_hiring_dashboard_pack(db, window_days=30, scope="all")
            durations.append(time.perf_counter() - start)
    finally:
        client.close()

    durations.sort()
    p95 = durations[-1]
    assert p95 < budget_sec, f"hiring-pack build p95={p95:.3f}s exceeds {budget_sec}s budget"
