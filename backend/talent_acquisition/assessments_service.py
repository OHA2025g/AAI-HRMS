"""Smart Hiring assessment service — CRUD, invites, scoring, publish."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from fastapi import HTTPException

from talent_acquisition.assessments_constants import (
    COL_ASSESSMENT_SUBMISSIONS,
    COL_ASSESSMENTS,
    DEFAULT_PASS_THRESHOLD,
    SUBMISSION_STATUSES,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _snapshot_from_doc(doc: Dict[str, Any], *, actor_id: Optional[str], action: str) -> Dict[str, Any]:
    questions = doc.get("questions") or []
    return {
        "version": int(doc.get("version") or 1),
        "saved_at": doc.get("updated_at") or _now_iso(),
        "actor_id": actor_id,
        "action": action,
        "title": doc.get("title", ""),
        "duration_minutes": doc.get("duration_minutes"),
        "total_marks": doc.get("total_marks"),
        "question_count": len(questions),
        "questions": questions,
        "rubric": doc.get("rubric"),
    }


async def _append_version_snapshot(
    db,
    doc: Dict[str, Any],
    *,
    actor_id: Optional[str] = None,
    action: str = "update",
) -> None:
    snap = _snapshot_from_doc(doc, actor_id=actor_id, action=action)
    history = list(doc.get("version_snapshots") or [])
    if history and history[-1].get("version") == snap["version"] and history[-1].get("action") == action:
        return
    history.append(snap)
    await db[COL_ASSESSMENTS].update_one(
        {"id": doc["id"]},
        {"$set": {"version_snapshots": history[-25:], "updated_at": _now_iso()}},
    )


async def list_assessment_versions(db, assessment_id: str) -> List[Dict[str, Any]]:
    doc = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0, "version_snapshots": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    rows = list(doc.get("version_snapshots") or [])
    return sorted(rows, key=lambda r: r.get("version") or 0, reverse=True)


def pass_threshold_from_rubric(rubric: Optional[Dict[str, Any]]) -> float:
    if not rubric:
        return float(DEFAULT_PASS_THRESHOLD)
    try:
        return float(rubric.get("pass_threshold", DEFAULT_PASS_THRESHOLD))
    except (TypeError, ValueError):
        return float(DEFAULT_PASS_THRESHOLD)


def auto_score_mcq(answer_key: Optional[str], response: str) -> Tuple[float, bool]:
    if not answer_key or answer_key.strip().lower() == "self-assessment":
        return 0.0, False
    ok = str(answer_key).strip().lower() == str(response or "").strip().lower()
    return (1.0 if ok else 0.0), ok


def score_submission_answers(
    assessment: Dict[str, Any], answers: List[Dict[str, Any]]
) -> Tuple[float, float, List[Dict[str, Any]], bool]:
    """Return (raw_score, score_pct, enriched_answers, all_auto_scored)."""
    questions = {q.get("id"): q for q in (assessment.get("questions") or []) if q.get("id")}
    total_marks = float(assessment.get("total_marks") or 0) or 1.0
    raw = 0.0
    enriched: List[Dict[str, Any]] = []
    all_auto = True

    for ans in answers:
        qid = ans.get("question_id")
        q = questions.get(qid) or {}
        qtype = (q.get("question_type") or "").upper()
        max_m = float(q.get("max_marks") or 10)
        response = ans.get("response", "")
        marks_awarded = ans.get("marks_awarded")
        auto_scored = ans.get("auto_scored", False)

        if marks_awarded is None and qtype == "MCQ":
            ratio, _ = auto_score_mcq(q.get("answer_key"), response)
            marks_awarded = round(ratio * max_m, 2)
            auto_scored = True
        elif marks_awarded is None:
            marks_awarded = 0.0
            auto_scored = False
            all_auto = False
        else:
            all_auto = all_auto and bool(auto_scored)

        raw += float(marks_awarded or 0)
        enriched.append(
            {
                **ans,
                "marks_awarded": marks_awarded,
                "auto_scored": auto_scored,
                "max_marks": int(max_m),
            }
        )

    score_pct = round(100.0 * raw / total_marks, 2)
    return raw, score_pct, enriched, all_auto


async def _job_ids_for_org_filter(
    db, org: Optional[Dict[str, str]]
) -> Optional[List[str]]:
    if not org or not any(org.values()):
        return None
    query: Dict[str, Any] = {}
    if org.get("pillar"):
        query["business_pillar"] = org["pillar"]
    if org.get("department"):
        query["business_department"] = org["department"]
    if org.get("sub_department"):
        query["business_sub_department"] = org["sub_department"]
    if org.get("project_id"):
        query["project_id"] = org["project_id"]
    if not query:
        return None
    jobs = await db.jobs.find(query, {"_id": 0, "id": 1}).to_list(5000)
    return [j["id"] for j in jobs if j.get("id")]


async def usage_for_job(db, job_id: str) -> Dict[str, int]:
    sent = await db.applications.count_documents({"job_id": job_id, "stage": "ASSESSMENT_SENT"})
    cleared = await db.applications.count_documents({"job_id": job_id, "stage": "ASSESSMENT_CLEARED"})
    invited = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents({"job_id": job_id})
    completed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {"job_id": job_id, "status": {"$in": ["SUBMITTED", "SCORED"]}}
    )
    passed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents({"job_id": job_id, "passed": True})
    return {
        "sent_count": sent,
        "cleared_count": cleared,
        "invited_count": invited,
        "completed_count": completed,
        "pass_count": passed,
    }


async def enrich_assessment(db, doc: Dict[str, Any], with_usage: bool = True) -> Dict[str, Any]:
    out = dict(doc)
    if doc.get("status"):
        out["status"] = doc["status"]
    elif doc.get("published_at"):
        out["status"] = "ACTIVE"
    else:
        # Legacy rows pre-status field — treat as active library items
        out["status"] = "ACTIVE"
    out.setdefault("is_primary", False)
    out.setdefault("version", 1)
    if with_usage and doc.get("job_id"):
        out["usage"] = await usage_for_job(db, doc["job_id"])
    return out


async def list_assessments(
    db,
    *,
    job_id: Optional[str] = None,
    assessment_type: Optional[str] = None,
    q: Optional[str] = None,
    status: Optional[str] = None,
    sort: str = "-created_at",
    limit: int = 100,
    offset: int = 0,
    org: Optional[Dict[str, str]] = None,
    usage_filter: Optional[str] = None,
    restrict_job_ids: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {}
    if job_id:
        query["job_id"] = job_id
    if restrict_job_ids is not None:
        if job_id and job_id not in restrict_job_ids:
            return []
        if not job_id:
            query["job_id"] = {"$in": restrict_job_ids or ["__none__"]}
    if assessment_type:
        query["assessment_type"] = assessment_type
    if status:
        query["status"] = status
    elif not usage_filter:
        query["status"] = {"$ne": "ARCHIVED"}
    if q:
        query["title"] = {"$regex": q, "$options": "i"}

    job_ids = await _job_ids_for_org_filter(db, org)
    if job_ids is not None:
        if job_id and job_id not in job_ids:
            return []
        if not job_id:
            query["job_id"] = {"$in": job_ids}

    sort_field = sort.lstrip("-")
    sort_dir = -1 if sort.startswith("-") else 1
    if sort_field not in ("created_at", "title", "duration_minutes", "usage"):
        sort_field, sort_dir = "created_at", -1

    rows = (
        await db[COL_ASSESSMENTS]
        .find(query, {"_id": 0})
        .sort(sort_field if sort_field != "usage" else "created_at", sort_dir if sort_field != "usage" else -1)
        .skip(max(0, offset))
        .limit(min(limit, 500))
        .to_list(limit)
    )

    enriched = [await enrich_assessment(db, r) for r in rows]

    if usage_filter == "missing":
        return []

    if usage_filter == "in_use":
        enriched = [a for a in enriched if (a.get("usage") or {}).get("invited_count", 0) > 0]
    elif usage_filter == "unused":
        enriched = [a for a in enriched if (a.get("usage") or {}).get("invited_count", 0) == 0]
    elif usage_filter == "stale":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        enriched = [
            a
            for a in enriched
            if (a.get("usage") or {}).get("invited_count", 0) == 0
            and (a.get("created_at") or "") < cutoff
            and a.get("status") != "ARCHIVED"
        ]

    if sort_field == "usage":
        enriched.sort(
            key=lambda a: (a.get("usage") or {}).get("invited_count", 0),
            reverse=(sort_dir == -1),
        )

    return enriched


async def create_assessment_doc(
    db,
    *,
    job_id: str,
    assessment_type: str,
    title: str,
    duration_minutes: int,
    questions: List[Dict[str, Any]],
    rubric: Optional[Dict[str, Any]],
    created_by: str,
    publish: bool = False,
) -> Dict[str, Any]:
    now = _now_iso()
    for q in questions:
        if not q.get("id"):
            q["id"] = str(uuid.uuid4())
    total_marks = sum(int(q.get("max_marks") or 10) for q in questions)
    doc = {
        "id": str(uuid.uuid4()),
        "job_id": job_id,
        "assessment_type": assessment_type,
        "title": title,
        "duration_minutes": duration_minutes,
        "total_marks": total_marks,
        "questions": questions,
        "rubric": rubric or {"pass_threshold": DEFAULT_PASS_THRESHOLD, "grading_guide": ""},
        "status": "ACTIVE" if publish else "DRAFT",
        "is_primary": False,
        "published_at": now if publish else None,
        "version": 1,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_ASSESSMENTS].insert_one(doc)
    await _append_version_snapshot(db, doc, actor_id=created_by, action="create")
    return await enrich_assessment(db, doc)


async def publish_assessment(db, assessment_id: str, *, actor_id: Optional[str] = None) -> Dict[str, Any]:
    doc = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    now = _now_iso()
    await db[COL_ASSESSMENTS].update_one(
        {"id": assessment_id},
        {"$set": {"status": "ACTIVE", "published_at": now, "updated_at": now}},
    )
    doc.update({"status": "ACTIVE", "published_at": now, "updated_at": now})
    await _append_version_snapshot(db, {**doc, "status": "ACTIVE", "published_at": now, "updated_at": now}, actor_id=actor_id, action="publish")
    from talent_acquisition.assessment_audit import log_assessment_audit

    await log_assessment_audit(db, action="publish", actor_id=actor_id, assessment_id=assessment_id)
    return await enrich_assessment(db, doc)


async def archive_assessment(db, assessment_id: str, *, actor_id: Optional[str] = None) -> Dict[str, Any]:
    doc = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    now = _now_iso()
    await db[COL_ASSESSMENTS].update_one(
        {"id": assessment_id},
        {"$set": {"status": "ARCHIVED", "archived_at": now, "updated_at": now}},
    )
    doc.update({"status": "ARCHIVED", "archived_at": now, "updated_at": now})
    from talent_acquisition.assessment_audit import log_assessment_audit

    await log_assessment_audit(db, action="archive", actor_id=actor_id, assessment_id=assessment_id)
    return await enrich_assessment(db, doc)


async def update_assessment(
    db, assessment_id: str, payload: Dict[str, Any], *, actor_id: Optional[str] = None
) -> Dict[str, Any]:
    doc = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    updates = {k: v for k, v in payload.items() if v is not None}
    version_bumped = False
    if "questions" in updates:
        await _append_version_snapshot(db, doc, actor_id=actor_id, action="questions_updated")
        for q in updates["questions"]:
            if not q.get("id"):
                q["id"] = str(uuid.uuid4())
        updates["total_marks"] = sum(int(q.get("max_marks") or 10) for q in updates["questions"])
        updates["version"] = int(doc.get("version") or 1) + 1
        version_bumped = True
    updates["updated_at"] = _now_iso()
    await db[COL_ASSESSMENTS].update_one({"id": assessment_id}, {"$set": updates})
    merged = {**doc, **updates}
    if version_bumped or {k for k in updates if k != "updated_at"}:
        from talent_acquisition.assessment_audit import log_assessment_audit

        await log_assessment_audit(
            db,
            action="update",
            actor_id=actor_id,
            assessment_id=assessment_id,
            detail={
                "version": merged.get("version"),
                "fields": [k for k in updates.keys() if k != "updated_at"],
            },
        )
    return await enrich_assessment(db, merged)


async def duplicate_assessment(db, assessment_id: str, created_by: str) -> Dict[str, Any]:
    doc = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    questions = []
    for q in doc.get("questions") or []:
        qc = dict(q)
        qc["id"] = str(uuid.uuid4())
        questions.append(qc)
    return await create_assessment_doc(
        db,
        job_id=doc["job_id"],
        assessment_type=doc.get("assessment_type", "CORE_SKILL"),
        title=f"{doc.get('title', 'Assessment')} (Copy)",
        duration_minutes=int(doc.get("duration_minutes") or 60),
        questions=questions,
        rubric=doc.get("rubric"),
        created_by=created_by,
        publish=False,
    )


async def invite_candidate(
    db,
    assessment_id: str,
    *,
    application_id: Optional[str],
    candidate_id: Optional[str],
    job_id: Optional[str],
    invited_by: str,
    move_to_assessment_sent: bool,
    expires_in_hours: int,
    send_candidate_email: bool = True,
    create_notification: Optional[Callable[..., Awaitable[Any]]] = None,
    notify_stage_change: Optional[Callable[..., Awaitable[Any]]] = None,
) -> Dict[str, Any]:
    assessment = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    app = None
    if application_id:
        app = await db.applications.find_one({"id": application_id}, {"_id": 0})
    elif candidate_id and job_id:
        app = await db.applications.find_one(
            {"candidate_id": candidate_id, "job_id": job_id}, {"_id": 0}
        )

    if not app:
        raise HTTPException(status_code=404, detail="Application not found for invite")

    candidate_id = app["candidate_id"]
    job_id = app["job_id"]

    existing = await db[COL_ASSESSMENT_SUBMISSIONS].find_one(
        {"assessment_id": assessment_id, "candidate_id": candidate_id, "status": {"$nin": ["CANCELLED", "EXPIRED"]}},
        {"_id": 0},
    )
    if existing:
        if send_candidate_email:
            assessment = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
            candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
            job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
            from talent_acquisition.assessment_email import send_assessment_invite_email

            token = existing.get("access_token")
            if token:
                email_result = await send_assessment_invite_email(
                    db,
                    submission_id=existing["id"],
                    candidate_email=(candidate or {}).get("email"),
                    candidate_name=(candidate or {}).get("full_name", "Candidate"),
                    job_title=(job or {}).get("title", "Role"),
                    assessment_title=(assessment or {}).get("title", "Assessment"),
                    take_path=f"/assessment/take/{token}",
                )
                await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
                    {"id": existing["id"]},
                    {
                        "$set": {
                            "candidate_email_sent": bool(email_result.get("sent")),
                            "candidate_email_queued": bool(email_result.get("queued")),
                            "candidate_email_failed": bool(
                                email_result.get("error") and not email_result.get("sent")
                            ),
                            "updated_at": _now_iso(),
                        }
                    },
                )
        if create_notification:
            candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
            job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
            cname = (candidate or {}).get("full_name", "Candidate")
            jtitle = (job or {}).get("title", "Role")
            await create_notification(
                recipient_id=invited_by,
                notification_type="ASSESSMENT_INVITE",
                title=f"Assessment re-sent: {cname}",
                message=f"Invite link refreshed for '{assessment.get('title')}' ({jtitle}).",
                metadata={
                    "submission_id": existing["id"],
                    "assessment_id": assessment_id,
                    "application_id": app.get("id"),
                    "candidate_id": candidate_id,
                },
            )
        from talent_acquisition.assessment_audit import log_assessment_audit

        await log_assessment_audit(
            db,
            action="reinvite",
            actor_id=invited_by,
            assessment_id=assessment_id,
            submission_id=existing["id"],
        )
        return await enrich_submission(db, existing)

    now = _now_iso()
    expires = (datetime.now(timezone.utc) + timedelta(hours=max(1, expires_in_hours))).isoformat()
    token = secrets.token_urlsafe(32)
    sub_id = str(uuid.uuid4())

    sub = {
        "id": sub_id,
        "assessment_id": assessment_id,
        "job_id": job_id,
        "application_id": app.get("id"),
        "candidate_id": candidate_id,
        "status": "INVITED",
        "invited_by": invited_by,
        "invited_at": now,
        "started_at": None,
        "completed_at": None,
        "expires_at": expires,
        "score": None,
        "score_pct": None,
        "passed": None,
        "answers": [],
        "graded_by": None,
        "graded_at": None,
        "notes": None,
        "access_token": token,
        "created_at": now,
        "updated_at": now,
    }
    await db[COL_ASSESSMENT_SUBMISSIONS].insert_one(sub)

    if move_to_assessment_sent and app.get("stage") != "ASSESSMENT_SENT":
        old_stage = app.get("stage")
        await db.applications.update_one(
            {"id": app["id"]},
            {"$set": {"stage": "ASSESSMENT_SENT", "updated_at": now}},
        )
        await db.application_stage_history.insert_one(
            {
                "id": str(uuid.uuid4()),
                "application_id": app["id"],
                "from_stage": old_stage,
                "to_stage": "ASSESSMENT_SENT",
                "reason": "Assessment invited",
                "changed_by": invited_by,
                "changed_at": now,
            }
        )

    candidate = await db.candidates.find_one({"id": candidate_id}, {"_id": 0})
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    cname = (candidate or {}).get("full_name", "Candidate")
    cemail = (candidate or {}).get("email")
    jtitle = (job or {}).get("title", "Role")

    email_result: Dict[str, Any] = {}
    if send_candidate_email:
        from talent_acquisition.assessment_email import send_assessment_invite_email

        email_result = await send_assessment_invite_email(
            db,
            submission_id=sub_id,
            candidate_email=cemail,
            candidate_name=cname,
            job_title=jtitle,
            assessment_title=assessment.get("title", "Assessment"),
            take_path=f"/assessment/take/{token}",
        )
        await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
            {"id": sub_id},
            {
                "$set": {
                    "candidate_email_sent": bool(email_result.get("sent")),
                    "candidate_email_queued": bool(email_result.get("queued")),
                    "candidate_email_failed": bool(email_result.get("error") and not email_result.get("sent")),
                    "updated_at": _now_iso(),
                }
            },
        )
        sub["candidate_email_sent"] = bool(email_result.get("sent"))
        sub["candidate_email_queued"] = bool(email_result.get("queued"))

    if create_notification:
        recruiters = await db.users.find({"role": {"$in": ["recruiter", "admin", "hr_admin"]}}, {"_id": 0}).to_list(100)
        for rec in recruiters:
            await create_notification(
                recipient_id=rec["id"],
                notification_type="ASSESSMENT_INVITE",
                title=f"Assessment invited: {cname}",
                message=f"{cname} was invited to take '{assessment.get('title')}' for {jtitle}.",
                metadata={
                    "submission_id": sub_id,
                    "assessment_id": assessment_id,
                    "application_id": app.get("id"),
                    "candidate_id": candidate_id,
                    "access_token": token,
                },
            )

    from talent_acquisition.assessment_audit import log_assessment_audit

    await log_assessment_audit(
        db,
        action="invite",
        actor_id=invited_by,
        assessment_id=assessment_id,
        submission_id=sub_id,
        detail={"candidate_id": candidate_id, "job_id": job_id},
    )

    return await enrich_submission(db, sub)


async def enrich_submission(db, sub: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(sub)
    out.pop("access_token", None)
    token = sub.get("access_token")
    if token:
        out["take_url"] = f"/assessment/take/{token}"
    assessment = await db[COL_ASSESSMENTS].find_one({"id": sub.get("assessment_id")}, {"_id": 0, "title": 1})
    candidate = await db.candidates.find_one({"id": sub.get("candidate_id")}, {"_id": 0, "full_name": 1})
    job = await db.jobs.find_one({"id": sub.get("job_id")}, {"_id": 0, "title": 1})
    out["assessment_title"] = (assessment or {}).get("title")
    out["candidate_name"] = (candidate or {}).get("full_name")
    out["candidate_email"] = (candidate or {}).get("email")
    out["job_title"] = (job or {}).get("title")
    out.setdefault("candidate_email_sent", sub.get("candidate_email_sent"))
    out.setdefault("candidate_email_queued", sub.get("candidate_email_queued"))
    if out.get("candidate_email_sent"):
        out["email_status"] = "sent"
    elif out.get("candidate_email_queued"):
        out["email_status"] = "queued"
    elif sub.get("candidate_email_failed"):
        out["email_status"] = "failed"
    else:
        out["email_status"] = "none"
    out.setdefault("reminder_sent_at", sub.get("reminder_sent_at"))
    return out


async def list_submissions(
    db,
    *,
    assessment_id: Optional[str] = None,
    job_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    status: Optional[str] = None,
    org: Optional[Dict[str, str]] = None,
    window_days: Optional[int] = None,
    score_min_pct: Optional[float] = None,
    score_max_pct: Optional[float] = None,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    query: Dict[str, Any] = {}
    if assessment_id:
        query["assessment_id"] = assessment_id
    if job_id:
        query["job_id"] = job_id
    elif org and any(org.values()):
        job_ids = await _job_ids_for_org_filter(db, org)
        if not job_ids:
            return []
        query["job_id"] = {"$in": job_ids}
    if candidate_id:
        query["candidate_id"] = candidate_id
    if status:
        query["status"] = status
    if window_days is not None:
        wd = max(1, min(int(window_days), 365))
        cutoff = (datetime.now(timezone.utc) - timedelta(days=wd)).isoformat()
        query["invited_at"] = {"$gte": cutoff}
    if score_min_pct is not None or score_max_pct is not None:
        query["status"] = "SCORED"
        score_q: Dict[str, Any] = {}
        if score_min_pct is not None:
            score_q["$gte"] = float(score_min_pct)
        if score_max_pct is not None:
            score_q["$lte"] = float(score_max_pct)
        query["score_pct"] = score_q
    rows = (
        await db[COL_ASSESSMENT_SUBMISSIONS]
        .find(query, {"_id": 0})
        .sort("invited_at", -1)
        .limit(min(limit, 500))
        .to_list(limit)
    )
    return [await enrich_submission(db, r) for r in rows]


async def get_submission_by_token(db, token: str) -> Dict[str, Any]:
    sub = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"access_token": token}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Assessment link not found")
    if sub.get("expires_at"):
        exp = datetime.fromisoformat(sub["expires_at"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > exp:
            await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
                {"id": sub["id"]}, {"$set": {"status": "EXPIRED", "updated_at": _now_iso()}}
            )
            raise HTTPException(status_code=410, detail="Assessment link expired")
    return sub


async def cancel_submission(
    db,
    submission_id: str,
    *,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    sub = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    status = sub.get("status")
    if status in ("CANCELLED", "EXPIRED", "SCORED"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel submission in status {status}")
    now = _now_iso()
    await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
        {"id": submission_id},
        {"$set": {"status": "CANCELLED", "updated_at": now}},
    )
    from talent_acquisition.assessment_audit import log_assessment_audit

    await log_assessment_audit(
        db,
        action="cancel_submission",
        actor_id=actor_id,
        assessment_id=sub.get("assessment_id"),
        submission_id=submission_id,
        detail={"prior_status": status},
    )
    sub["status"] = "CANCELLED"
    sub["updated_at"] = now
    return await enrich_submission(db, sub)


async def start_submission(db, submission_id: str) -> Dict[str, Any]:
    sub = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.get("status") not in ("INVITED", "IN_PROGRESS"):
        raise HTTPException(status_code=400, detail=f"Cannot start submission in status {sub.get('status')}")
    now = _now_iso()
    await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
        {"id": submission_id},
        {"$set": {"status": "IN_PROGRESS", "started_at": sub.get("started_at") or now, "updated_at": now}},
    )
    sub["status"] = "IN_PROGRESS"
    sub["started_at"] = sub.get("started_at") or now
    return await enrich_submission(db, sub)


async def save_take_draft(
    db,
    token: str,
    answers: List[Dict[str, Any]],
) -> Dict[str, Any]:
    sub = await get_submission_by_token(db, token)
    if sub.get("status") not in ("INVITED", "IN_PROGRESS"):
        raise HTTPException(status_code=400, detail="Cannot save draft for this submission")
    now = _now_iso()
    normalized = [{"question_id": a.get("question_id"), "response": a.get("response", "")} for a in answers]
    await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
        {"id": sub["id"]},
        {
            "$set": {
                "draft_answers": normalized,
                "draft_saved_at": now,
                "status": "IN_PROGRESS",
                "started_at": sub.get("started_at") or now,
                "updated_at": now,
            }
        },
    )
    sub.update(
        {
            "draft_answers": normalized,
            "draft_saved_at": now,
            "status": "IN_PROGRESS",
            "started_at": sub.get("started_at") or now,
            "updated_at": now,
        }
    )
    return sub


async def submit_and_score(
    db,
    submission_id: str,
    answers: List[Dict[str, Any]],
    *,
    graded_by: Optional[str] = None,
    manual_score: Optional[float] = None,
    notes: Optional[str] = None,
    passed_override: Optional[bool] = None,
    override_reason: Optional[str] = None,
    auto_clear_pipeline: bool = True,
) -> Dict[str, Any]:
    sub = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.get("status") in ("CANCELLED", "EXPIRED"):
        raise HTTPException(status_code=400, detail="Submission is not active")

    assessment = await db[COL_ASSESSMENTS].find_one({"id": sub["assessment_id"]}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    now = _now_iso()
    raw, score_pct, enriched, all_auto = score_submission_answers(assessment, answers)
    if manual_score is not None:
        raw = float(manual_score)
        total = float(assessment.get("total_marks") or 1)
        score_pct = round(100.0 * raw / total, 2)

    pending_manual = (
        manual_score is None
        and passed_override is None
        and not all_auto
        and (graded_by is None or graded_by == "candidate")
    )

    if pending_manual:
        await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
            {"id": submission_id},
            {
                "$set": {
                    "status": "SUBMITTED",
                    "answers": enriched,
                    "score": None,
                    "score_pct": None,
                    "passed": None,
                    "completed_at": now,
                    "graded_by": None,
                    "graded_at": None,
                    "notes": notes,
                    "override_reason": None,
                    "updated_at": now,
                }
            },
        )
        sub.update(
            {
                "status": "SUBMITTED",
                "answers": enriched,
                "score": None,
                "score_pct": None,
                "passed": None,
                "completed_at": now,
                "graded_by": None,
                "graded_at": None,
                "notes": notes,
                "override_reason": None,
                "updated_at": now,
            }
        )
        from talent_acquisition.assessment_audit import log_assessment_audit

        await log_assessment_audit(
            db,
            action="submit_pending_grade",
            actor_id=graded_by if graded_by != "candidate" else None,
            assessment_id=sub.get("assessment_id"),
            submission_id=submission_id,
            detail={"auto_scored_only": True},
        )
        return await enrich_submission(db, sub)

    threshold = pass_threshold_from_rubric(assessment.get("rubric"))
    passed = passed_override if passed_override is not None else score_pct >= threshold
    combined_notes = notes
    if override_reason:
        prefix = f"Override: {override_reason}"
        combined_notes = f"{prefix}. {notes}" if notes else prefix

    await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
        {"id": submission_id},
        {
            "$set": {
                "status": "SCORED",
                "answers": enriched,
                "score": raw,
                "score_pct": score_pct,
                "passed": passed,
                "completed_at": now,
                "graded_by": graded_by,
                "graded_at": now,
                "notes": combined_notes,
                "override_reason": override_reason,
                "updated_at": now,
            }
        },
    )
    sub.update(
        {
            "status": "SCORED",
            "answers": enriched,
            "score": raw,
            "score_pct": score_pct,
            "passed": passed,
            "completed_at": now,
            "graded_by": graded_by,
            "graded_at": now,
            "notes": combined_notes,
            "override_reason": override_reason,
            "updated_at": now,
        }
    )

    if passed and auto_clear_pipeline and sub.get("application_id"):
        app = await db.applications.find_one({"id": sub["application_id"]}, {"_id": 0})
        if app and app.get("stage") == "ASSESSMENT_SENT":
            await db.applications.update_one(
                {"id": app["id"]},
                {"$set": {"stage": "ASSESSMENT_CLEARED", "updated_at": now}},
            )
            await db.application_stage_history.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "application_id": app["id"],
                    "from_stage": "ASSESSMENT_SENT",
                    "to_stage": "ASSESSMENT_CLEARED",
                    "reason": f"Auto-cleared: assessment score {score_pct}%",
                    "changed_by": graded_by or "system",
                    "changed_at": now,
                }
            )

    from talent_acquisition.assessment_audit import log_assessment_audit

    await log_assessment_audit(
        db,
        action="score",
        actor_id=graded_by if graded_by and graded_by != "candidate" else None,
        assessment_id=sub.get("assessment_id"),
        submission_id=submission_id,
        detail={"score_pct": score_pct, "passed": passed, "override_reason": override_reason},
    )

    return await enrich_submission(db, sub)


async def ai_suggest_grades(
    db,
    submission_id: str,
    llm_chat: Callable[..., Awaitable[str]],
) -> List[Dict[str, Any]]:
    import json
    import re

    sub = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    assessment = await db[COL_ASSESSMENTS].find_one({"id": sub["assessment_id"]}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    qmap = {q["id"]: q for q in (assessment.get("questions") or []) if q.get("id")}
    suggestions = []
    for ans in sub.get("answers") or []:
        q = qmap.get(ans.get("question_id"), {})
        qtype = (q.get("question_type") or "").upper()
        if qtype == "MCQ" or ans.get("auto_scored"):
            continue
        prompt = f"""Grade this assessment response. Return JSON only:
{{"marks_awarded": number, "rationale": "brief reason"}}

