"""Tests for hiring dashboard RBAC scope enforcement."""

import pytest
from fastapi import HTTPException

from talent_acquisition.hiring_dashboard_access import enforce_hiring_dashboard_scope


class _FakeDb:
    def __init__(self, user=None, employee=None):
        self.users = _FakeColl(user)
        self.employees = _FakeColl(employee)


class _FakeColl:
    def __init__(self, doc):
        self._doc = doc

    async def find_one(self, query, projection=None):
        return self._doc


@pytest.mark.asyncio
async def test_mine_scope_forces_owner():
    db = _FakeDb()
    scope, dept, owner, job = await enforce_hiring_dashboard_scope(
        db,
        current_user={"id": "u1", "role": "recruiter"},
        scope="mine",
        department="Engineering",
        owner_id=None,
        job_id=None,
    )
    assert scope == "mine"
    assert owner == "u1"
    assert dept is None


@pytest.mark.asyncio
async def test_rejects_foreign_owner_id():
    db = _FakeDb()
    with pytest.raises(HTTPException) as exc:
        await enforce_hiring_dashboard_scope(
            db,
            current_user={"id": "u1", "role": "recruiter"},
            scope="all",
            department=None,
            owner_id="other-user",
            job_id=None,
        )
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_admin_may_query_foreign_owner():
    db = _FakeDb()
    scope, dept, owner, job = await enforce_hiring_dashboard_scope(
        db,
        current_user={"id": "admin1", "role": "admin"},
        scope="all",
        department=None,
        owner_id="other-user",
        job_id=None,
    )
    assert owner == "other-user"
