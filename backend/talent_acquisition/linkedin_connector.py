"""
LinkedIn Talent Solutions (Recruiter System Connect) connector.

Uses OAuth 2.0 client credentials and the official REST APIs:
- Token: https://www.linkedin.com/oauth/v2/accessToken
- Exported candidates: GET /rest/exportedCandidates?q=request&requestId=...

Candidates are ingested when recruiters export profiles from LinkedIn Recruiter
(one-click export). Push notifications enqueue request IDs; this module fetches
profile payloads and normalizes them for the HRMS candidate store.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple
from urllib.parse import quote

import httpx

from talent_acquisition.candidate_import.constants import DEFAULT_APPLICATION_STAGE
from talent_acquisition.connector_oauth import ensure_access_token
from talent_acquisition.normalize import normalize_board_candidate

logger = logging.getLogger(__name__)

LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_REST_BASE = "https://api.linkedin.com/rest"
LINKEDIN_DEFAULT_VERSION = "202603"
EXPORT_QUEUE_COLLECTION = "linkedin_export_requests"

EXPORT_EVENT_TYPES = frozenset(
    {
        "EXPORT_CANDIDATE_PROFILE",
        "export_candidate_profile",
    }
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def integration_context_urn(cfg: Dict[str, Any]) -> Optional[str]:
    raw = (
        cfg.get("linkedin_organization_id")
        or cfg.get("organization_id")
        or cfg.get("integration_context")
    )
    if not raw:
        return None
    s = str(raw).strip()
    if s.startswith("urn:li:organization:"):
        return s
    if s.isdigit():
        return f"urn:li:organization:{s}"
    return None


def linkedin_api_version(cfg: Dict[str, Any]) -> str:
    return str(cfg.get("linkedin_api_version") or LINKEDIN_DEFAULT_VERSION).strip()


def linkedin_rest_headers(cfg: Dict[str, Any], token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "LinkedIn-Version": linkedin_api_version(cfg),
        "X-Restli-Protocol-Version": "2.0.0",
        "Accept": "application/json",
    }


def validate_linkedin_config(cfg: Dict[str, Any]) -> Tuple[bool, str]:
    if not cfg.get("enabled"):
        return False, "LinkedIn connector is disabled"
    if not (cfg.get("client_id") or "").strip():
        return False, "LinkedIn Client ID is required"
    if not (cfg.get("client_secret") or "").strip():
        return False, "LinkedIn Client Secret is required"
    if not integration_context_urn(cfg):
        return False, "LinkedIn Organization ID is required (numeric ID or urn:li:organization:...)"
    return True, "ok"


def _location_text(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    if isinstance(raw, dict):
        return (raw.get("locationName") or raw.get("name") or "").strip() or None
    return None


def normalize_export_element(element: Dict[str, Any]) -> Dict[str, Any]:
    """Map LinkedIn exportedCandidates element -> board candidate dict."""
    stub = element.get("candidate") or {}
    if not isinstance(stub, dict):
        stub = {}

    first = (stub.get("firstName") or "").strip()
    last = (stub.get("lastName") or "").strip()
    full_name = f"{first} {last}".strip() or stub.get("fullName") or ""

    emails = stub.get("emailAddresses") or stub.get("emailAddress")
    email: Optional[str] = None
    if isinstance(emails, list) and emails:
        email = str(emails[0]).strip() or None
    elif isinstance(emails, str) and emails.strip():
        email = emails.strip()

    phones = stub.get("phoneNumbers") or stub.get("phoneNumber")
    phone: Optional[str] = None
    if isinstance(phones, list) and phones:
        phone = str(phones[0]).strip() or None
    elif isinstance(phones, str) and phones.strip():
        phone = phones.strip()

    employers = stub.get("currentEmployerNames") or []
    current_company = employers[0] if isinstance(employers, list) and employers else None

    skills_raw = stub.get("skills") or []
    skills: List[Dict[str, Any]] = []
    if isinstance(skills_raw, list):
        for s in skills_raw:
            if isinstance(s, str) and s.strip():
                skills.append({"skill_name": s.strip(), "proficiency": None})
            elif isinstance(s, dict) and s.get("name"):
                skills.append({"skill_name": str(s["name"]).strip(), "proficiency": None})

    member = stub.get("member") or element.get("member")
    external_id = None
    if isinstance(member, str) and member.strip():
        external_id = member.strip()

    return {
        "id": external_id or str(uuid.uuid4()),
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "location": _location_text(stub.get("location")),
        "headline": stub.get("headline"),
        "current_company": current_company,
        "skills": skills,
        "resume_text": element.get("notes") or stub.get("summary"),
        "linkedin_url": stub.get("profileUrl") or stub.get("publicProfileUrl"),
        "source": "LINKEDIN",
        "created_at": _iso_now(),
        "linkedin_member_urn": external_id,
        "linkedin_export_request_id": element.get("_request_id"),
        "linkedin_external_job_id": element.get("externalJobPostingId")
        or element.get("referenceEntityId"),
        "linkedin_integration_context": element.get("integrationContext"),
    }


def _job_reference_keys(job: Dict[str, Any]) -> set[str]:
    keys: set[str] = set()
    for field in ("id", "job_code", "requisition_id", "external_id", "partner_requisition_id"):
        v = job.get(field)
        if v is not None and str(v).strip():
            keys.add(str(v).strip().lower())
    title = job.get("title")
    if title and str(title).strip():
        keys.add(str(title).strip().lower())
    return keys


def linkedin_challenge_response_hex(client_secret: str, challenge_code: str) -> str:
    """Hex HMAC-SHA256(challengeCode, clientSecret) for webhook URL registration."""
    return hmac.new(
        client_secret.encode("utf-8"),
        challenge_code.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def build_webhook_challenge_response(
    challenge_code: str, client_secret: str
) -> Dict[str, str]:
    code = str(challenge_code).strip()
    if not code:
        raise ValueError("challengeCode is required")
    secret = (client_secret or "").strip()
    if not secret:
        raise ValueError("LinkedIn client secret is required for webhook validation")
    return {
        "challengeCode": code,
        "challengeResponse": linkedin_challenge_response_hex(secret, code),
    }


def linkedin_official_signature_hex(client_secret: str, raw_body: bytes) -> str:
    """
    LinkedIn Talent push events: HMAC-SHA256 over ``hmacsha256=`` + raw POST body bytes.
    See https://learn.microsoft.com/en-us/linkedin/shared/api-guide/webhook-validation
    """
    message = b"hmacsha256=" + raw_body
    return hmac.new(client_secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _normalize_signature_header(value: str) -> str:
    sig = (value or "").strip()
    lower = sig.lower()
    if lower.startswith("hmacsha256="):
        return sig.split("=", 1)[1].strip()
    if lower.startswith("sha256="):
        return sig.split("=", 1)[1].strip()
    return sig


def verify_linkedin_webhook_signature(
    raw_body: bytes,
    *,
    x_li_signature: Optional[str] = None,
    x_linkedin_signature: Optional[str] = None,
    client_secret: Optional[str] = None,
    webhook_secret: Optional[str] = None,
) -> bool:
    """
    Validate LinkedIn webhook authenticity.

    Official (Talent push): ``X-LI-Signature`` = HMAC-SHA256(client_secret, ``hmacsha256=`` + body).
    Legacy/custom: ``X-LinkedIn-Signature`` plain shared secret or body-only HMAC.
    """
    cs = (client_secret or "").strip()
    ws = (webhook_secret or "").strip()
    if not cs and not ws:
        return True

    li_hdr = (x_li_signature or "").strip()
    legacy_hdr = (x_linkedin_signature or "").strip()

    if cs and li_hdr:
        expected = linkedin_official_signature_hex(cs, raw_body)
        if hmac.compare_digest(_normalize_signature_header(li_hdr), expected):
            return True

    if ws and legacy_hdr:
        if hmac.compare_digest(legacy_hdr, ws):
            return True
        expected_legacy = hmac.new(ws.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        if hmac.compare_digest(_normalize_signature_header(legacy_hdr), expected_legacy):
            return True

    if cs and not li_hdr and not legacy_hdr:
        return False
    if ws and not legacy_hdr and not li_hdr:
        return False
    if (cs or ws) and (li_hdr or legacy_hdr):
        return False
    return True


async def resolve_job_id_for_linkedin_export(db, element: Dict[str, Any]) -> Optional[str]:
    """Map LinkedIn export externalJobPostingId / referenceEntityId to an HRMS job id."""
    keys: List[str] = []
    for field in ("externalJobPostingId", "referenceEntityId"):
        v = element.get(field)
        if v is not None and str(v).strip():
            keys.append(str(v).strip())
    for key in keys:
        job = await db.jobs.find_one(
            {
                "$or": [
                    {"id": key},
                    {"job_code": key},
                    {"requisition_id": key},
                    {"external_id": key},
                    {"partner_requisition_id": key},
                ]
            },
            {"_id": 0, "id": 1},
        )
        if job and job.get("id"):
            return str(job["id"])
    return None


async def maybe_create_application_for_linkedin_export(
    db,
    candidate_id: str,
    job_id: str,
    *,
    changed_by: str = "linkedin_import",
) -> bool:
    """Create SOURCED application + stage history when a LinkedIn export is tied to a job."""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0, "id": 1})
    if not job:
        return False
    existing = await db.applications.find_one(
        {"job_id": job_id, "candidate_id": candidate_id},
        {"_id": 0, "id": 1},
    )
    if existing:
        return False
    now = _iso_now()
    app_id = str(uuid.uuid4())
    stage = DEFAULT_APPLICATION_STAGE
    await db.applications.insert_one(
        {
            "id": app_id,
            "job_id": job_id,
            "candidate_id": candidate_id,
            "stage": stage,
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
        }
    )
    await db.application_stage_history.insert_one(
        {
            "id": str(uuid.uuid4()),
            "application_id": app_id,
            "from_stage": None,
            "to_stage": stage,
            "changed_by": changed_by,
            "changed_at": now,
        }
    )
    await db.candidates.update_one(
        {"id": candidate_id},
        {"$set": {"pipeline_stage": stage, "updated_at": now}},
    )
    return True


def _workplace_types_for_job(job: Dict[str, Any]) -> List[str]:
    wm = str(job.get("work_mode") or "hybrid").strip().lower()
    if wm in ("remote", "wfh"):
        return ["REMOTE"]
    if wm in ("onsite", "on-site", "office"):
        return ["ONSITE"]
    return ["HYBRID"]


def build_simple_job_posting_element(
    job: Dict[str, Any], cfg: Dict[str, Any]
) -> Tuple[Optional[str], Optional[str], Dict[str, Any]]:
    """Return (integration_context, external_job_posting_id, element) for simpleJobPostings PUT."""
    org = integration_context_urn(cfg)
    ext_id = (job.get("job_code") or job.get("id") or "").strip()
    if not org or not ext_id:
        return org, ext_id or None, {}

    listed_at = int(datetime.now(timezone.utc).timestamp() * 1000)
    description = (job.get("description") or job.get("title") or "Open role")[:8000]
    element: Dict[str, Any] = {
        "externalJobPostingId": ext_id,
        "integrationContext": org,
        "title": (job.get("title") or "Open role")[:500],
        "description": description,
        "listedAt": listed_at,
        "workplaceTypes": _workplace_types_for_job(job),
    }
    location = job.get("location")
    if location and str(location).strip():
        element["location"] = str(location).strip()
    if job.get("status") == "CLOSED":
        element["closedAt"] = listed_at
    company = cfg.get("linkedin_company_name") or cfg.get("company_name")
    if company and str(company).strip():
        element["companyName"] = str(company).strip()[:200]
    return org, ext_id, element


async def sync_job_to_linkedin(
    cfg: Dict[str, Any],
    token: str,
    job: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Best-effort sync of an HRMS job to LinkedIn simpleJobPostings (RSC prerequisite for export↔job mapping).
    """
    org, ext_id, element = build_simple_job_posting_element(job, cfg)
    if not org:
        return {"ok": False, "message": "LinkedIn organization ID is required for job sync"}
    if not ext_id or not element:
        return {"ok": False, "message": "Job id or job_code is required for LinkedIn externalJobPostingId"}

    ic = quote(org, safe="")
    eid = quote(ext_id, safe="")
    url = (
        f"{LINKEDIN_REST_BASE}/simpleJobPostings"
        f"?ids[0].integrationContext={ic}&ids[0].externalJobPostingId={eid}"
    )
    payload = {"elements": [element]}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0)) as http:
            resp = await http.put(
                url,
                headers={**linkedin_rest_headers(cfg, token), "Content-Type": "application/json"},
                json=payload,
            )
        if resp.status_code in (200, 201, 204):
            return {
                "ok": True,
                "message": "Job synced to LinkedIn",
                "external_job_posting_id": ext_id,
                "http_status": resp.status_code,
            }
        return {
            "ok": False,
            "message": f"LinkedIn job sync HTTP {resp.status_code}: {resp.text[:400]}",
            "external_job_posting_id": ext_id,
        }
    except Exception as e:
        return {"ok": False, "message": str(e), "external_job_posting_id": ext_id}