Question: {q.get('question_text')}
Max marks: {q.get('max_marks', 10)}
Answer key / rubric: {q.get('answer_key') or assessment.get('rubric', {}).get('grading_guide', '')}
Candidate response: {ans.get('response', '')}
"""
        try:
            raw = await llm_chat("You are an expert grader. Respond with valid JSON only.", prompt)
            clean = raw.strip()
            if clean.startswith("```"):
                clean = re.sub(r"^```(?:json)?\n?", "", clean)
                clean = re.sub(r"\n?```$", "", clean)
            parsed = json.loads(clean)
            marks = float(parsed.get("marks_awarded", 0))
            max_m = float(q.get("max_marks") or 10)
            suggestions.append(
                {
                    "question_id": ans.get("question_id"),
                    "marks_awarded": min(max(marks, 0), max_m),
                    "rationale": parsed.get("rationale", ""),
                }
            )
        except Exception:
            suggestions.append(
                {
                    "question_id": ans.get("question_id"),
                    "marks_awarded": None,
                    "rationale": "AI grading unavailable",
                }
            )
    return suggestions


async def suggest_pass_threshold(
    db,
    assessment_id: str,
    llm_chat: Optional[Callable[..., Awaitable[str]]] = None,
) -> Dict[str, Any]:
    """Suggest a rubric pass threshold from scored submissions or role context."""
    import json
    import re

    assessment = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    current = pass_threshold_from_rubric(assessment.get("rubric"))
    job = await db.jobs.find_one({"id": assessment.get("job_id")}, {"_id": 0})

    subs = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        {"assessment_id": assessment_id, "status": "SCORED", "score_pct": {"$ne": None}},
        {"_id": 0, "score_pct": 1},
    ).to_list(5000)
    scores = [float(s["score_pct"]) for s in subs if s.get("score_pct") is not None]

    if len(scores) >= 3:
        sorted_scores = sorted(scores)
        idx = max(0, int(0.3 * (len(sorted_scores) - 1)))
        suggested = int(round(sorted_scores[idx]))
        suggested = max(0, min(100, suggested))
        return {
            "current_pass_threshold_pct": current,
            "suggested_pass_threshold_pct": float(suggested),
            "method": "score_distribution",
            "rationale": (
                f"Calibrated to historical scores ({len(scores)} submissions): "
                f"threshold at ~30th percentile targets ~70% pass rate."
            ),
            "sample_size": len(scores),
        }

    if llm_chat and job:
        prompt = f"""Suggest a pass threshold percentage (0-100) for this hiring assessment.
