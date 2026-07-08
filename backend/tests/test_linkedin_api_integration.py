"""API integration tests for LinkedIn admin routes and webhook."""

from __future__ import annotations

from typing import Any, Dict, List
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from talent_acquisition.linkedin_connector import linkedin_official_signature_hex
from talent_acquisition.linkedin_routes import create_linkedin_router


class _MemCursor:
    def __init__(self, rows: List[Dict[str, Any]]):
        self._rows = rows

    def sort(self, *args, **kwargs):
        return self

    def limit(self, n: int):
        self._rows = self._rows[:n]
        return self

    async def to_list(self, length: int = 0):
        return list(self._rows)


class _MemCollection:
    def __init__(self, name: str, store: Dict[str, List[Dict[str, Any]]]):
        self._name = name
        self._store = store
        if name not in store:
            store[name] = []

    def find(self, query: Dict[str, Any], projection=None):
        rows = self._store.get(self._name, [])
        if not query:
            return _MemCursor([dict(r) for r in rows])
        matched = []
        for row in rows:
            ok = True
            for k, v in query.items():
                if row.get(k) != v:
                    ok = False
                    break
            if ok:
                matched.append(dict(row))
        return _MemCursor(matched)

    async def find_one(self, query: Dict[str, Any], projection=None):
        cur = self.find(query, projection)
        rows = await cur.to_list(1)
        return rows[0] if rows else None

    async def count_documents(self, query: Dict[str, Any]):
        cur = self.find(query)
        return len(await cur.to_list(1000))

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert=False):
        rows = self._store.setdefault(self._name, [])
        matched_idx = None
        for i, row in enumerate(rows):
            if all(row.get(k) == v for k, v in query.items()):
                matched_idx = i
                break
        patch = update.get("$set", {})
        if matched_idx is None:
            if upsert:
                doc = {**query, **patch}
                if "$setOnInsert" in update:
                    doc.update(update["$setOnInsert"])
                rows.append(doc)
            return
        rows[matched_idx].update(patch)


class _MemDb:
    def __init__(self):
        self._store: Dict[str, List[Dict[str, Any]]] = {}

    def __getitem__(self, name: str):
        return _MemCollection(name, self._store)

    def __getattr__(self, name: str):
        return _MemCollection(name, self._store)


@pytest.fixture
def linkedin_app():
    db = _MemDb()
    cfg = {
        "name": "LINKEDIN",
        "enabled": True,
        "client_id": "cid",
        "client_secret": "sec",
        "linkedin_organization_id": "12345",
    }
    import asyncio

    asyncio.run(
        db["connector_configs"].update_one(
            {"name": "LINKEDIN"},
            {"$set": cfg},
            upsert=True,
        )
    )

    async def upsert(doc):
        return {**doc, "id": doc.get("id") or "cand-x"}

    app = FastAPI()
    admin = {"id": "admin-1", "role": "admin", "email": "admin@test.com"}

    async def get_user():
        return admin

    def require_admin(user):
        if user.get("role") != "admin":
            from fastapi import HTTPException

            raise HTTPException(status_code=403, detail="Admin only")

    router = create_linkedin_router(
        db=db,
        get_current_user=get_user,
        require_admin=require_admin,
        upsert_candidate=upsert,
    )
    app.include_router(router)

    return app, db, cfg


@pytest.mark.asyncio
async def test_webhook_challenge_get(linkedin_app):
    app, _db, cfg = linkedin_app
    code = "890e4665-4dfe-4ab1-b689-ed553bceeed0"
    from talent_acquisition.linkedin_connector import linkedin_challenge_response_hex

    expected_resp = linkedin_challenge_response_hex(cfg["client_secret"], code)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/webhooks/linkedin/events",
            params={"challengeCode": code},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["challengeCode"] == code
    assert data["challengeResponse"] == expected_resp