async def sync_open_jobs_to_linkedin(
    cfg: Dict[str, Any],
    db,
    connector_coll: str,
    *,
    limit: int = 50,
) -> Dict[str, Any]:
    """Sync OPEN jobs to LinkedIn (admin recovery / initial provisioning)."""
    ok_cfg, msg = validate_linkedin_config(cfg)
    if not ok_cfg:
        return {"ok": False, "message": msg, "synced": 0, "failed": 0}

    updated, token, err = await obtain_linkedin_token(cfg, db, connector_coll)
    if err or not token:
        return {"ok": False, "message": err or "no token", "synced": 0, "failed": 0}

    jobs = (
        await db.jobs.find({"status": "OPEN"}, {"_id": 0})
        .sort("created_at", -1)
        .limit(max(1, min(limit, 200)))
        .to_list(max(1, min(limit, 200)))
    )
    synced = 0
    failed = 0
    errors: List[str] = []
    now = _iso_now()
    for job in jobs:
        result = await sync_job_to_linkedin(updated, token, job)
        job_id = job.get("id")
        if result.get("ok") and job_id:
            synced += 1
            await db.jobs.update_one(
                {"id": job_id},
                {
                    "$set": {
                        "linkedin_synced_at": now,
                        "linkedin_external_job_posting_id": result.get("external_job_posting_id"),
                    }
                },
            )
        else:
            failed += 1
            if result.get("message"):
                errors.append(f"{job_id}: {result['message']}")
    await _record_health(
        db,
        connector_coll,
        failed == 0,
        f"job_sync synced={synced} failed={failed}",
    )
    return {
        "ok": failed == 0,
        "synced": synced,
        "failed": failed,
        "errors": errors[:15],
    }


