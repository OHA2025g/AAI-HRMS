"""Smart Hiring RBAC — login roles + per-job hiring_team assignments."""

from __future__ import annotations

from typing import Any, Dict, FrozenSet, List, Optional, Set

from fastapi import HTTPException

# --- Login roles ---
HIRING_LOGIN_ROLES: FrozenSet[str] = frozenset(
    {
        "admin",
        "recruiter",
        "hr_admin",
        "hr_viewer",
        "hiring_manager",
        "technical_manager",
        "project_manager",
    }
)

PRIVILEGED_GLOBAL_ROLES: FrozenSet[str] = frozenset({"admin", "hr_admin", "recruiter"})
STAKEHOLDER_ROLES: FrozenSet[str] = frozenset(
    {"hiring_manager", "technical_manager", "project_manager"}
)

# --- Permissions ---
PERM_JOB_READ = "job.read"
PERM_JOB_CREATE = "job.create"
PERM_JOB_EDIT = "job.edit"
PERM_JOB_EDIT_TECHNICAL = "job.edit_technical"
PERM_JOB_DELETE = "job.delete"
PERM_JOB_ASSIGN_TEAM = "job.assign_team"
PERM_PIPELINE_READ = "pipeline.read"
PERM_PIPELINE_ADVANCE = "pipeline.advance"
PERM_PIPELINE_OFFER = "pipeline.offer"
PERM_ASSESSMENT_READ = "assessment.read"
PERM_ASSESSMENT_GENERATE = "assessment.generate"
PERM_ASSESSMENT_PUBLISH = "assessment.publish"
PERM_ASSESSMENT_GRADE = "assessment.grade"
PERM_MATCH_RUN = "match.run"
PERM_INTERVIEW_APPROVE = "interview.approve"
PERM_IMPORT_BULK = "import.bulk"
PERM_INTEGRATION_ADMIN = "integration.admin"

OFFER_STAGES: FrozenSet[str] = frozenset({"OFFER", "JOINED"})

ROLE_PERMISSIONS: Dict[str, FrozenSet[str]] = {
    "admin": frozenset(
        {
            PERM_JOB_READ,
            PERM_JOB_CREATE,
            PERM_JOB_EDIT,
            PERM_JOB_EDIT_TECHNICAL,
            PERM_JOB_DELETE,
            PERM_JOB_ASSIGN_TEAM,
            PERM_PIPELINE_READ,
            PERM_PIPELINE_ADVANCE,
            PERM_PIPELINE_OFFER,
            PERM_ASSESSMENT_READ,
            PERM_ASSESSMENT_GENERATE,
            PERM_ASSESSMENT_PUBLISH,
            PERM_ASSESSMENT_GRADE,
            PERM_MATCH_RUN,
            PERM_INTERVIEW_APPROVE,
            PERM_IMPORT_BULK,
            PERM_INTEGRATION_ADMIN,
        }
    ),
    "hr_admin": frozenset(
        {
            PERM_JOB_READ,
            PERM_JOB_CREATE,
            PERM_JOB_EDIT,
            PERM_JOB_EDIT_TECHNICAL,
            PERM_JOB_DELETE,
            PERM_JOB_ASSIGN_TEAM,
            PERM_PIPELINE_READ,
            PERM_PIPELINE_ADVANCE,
            PERM_PIPELINE_OFFER,
            PERM_ASSESSMENT_READ,
            PERM_ASSESSMENT_GENERATE,
            PERM_ASSESSMENT_PUBLISH,
            PERM_ASSESSMENT_GRADE,
            PERM_MATCH_RUN,
            PERM_INTERVIEW_APPROVE,
            PERM_IMPORT_BULK,
        }
    ),
    "recruiter": frozenset(
        {
            PERM_JOB_READ,
            PERM_JOB_CREATE,
            PERM_JOB_EDIT,
            PERM_JOB_EDIT_TECHNICAL,
            PERM_JOB_DELETE,
            PERM_JOB_ASSIGN_TEAM,
            PERM_PIPELINE_READ,
            PERM_PIPELINE_ADVANCE,
            PERM_PIPELINE_OFFER,
            PERM_ASSESSMENT_READ,
            PERM_ASSESSMENT_GENERATE,
            PERM_ASSESSMENT_PUBLISH,
            PERM_ASSESSMENT_GRADE,
            PERM_MATCH_RUN,
            PERM_INTERVIEW_APPROVE,
            PERM_IMPORT_BULK,
        }
    ),
    "hr_viewer": frozenset({PERM_JOB_READ, PERM_PIPELINE_READ, PERM_ASSESSMENT_READ}),
    "hiring_manager": frozenset(
        {
            PERM_JOB_READ,
            PERM_JOB_CREATE,
            PERM_JOB_EDIT,
            PERM_JOB_ASSIGN_TEAM,
            PERM_PIPELINE_READ,
            PERM_PIPELINE_ADVANCE,
            PERM_PIPELINE_OFFER,
            PERM_ASSESSMENT_READ,
            PERM_ASSESSMENT_GENERATE,
            PERM_ASSESSMENT_PUBLISH,
            PERM_ASSESSMENT_GRADE,
            PERM_MATCH_RUN,
            PERM_INTERVIEW_APPROVE,
        }
    ),
    "technical_manager": frozenset(
        {
            PERM_JOB_READ,
            PERM_JOB_EDIT_TECHNICAL,
            PERM_PIPELINE_READ,
            PERM_PIPELINE_ADVANCE,
            PERM_ASSESSMENT_READ,
            PERM_ASSESSMENT_GENERATE,
            PERM_ASSESSMENT_PUBLISH,
            PERM_ASSESSMENT_GRADE,
            PERM_MATCH_RUN,
        }
    ),
    "project_manager": frozenset(
        {
            PERM_JOB_READ,
            PERM_JOB_CREATE,
            PERM_PIPELINE_READ,
            PERM_ASSESSMENT_READ,
        }
    ),
}


