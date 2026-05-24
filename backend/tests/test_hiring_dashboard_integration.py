"""Optional integration test for GET /dashboard/hiring-pack (requires running API)."""

from __future__ import annotations

import os

import pytest
import httpx


@pytest.mark.skipif(
    not os.environ.get("PHASE1_BEARER_TOKEN"),
    reason="Set PHASE1_BEARER_TOKEN and PHASE1_BASE_URL to run hiring-pack integration test",
)
@pytest.mark.asyncio
async def test_hiring_pack_returns_200():
    base = os.environ.get("PHASE1_BASE_URL", "http://127.0.0.1:11001").rstrip("/")
    token = os.environ["PHASE1_BEARER_TOKEN"]
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(
            f"{base}/api/dashboard/hiring-pack",
            params={"window_days": 30, "scope": "all", "include_trends": True, "trends_months": 6},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert "headline" in body
    assert "funnel" in body
    assert "trends" in body
    assert "points" in body["trends"]
    assert body["trends"].get("data_source") in ("snapshots", "seeded", "mixed", "synthetic")
    assert "ai_match_adoption" in body
    assert "referral_metrics" in body
    assert "career_trajectory_coverage" in body
    assert "median_fit_score" in body.get("headline", {})
    assert body.get("window_days") == 30
    assert "offer_funnel" in body
    assert "offer_aging" in body
    assert "bottleneck_slow_hires" in body
    assert "hire_journeys" in body
    assert "conversion_bottleneck" in body
    assert "interview_round_metrics" in body
    trends = body["trends"]
    assert "snapshot_count" in trends
    assert "live_snapshot_count" in trends
    assert "last_live_snapshot_at" in trends


@pytest.mark.skipif(
    not os.environ.get("PHASE1_BEARER_TOKEN"),
    reason="Set PHASE1_BEARER_TOKEN and PHASE1_BASE_URL to run trends health integration test",
)
@pytest.mark.asyncio
async def test_trends_health_returns_200():
    base = os.environ.get("PHASE1_BASE_URL", "http://127.0.0.1:11001").rstrip("/")
    token = os.environ["PHASE1_BEARER_TOKEN"]
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.get(
            f"{base}/api/dashboard/trends/health",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body.get("status") in ("ok", "no_snapshots", "seeded_only", "stale")
    assert "snapshot_count" in body
    assert "live_snapshot_count" in body
    assert "cron_token_configured" in body
