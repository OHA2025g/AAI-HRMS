"""API test: hiring-pack uses LLM insights when config + mock LLM path succeed."""

from __future__ import annotations

from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

import server as srv
from talent_acquisition.hiring_dashboard_schemas import AiInsightItem, AiRecommendation
from talent_acquisition.hiring_pack_cache import hiring_pack_cache_size, invalidate_hiring_pack_cache

_TEST_PASSWORD = "QA_Seed_ChangeMe!"

pytestmark = pytest.mark.usefixtures("bind_motor_to_current_loop")


@pytest_asyncio.fixture
async def pack_client():
    transport = ASGITransport(app=srv.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def _seed_admin(email: str = "llm_pack_admin@aai-hrms.local") -> dict:
    uid = "llm-pack-admin-user"
    doc = {
        "id": uid,
        "email": email,
        "full_name": "LLM Pack Admin",
        "role": "admin",
        "password": srv.hash_password(_TEST_PASSWORD),
        "is_active": True,
    }
    await srv.db.users.update_one({"id": uid}, {"$set": doc}, upsert=True)
    return doc


async def _auth_headers(client: AsyncClient, email: str):
    res = await client.post("/api/auth/login", json={"email": email, "password": _TEST_PASSWORD})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


async def _fake_enhance_insights_with_llm(**kwargs):
    return (
        AiRecommendation(
            title="LLM prioritization",
            message="Focus on stuck interview stages.",
            impact_days=9,
            action_path="/pipeline?tab=interviews",
        ),
        [
            AiInsightItem(
                severity="orange",
                title="Interview backlog",
                message="Several candidates exceed SLA.",
                action_label="Review pipeline",
                action_path="/pipeline",
            )
        ],
        "llm",
    )


@pytest.mark.asyncio
async def test_hiring_pack_returns_llm_source_when_enabled_and_mock_succeeds(pack_client: AsyncClient):
    await _seed_admin()
    headers = await _auth_headers(pack_client, "llm_pack_admin@aai-hrms.local")
    invalidate_hiring_pack_cache(reason="test_reset")

    put_res = await pack_client.put(
        "/api/admin/hiring-dashboard/config",
        headers=headers,
        json={"llm_insights_enabled": True},
    )
    assert put_res.status_code == 200, put_res.text

    with patch(
        "talent_acquisition.hiring_dashboard_llm_insights.enhance_insights_with_llm",
        side_effect=_fake_enhance_insights_with_llm,
    ), patch(
        "talent_acquisition.hiring_dashboard_llm_insights.mistral_configured",
        return_value=True,
    ):
        res = await pack_client.get(
            "/api/dashboard/hiring-pack",
            headers=headers,
            params={"window_days": 30, "scope": "all"},
        )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body.get("ai_insights_source") == "llm"
    assert body.get("ai_recommendation", {}).get("title") == "LLM prioritization"
    assert body.get("ai_insights")


@pytest.mark.asyncio
async def test_admin_config_update_invalidates_hiring_pack_cache(pack_client: AsyncClient):
    await _seed_admin()
    headers = await _auth_headers(pack_client, "llm_pack_admin@aai-hrms.local")
    invalidate_hiring_pack_cache(reason="test_reset")

    from talent_acquisition.hiring_pack_cache import set_cached_hiring_pack

    set_cached_hiring_pack("cached-key", {"health_score": 50})
    assert hiring_pack_cache_size() >= 1

    res = await pack_client.put(
        "/api/admin/hiring-dashboard/config",
        headers=headers,
        json={"monthly_hire_target": 11},
    )
    assert res.status_code == 200, res.text
    assert hiring_pack_cache_size() == 0