def normalize_role(role: Optional[str]) -> str:
    return (role or "").strip().lower()


def role_permissions(role: Optional[str]) -> Set[str]:
    return set(ROLE_PERMISSIONS.get(normalize_role(role), frozenset()))


def is_privileged_role(role: Optional[str]) -> bool:
    return normalize_role(role) in PRIVILEGED_GLOBAL_ROLES


def get_hiring_team(job: Optional[Dict[str, Any]]) -> Dict[str, Optional[str]]:
    if not job:
        return {}
    team = job.get("hiring_team")
    if isinstance(team, dict) and team:
        return {
            "hiring_manager_id": team.get("hiring_manager_id"),
            "technical_manager_id": team.get("technical_manager_id"),
            "project_manager_id": team.get("project_manager_id"),
            "recruiter_id": team.get("recruiter_id"),
        }
    creator = job.get("created_by")
    return {
        "hiring_manager_id": None,
        "technical_manager_id": None,
        "project_manager_id": None,
        "recruiter_id": creator,
    }


def user_on_job_team(user_id: Optional[str], job: Optional[Dict[str, Any]]) -> bool:
    if not user_id or not job:
        return False
    if job.get("created_by") == user_id:
        return True
    team = get_hiring_team(job)
    return user_id in {v for v in team.values() if v}


def build_hiring_team(
    *,
    creator_id: str,
    creator_role: str,
    hiring_team: Optional[Dict[str, Any]] = None,
) -> Dict[str, Optional[str]]:
    """Merge explicit team assignment with creator defaults."""
    raw = dict(hiring_team or {})
    team: Dict[str, Optional[str]] = {
        "hiring_manager_id": _clean_id(raw.get("hiring_manager_id")),
        "technical_manager_id": _clean_id(raw.get("technical_manager_id")),
        "project_manager_id": _clean_id(raw.get("project_manager_id")),
        "recruiter_id": _clean_id(raw.get("recruiter_id")),
    }
    role = normalize_role(creator_role)
    if role == "hiring_manager" and not team["hiring_manager_id"]:
        team["hiring_manager_id"] = creator_id
    elif role == "technical_manager" and not team["technical_manager_id"]:
        team["technical_manager_id"] = creator_id
    elif role == "project_manager" and not team["project_manager_id"]:
        team["project_manager_id"] = creator_id
    elif role == "recruiter" and not team["recruiter_id"]:
        team["recruiter_id"] = creator_id
    if not team["recruiter_id"] and role in PRIVILEGED_GLOBAL_ROLES:
        team["recruiter_id"] = creator_id
    return team


