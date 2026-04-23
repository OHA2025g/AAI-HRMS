"""M6-1: cadence helpers for survey scheduling."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

Cadence = Literal["WEEKLY", "MONTHLY", "QUARTERLY"]


def next_run_after(cadence: str, ref: datetime) -> datetime:
    c = (cadence or "MONTHLY").upper()
    if c == "WEEKLY":
        return ref + timedelta(days=7)
    if c == "QUARTERLY":
        return ref + timedelta(days=90)
    return ref + timedelta(days=30)


def parse_iso_dt(s: str) -> datetime:
    raw = (s or "").replace("Z", "+00:00")
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt
