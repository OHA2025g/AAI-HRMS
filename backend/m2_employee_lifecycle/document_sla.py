"""Document SLA helpers for employee lifecycle."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional


def default_sla_due(now_iso: str, days: int = 7) -> str:
    try:
        now = datetime.fromisoformat(now_iso.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        now = datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    due = now + timedelta(days=max(1, int(days)))
    return due.isoformat()


def is_past_iso(value: Optional[str]) -> bool:
    if not value:
        return False
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt < datetime.now(timezone.utc)
