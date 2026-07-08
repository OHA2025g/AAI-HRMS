"""API integration tests for hiring RBAC (stakeholder scope)."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

import server as srv
from talent_acquisition.hiring_rbac import build_hiring_team

_TEST_PASSWORD = "QA_Seed_ChangeMe!"
_NOW = datetime.now(timezone.utc).isoformat()


def _candidate_doc(cid: str, name: str, email: str) -> dict:
    return {
        "id": cid,
        "full_name": name,
        "email": email,
        "source": "MANUAL",
        "created_at": _NOW,
    }


pytestmark = pytest.mark.usefixtures("bind_motor_to_current_loop")


@pytest_asyncio.fixture
async def rbac_client():
    transport = ASGITransport(app=srv.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def _seed_user(role: str, email: str) -> dict:
    uid = f"test-{role}-{email.split('@')[0]}"
    doc = {
        "id": uid,
        "email": email,
        "full_name": f"Test {role}",
        "role": role,
        "password": srv.hash_password(_TEST_PASSWORD),
        "is_active": True,
    }
    await srv.db.users.update_one({"id": uid}, {"$set": doc}, upsert=True)
    return doc


async def _login(client: AsyncClient, email: str, password: str = _TEST_PASSWORD):
    res = await client.post("/api/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        pytest.skip(f"Login failed for {email}: {res.status_code} {res.text}")
    token = res.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_stakeholder_candidates_list_scoped(rbac_client: AsyncClient):
    """HM on one job should not see candidates only on another job."""
    hm = await _seed_user("hiring_manager", "rbac_hm_scope@aai-hrms.local")
    job_a = "job-rbac-a"
    job_b = "job-rbac-b"
    cand_a = "cand-rbac-a"
    cand_b = "cand-rbac-b"

    await srv.db.jobs.delete_many({"id": {"$in": [job_a, job_b]}})
    await srv.db.candidates.delete_many({"id": {"$in": [cand_a, cand_b]}})
    await srv.db.applications.delete_many({"job_id": {"$in": [job_a, job_b]}})

    team = build_hiring_team(creator_id=hm["id"], creator_role="hiring_manager")
    await srv.db.jobs.insert_one(
        {
            "id": job_a,
            "title": "RBAC Job A",
            "status": "OPEN",
            "created_by": hm["id"],
            "hiring_team": {**team, "hiring_manager_id": hm["id"]},
        }
    )
    await srv.db.jobs.insert_one(
        {
            "id": job_b,
            "title": "RBAC Job B",
            "status": "OPEN",
            "created_by": "other-user",
            "hiring_team": build_hiring_team(creator_id="other-user", creator_role="recruiter"),
        }
    )
    await srv.db.candidates.insert_one(_candidate_doc(cand_a, "A", "a@rbac.test"))
    await srv.db.candidates.insert_one(_candidate_doc(cand_b, "B", "b@rbac.test"))
    await srv.db.applications.insert_one(
        {"id": "app-a", "job_id": job_a, "candidate_id": cand_a, "stage": "SOURCED", "status": "ACTIVE"}
    )
    await srv.db.applications.insert_one(
        {"id": "app-b", "job_id": job_b, "candidate_id": cand_b, "stage": "SOURCED", "status": "ACTIVE"}
    )

    headers = await _login(rbac_client, hm["email"])
    res = await rbac_client.get("/api/candidates", headers=headers)
    assert res.status_code == 200
    ids = {c["id"] for c in res.json()}
    assert cand_a in ids
    assert cand_b not in ids


@pytest.mark.asyncio
async def test_tm_blocked_from_direct_offer_stage(rbac_client: AsyncClient):
    """Technical Manager must not move applications to OFFER directly."""
    tm = await _seed_user("technical_manager", "rbac_tm_offer@aai-hrms.local")
    job_id = "job-rbac-tm-offer"
    app_id = "app-rbac-tm-offer"
    cand_id = "cand-rbac-tm-offer"

    await srv.db.jobs.delete_many({"id": job_id})
    await srv.db.candidates.delete_many({"id": cand_id})
    await srv.db.applications.delete_many({"id": app_id})

    team = build_hiring_team(creator_id=tm["id"], creator_role="technical_manager")
    await srv.db.jobs.insert_one(
        {
            "id": job_id,
            "title": "RBAC TM Offer Job",
            "status": "OPEN",
            "created_by": tm["id"],
            "hiring_team": {**team, "technical_manager_id": tm["id"]},
        }
    )
    await srv.db.candidates.insert_one(_candidate_doc(cand_id, "TM Cand", "tm@rbac.test"))
    await srv.db.applications.insert_one(
        {
            "id": app_id,
            "job_id": job_id,
            "candidate_id": cand_id,
            "stage": "INTERVIEW_1",
            "status": "ACTIVE",
        }
    )

    headers = await _login(rbac_client, tm["email"])
    res = await rbac_client.put(
        f"/api/applications/{app_id}/stage",
        json={"stage": "OFFER"},
        headers=headers,
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_assessment_submission_scoped_to_job_team(rbac_client: AsyncClient):
    """HM on job A cannot read/cancel submission on job B."""
    hm = await _seed_user("hiring_manager", "rbac_hm_sub@aai-hrms.local")
    job_a = "job-rbac-sub-a"
    job_b = "job-rbac-sub-b"
    sub_b = "sub-rbac-b"
    asm_b = "asm-rbac-b"

    await srv.db.jobs.delete_many({"id": {"$in": [job_a, job_b]}})
    await srv.db.assessments.delete_many({"id": asm_b})
    await srv.db.assessment_submissions.delete_many({"id": sub_b})

    team = build_hiring_team(creator_id=hm["id"], creator_role="hiring_manager")
    await srv.db.jobs.insert_one(
        {
            "id": job_a,
            "title": "RBAC Sub Job A",
            "status": "OPEN",
            "created_by": hm["id"],
            "hiring_team": {**team, "hiring_manager_id": hm["id"]},
        }
    )
    await srv.db.jobs.insert_one(
        {
            "id": job_b,
            "title": "RBAC Sub Job B",
            "status": "OPEN",
            "created_by": "other-user",
            "hiring_team": build_hiring_team(creator_id="other-user", creator_role="recruiter"),
        }
    )
    await srv.db.assessments.insert_one(
        {
            "id": asm_b,
            "job_id": job_b,
            "title": "B Assessment",
            "status": "ACTIVE",
            "assessment_type": "CORE_SKILL",
            "questions": [],
        }
    )
    await srv.db.assessment_submissions.insert_one(
        {
            "id": sub_b,
            "assessment_id": asm_b,
            "job_id": job_b,
            "candidate_id": "cand-b",
            "status": "INVITED",
        }
    )

    headers = await _login(rbac_client, hm["email"])
    get_res = await rbac_client.get(f"/api/assessments/submissions/{sub_b}", headers=headers)
    assert get_res.status_code == 403

    cancel_res = await rbac_client.post(
        f"/api/assessments/submissions/{sub_b}/cancel",
        headers=headers,
    )
    assert cancel_res.status_code == 403


@pytest.mark.asyncio
async def test_tm_can_create_offer_stage_proposal(rbac_client: AsyncClient):
    """TM requests HM approval instead of direct OFFER move."""
    tm = await _seed_user("technical_manager", "rbac_tm_prop@aai-hrms.local")
    job_id = "job-rbac-tm-prop"
    app_id = "app-rbac-tm-prop"
    cand_id = "cand-rbac-tm-prop"

    await srv.db.jobs.delete_many({"id": job_id})
    await srv.db.candidates.delete_many({"id": cand_id})
    await srv.db.applications.delete_many({"id": app_id})
    await srv.db.offer_stage_proposals.delete_many({"application_id": app_id})

    team = build_hiring_team(creator_id=tm["id"], creator_role="technical_manager")
    await srv.db.jobs.insert_one(
        {
            "id": job_id,
            "title": "RBAC TM Proposal Job",
            "status": "OPEN",
            "created_by": tm["id"],
            "hiring_team": {**team, "technical_manager_id": tm["id"]},
        }
    )
    await srv.db.candidates.insert_one(_candidate_doc(cand_id, "Prop Cand", "prop@rbac.test"))
    await srv.db.applications.insert_one(
        {
            "id": app_id,
            "job_id": job_id,
            "candidate_id": cand_id,
            "stage": "HR_ROUND",
            "status": "ACTIVE",
        }
    )

    headers = await _login(rbac_client, tm["email"])
    res = await rbac_client.post(
        f"/api/applications/{app_id}/offer-stage-proposal",
        json={"target_stage": "OFFER", "reason": "Ready for offer"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json().get("status") == "PENDING"


@pytest.mark.asyncio
async def test_hm_approves_offer_stage_proposal(rbac_client: AsyncClient):
    """HM approves TM offer proposal and application moves to OFFER."""
    tm = await _seed_user("technical_manager", "rbac_tm_appr@aai-hrms.local")
    hm = await _seed_user("hiring_manager", "rbac_hm_appr@aai-hrms.local")
    job_id = "job-rbac-hm-appr"
    app_id = "app-rbac-hm-appr"
    cand_id = "cand-rbac-hm-appr"

    await srv.db.jobs.delete_many({"id": job_id})
    await srv.db.candidates.delete_many({"id": cand_id})
    await srv.db.applications.delete_many({"id": app_id})
    await srv.db.offer_stage_proposals.delete_many({"application_id": app_id})

    team = build_hiring_team(creator_id=hm["id"], creator_role="hiring_manager")
    team["technical_manager_id"] = tm["id"]
    team["hiring_manager_id"] = hm["id"]
    await srv.db.jobs.insert_one(
        {
            "id": job_id,
            "title": "RBAC HM Approve Job",
            "status": "OPEN",
            "created_by": hm["id"],
            "hiring_team": team,
        }
    )
    await srv.db.candidates.insert_one(_candidate_doc(cand_id, "Approve Cand", "appr@rbac.test"))
    await srv.db.applications.insert_one(
        {
            "id": app_id,
            "job_id": job_id,
            "candidate_id": cand_id,
            "stage": "HR_ROUND",
            "status": "ACTIVE",
        }
    )

    tm_headers = await _login(rbac_client, tm["email"])
    create_res = await rbac_client.post(
        f"/api/applications/{app_id}/offer-stage-proposal",
        json={"target_stage": "OFFER", "reason": "Recommend offer"},
        headers=tm_headers,
    )
    assert create_res.status_code == 200
    proposal_id = create_res.json()["id"]

    hm_headers = await _login(rbac_client, hm["email"])
    approve_res = await rbac_client.post(
        f"/api/offer-stage-proposals/{proposal_id}/approve",
        headers=hm_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json().get("status") == "APPROVED"

    app_row = await srv.db.applications.find_one({"id": app_id}, {"_id": 0, "stage": 1})
    assert app_row["stage"] == "OFFER"