Return JSON only: {{"pass_threshold": number, "rationale": "one sentence"}}

Job title: {job.get('title', 'Role')}
Experience level: {job.get('experience_level') or job.get('seniority') or 'not specified'}
Assessment type: {assessment.get('assessment_type', 'CORE_SKILL')}
Question count: {len(assessment.get('questions') or [])}
Total marks: {assessment.get('total_marks') or 'unknown'}
Current threshold: {current}%
"""
        try:
            raw = await llm_chat("You are an expert talent assessment designer. Respond with valid JSON only.", prompt)
            clean = raw.strip()
            if clean.startswith("```"):
                clean = re.sub(r"^```(?:json)?\n?", "", clean)
                clean = re.sub(r"\n?```$", "", clean)
            parsed = json.loads(clean)
            suggested = float(parsed.get("pass_threshold", current))
            suggested = max(0.0, min(100.0, suggested))
            return {
                "current_pass_threshold_pct": current,
                "suggested_pass_threshold_pct": round(suggested, 1),
                "method": "llm",
                "rationale": str(parsed.get("rationale") or "AI suggestion based on role and assessment design."),
                "sample_size": 0,
            }
        except Exception:
            pass

    return {
        "current_pass_threshold_pct": current,
        "suggested_pass_threshold_pct": current,
        "method": "default",
        "rationale": "Not enough scored submissions for calibration; keeping the current threshold.",
        "sample_size": len(scores),
    }


async def regenerate_assessment_question(
    db,
    assessment_id: str,
    question_id: str,
    llm_chat: Callable[..., Awaitable[str]],
    generate_with_ai: Callable[..., Awaitable[Dict[str, Any]]],
) -> Dict[str, Any]:
    assessment = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    job = await db.jobs.find_one({"id": assessment.get("job_id")}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    generated = await generate_with_ai(job, assessment.get("assessment_type", "CORE_SKILL"))
    candidates = generated.get("questions") or []
    if not candidates:
        raise HTTPException(status_code=502, detail="Could not generate replacement question")

    replacement = dict(candidates[0])
    replacement["id"] = question_id
    questions = []
    replaced = False
    for q in assessment.get("questions") or []:
        if q.get("id") == question_id:
            questions.append(replacement)
            replaced = True
        else:
            questions.append(q)
    if not replaced:
        raise HTTPException(status_code=404, detail="Question not found")

    return await update_assessment(db, assessment_id, {"questions": questions})


async def item_analysis(db, assessment_id: str) -> List[Dict[str, Any]]:
    assessment = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    subs = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        {"assessment_id": assessment_id, "status": "SCORED"},
        {"_id": 0, "answers": 1},
    ).to_list(500)

    qmap = {q["id"]: q for q in (assessment.get("questions") or []) if q.get("id")}
    stats: Dict[str, Dict[str, Any]] = {}

    for sub in subs:
        for ans in sub.get("answers") or []:
            qid = ans.get("question_id")
            if not qid:
                continue
            st = stats.setdefault(qid, {"marks": [], "correct": 0, "attempts": 0})
            st["attempts"] += 1
            marks = float(ans.get("marks_awarded") or 0)
            max_m = float(ans.get("max_marks") or qmap.get(qid, {}).get("max_marks") or 10)
            st["marks"].append(marks)
            if max_m > 0 and marks >= max_m * 0.99:
                st["correct"] += 1

    rows = []
    for qid, q in qmap.items():
        st = stats.get(qid, {"marks": [], "correct": 0, "attempts": 0})
        attempts = st["attempts"]
        avg_m = round(sum(st["marks"]) / len(st["marks"]), 2) if st["marks"] else None
        max_m = int(q.get("max_marks") or 10)
        pct = round(100.0 * st["correct"] / attempts, 2) if attempts else None
        flag = None
        if pct is not None:
            if pct < 20:
                flag = "too_hard"
            elif pct > 95:
                flag = "too_easy"
        rows.append(
            {
                "question_id": qid,
                "question_text": q.get("question_text", ""),
                "question_type": q.get("question_type", ""),
                "skill_tested": q.get("skill_tested"),
                "attempts": attempts,
                "avg_marks": avg_m,
                "max_marks": max_m,
                "pct_correct": pct,
                "flag": flag,
            }
        )
    rows.sort(key=lambda r: (r["pct_correct"] is None, r["pct_correct"] or 0))
    return rows


async def resend_submission_invite_email(
    db,
    submission_id: str,
    *,
    actor_id: Optional[str] = None,
    create_notification: Optional[Callable[..., Awaitable[Any]]] = None,
) -> Dict[str, Any]:
    sub = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": submission_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.get("status") in ("CANCELLED", "EXPIRED"):
        raise HTTPException(status_code=400, detail="Cannot resend email for inactive submission")

    token = sub.get("access_token")
    if not token:
        raise HTTPException(status_code=400, detail="Submission has no take link")

    assessment = await db[COL_ASSESSMENTS].find_one({"id": sub["assessment_id"]}, {"_id": 0})
    candidate = await db.candidates.find_one({"id": sub["candidate_id"]}, {"_id": 0})
    job = await db.jobs.find_one({"id": sub["job_id"]}, {"_id": 0})

    from talent_acquisition.assessment_email import send_assessment_invite_email

    email_result = await send_assessment_invite_email(
        db,
        submission_id=submission_id,
        candidate_email=(candidate or {}).get("email"),
        candidate_name=(candidate or {}).get("full_name", "Candidate"),
        job_title=(job or {}).get("title", "Role"),
        assessment_title=(assessment or {}).get("title", "Assessment"),
        take_path=f"/assessment/take/{token}",
    )
    now = _now_iso()
    await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
        {"id": submission_id},
        {
            "$set": {
                "candidate_email_sent": bool(email_result.get("sent")),
                "candidate_email_queued": bool(email_result.get("queued")),
                "candidate_email_failed": bool(email_result.get("error") and not email_result.get("sent")),
                "updated_at": now,
            }
        },
    )
    from talent_acquisition.assessment_audit import log_assessment_audit

    await log_assessment_audit(
        db,
        action="resend_email",
        actor_id=actor_id,
        assessment_id=sub.get("assessment_id"),
        submission_id=submission_id,
        detail={
            "sent": bool(email_result.get("sent")),
            "queued": bool(email_result.get("queued")),
            "error": email_result.get("error"),
        },
    )
    invited_by = sub.get("invited_by") or actor_id
    if create_notification and invited_by:
        cname = (candidate or {}).get("full_name", "Candidate")
        jtitle = (job or {}).get("title", "Role")
        atitle = (assessment or {}).get("title", "Assessment")
        await create_notification(
            recipient_id=invited_by,
            notification_type="ASSESSMENT_INVITE",
            title=f"Assessment email resent: {cname}",
            message=f"Invite email resent for '{atitle}' ({jtitle}).",
            metadata={
                "submission_id": submission_id,
                "assessment_id": sub.get("assessment_id"),
                "candidate_id": sub.get("candidate_id"),
                "resent_by": actor_id,
            },
        )
    sub.update(
        {
            "candidate_email_sent": bool(email_result.get("sent")),
            "candidate_email_queued": bool(email_result.get("queued")),
            "updated_at": now,
        }
    )
    return await enrich_submission(db, sub)


async def set_primary_assessment(db, assessment_id: str, *, actor_id: Optional[str] = None) -> Dict[str, Any]:
    doc = await db[COL_ASSESSMENTS].find_one({"id": assessment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Assessment not found")
    job_id = doc.get("job_id")
    now = _now_iso()
    await db[COL_ASSESSMENTS].update_many({"job_id": job_id}, {"$set": {"is_primary": False, "updated_at": now}})
    await db[COL_ASSESSMENTS].update_one(
        {"id": assessment_id},
        {"$set": {"is_primary": True, "updated_at": now}},
    )
    from talent_acquisition.assessment_audit import log_assessment_audit

    await log_assessment_audit(
        db,
        action="set_primary",
        actor_id=actor_id,
        assessment_id=assessment_id,
        detail={"job_id": job_id},
    )
    doc["is_primary"] = True
    return await enrich_assessment(db, doc)


async def dispatch_assessment_reminders(
    db,
    *,
    hours_since_invite: int = 48,
    send_email: bool = True,
    create_notification: Optional[Callable[..., Awaitable[Any]]] = None,
) -> Dict[str, Any]:
    """Send reminders for invited/in-progress submissions not completed after N hours."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=max(1, hours_since_invite))).isoformat()
    rows = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        {
            "status": {"$in": ["INVITED", "IN_PROGRESS"]},
            "reminder_sent_at": None,
            "invited_at": {"$lte": cutoff},
        },
        {"_id": 0},
    ).to_list(300)

    sent = skipped = 0
    now = _now_iso()
    for sub in rows:
        sub_id = sub["id"]
        if send_email:
            assessment = await db[COL_ASSESSMENTS].find_one({"id": sub["assessment_id"]}, {"_id": 0})
            candidate = await db.candidates.find_one({"id": sub["candidate_id"]}, {"_id": 0})
            job = await db.jobs.find_one({"id": sub["job_id"]}, {"_id": 0})
            token = sub.get("access_token")
            if token:
                from talent_acquisition.assessment_email import send_assessment_reminder_email

                await send_assessment_reminder_email(
                    db,
                    submission_id=sub_id,
                    candidate_email=(candidate or {}).get("email"),
                    candidate_name=(candidate or {}).get("full_name", "Candidate"),
                    job_title=(job or {}).get("title", "Role"),
                    assessment_title=(assessment or {}).get("title", "Assessment"),
                    take_path=f"/assessment/take/{token}",
                )
        invited_by = sub.get("invited_by")
        if create_notification and invited_by:
            candidate = await db.candidates.find_one({"id": sub["candidate_id"]}, {"_id": 0})
            await create_notification(
                recipient_id=invited_by,
                notification_type="ASSESSMENT_REMINDER",
                title=f"Assessment pending: {(candidate or {}).get('full_name', 'Candidate')}",
                message="Candidate has not completed the assessment within the reminder window.",
                metadata={"submission_id": sub_id, "assessment_id": sub.get("assessment_id")},
            )
        await db[COL_ASSESSMENT_SUBMISSIONS].update_one(
            {"id": sub_id},
            {"$set": {"reminder_sent_at": now, "updated_at": now}},
        )
        from talent_acquisition.assessment_audit import log_assessment_audit

        await log_assessment_audit(
            db,
            action="reminder_sent",
            actor_id=None,
            assessment_id=sub.get("assessment_id"),
            submission_id=sub_id,
        )
        sent += 1

    return {"dispatched": sent, "skipped": skipped, "cutoff": cutoff}
