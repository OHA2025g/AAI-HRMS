"""
SLA helpers for compliance documents (M2-3).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional


def default_sla_due(uploaded_at_iso: str, days: int = 14) -> str:
    try:
        raw = uploaded_at_iso.replace("Z", "+00:00")
        up = datetime.fromisoformat(raw)
        if up.tzinfo is None:
            up = up.replace(tzinfo=timezone.utc)
    except Exception:
        up = datetime.now(timezone.utc)
    return (up + timedelta(days=days)).isoformat()


def is_past_iso(iso: Optional[str]) -> bool:
    if not iso or not isinstance(iso, str):
        return False
    try:
        raw = iso.replace("Z", "+00:00")
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt < datetime.now(timezone.utc)
    except Exception:
        return False
