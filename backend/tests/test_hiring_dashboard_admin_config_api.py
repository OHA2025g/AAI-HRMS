"""API tests for admin hiring dashboard configuration."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

import server as srv
from talent_acquisition.hiring_dashboard_config import (
    COL_HIRING_DASHBOARD_CONFIG,
    COL_HIRING_DASHBOARD_CONFIG_AUDIT,
)

_TEST_PASSWORD = "QA_Seed_ChangeMe!"

pytestmark = pytest.mark.usefixtures("bind_motor_to_current_loop")


@pytest_asyncio.fixture
async def admin_client():
    transport = ASGITransport(app=srv.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def _seed_admin(email: str = "admin_config_test@aai-hrms.local") -> dict:
    uid = "admin-config-test-user"
    doc = {
        "id": uid,
        "email": email,
        "full_name": "Config Test Admin",
        "role": "admin",
        "password": srv.hash_password(_TEST_PASSWORD),
        "is_active": True,
    }
    await srv.db.users.update_one({"id": uid}, {"$set": doc}, upsert=True)
    return doc


async def _auth_headers(client: AsyncClient, email: str):
    res = await client.post("/api/auth/login", json={"email": email, "password": _TEST_PASSWORD})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_admin_get_hiring_dashboard_config_includes_audit_trail(admin_client: AsyncClient):
    await _seed_admin()
    headers = await _auth_headers(admin_client, "admin_config_test@aai-hrms.local")

    res = await admin_client.get("/api/admin/hiring-dashboard/config", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "rule_flags" in body
    assert "llm_insights_enabled" in body
    assert "audit_trail" in body
    assert isinstance(body["audit_trail"], list)
    for key in ("low_fit", "stuck_stage", "stale_req", "trend_target", "no_pipeline", "no_ai_matches", "high_fit_recent"):
        assert key in body["rule_flags"]


@pytest.mark.asyncio
async def test_admin_put_hiring_dashboard_config_writes_audit(admin_client: AsyncClient):
    await _seed_admin()
    headers = await _auth_headers(admin_client, "admin_config_test@aai-hrms.local")

    await srv.db[COL_HIRING_DASHBOARD_CONFIG].delete_many({})
    await srv.db[COL_HIRING_DASHBOARD_CONFIG_AUDIT].delete_many({})

    put_res = await admin_client.put(
        "/api/admin/hiring-dashboard/config",
        headers=headers,
        json={
            "llm_insights_enabled": True,
            "rule_flags": {
                "low_fit": True,
                "stuck_stage": True,
                "stale_req": False,
                "trend_target": True,
                "no_pipeline": True,
                "no_ai_matches": False,
                "high_fit_recent": True,
            },
        },
    )
    assert put_res.status_code == 200, put_res.text
    body = put_res.json()
    assert body["llm_insights_enabled"] is True
    assert body["rule_flags"]["stale_req"] is False
    assert body["rule_flags"]["no_ai_matches"] is False
    assert len(body["audit_trail"]) >= 1

    audit_rows = await srv.db[COL_HIRING_DASHBOARD_CONFIG_AUDIT].find({}, {"_id": 0}).to_list(10)
    assert len(audit_rows) >= 1
    assert audit_rows[0].get("user_name")


@pytest.mark.asyncio
async def test_non_admin_cannot_update_hiring_dashboard_config(admin_client: AsyncClient):
    uid = "recruiter-config-test"
    await srv.db.users.update_one(
        {"id": uid},
        {
            "$set": {
                "id": uid,
                "email": "recruiter_config_test@aai-hrms.local",
                "full_name": "Recruiter",
                "role": "recruiter",
                "password": srv.hash_password(_TEST_PASSWORD),
                "is_active": True,
            }
        },
        upsert=True,
    )
    headers = await _auth_headers(admin_client, "recruiter_config_test@aai-hrms.local")
    res = await admin_client.put(
        "/api/admin/hiring-dashboard/config",
        headers=headers,
        json={"monthly_hire_target": 99},
    )
    assert res.status_code == 403