def _clean_id(value: Any) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s or None


def job_team_access_filter(user_id: str, *, project_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """Mongo filter: jobs the user may access via team, legacy created_by, or PM project scope."""
    clauses: List[Dict[str, Any]] = [
        {"created_by": user_id},
        {"hiring_team.hiring_manager_id": user_id},
        {"hiring_team.technical_manager_id": user_id},
        {"hiring_team.project_manager_id": user_id},
        {"hiring_team.recruiter_id": user_id},
    ]
    if project_ids:
        clauses.append({"project_id": {"$in": project_ids}})
    return {"$or": clauses}


async def project_ids_for_manager(db, user_id: str) -> List[str]:
    """Projects where user is recorded as project_manager_id (PM auto-scope)."""
    if not user_id:
        return []
    rows = await db.projects.find({"project_manager_id": user_id}, {"_id": 0, "id": 1}).to_list(2000)
    return [r["id"] for r in rows if r.get("id")]


async def allowed_job_ids(db, user: Dict[str, Any]) -> Optional[List[str]]:
    """
    None = unrestricted (privileged roles).
    Otherwise list of job ids the user may access.
    """
    role = normalize_role(user.get("role"))
    user_id = user.get("id")
    if is_privileged_role(role) or role == "hr_viewer":
        return None
    if not user_id:
        return []
    project_ids = await project_ids_for_manager(db, user_id) if role == "project_manager" else None
    rows = await db.jobs.find(
        job_team_access_filter(user_id, project_ids=project_ids),
        {"_id": 0, "id": 1},
    ).to_list(5000)
    return [r["id"] for r in rows if r.get("id")]


async def allowed_candidate_ids(db, user: Dict[str, Any]) -> Optional[List[str]]:
    """None = all candidates; else ids linked via applications on accessible jobs."""
    job_ids = await allowed_job_ids(db, user)
    if job_ids is None:
        return None
    if not job_ids:
        return []
    seen: Set[str] = set()
    async for app in db.applications.find(
        {"job_id": {"$in": job_ids}},
        {"_id": 0, "candidate_id": 1},
    ):
        cid = app.get("candidate_id")
        if cid:
            seen.add(str(cid))
    return list(seen)


def merge_candidate_query_with_access(base: Dict[str, Any], candidate_ids: Optional[List[str]]) -> Dict[str, Any]:
    q = dict(base or {})
    if candidate_ids is None:
        return q
    clause = {"id": {"$in": candidate_ids or ["__none__"]}}
    if not q:
        return clause
    return {"$and": [q, clause]}


def has_permission(user: Dict[str, Any], permission: str, job: Optional[Dict[str, Any]] = None) -> bool:
    role = normalize_role(user.get("role"))
    if permission not in role_permissions(role):
        return False
    if is_privileged_role(role) or role == "hr_viewer":
        return True
    if job is None:
        return role in STAKEHOLDER_ROLES
    return user_on_job_team(user.get("id"), job)


def assert_permission(
    user: Dict[str, Any],
    permission: str,
    job: Optional[Dict[str, Any]] = None,
    *,
    detail: Optional[str] = None,
) -> None:
    if has_permission(user, permission, job):
        return
    raise HTTPException(
        status_code=403,
        detail=detail or f"Missing permission: {permission}",
    )


async def assert_job_access(
    db,
    user: Dict[str, Any],
    job_id: str,
    permission: str = PERM_JOB_READ,
) -> Dict[str, Any]:
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    assert_permission(user, permission, job)
    return job


async def assert_candidate_access(
    db,
    user: Dict[str, Any],
    candidate_id: str,
    *,
    permission: str = PERM_PIPELINE_READ,
) -> None:
    """Ensure stakeholder can see candidate via an application on an accessible job."""
    role = normalize_role(user.get("role"))
    if is_privileged_role(role) or role == "hr_viewer":
        return
    if role not in STAKEHOLDER_ROLES:
        return
    allowed = await allowed_candidate_ids(db, user)
    if allowed is not None and candidate_id not in allowed:
        raise HTTPException(status_code=403, detail="Candidate not in your hiring scope")


async def assert_application_access(
    db,
    user: Dict[str, Any],
    application_id: str,
    permission: str = PERM_PIPELINE_READ,
) -> tuple:
    app = await db.applications.find_one({"id": application_id}, {"_id": 0})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    job = await assert_job_access(db, user, app["job_id"], permission)
    return app, job


async def assert_interview_access(
    db,
    user: Dict[str, Any],
    interview_id: str,
    permission: str = PERM_PIPELINE_READ,
) -> tuple:
    interview = await db.interviews.find_one({"id": interview_id}, {"_id": 0})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    job = await assert_job_access(db, user, interview["job_id"], permission)
    return interview, job


async def hiring_team_recipient_ids(db, job: Dict[str, Any]) -> List[str]:
    """User ids to notify for pipeline events on this job."""
    team = get_hiring_team(job)
    ids: Set[str] = set()
    for uid in team.values():
        if uid:
            ids.add(str(uid))
    creator = job.get("created_by")
    if creator:
        ids.add(str(creator))
    out: List[str] = []
    for uid in ids:
        row = await db.users.find_one({"id": uid}, {"_id": 0, "id": 1})
        if row and row.get("id"):
            out.append(row["id"])
    return out


def assert_can_create_global_candidate(user: Dict[str, Any]) -> None:
    """TA operators only — stakeholders use referrals."""
    role = normalize_role(user.get("role"))
    if role in STAKEHOLDER_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Use Referrals to add candidates for your jobs, or ask TA to add to the talent pool",
        )
    if not is_privileged_role(role) and role != "hr_viewer":
        raise HTTPException(status_code=403, detail="Not allowed to create candidates")