async def sync_linkedin_job_by_id(
    job_id: str,
    db,
    connector_coll: str,
) -> Dict[str, Any]:
    """Sync one HRMS job to LinkedIn when connector is enabled (create/update background task)."""
    cfg = await db[connector_coll].find_one({"name": "LINKEDIN"}, {"_id": 0}) or {}
    ok_cfg, msg = validate_linkedin_config(cfg)
    if not ok_cfg or not cfg.get("enabled"):
        return {"ok": False, "message": msg if not ok_cfg else "connector disabled"}

    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        return {"ok": False, "message": "Job not found"}
    if job.get("status") not in (None, "OPEN"):
        return {"ok": False, "message": f"Job status {job.get('status')} — skip LinkedIn sync"}

    updated, token, err = await obtain_linkedin_token(cfg, db, connector_coll)
    if err or not token:
        return {"ok": False, "message": err or "no token"}

    result = await sync_job_to_linkedin(updated, token, job)
    if result.get("ok"):
        await db.jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "linkedin_synced_at": _iso_now(),
                    "linkedin_external_job_posting_id": result.get(
                        "external_job_posting_id"
                    ),
                }
            },
        )
    return result


def export_matches_job(element: Dict[str, Any], job: Dict[str, Any]) -> bool:
    """True if export row is tied to this job/requisition (or job keys empty -> accept all)."""
    refs = _job_reference_keys(job)
    if not refs:
        return True
    for field in ("externalJobPostingId", "referenceEntityId"):
        val = element.get(field)
        if val is not None and str(val).strip().lower() in refs:
            return True
    return False


