from typing import Literal
import pytest
from pydantic import BaseModel, ValidationError


class _EmployeePayload(BaseModel):
    employee_code: str
    full_name: str
    department: str
    role_title: str
    status: Literal["ONBOARDING", "ACTIVE", "INACTIVE", "EXITED"] = "ACTIVE"


class _SkillPayload(BaseModel):
    skill_name: str
    priority: Literal["HIGH", "MEDIUM", "LOW"] = "MEDIUM"


class _BulkMode(BaseModel):
    mode: Literal["skip", "upsert"] = "skip"
    dry_run: bool = False


def test_employee_status_enum_contract():
    ok = _EmployeePayload(
        employee_code="E100",
        full_name="A User",
        department="Engineering",
        role_title="Developer",
        status="ACTIVE",
    )
    assert ok.status == "ACTIVE"

    with pytest.raises(ValidationError):
        _EmployeePayload(
            employee_code="E101",
            full_name="Bad User",
            department="Engineering",
            role_title="Developer",
            status="INVALID_STATUS",
        )


def test_bulk_mode_contract():
    assert _BulkMode(mode="upsert", dry_run=True).mode == "upsert"
    with pytest.raises(ValidationError):
        _BulkMode(mode="invalid")


def test_skill_priority_contract():
    assert _SkillPayload(skill_name="Python", priority="HIGH").priority == "HIGH"
    with pytest.raises(ValidationError):
        _SkillPayload(skill_name="Python", priority="CRITICAL")
