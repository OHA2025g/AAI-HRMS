"""Parse free-text experience blobs into structured entries."""

from __future__ import annotations

import re
from typing import Any, Dict, List


def parse_experience_blob(raw: str) -> List[Dict[str, Any]]:
    if not raw or not str(raw).strip():
        return []
    text = str(raw).strip()
    blocks = re.split(r"\n{2,}|(?:\n(?=[•\-\*]))", text)
    out: List[Dict[str, Any]] = []
    for block in blocks:
        line = block.strip().lstrip("•-* ").strip()
        if not line:
            continue
        out.append({"title": "Experience", "company": "", "description": line})
    return out[:50]


def normalize_experience_list(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "title": item.get("title") or item.get("role") or "Experience",
                "company": item.get("company") or item.get("organization") or "",
                "description": item.get("description") or item.get("summary") or "",
                "start_date": item.get("start_date"),
                "end_date": item.get("end_date"),
            }
        )
    return out[:50]