async def _record_health(
    db,
    connector_coll: str,
    ok: bool,
    detail: Optional[str] = None,
    increment_requests: int = 0,
) -> None:
    patch: Dict[str, Any] = {
        "health_checked_at": _iso_now(),
        "health_ok": ok,
        "health_detail": (detail or "")[:2000],
    }
    try:
        if increment_requests:
            await db[connector_coll].update_one(
                {"name": "LINKEDIN"},
                {"$set": patch, "$inc": {"request_count_total": increment_requests}},
            )
        else:
            await db[connector_coll].update_one({"name": "LINKEDIN"}, {"$set": patch})
    except Exception as e:
        logger.warning("LinkedIn health patch failed: %s", e)


async def obtain_linkedin_token(
    cfg: Dict[str, Any],
    db,
    connector_coll: str,
) -> Tuple[Dict[str, Any], Optional[str], Optional[str]]:
    """Return (cfg, token, error_message)."""
    cfg = dict(cfg)
    if not cfg.get("oauth_token_url"):
        cfg["oauth_token_url"] = LINKEDIN_TOKEN_URL
    updated, token = await ensure_access_token("LINKEDIN", cfg, db, connector_coll)
    if not token:
        return updated, None, "Could not obtain LinkedIn access token (check Client ID / Secret)"
    return updated, token, None


