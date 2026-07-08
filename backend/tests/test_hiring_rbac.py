"""Unit tests for Smart Hiring RBAC."""

import pytest
from fastapi import HTTPException

from talent_acquisition.hiring_rbac import (
    PERM_JOB_CREATE,
    PERM_PIPELINE_OFFER,
    PERM_PIPELINE_ADVANCE,
    assert_can_request_offer_stage,
    assert_permission,
    assert_stage_transition,
    build_hiring_team,
    has_permission,
    is_privileged_role,
    job_team_access_filter,
    merge_candidate_query_with_access,
    user_on_job_team,
)


def _job(team=None, created_by="creator-1"):
    return {
        "id": "job-1",
        "created_by": created_by,
        "hiring_team": team
        or {
            "hiring_manager_id": "hm-1",
            "technical_manager_id": "tm-1",
            "project_manager_id": "pm-1",
            "recruiter_id": "rec-1",
        },
    }


def test_privileged_roles():
    assert is_privileged_role("admin")
    assert is_privileged_role("recruiter")
    assert not is_privileged_role("hiring_manager")


def test_user_on_job_team():
    job = _job()
    assert user_on_job_team("hm-1", job)
    assert not user_on_job_team("other", job)
    assert user_on_job_team("creator-1", {"id": "j", "created_by": "creator-1"})


def test_build_hiring_team_defaults_by_creator_role():
    team = build_hiring_team(creator_id="u1", creator_role="hiring_manager")
    assert team["hiring_manager_id"] == "u1"
    team2 = build_hiring_team(creator_id="u2", creator_role="technical_manager")
    assert team2["technical_manager_id"] == "u2"


def test_hiring_manager_permissions_on_assigned_job():
    user = {"id": "hm-1", "role": "hiring_manager"}
    job = _job()
    assert has_permission(user, PERM_PIPELINE_OFFER, job)
    assert has_permission(user, PERM_JOB_CREATE, job)


def test_technical_manager_cannot_offer():
    user = {"id": "tm-1", "role": "technical_manager"}
    job = _job()
    assert has_permission(user, PERM_PIPELINE_ADVANCE, job)
    assert not has_permission(user, PERM_PIPELINE_OFFER, job)


def test_project_manager_read_only_pipeline():
    user = {"id": "pm-1", "role": "project_manager"}
    job = _job()
    assert has_permission(user, PERM_JOB_CREATE, job)
    with pytest.raises(HTTPException) as exc:
        assert_stage_transition(user, job, "OFFER")
    assert exc.value.status_code == 403


def test_tm_blocked_from_offer_stage():
    user = {"id": "tm-1", "role": "technical_manager"}
    job = _job()
    with pytest.raises(HTTPException):
        assert_stage_transition(user, job, "OFFER")


def test_tm_can_request_offer_stage_on_team():
    user = {"id": "tm-1", "role": "technical_manager"}
    job = _job()
    assert_can_request_offer_stage(user, job)


def test_hm_cannot_request_offer_stage():
    user = {"id": "hm-1", "role": "hiring_manager"}
    job = _job()
    with pytest.raises(HTTPException) as exc:
        assert_can_request_offer_stage(user, job)
    assert exc.value.status_code == 403


def test_stakeholder_not_on_job_denied():
    user = {"id": "hm-99", "role": "hiring_manager"}
    job = _job()
    assert not has_permission(user, PERM_PIPELINE_ADVANCE, job)


def test_job_team_access_filter_shape():
    f = job_team_access_filter("u1")
    assert "$or" in f
    assert len(f["$or"]) == 5


def test_job_team_access_filter_with_projects():
    f = job_team_access_filter("u1", project_ids=["p1", "p2"])
    assert {"project_id": {"$in": ["p1", "p2"]}} in f["$or"]


def test_merge_candidate_query_scoped():
    q = merge_candidate_query_with_access({"source": "LINKEDIN"}, ["c1", "c2"])
    assert "$and" in q
    assert q["$and"][1]["id"]["$in"] == ["c1", "c2"]
