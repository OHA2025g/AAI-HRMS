"""HTTP-layer tests for LinkedIn connector (mocked httpx)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from talent_acquisition.linkedin_connector import (
    build_webhook_challenge_response,
    fetch_exported_candidate_by_request_id,
    linkedin_challenge_response_hex,
    sync_job_to_linkedin,
)


def test_build_webhook_challenge_response():
    code = "890e4665-4dfe-4ab1-b689-ed553bceeed0"
    secret = "my-client-secret"
    out = build_webhook_challenge_response(code, secret)
    assert out["challengeCode"] == code
    assert out["challengeResponse"] == linkedin_challenge_response_hex(secret, code)


@pytest.mark.asyncio
async def test_fetch_exported_candidate_by_request_id_success():
    cfg = {"linkedin_api_version": "202603"}
    token = "access-token"
    elements = [
        {
            "candidate": {"firstName": "Ann", "lastName": "Lee"},
            "externalJobPostingId": "JOB-1",
        }
    ]
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"elements": elements}

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(return_value=mock_resp)
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=None)

    with patch(
        "talent_acquisition.linkedin_connector.httpx.AsyncClient",
        return_value=mock_http,
    ):
        rows, err = await fetch_exported_candidate_by_request_id(cfg, token, "req-123")

    assert err is None
    assert len(rows) == 1
    assert rows[0]["_request_id"] == "req-123"
    mock_http.get.assert_awaited_once()


@pytest.mark.asyncio
async def test_fetch_exported_candidate_by_request_id_401():
    cfg = {"linkedin_api_version": "202603"}
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.text = "Unauthorized"

    mock_http = AsyncMock()
    mock_http.get = AsyncMock(return_value=mock_resp)
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=None)

    with patch(
        "talent_acquisition.linkedin_connector.httpx.AsyncClient",
        return_value=mock_http,
    ):
        rows, err = await fetch_exported_candidate_by_request_id(cfg, "bad-token", "req-1")

    assert rows is None
    assert "401" in (err or "")


@pytest.mark.asyncio
async def test_sync_job_to_linkedin_success():
    cfg = {"linkedin_organization_id": "12345", "linkedin_api_version": "202603"}
    job = {
        "id": "job-abc",
        "title": "Data Engineer",
        "description": "Build pipelines",
        "location": "Remote",
        "work_mode": "remote",
        "status": "OPEN",
    }
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = ""

    mock_http = AsyncMock()
    mock_http.put = AsyncMock(return_value=mock_resp)
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=None)

    with patch(
        "talent_acquisition.linkedin_connector.httpx.AsyncClient",
        return_value=mock_http,
    ):
        result = await sync_job_to_linkedin(cfg, "token", job)

    assert result["ok"] is True
    assert result["external_job_posting_id"] == "job-abc"
    mock_http.put.assert_awaited_once()


@pytest.mark.asyncio
async def test_sync_job_to_linkedin_http_error():
    cfg = {"linkedin_organization_id": "99", "linkedin_api_version": "202603"}
    job = {"id": "j1", "title": "Role", "description": "Desc", "status": "OPEN"}
    mock_resp = MagicMock()
    mock_resp.status_code = 422
    mock_resp.text = "Invalid payload"

    mock_http = AsyncMock()
    mock_http.put = AsyncMock(return_value=mock_resp)
    mock_http.__aenter__ = AsyncMock(return_value=mock_http)
    mock_http.__aexit__ = AsyncMock(return_value=None)

    with patch(
        "talent_acquisition.linkedin_connector.httpx.AsyncClient",
        return_value=mock_http,
    ):
        result = await sync_job_to_linkedin(cfg, "token", job)

    assert result["ok"] is False
    assert "422" in result["message"]
