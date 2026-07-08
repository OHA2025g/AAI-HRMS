"""Admin + webhook routes for LinkedIn Talent API integration."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Awaitable, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from talent_acquisition.linkedin_connector import (
    EXPORT_QUEUE_COLLECTION,
    build_webhook_challenge_response,
    enqueue_export_request,
    extract_event_type,
    extract_notification_id_from_event,
    extract_request_id_from_event,
    process_export_request_id,
    process_pending_export_queue,
    public_webhook_url,
    sync_open_jobs_to_linkedin,
    test_linkedin_connection,
    validate_linkedin_config,
    verify_linkedin_webhook_signature,
)

logger = logging.getLogger(__name__)

CONNECTOR_NAME = "LINKEDIN"
CONNECTOR_COLL = "connector_configs"


class LinkedInTestResponse(BaseModel):
    ok: bool
    message: str
    integration_context: Optional[str] = None
    token_expires_at: Optional[str] = None
    api_version: Optional[str] = None
    webhook_url: Optional[str] = None


class LinkedInFetchExportRequest(BaseModel):
    request_id: str = Field(..., min_length=1, max_length=256)


def create_linkedin_router(
    *,
    db,
    get_current_user: Callable,
    require_admin: Callable,
    upsert_candidate: Callable[[Dict[str, Any]], Awaitable[Dict[str, Any]]],
) -> APIRouter:
    router = APIRouter(tags=["linkedin"])

    async def _load_cfg() -> Dict[str, Any]:
        return await db[CONNECTOR_COLL].find_one({"name": CONNECTOR_NAME}, {"_id": 0}) or {}

    @router.get("/admin/linkedin/status")
    async def linkedin_status(
        request: Request,
        current_user: dict = Depends(get_current_user),
    ):
        require_admin(current_user)
        cfg = await _load_cfg()
        ok_cfg, cfg_msg = validate_linkedin_config(cfg)
        pending = await db[EXPORT_QUEUE_COLLECTION].count_documents({"status": "pending"})
        completed = await db[EXPORT_QUEUE_COLLECTION].count_documents({"status": "completed"})
        return {
            "enabled": bool(cfg.get("enabled")),
            "configured": ok_cfg,
            "configuration_message": cfg_msg,
            "client_id_set": bool(cfg.get("client_id")),
            "client_secret_set": bool(cfg.get("client_secret")),
            "linkedin_organization_id": cfg.get("linkedin_organization_id"),
            "linkedin_api_version": cfg.get("linkedin_api_version"),
            "token_expires_at": cfg.get("token_expires_at"),
            "access_token_set": bool(cfg.get("access_token")),
            "health_ok": cfg.get("health_ok"),
            "health_detail": (cfg.get("health_detail") or "")[:500],
            "pending_export_count": pending,
            "completed_export_count": completed,
            "webhook_url": public_webhook_url(str(request.base_url).rstrip("/")),
        }

    @router.post("/admin/linkedin/test", response_model=LinkedInTestResponse)
    async def linkedin_test(
        request: Request,
        current_user: dict = Depends(get_current_user),
    ):
        require_admin(current_user)
        cfg = await _load_cfg()
        result = await test_linkedin_connection(cfg, db, CONNECTOR_COLL)
        result["webhook_url"] = public_webhook_url(str(request.base_url).rstrip("/"))
        return LinkedInTestResponse(**result)

    @router.post("/admin/linkedin/fetch-export")
    async def linkedin_fetch_export(
        body: LinkedInFetchExportRequest,
        current_user: dict = Depends(get_current_user),
    ):
        require_admin(current_user)
        cfg = await _load_cfg()
        await enqueue_export_request(
            db,
            request_id=body.request_id,
            event_type="MANUAL_FETCH",
        )
        result = await process_export_request_id(
            cfg,
            db,
            CONNECTOR_COLL,
            body.request_id,
            upsert_candidate,
            job=None,
        )
        if not result.get("ok"):
            raise HTTPException(
                status_code=502,
                detail=result.get("message") or "LinkedIn fetch failed",
            )
        return {
            "request_id": body.request_id,
            "elements": result.get("elements", 0),
            "upserted": result.get("upserted", 0),
            "candidate_ids": result.get("candidate_ids") or [],
            "warning": result.get("warning"),
        }

    @router.get("/admin/linkedin/export-queue")
    async def linkedin_export_queue(
        current_user: dict = Depends(get_current_user),
        limit: int = 20,
    ):
        require_admin(current_user)
        lim = max(1, min(limit, 100))
        rows = (
            await db[EXPORT_QUEUE_COLLECTION]
            .find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(lim)
            .to_list(lim)
        )
        return {"items": rows}

    @router.post("/admin/linkedin/sync-open-jobs")
    async def linkedin_sync_open_jobs(
        current_user: dict = Depends(get_current_user),
        limit: int = 50,
    ):
        """Push OPEN HRMS jobs to LinkedIn simpleJobPostings (RSC job mapping prerequisite)."""
        require_admin(current_user)
        cfg = await _load_cfg()
        stats = await sync_open_jobs_to_linkedin(
            cfg, db, CONNECTOR_COLL, limit=limit
        )
        if not stats.get("ok") and stats.get("synced", 0) == 0:
            raise HTTPException(
                status_code=502,
                detail=stats.get("message") or "LinkedIn job sync failed",
            )
        return stats

    @router.post("/admin/linkedin/process-queue-cron")
    async def linkedin_process_queue_cron(request: Request):
        """Process pending LinkedIn export queue (scheduled; token-protected)."""
        expected = (
            os.environ.get("LINKEDIN_EXPORT_PROCESS_TOKEN")
            or os.environ.get("HIRING_SNAPSHOT_TOKEN")
            or os.environ.get("CANDIDATE_IMPORT_CLEANUP_TOKEN")
            or ""
        ).strip()
        got = (
            request.headers.get("X-LinkedIn-Export-Process-Token")
            or request.headers.get("X-Hiring-Snapshot-Token")
            or request.headers.get("X-Candidate-Import-Cleanup-Token")
            or ""
        ).strip()
        if not expected or got != expected:
            raise HTTPException(status_code=401, detail="Invalid or missing process token")

        cfg = await _load_cfg()
        stats = await process_pending_export_queue(
            cfg,
            db,
            CONNECTOR_COLL,
            upsert_candidate,
            limit=50,
            job=None,
        )
        return {"ok": True, **stats}

    @router.get("/webhooks/linkedin/events")
    async def linkedin_webhook_validate(
        challengeCode: Optional[str] = Query(None, alias="challengeCode"),
        applicationId: Optional[str] = Query(None, alias="applicationId"),
    ):
        """
        LinkedIn webhook URL registration / re-validation (every ~2h).
        GET ?challengeCode=<uuid> → JSON { challengeCode, challengeResponse }.
        """
        if not challengeCode or not str(challengeCode).strip():
            raise HTTPException(status_code=400, detail="challengeCode query parameter is required")
        cfg = await _load_cfg()
        secret = (cfg.get("client_secret") or "").strip()
        if not secret:
            raise HTTPException(
                status_code=503,
                detail="Configure LinkedIn Client Secret before registering the webhook URL",
            )
        if applicationId:
            logger.info("LinkedIn webhook challenge for applicationId=%s", applicationId)
        try:
            payload = build_webhook_challenge_response(challengeCode, secret)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        return JSONResponse(content=payload, media_type="application/json")

    @router.post("/webhooks/linkedin/events")
    async def linkedin_webhook(request: Request):
        """
        LinkedIn push notification endpoint (EXPORT_CANDIDATE_PROFILE).
        Fetches and persists candidates immediately when the connector is configured.
        """
        cfg = await _load_cfg()
        raw_body = await request.body()

        # POST body may carry challenge during alternate validation flows
        if raw_body:
            try:
                maybe_challenge = json.loads(raw_body.decode("utf-8"))
            except Exception:
                maybe_challenge = None
            if isinstance(maybe_challenge, dict) and maybe_challenge.get("challengeCode"):
                secret = (cfg.get("client_secret") or "").strip()
                if not secret:
                    raise HTTPException(status_code=503, detail="LinkedIn client secret not configured")
                payload = build_webhook_challenge_response(
                    str(maybe_challenge["challengeCode"]), secret
                )
                return JSONResponse(content=payload, media_type="application/json")

        if not verify_linkedin_webhook_signature(
            raw_body,
            x_li_signature=request.headers.get("X-LI-Signature"),
            x_linkedin_signature=request.headers.get("X-LinkedIn-Signature"),
            client_secret=cfg.get("client_secret"),
            webhook_secret=cfg.get("webhook_secret"),
        ):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

        try:
            body = json.loads(raw_body.decode("utf-8")) if raw_body else {}
        except Exception:
            body = {}

        if not isinstance(body, dict):
            body = {}

        event_type = extract_event_type(body)
        request_id = extract_request_id_from_event(body)
        if not request_id:
            logger.warning("LinkedIn webhook missing requestId: %s", body)
            return {"received": True, "queued": False, "reason": "missing requestId"}

        if event_type and event_type not in (
            "EXPORT_CANDIDATE_PROFILE",
            "export_candidate_profile",
            "MANUAL_FETCH",
        ):
            return {"received": True, "queued": False, "reason": f"ignored event {event_type}"}

        notification_id = extract_notification_id_from_event(body)
        if not notification_id:
            top_id = body.get("id")
            if top_id is not None and str(top_id).strip() and str(top_id).strip() != request_id:
                notification_id = str(top_id).strip()

        await enqueue_export_request(
            db,
            request_id=request_id,
            event_type=event_type or "EXPORT_CANDIDATE_PROFILE",
            payload=body,
            linkedin_notification_id=notification_id,
        )

        ok_cfg, cfg_msg = validate_linkedin_config(cfg)
        if not ok_cfg or not cfg.get("enabled"):
            return {
                "received": True,
                "queued": True,
                "processed": False,
                "reason": cfg_msg if not ok_cfg else "connector disabled",
                "request_id": request_id,
            }

        result = await process_export_request_id(
            cfg,
            db,
            CONNECTOR_COLL,
            request_id,
            upsert_candidate,
            job=None,
        )
        return {
            "received": True,
            "queued": True,
            "processed": bool(result.get("ok")),
            "request_id": request_id,
            "upserted": result.get("upserted", 0),
            "elements": result.get("elements", 0),
            "message": result.get("message"),
        }

    return router
