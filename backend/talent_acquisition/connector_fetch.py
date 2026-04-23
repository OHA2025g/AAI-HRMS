"""
HTTP + Mongo candidate fetch with paging, retries, and throttling (M1-1 / M1-2).
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

from talent_acquisition.connector_oauth import ensure_access_token, throttle_interval_ms
from talent_acquisition.normalize import normalize_board_candidate

logger = logging.getLogger(__name__)


async def _record_health(
    db,
    connector_coll: str,
    name: str,
    ok: bool,
    detail: Optional[str] = None,
    increment_requests: int = 0,
) -> None:
    patch: Dict[str, Any] = {
        "health_checked_at": datetime.now(timezone.utc).isoformat(),
        "health_ok": ok,
        "health_detail": (detail or "")[:2000],
    }
    if increment_requests:
        # Best-effort counters for source-level monitoring
        try:
            await db[connector_coll].update_one(
                {"name": name},
                {
                    "$set": patch,
                    "$inc": {"request_count_total": increment_requests},
                },
            )
        except Exception:
            await db[connector_coll].update_one({"name": name}, {"$set": patch})
    else:
        await db[connector_coll].update_one({"name": name}, {"$set": patch})


def _extract_list(data: Any) -> List[Dict[str, Any]]:
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)]
    if isinstance(data, dict):
        for key in ("candidates", "items", "results", "data", "profiles"):
            v = data.get(key)
            if isinstance(v, list):
                return [x for x in v if isinstance(x, dict)]
    return []


def _extract_next_cursor(data: Dict[str, Any]) -> Optional[str]:
    if not isinstance(data, dict):
        return None
    for key in ("next_cursor", "next_page_token", "nextPageToken", "cursor"):
        v = data.get(key)
        if isinstance(v, str) and v.strip():
            return v.strip()
    meta = data.get("meta") or data.get("pagination") or {}
    if isinstance(meta, dict):
        for key in ("next_cursor", "next", "next_page"):
            v = meta.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
            if isinstance(v, int) and v > 0:
                return str(v)
    return None


async def fetch_mongo_candidates(
    cfg: Dict[str, Any],
    source: str,
    limit: int,
) -> List[Dict[str, Any]]:
    mongo_url = cfg.get("mongo_url")
    db_name = cfg.get("db_name")
    if not mongo_url or not db_name:
        return []
    ext_client = AsyncIOMotorClient(mongo_url)
    ext_coll_name = cfg.get("collection_name") or "candidates"
    ext_coll = ext_client[db_name][ext_coll_name]
    docs = await ext_coll.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    out: List[Dict[str, Any]] = []
    for doc in docs:
        if isinstance(doc, dict):
            out.append(normalize_board_candidate(doc, source))
    return out


async def fetch_http_candidates_paged(
    name: str,
    cfg: Dict[str, Any],
    job: Dict[str, Any],
    source: str,
    limit: int,
    db,
    connector_coll: str,
) -> List[Dict[str, Any]]:
    base_url = (cfg.get("base_url") or "").rstrip("/")
    if not base_url:
        await _record_health(db, connector_coll, name, True, "HTTP skipped: no base_url")
        return []

    cfg, token = await ensure_access_token(name, cfg, db, connector_coll)

    search_paths = cfg.get("search_path")
    if isinstance(search_paths, str) and search_paths.strip():
        paths = [search_paths.strip()]
    elif isinstance(search_paths, list) and search_paths:
        paths = [str(p).strip() for p in search_paths if str(p).strip()]
    else:
        paths = ["/candidates/search"]

    page_size = int(cfg.get("page_size") or 50)
    page_size = max(1, min(page_size, limit, 200))
    max_retries = int(cfg.get("max_retries") or 3)
    min_interval_ms = int(cfg.get("min_interval_ms") or 0)

    aggregated: List[Dict[str, Any]] = []
    cursor: Optional[str] = None

    job_payload = {
        "title": job.get("title"),
        "description": job.get("description"),
        "skills": job.get("skills") or [],
        "must_have_skills": [
            s.get("skill_name")
            for s in (job.get("skills") or [])
            if isinstance(s, dict) and s.get("skill_type") == "MUST_HAVE" and s.get("skill_name")
        ],
    }

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    path_idx = 0
    while len(aggregated) < limit:
        path = paths[path_idx % len(paths)]
        search_url = f"{base_url}{path if path.startswith('/') else '/' + path}"
        remaining = limit - len(aggregated)
        body = {
            "job": job_payload,
            "limit": min(page_size, remaining),
            "top_n": min(page_size, remaining),
            "cursor": cursor,
            "page_token": cursor,
        }

        last_err: Optional[str] = None
        data: Any = None
        for attempt in range(max_retries):
            try:
                await throttle_interval_ms(min_interval_ms)
                async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as http:
                    resp = await http.post(search_url, json=body, headers=headers)
                await _record_health(
                    db,
                    connector_coll,
                    name,
                    200 <= resp.status_code < 300,
                    f"POST {path} -> {resp.status_code}",
                    increment_requests=1,
                )
                if resp.status_code == 401 and attempt < max_retries - 1:
                    # Token may be stale — force refresh path
                    cfg.pop("access_token", None)
                    cfg.pop("token_expires_at", None)
                    cfg, token = await ensure_access_token(name, cfg, db, connector_coll)
                    if token:
                        headers["Authorization"] = f"Bearer {token}"
                    await asyncio.sleep(0.4 * (attempt + 1))
                    continue
                if resp.status_code < 200 or resp.status_code >= 300:
                    last_err = f"HTTP {resp.status_code}: {resp.text[:300]}"
                    await asyncio.sleep(0.5 * (2**attempt))
                    continue
                data = resp.json()
                break
            except Exception as e:
                last_err = str(e)
                await asyncio.sleep(0.5 * (2**attempt))

        if data is None:
            await _record_health(db, connector_coll, name, False, last_err or "HTTP failure")
            # try alternate path once
            if len(paths) > 1 and path_idx == 0:
                path_idx += 1
                cursor = None
                continue
            break

        if isinstance(data, dict) and data.get("error"):
            await _record_health(
                db,
                connector_coll,
                name,
                False,
                json.dumps(data.get("error"))[:500],
            )
            break

        batch = _extract_list(data)
        for item in batch:
            aggregated.append(normalize_board_candidate(item, source))
            if len(aggregated) >= limit:
                break

        if isinstance(data, dict):
            next_c = _extract_next_cursor(data)
        else:
            next_c = None

        if not batch:
            if len(paths) > 1 and path_idx < len(paths) - 1:
                path_idx += 1
                cursor = None
                continue
            break

        if next_c:
            cursor = next_c
        else:
            break

    await _record_health(
        db,
        connector_coll,
        name,
        True,
        f"ingested_http={len(aggregated)}",
    )
    return aggregated[:limit]


async def fetch_connector_candidates(
    name: str,
    cfg: Dict[str, Any],
    job: Dict[str, Any],
    source: str,
    limit: int,
    db,
    connector_coll: str,
    prefer_mongo_first: bool = True,
) -> List[Dict[str, Any]]:
    """
    Prefer external Mongo when configured; otherwise paged HTTP with OAuth.
    """
    if prefer_mongo_first and cfg.get("mongo_url") and cfg.get("db_name"):
        try:
            mongo_res = await fetch_mongo_candidates(cfg, source, limit)
            if mongo_res:
                return mongo_res
        except Exception as e:
            logger.error("%s mongo ingestion failed: %s", name, e)
            await _record_health(db, connector_coll, name, False, f"mongo: {e}")

    return await fetch_http_candidates_paged(name, cfg, job, source, limit, db, connector_coll)