@pytest.mark.asyncio
async def test_webhook_rejects_bad_hmac(linkedin_app):
    app, db, cfg = linkedin_app
    await db["connector_configs"].update_one(
        {"name": "LINKEDIN"},
        {"$set": {**cfg, "webhook_secret": "supersecret"}},
        upsert=True,
    )
    body = b'{"requestId":"req-abc"}'
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/webhooks/linkedin/events",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-LinkedIn-Signature": "wrong",
            },
        )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_webhook_accepts_legacy_shared_secret(linkedin_app):
    app, db, cfg = linkedin_app
    secret = "supersecret"
    await db["connector_configs"].update_one(
        {"name": "LINKEDIN"},
        {"$set": {**cfg, "webhook_secret": secret, "client_secret": ""}},
        upsert=True,
    )
    body = b'{"requestId":"req-hmac-1","eventType":"EXPORT_CANDIDATE_PROFILE"}'

    with patch(
        "talent_acquisition.linkedin_routes.process_export_request_id",
        new_callable=AsyncMock,
    ) as mock_proc:
        mock_proc.return_value = {
            "ok": True,
            "upserted": 1,
            "elements": 1,
            "message": None,
        }
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/webhooks/linkedin/events",
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-LinkedIn-Signature": secret,
                },
            )
    assert res.status_code == 200
    data = res.json()
    assert data.get("received") is True
    assert data.get("request_id") == "req-hmac-1"


@pytest.mark.asyncio
async def test_webhook_accepts_official_x_li_signature(linkedin_app):
    app, db, cfg = linkedin_app
    body = b'{"id":"req-official-1","type":"EXPORT_CANDIDATE_PROFILE"}'
    sig = linkedin_official_signature_hex(cfg["client_secret"], body)

    with patch(
        "talent_acquisition.linkedin_routes.process_export_request_id",
        new_callable=AsyncMock,
    ) as mock_proc:
        mock_proc.return_value = {"ok": True, "upserted": 1, "elements": 1}
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/webhooks/linkedin/events",
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-LI-Signature": sig,
                },
            )
    assert res.status_code == 200
    assert res.json().get("request_id") == "req-official-1"


@pytest.mark.asyncio
async def test_fetch_export_endpoint(linkedin_app):
    app, _db, _cfg = linkedin_app
    with patch(
        "talent_acquisition.linkedin_routes.process_export_request_id",
        new_callable=AsyncMock,
    ) as mock_proc:
        mock_proc.return_value = {
            "ok": True,
            "upserted": 2,
            "elements": 2,
            "candidate_ids": ["c1", "c2"],
        }
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
                "/admin/linkedin/fetch-export",
                json={"request_id": "manual-req-99"},
            )
    assert res.status_code == 200
    assert res.json()["upserted"] == 2


@pytest.mark.asyncio
async def test_sync_open_jobs_endpoint(linkedin_app):
    app, _db, _cfg = linkedin_app
    with patch(
        "talent_acquisition.linkedin_routes.sync_open_jobs_to_linkedin",
        new_callable=AsyncMock,
    ) as mock_sync:
        mock_sync.return_value = {"ok": True, "synced": 3, "failed": 0, "errors": []}
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/admin/linkedin/sync-open-jobs?limit=10")
    assert res.status_code == 200
    assert res.json()["synced"] == 3


@pytest.mark.asyncio
async def test_linkedin_test_connection_endpoint(linkedin_app):
    app, _db, _cfg = linkedin_app
    with patch(
        "talent_acquisition.linkedin_routes.test_linkedin_connection",
        new_callable=AsyncMock,
    ) as mock_test:
        mock_test.return_value = {
            "ok": True,
            "message": "LinkedIn API credentials verified successfully",
            "integration_context": "urn:li:organization:12345",
            "api_version": "202603",
        }
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post("/admin/linkedin/test")
    assert res.status_code == 200
    assert res.json()["ok"] is True


@pytest.mark.asyncio
async def test_export_queue_list_requires_admin(linkedin_app):
    app, db, _cfg = linkedin_app
    await db["linkedin_export_requests"].update_one(
        {"request_id": "r1"},
        {
            "$set": {
                "request_id": "r1",
                "status": "pending",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        },
        upsert=True,
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/admin/linkedin/export-queue?limit=10")
    assert res.status_code == 200
    assert len(res.json().get("items") or []) >= 1
