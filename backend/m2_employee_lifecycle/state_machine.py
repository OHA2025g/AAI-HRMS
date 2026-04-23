"""
Employee status state machine + lifecycle event eligibility (M2-1).
"""

from __future__ import annotations

from typing import Dict, Optional, Set, Tuple

# Canonical employee.status values
EMPLOYEE_STATUSES = frozenset({"ONBOARDING", "ACTIVE", "INACTIVE", "EXITED"})

# Directed edges for direct PATCH/PUT on employees.status (UI / API edits)
STATUS_TRANSITION_GRAPH: Dict[str, Set[str]] = {
    "ONBOARDING": {"ACTIVE", "INACTIVE", "EXITED"},
    "ACTIVE": {"INACTIVE", "EXITED"},
    "INACTIVE": {"ACTIVE", "EXITED"},
    "EXITED": set(),
}


def normalize_status(status: Optional[str]) -> str:
    s = (status or "ACTIVE").strip().upper()
    return s if s in EMPLOYEE_STATUSES else "ACTIVE"


def validate_direct_status_transition(from_status: str, to_status: str) -> Optional[str]:
    """
    Returns error message if illegal, else None.
    """
    fs = normalize_status(from_status)
    ts = normalize_status(to_status)
    if fs == ts:
        return None
    allowed = STATUS_TRANSITION_GRAPH.get(fs, set())
    if ts not in allowed:
        return f"Illegal status transition {fs} -> {ts}"
    return None


def validate_lifecycle_event_for_status(event_type: str, current_status: str) -> Optional[str]:
    """
    Returns error message if this event must not apply from current_status.
    """
    cs = normalize_status(current_status)
    et = (event_type or "").strip().upper()

    if et == "ONBOARDED":
        if cs == "EXITED":
            return "Cannot ONBOARDED from EXITED; use HR data correction if needed"
        return None

    if et == "ACTIVATED":
        if cs != "ONBOARDING":
            return "ACTIVATED is only valid when employee status is ONBOARDING"
        return None

    if et == "EXITED":
        if cs == "EXITED":
            return "Employee already EXITED"
        if cs not in {"ONBOARDING", "ACTIVE", "INACTIVE"}:
            return f"EXITED not allowed from {cs}"
        return None

    if et in {"ROLE_CHANGED", "DOCUMENT_ADDED"}:
        if cs == "EXITED":
            return f"{et} not allowed for EXITED employees"
        return None

    return f"Unknown event_type: {et}"


def target_status_for_event(event_type: str) -> Optional[str]:
    """If event implies a canonical status change, return target status."""
    et = (event_type or "").strip().upper()
    if et == "ONBOARDED":
        return "ONBOARDING"
    if et == "ACTIVATED":
        return "ACTIVE"
    if et == "EXITED":
        return "EXITED"
    return None


def approval_rule_for_event(event_type: str) -> Optional[Tuple[Tuple[str, ...], int]]:
    """
    (allowed_roles, escalation_hours) or None if no approval gate.
    """
    et = (event_type or "").strip().upper()
    if et == "EXITED":
        # Align with lifecycle_write (recruiter can process exits in demo / TA-heavy orgs)
        return (("admin", "hr_admin", "recruiter"), 48)
    if et == "ROLE_CHANGED":
        return (("admin", "hr_admin", "recruiter"), 24)
    return None
