"""M7-2: deterministic intent detection (guardrails live in API layer)."""

from __future__ import annotations

import re
from typing import Optional


def _norm(s: str) -> str:
    return (s or "").strip().lower()


def detect_intent(message: str) -> str:
    m = _norm(message)
    if not m:
        return "empty"

    if any(k in m for k in ("help", "what can you do", "capabilities", "commands")):
        return "help"

    if any(k in m for k in ("automation status", "lifecycle status", "pending lifecycle", "failed lifecycle")):
        return "automation_status"

    if any(k in m for k in ("reprocess", "re-run", "rerun", "replay")) and "lifecycle" in m:
        return "reprocess_lifecycle"

    if "reprocess" in m or ("lifecycle" in m and any(k in m for k in ("process", "queue", "stuck", "pending"))):
        return "reprocess_lifecycle"

    if "employee" in m or "lookup" in m or re.search(r"\b(e\d+|[a-z]{1,3}\d{3,})\b", m):
        return "employee_lookup"

    if any(k in m for k in ("workflow rule", "automation rule", "run rule")):
        return "workflow_rules"

    return "unknown"


def extract_employee_code_hint(message: str) -> Optional[str]:
    """Best-effort token that looks like an employee code."""
    raw = (message or "").strip()
    for pat in (r"\b([A-Za-z]{1,4}\d{3,})\b", r"\b(E\d+)\b", r"\b(EMP[-_]?[A-Z0-9]+)\b"):
        mm = re.search(pat, raw, re.I)
        if mm:
            return mm.group(1).upper()
    return None


def permission_for_intent(intent: str) -> Optional[str]:
    """Phase-1 permission string required to execute side-effecting resolution."""
    if intent == "reprocess_lifecycle":
        return "lifecycle_write"
    if intent == "employee_lookup":
        return "employees_read"
    if intent == "workflow_rules":
        return None  # gated by admin in API
    return None


def help_text() -> str:
    return (
        "I can help with: lifecycle automation status, reprocessing pending/failed lifecycle events "
        "(requires lifecycle approval access), employee lookup by code (read access), and (admins) workflow rules. "
        "Ask naturally, e.g. “automation status” or “reprocess lifecycle events”."
    )
