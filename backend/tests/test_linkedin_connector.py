"""Tests for LinkedIn Talent API connector."""

from __future__ import annotations

import hashlib
import hmac
from unittest.mock import AsyncMock, patch

import pytest

from talent_acquisition.linkedin_connector import (
    build_simple_job_posting_element,
    build_webhook_challenge_response,
    export_matches_job,
    extract_request_id_from_event,
    integration_context_urn,
    linkedin_official_signature_hex,
    maybe_create_application_for_linkedin_export,
    normalize_export_element,
    persist_export_elements,
    resolve_job_id_for_linkedin_export,
    validate_linkedin_config,
    verify_linkedin_webhook_signature,
)


def test_validate_linkedin_config_missing_secret():
    ok, msg = validate_linkedin_config(
        {"enabled": True, "client_id": "abc", "linkedin_organization_id": "99"}
    )
    assert not ok
    assert "Secret" in msg


def test_integration_context_urn_numeric():
    assert integration_context_urn({"linkedin_organization_id": "12345"}) == "urn:li:organization:12345"


def test_normalize_export_element_stub_profile():
    raw = {
        "candidate": {
            "firstName": "Jane",
            "lastName": "Doe",
            "headline": "Engineer",
            "profileUrl": "https://www.linkedin.com/in/jane-doe",
            "location": "Mumbai",
            "currentEmployerNames": ["Acme"],
            "emailAddresses": ["jane@example.com"],
        },
        "externalJobPostingId": "JOB-001",
        "integrationContext": "urn:li:organization:1",
        "_request_id": "req-1",
    }
    out = normalize_export_element(raw)
    assert out["full_name"] == "Jane Doe"
    assert out["email"] == "jane@example.com"
    assert out["linkedin_url"] == "https://www.linkedin.com/in/jane-doe"
    assert out["source"] == "LINKEDIN"


def test_export_matches_job_by_job_code():
    job = {"id": "x", "job_code": "JOB-001"}
    assert export_matches_job({"externalJobPostingId": "JOB-001"}, job)
    assert not export_matches_job({"externalJobPostingId": "OTHER"}, job)


def test_extract_request_id_nested():
    body = {"events": [{"eventType": "EXPORT_CANDIDATE_PROFILE", "requestId": "abc123"}]}
    assert extract_request_id_from_event(body) == "abc123"


@pytest.mark.asyncio
async def test_persist_export_elements_calls_upsert():
    elements = [
        {
            "candidate": {
                "firstName": "A",
                "lastName": "B",
                "profileUrl": "https://www.linkedin.com/in/ab",
            },
            "externalJobPostingId": "J1",
        }
    ]
    upserted_docs = []

    async def fake_upsert(doc):
        upserted_docs.append(doc)
        return {**doc, "id": "cand-1"}

    docs, count = await persist_export_elements(elements, fake_upsert, job=None)
    assert count == 1
    assert len(docs) == 1
    assert docs[0]["id"] == "cand-1"


def test_build_webhook_challenge_response_matches_hmac():
    code = "890e4665-4dfe-4ab1-b689-ed553bceeed0"
    secret = "client-secret"
    out = build_webhook_challenge_response(code, secret)
    assert out["challengeCode"] == code
    assert len(out["challengeResponse"]) == 64


def test_linkedin_official_signature_hex():
    body = b'{"id":"req-1","type":"EXPORT_CANDIDATE_PROFILE"}'
    expected = linkedin_official_signature_hex("client-secret", body)
    assert verify_linkedin_webhook_signature(
        body,
        x_li_signature=expected,
        client_secret="client-secret",
    )


def test_verify_webhook_legacy_plain_secret():
    assert verify_linkedin_webhook_signature(
        b"{}",
        x_linkedin_signature="plain",
        webhook_secret="plain",
    )


def test_verify_webhook_rejects_bad_official_sig():
    body = b'{"id":"x"}'
    assert not verify_linkedin_webhook_signature(
        body,
        x_li_signature="deadbeef",
        client_secret="client-secret",
    )


def test_extract_request_id_from_push_event_id_field():
    body = {"id": "59a92119-export-1", "type": "EXPORT_CANDIDATE_PROFILE"}
    assert extract_request_id_from_event(body) == "59a92119-export-1"


def test_extract_notification_id_from_event():
    from talent_acquisition.linkedin_connector import extract_notification_id_from_event

    body = {
        "notificationId": "notif-99",
        "requestId": "req-99",
        "type": "EXPORT_CANDIDATE_PROFILE",
    }
    assert extract_notification_id_from_event(body) == "notif-99"


def test_build_simple_job_posting_element():
    job = {
        "id": "job-1",
        "title": "Engineer",
        "description": "Build things",
        "location": "Mumbai",
        "work_mode": "remote",
        "status": "OPEN",
    }
    cfg = {"linkedin_organization_id": "99"}
    org, ext_id, el = build_simple_job_posting_element(job, cfg)
    assert org == "urn:li:organization:99"
    assert ext_id == "job-1"
    assert el["workplaceTypes"] == ["REMOTE"]
    assert el["integrationContext"] == org


@pytest.mark.asyncio
async def test_resolve_job_id_for_linkedin_export():
    class _Jobs:
        async def find_one(self, query, projection=None):
            assert query["$or"]
            return {"id": "job-abc"}

    db = type("DB", (), {"jobs": _Jobs()})()
    jid = await resolve_job_id_for_linkedin_export(
        db, {"externalJobPostingId": "ENG-42"}
    )
    assert jid == "job-abc"


@pytest.mark.asyncio
async def test_maybe_create_application_for_linkedin_export():
    apps: list = []
    history: list = []

    class _Apps:
        async def find_one(self, query, projection=None):
            return None

        async def insert_one(self, doc):
            apps.append(doc)

    class _History:
        async def insert_one(self, doc):
            history.append(doc)

    class _Candidates:
        async def update_one(self, query, patch):
            return None

    class _Jobs:
        async def find_one(self, query, projection=None):
            return {"id": "job-1"}

    db = type(
        "DB",
        (),
        {
            "jobs": _Jobs(),
            "applications": _Apps(),
            "application_stage_history": _History(),
            "candidates": _Candidates(),
        },
    )()
    ok = await maybe_create_application_for_linkedin_export(db, "cand-1", "job-1")
    assert ok is True
    assert apps[0]["stage"] == "SOURCED"
    assert history[0]["to_stage"] == "SOURCED"


@pytest.mark.asyncio
async def test_persist_export_elements_links_application():
    elements = [
        {
            "candidate": {"firstName": "A", "lastName": "B", "emailAddresses": ["a@b.com"]},
            "externalJobPostingId": "JOB-9",
        }
    ]

    class _Jobs:
        async def find_one(self, query, projection=None):
            return {"id": "job-9"}

    class _Apps:
        async def find_one(self, query, projection=None):
            return None

        async def insert_one(self, doc):
            pass

    class _History:
        async def insert_one(self, doc):
            pass

    class _Candidates:
        async def update_one(self, query, patch):
            pass

    db = type(
        "DB",
        (),
        {
            "jobs": _Jobs(),
            "applications": _Apps(),
            "application_stage_history": _History(),
            "candidates": _Candidates(),
        },
    )()
    async def fake_upsert(doc):
        return {**doc, "id": "cand-linked"}

    with patch(
        "talent_acquisition.linkedin_connector.maybe_create_application_for_linkedin_export",
        new_callable=AsyncMock,
    ) as mock_link:
        mock_link.return_value = True
        await persist_export_elements(
            elements, fake_upsert, job=None, db=db, link_applications=True
        )
        mock_link.assert_awaited_once()
        assert mock_link.await_args[0][1] == "cand-linked"
        assert mock_link.await_args[0][2] == "job-9"


@pytest.mark.asyncio
async def test_persist_export_elements_job_filter():
    elements = [
        {"candidate": {"firstName": "A", "lastName": "One"}, "externalJobPostingId": "JOB-001"},
        {"candidate": {"firstName": "B", "lastName": "Two"}, "externalJobPostingId": "OTHER"},
    ]

    async def fake_upsert(doc):
        return {**doc, "id": doc["full_name"]}

    job = {"job_code": "JOB-001"}
    docs, count = await persist_export_elements(elements, fake_upsert, job=job)
    assert count == 1
    assert docs[0]["full_name"] == "A One"