async def test_linkedin_connection(
    cfg: Dict[str, Any],
    db,
    connector_coll: str,
) -> Dict[str, Any]:
    ok_cfg, msg = validate_linkedin_config(cfg)
    if not ok_cfg:
        await _record_health(db, connector_coll, False, msg)
        return {"ok": False, "message": msg}

    updated, token, err = await obtain_linkedin_token(cfg, db, connector_coll)
    if err:
        await _record_health(db, connector_coll, False, err)
        return {"ok": False, "message": err}

    org = integration_context_urn(updated)
    detail = f"OAuth token obtained; integrationContext={org}"
    await _record_health(db, connector_coll, True, detail, increment_requests=1)
    return {
        "ok": True,
        "message": "LinkedIn API credentials verified successfully",
        "integration_context": org,
        "token_expires_at": updated.get("token_expires_at"),
        "api_version": linkedin_api_version(updated),
    }


async def fetch_exported_candidate_by_request_id(
    cfg: Dict[str, Any],
    token: str,
    request_id: str,
) -> Tuple[Optional[List[Dict[str, Any]]], Optional[str]]:
    rid = str(request_id).strip()
    if not rid:
        return None, "request_id is required"

    url = f"{LINKEDIN_REST_BASE}/exportedCandidates?q=request&requestId={quote(rid, safe='')}"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as http:
            resp = await http.get(url, headers=linkedin_rest_headers(cfg, token))
        if resp.status_code == 401:
            return None, "LinkedIn returned 401 — token invalid or expired"
        if resp.status_code == 404:
            return [], "Export request not found or expired (24h limit)"
        if resp.status_code < 200 or resp.status_code >= 300:
            return None, f"LinkedIn HTTP {resp.status_code}: {resp.text[:400]}"

        data = resp.json()
        elements = data.get("elements") if isinstance(data, dict) else None
        if not isinstance(elements, list):
            return [], None

        out: List[Dict[str, Any]] = []
        for el in elements:
            if not isinstance(el, dict):
                continue
            el = dict(el)
            el["_request_id"] = rid
            out.append(el)
        return out, None
    except Exception as e:
        return None, str(e)


