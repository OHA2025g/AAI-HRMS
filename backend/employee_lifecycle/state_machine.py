"""Employee lifecycle state machine helpers."""

from __future__ import annotations

from typing import Any, Dict, Optional

ALLOWED_STATUS = {"ACTIVE", "INACTIVE", "ONBOARDING", "EXITED", "SUSPENDED"}

STATUS_TRANSITIONS = {
    "ONBOARDING": {"ACTIVE", "INACTIVE", "EXITED"},
    "ACTIVE": {"INACTIVE", "EXITED", "SUSPENDED"},
    "INACTIVE": {"ACTIVE", "EXITED"},
    "SUSPENDED": {"ACTIVE", "INACTIVE", "EXITED"},
    "EXITED": set(),
}

EVENT_TARGET_STATUS = {
    "ONBOARDED": "ONBOARDING",
    "ACTIVATED": "ACTIVE",
    "ROLE_CHANGED": None,
    "DOCUMENT_ADDED": None,
    "EXITED": "EXITED",
}

EVENT_ALLOWED_FROM = {
    "ONBOARDED": {"INACTIVE", "ONBOARDING"},
    "ACTIVATED": {"ONBOARDING", "INACTIVE"},
    "ROLE_CHANGED": {"ACTIVE", "ONBOARDING"},
    "DOCUMENT_ADDED": {"ACTIVE", "ONBOARDING"},
    "EXITED": {"ACTIVE", "INACTIVE", "ONBOARDING", "SUSPENDED"},
}

APPROVAL_RULES: Dict[str, Dict[str, Any]] = {
    "ROLE_CHANGED": {"min_approvers": 1},
    "EXITED": {"min_approvers": 1},
}


def validate_direct_status_transition(from_status: str, to_status: str) -> Optional[str]:
    src = (from_status or "ACTIVE").upper()
    dst = (to_status or "").upper()
    if dst not in ALLOWED_STATUS:
        return f"Invalid status: {dst}"
    allowed = STATUS_TRANSITIONS.get(src, ALLOWED_STATUS)
    if dst not in allowed:
        return f"Cannot transition from {src} to {dst}"
    return None


def validate_lifecycle_event_for_status(event_type: str, current_status: str) -> Optional[str]:
    et = (event_type or "").upper()
    cur = (current_status or "ACTIVE").upper()
    allowed = EVENT_ALLOWED_FROM.get(et)
    if allowed is None:
        return f"Unknown event type: {et}"
    if cur not in allowed:
        return f"Event {et} not allowed from status {cur}"
    return None


def target_status_for_event(event_type: str) -> str:
    et = (event_type or "").upper()
    target = EVENT_TARGET_STATUS.get(et)
    return target or "ACTIVE"


def approval_rule_for_event(event_type: str) -> Optional[Dict[str, Any]]:
    return APPROVAL_RULES.get((event_type or "").upper())
