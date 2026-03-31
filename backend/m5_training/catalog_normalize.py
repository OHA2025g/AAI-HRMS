"""M5-2: normalize external LMS course payloads to a stable HRMS shape."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Mapping, Optional


_WS = re.compile(r"\s+")


def _clean_str(v: Any, max_len: int = 500) -> str:
    s = "" if v is None else str(v).strip()
    s = _WS.sub(" ", s)
    return s[:max_len]


def normalize_skill_tags(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        parts = re.split(r"[,;|]", raw)
        return [p.strip().lower() for p in parts if p.strip()]
    if isinstance(raw, (list, tuple)):
        return [str(x).strip().lower() for x in raw if str(x).strip()]
    return []


def normalize_course_record(raw: Mapping[str, Any], *, provider: str) -> Dict[str, Any]:
    """
    Input keys (flexible): id/external_id, title/name, description/summary, skills/tags,
    duration_hours/length_hours, url/link.
    """
    ext_id = _clean_str(raw.get("external_id") or raw.get("id") or raw.get("course_id"), 120)
    title = _clean_str(raw.get("title") or raw.get("name") or "Untitled course", 300)
    desc = _clean_str(raw.get("description") or raw.get("summary") or "", 2000)
    duration = raw.get("duration_hours")
    try:
        duration_f = float(duration) if duration is not None else None
    except (TypeError, ValueError):
        duration_f = None
    url = _clean_str(raw.get("url") or raw.get("link") or raw.get("href"), 800) or None
    tags = normalize_skill_tags(raw.get("skills") or raw.get("skill_tags") or raw.get("tags"))

    return {
        "provider": _clean_str(provider, 64) or "unknown",
        "external_id": ext_id or "unknown",
        "title_norm": title,
        "description_norm": desc,
        "skill_tags_lc": tags,
        "duration_hours": duration_f,
        "source_url": url,
    }