async def enqueue_export_request(
    db,
    *,
    request_id: str,
    event_type: str = "EXPORT_CANDIDATE_PROFILE",
    payload: Optional[Dict[str, Any]] = None,
    linkedin_notification_id: Optional[str] = None,
) -> str:
    if linkedin_notification_id:
        existing = await db[EXPORT_QUEUE_COLLECTION].find_one(
            {"linkedin_notification_id": linkedin_notification_id},
            {"_id": 0, "id": 1},
        )
        if existing and existing.get("id"):
            return existing["id"]

    doc_id = str(uuid.uuid4())
    set_fields: Dict[str, Any] = {
        "request_id": request_id,
        "event_type": event_type,
        "status": "pending",
        "payload": payload or {},
        "updated_at": _iso_now(),
    }
    if linkedin_notification_id:
        set_fields["linkedin_notification_id"] = linkedin_notification_id

    await db[EXPORT_QUEUE_COLLECTION].update_one(
        {"request_id": request_id},
        {
            "$set": set_fields,
            "$setOnInsert": {"id": doc_id, "created_at": _iso_now()},
        },
        upsert=True,
    )
    row = await db[EXPORT_QUEUE_COLLECTION].find_one({"request_id": request_id}, {"_id": 0, "id": 1})
    return (row or {}).get("id") or doc_id


async def persist_export_elements(
    elements: List[Dict[str, Any]],
    upsert_fn: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
    job: Optional[Dict[str, Any]] = None,
    *,
    db=None,
    link_applications: bool = True,
) -> Tuple[List[Dict[str, Any]], int]:
    """Normalize LinkedIn export rows and upsert into the candidates collection."""
    upserted: List[Dict[str, Any]] = []
    for el in elements:
        if job is not None and not export_matches_job(el, job):
            continue
        normalized = normalize_board_candidate(normalize_export_element(el), "LINKEDIN")
        try:
            doc = await upsert_fn(normalized)
            upserted.append(doc)
            if db is not None and link_applications and doc.get("id"):
                job_id = None
                if job and job.get("id"):
                    job_id = str(job["id"])
                else:
                    job_id = await resolve_job_id_for_linkedin_export(db, el)
                if job_id:
                    await maybe_create_application_for_linkedin_export(
                        db, doc["id"], job_id
                    )
        except Exception as e:
            logger.error("LinkedIn export upsert failed: %s", e)
    return upserted, len(upserted)


async def process_export_request_id(
    cfg: Dict[str, Any],
    db,
    connector_coll: str,
    request_id: str,
    upsert_fn: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
    job: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Fetch one export request from LinkedIn, persist candidates, update queue status.
    """
    ok_cfg, msg = validate_linkedin_config(cfg)
    if not ok_cfg:
        return {"ok": False, "message": msg, "upserted": 0, "elements": 0}

    updated, token, err = await obtain_linkedin_token(cfg, db, connector_coll)
    if err or not token:
        return {"ok": False, "message": err or "no token", "upserted": 0, "elements": 0}

    elements, fetch_err = await _process_queue_item(updated, token, db, connector_coll, request_id)
    if fetch_err and not elements:
        return {
            "ok": False,
            "message": fetch_err,
            "request_id": request_id,
            "upserted": 0,
            "elements": 0,
        }

    upserted_docs, upserted_count = await persist_export_elements(
        elements, upsert_fn, job=job, db=db, link_applications=True
    )
    now = _iso_now()
    await db[EXPORT_QUEUE_COLLECTION].update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "completed",
                "upserted_count": upserted_count,
                "completed_at": now,
                "updated_at": now,
            }
        },
    )
    return {
        "ok": True,
        "request_id": request_id,
        "elements": len(elements),
        "upserted": upserted_count,
        "warning": fetch_err,
        "candidate_ids": [d.get("id") for d in upserted_docs if d.get("id")],
        "candidates": upserted_docs,
    }


async def ingest_linkedin_exports_for_job(
    cfg: Dict[str, Any],
    job: Dict[str, Any],
    limit: int,
    db,
    connector_coll: str,
    upsert_fn: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """Job-scoped LinkedIn ingest: process pending exports, upsert, return candidate docs."""
    ok_cfg, msg = validate_linkedin_config(cfg)
    if not ok_cfg:
        logger.info("LinkedIn ingest skipped: %s", msg)
        await _record_health(db, connector_coll, False, msg)
        return []

    pending = (
        await db[EXPORT_QUEUE_COLLECTION]
        .find({"status": "pending"}, {"_id": 0})
        .sort("created_at", 1)
        .limit(max(limit * 3, 50))
        .to_list(max(limit * 3, 50))
    )

    upserted_all: List[Dict[str, Any]] = []
    for row in pending:
        if len(upserted_all) >= limit:
            break
        rid = row.get("request_id")
        if not rid:
            continue
        result = await process_export_request_id(
            cfg, db, connector_coll, rid, upsert_fn, job=job
        )
        if result.get("ok"):
            for doc in result.get("candidates") or []:
                upserted_all.append(doc)
                if len(upserted_all) >= limit:
                    break

    if len(upserted_all) < limit:
        manual_ids = cfg.get("pending_export_request_ids") or []
        if isinstance(manual_ids, str):
            manual_ids = [x.strip() for x in manual_ids.replace("\n", ",").split(",") if x.strip()]
        updated, token, err = await obtain_linkedin_token(cfg, db, connector_coll)
        if token and not err:
            for rid in manual_ids:
                if len(upserted_all) >= limit:
                    break
                elements, _ = await fetch_exported_candidate_by_request_id(updated, token, rid)
                docs, _ = await persist_export_elements(
                    elements or [], upsert_fn, job=job, db=db, link_applications=True
                )
                upserted_all.extend(docs)
                if len(upserted_all) >= limit:
                    break

    await _record_health(
        db,
        connector_coll,
        True,
        f"ingested_linkedin_upserted={len(upserted_all)} pending_queue={len(pending)}",
    )
    return upserted_all[:limit]


async def process_pending_export_queue(
    cfg: Dict[str, Any],
    db,
    connector_coll: str,
    upsert_fn: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
    *,
    limit: int = 25,
    job: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Process pending export request IDs (cron / recovery)."""
    ok_cfg, msg = validate_linkedin_config(cfg)
    if not ok_cfg:
        return {"ok": False, "message": msg, "processed": 0, "upserted_total": 0}

    pending = (
        await db[EXPORT_QUEUE_COLLECTION]
        .find({"status": "pending"}, {"_id": 0, "request_id": 1})
        .sort("created_at", 1)
        .limit(max(1, min(limit, 100)))
        .to_list(max(1, min(limit, 100)))
    )

    processed = 0
    upserted_total = 0
    errors: List[str] = []
    for row in pending:
        rid = row.get("request_id")
        if not rid:
            continue
        result = await process_export_request_id(
            cfg, db, connector_coll, rid, upsert_fn, job=job
        )
        processed += 1
        if result.get("ok"):
            upserted_total += int(result.get("upserted") or 0)
        else:
            errors.append(f"{rid}: {result.get('message')}")

    await _record_health(
        db,
        connector_coll,
        True,
        f"queue_processed={processed} upserted_total={upserted_total}",
    )
    return {
        "ok": True,
        "processed": processed,
        "upserted_total": upserted_total,
        "errors": errors[:10],
    }


async def _process_queue_item(
    cfg: Dict[str, Any],
    token: str,
    db,
    connector_coll: str,
    request_id: str,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    elements, err = await fetch_exported_candidate_by_request_id(cfg, token, request_id)
    now = _iso_now()
    if err and elements is None:
        await db[EXPORT_QUEUE_COLLECTION].update_one(
            {"request_id": request_id},
            {"$set": {"status": "failed", "error": err, "updated_at": now}},
        )
        return [], err

    await db[EXPORT_QUEUE_COLLECTION].update_one(
        {"request_id": request_id},
        {
            "$set": {
                "status": "fetched",
                "fetched_at": now,
                "updated_at": now,
                "error": err,
                "result_count": len(elements or []),
            }
        },
    )
    await _record_health(
        db,
        connector_coll,
        True,
        f"fetched export requestId={request_id} count={len(elements or [])}",
        increment_requests=1,
    )
    return elements or [], None


async def fetch_linkedin_candidates(
    cfg: Dict[str, Any],
    job: Dict[str, Any],
    limit: int,
    db,
    connector_coll: str,
) -> List[Dict[str, Any]]:
    """
    Pull candidates from LinkedIn export queue (webhook / manual) and hydrate via REST API.
    """
    ok_cfg, msg = validate_linkedin_config(cfg)
    if not ok_cfg:
        logger.info("LinkedIn ingest skipped: %s", msg)
        await _record_health(db, connector_coll, False, msg)
        return []

    updated, token, err = await obtain_linkedin_token(cfg, db, connector_coll)
    if err or not token:
        await _record_health(db, connector_coll, False, err or "no token")
        return []

    pending = (
        await db[EXPORT_QUEUE_COLLECTION]
        .find({"status": "pending"}, {"_id": 0})
        .sort("created_at", 1)
        .limit(max(limit * 3, 50))
        .to_list(max(limit * 3, 50))
    )

    aggregated: List[Dict[str, Any]] = []
    for row in pending:
        rid = row.get("request_id")
        if not rid:
            continue
        elements, fetch_err = await _process_queue_item(updated, token, db, connector_coll, rid)
        if fetch_err and not elements:
            continue
        for el in elements:
            if not export_matches_job(el, job):
                continue
            aggregated.append(normalize_board_candidate(normalize_export_element(el), "LINKEDIN"))
            if len(aggregated) >= limit:
                break
        if len(aggregated) >= limit:
            break

    if len(aggregated) < limit:
        manual_ids = cfg.get("pending_export_request_ids") or []
        if isinstance(manual_ids, str):
            manual_ids = [x.strip() for x in manual_ids.replace("\n", ",").split(",") if x.strip()]
        for rid in manual_ids:
            if len(aggregated) >= limit:
                break
            elements, _ = await fetch_exported_candidate_by_request_id(updated, token, rid)
            for el in elements or []:
                if not export_matches_job(el, job):
                    continue
                aggregated.append(normalize_board_candidate(normalize_export_element(el), "LINKEDIN"))
                if len(aggregated) >= limit:
                    break

    await _record_health(
        db,
        connector_coll,
        True,
        f"ingested_linkedin={len(aggregated)} pending_queue={len(pending)}",
    )
    return aggregated[:limit]


def public_webhook_url(request_base: str) -> str:
    explicit = (os.environ.get("LINKEDIN_WEBHOOK_PUBLIC_URL") or "").strip()
    if explicit:
        return explicit.rstrip("/")
    base = (os.environ.get("PUBLIC_API_BASE_URL") or request_base or "").strip().rstrip("/")
    if not base:
        return "/api/webhooks/linkedin/events"
    return f"{base}/api/webhooks/linkedin/events"


def extract_notification_id_from_event(body: Dict[str, Any]) -> Optional[str]:
    """LinkedIn push notification id (distinct from export request id when both are present)."""
    for key in ("notificationId", "notification_id", "notificationURN", "notificationUrn"):
        v = body.get(key)
        if v is not None and str(v).strip():
            return str(v).strip()
    nested = body.get("data") or body.get("event") or body.get("payload")
    if isinstance(nested, dict):
        return extract_notification_id_from_event(nested)
    events = body.get("events")
    if isinstance(events, list) and events:
        first = events[0]
        if isinstance(first, dict):
            return extract_notification_id_from_event(first)
    return None


def extract_request_id_from_event(body: Dict[str, Any]) -> Optional[str]:
    for key in ("requestId", "request_id", "exportRequestId", "id"):
        v = body.get(key)
        if v is not None and str(v).strip():
            return str(v).strip()
    nested = body.get("data") or body.get("event") or body.get("payload")
    if isinstance(nested, dict):
        return extract_request_id_from_event(nested)
    events = body.get("events")
    if isinstance(events, list) and events:
        first = events[0]
        if isinstance(first, dict):
            return extract_request_id_from_event(first)
    return None


def extract_event_type(body: Dict[str, Any]) -> str:
    for key in ("eventType", "event_type", "type"):
        v = body.get(key)
        if v is not None and str(v).strip():
            return str(v).strip()
    nested = body.get("data") or body.get("event")
    if isinstance(nested, dict):
        return extract_event_type(nested)
    return ""
