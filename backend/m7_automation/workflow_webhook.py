"""M7: outbound HTTP webhook actions with basic SSRF guardrails."""

from __future__ import annotations

import ipaddress
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlparse

import httpx

_TEMPLATE_RE = re.compile(r"\{(\w+)\}")


def _allow_private_targets() -> bool:
    return (os.environ.get("WORKFLOW_WEBHOOK_ALLOW_PRIVATE_IPS") or "").strip().lower() in ("1", "true", "yes")


def validate_webhook_url(url: str) -> Tuple[bool, str]:
    """
    Reject obviously unsafe URLs. Full DNS rebinding protection is not attempted here.
    Blocks: non-http(s), localhost, literal private/reserved IPs in host.
    """
    raw = (url or "").strip()
    if not raw:
        return False, "URL is empty"
    if len(raw) > 2048:
        return False, "URL too long"
    parsed = urlparse(raw)
    scheme = (parsed.scheme or "").lower()
    if scheme not in ("http", "https"):
        return False, "Only http/https URLs are allowed"
    host = (parsed.hostname or "").strip().lower()
    if not host:
        return False, "Missing host"
    if host in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        if not _allow_private_targets():
            return False, "Localhost targets are blocked (set WORKFLOW_WEBHOOK_ALLOW_PRIVATE_IPS=1 to allow in dev)"
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            if not _allow_private_targets():
                return False, "Private/reserved IP hosts are blocked"
    except ValueError:
        pass
    if host.endswith(".local") and not _allow_private_targets():
        return False, ".local hosts are blocked"
    if host in ("metadata.google.internal", "metadata", "169.254.169.254"):
        return False, "Metadata endpoints are blocked"
    return True, ""


def render_webhook_body(template: str, *, rule: Dict[str, Any], extra: Optional[Dict[str, Any]] = None) -> str:
    """Replace {rule_id}, {rule_name}, {timestamp}, {trigger_type} and extra keys."""
    ctx: Dict[str, str] = {
        "rule_id": str(rule.get("id") or ""),
        "rule_name": str(rule.get("name") or ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "trigger_type": str(rule.get("trigger_type") or ""),
    }
    if extra:
        for k, v in extra.items():
            ctx[str(k)] = json.dumps(v) if isinstance(v, (dict, list)) else str(v)

    def repl(m: re.Match) -> str:
        key = m.group(1)
        return ctx.get(key, m.group(0))

    return _TEMPLATE_RE.sub(repl, template or "")


async def execute_http_webhook(
    action_config: Dict[str, Any],
    *,
    rule: Dict[str, Any],
    extra_template_vars: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    url = str(action_config.get("url") or "").strip()
    ok, err = validate_webhook_url(url)
    if not ok:
        raise ValueError(err)

    method = str(action_config.get("method") or "POST").upper()
    if method not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
        raise ValueError(f"Unsupported HTTP method: {method}")

    headers_in = action_config.get("headers") or {}
    headers: Dict[str, str] = {}
    if isinstance(headers_in, dict):
        for k, v in headers_in.items():
            if k and v is not None:
                headers[str(k)[:200]] = str(v)[:4000]

    timeout_sec = max(3.0, min(float(action_config.get("timeout_sec") or 15.0), 60.0))

    body_template = action_config.get("body_template")
    content: Optional[str] = None
    if body_template is not None and method not in ("GET",):
        content = render_webhook_body(str(body_template), rule=rule, extra=extra_template_vars)
        if "content-type" not in {k.lower() for k in headers}:
            headers["Content-Type"] = "application/json"

    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout_sec, connect=10.0), follow_redirects=False) as client:
        r = await client.request(method, url, headers=headers, content=content)

    return {
        "http_status": r.status_code,
        "response_snippet": (r.text or "")[:2000],
    }