def assert_can_request_offer_stage(user: Dict[str, Any], job: Dict[str, Any]) -> None:
    """Technical Manager requests HM approval to move a candidate to Offer."""
    role = normalize_role(user.get("role"))
    if role != "technical_manager":
        raise HTTPException(
            status_code=403,
            detail="Only Technical Manager can request offer-stage approval",
        )
    assert_permission(user, PERM_PIPELINE_ADVANCE, job)


def assert_stage_transition(user: Dict[str, Any], job: Dict[str, Any], target_stage: str) -> None:
    """Enforce pipeline stage moves by role."""
    stage = (target_stage or "").strip().upper()
    role = normalize_role(user.get("role"))
    assert_permission(user, PERM_PIPELINE_READ, job)

    if role == "project_manager":
        raise HTTPException(status_code=403, detail="Project Manager has read-only pipeline access")

    if stage in OFFER_STAGES:
        assert_permission(user, PERM_PIPELINE_OFFER, job, detail="Only Hiring Manager or TA can move to Offer/Hired")
        return

    if role == "technical_manager":
        if stage in OFFER_STAGES:
            raise HTTPException(status_code=403, detail="Technical Manager cannot move candidates to Offer")
        assert_permission(user, PERM_PIPELINE_ADVANCE, job)
        return

    assert_permission(user, PERM_PIPELINE_ADVANCE, job)


def merge_job_query_with_access(base: Dict[str, Any], job_ids: Optional[List[str]]) -> Dict[str, Any]:
    q = dict(base or {})
    if job_ids is None:
        return q
    clause = {"id": {"$in": job_ids or ["__none__"]}}
    if not q:
        return clause
    return {"$and": [q, clause]}
