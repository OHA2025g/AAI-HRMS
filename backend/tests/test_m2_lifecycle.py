"""M2 employee lifecycle state machine unit tests (no Mongo)."""

import pytest

from m2_employee_lifecycle.state_machine import (
    validate_direct_status_transition,
    validate_lifecycle_event_for_status,
    approval_rule_for_event,
)


def test_direct_status_graph():
    assert validate_direct_status_transition("ONBOARDING", "ACTIVE") is None
    assert validate_direct_status_transition("ACTIVE", "EXITED") is None
    assert validate_direct_status_transition("EXITED", "ACTIVE") is not None
    assert validate_direct_status_transition("ACTIVE", "ONBOARDING") is not None


def test_lifecycle_event_eligibility():
    assert validate_lifecycle_event_for_status("ACTIVATED", "ONBOARDING") is None
    assert validate_lifecycle_event_for_status("ACTIVATED", "ACTIVE") is not None
    assert validate_lifecycle_event_for_status("EXITED", "EXITED") is not None
    assert validate_lifecycle_event_for_status("ROLE_CHANGED", "EXITED") is not None


def test_approval_rules():
    assert approval_rule_for_event("EXITED") is not None
    assert approval_rule_for_event("ROLE_CHANGED") is not None
    assert approval_rule_for_event("ONBOARDED") is None
