"""
OAuth / token lifecycle for job-board connectors (M1-1).

Supports:
- client_credentials (default)
- refresh_token when `refresh_token` is stored on the connector config
- Optional `oauth_token_url` override (e.g. LinkedIn: https://www.linkedin.com/oauth/v2/accessToken)
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)


def _parse_expires_at(raw: Any) -> Optional[datetime]:
    if not raw or not isinstance(raw, str):
        return None
    try:
        # ISO8601
        if raw.endswith("Z"):
            raw = raw.replace("Z", "+00:00")
        return datetime.fromisoformat(raw)
    except Exception:
        return None


async def _post_token(
    token_url: str,
    data: Dict[str, Any],
) -> Tuple[Optional[str], Optional[str], Optional[int]]:
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as http:
        resp = await http.post(
            token_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if resp.status_code < 200 or resp.status_code >= 300:
            logger.error("OAuth token HTTP %s: %s", resp.status_code, resp.text[:400])
            return None, None, None
        body = resp.json()
        access = body.get("access_token")
        refresh = body.get("refresh_token")
        expires_in = body.get("expires_in")
        if expires_in is not None:
            try:
                expires_in = int(expires_in)
            except (TypeError, ValueError):
                expires_in = None
        return access, refresh, expires_in


async def ensure_access_token(
    name: str,
    cfg: Dict[str, Any],
    db,
    connector_coll: str,
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Returns (cfg possibly updated in-memory, bearer_token or None).
    Persists new tokens / expiry to Mongo when refreshed.
    """
    cfg = dict(cfg)
    base_url = (cfg.get("base_url") or "").rstrip("/")
    client_id = cfg.get("client_id")
    client_secret = cfg.get("client_secret")
    token_url = (cfg.get("oauth_token_url") or "").strip() or (
        f"{base_url}/oauth/token" if base_url else ""
    )

    if not token_url or not client_id or not client_secret:
        return cfg, None

    # Use existing access token if not near expiry
    now = datetime.now(timezone.utc)
    exp = _parse_expires_at(cfg.get("token_expires_at"))
    skew = timedelta(seconds=90)
    existing = cfg.get("access_token")
    if existing and exp and (exp - skew) > now:
        return cfg, str(existing)

    scopes = cfg.get("scopes") or []
    if isinstance(scopes, str):
        scopes = [scopes]
    scope_str = " ".join(s for s in scopes if isinstance(s, str) and s.strip()) or None

    access: Optional[str] = None
    new_refresh: Optional[str] = None
    expires_in: Optional[int] = None

    # 1) Refresh grant if we have a refresh token
    if cfg.get("refresh_token"):
        access, new_refresh, expires_in = await _post_token(
            token_url,
            {
                "grant_type": "refresh_token",
                "refresh_token": cfg["refresh_token"],
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )

    # 2) Client credentials fallback
    if not access:
        data: Dict[str, Any] = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        }
        if scope_str:
            data["scope"] = scope_str
        access, new_refresh, expires_in = await _post_token(token_url, data)

    if not access:
        return cfg, None

    patch: Dict[str, Any] = {
        "access_token": access,
        "token_refreshed_at": now.isoformat(),
    }
    if new_refresh:
        patch["refresh_token"] = new_refresh
    if expires_in is not None:
        patch["token_expires_at"] = (now + timedelta(seconds=expires_in)).isoformat()

    cfg.update(patch)
    try:
        await db[connector_coll].update_one({"name": name}, {"$set": patch})
    except Exception as e:
        logger.warning("Could not persist OAuth tokens for %s: %s", name, e)

    return cfg, access


async def throttle_interval_ms(ms: int) -> None:
    if ms and ms > 0:
        await asyncio.sleep(ms / 1000.0)
