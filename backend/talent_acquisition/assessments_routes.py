"""FastAPI router for Smart Hiring assessments."""

from __future__ import annotations

from typing import Any, Awaitable, Callable, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from talent_acquisition.assessment_feature_flags import get_assessment_feature_flags, is_assessment_feature_enabled
from talent_acquisition.assessments_analytics import (
    build_analytics_summary,
    build_coverage_matrix,
    build_funnel,
    build_trends,
    calibration_insights,
    fit_vs_score,
    outcome_correlation,
    pass_rate_by_type,
    score_distribution,
    skill_breakdown,
    time_vs_score,
)
from talent_acquisition.assessments_schemas import (
    AssessmentAuditEntry,
    AssessmentCreate,
    AssessmentFeatureFlags,
    AssessmentInviteRequest,
    AssessmentOpsStatus,
    AssessmentResponse,
    AssessmentSubmissionResponse,
    AssessmentUpdate,
    AssessmentVersionSnapshot,
    CalibrationInsights,
    OutcomeCorrelation,
    PassThresholdSuggestion,
    PublicTakeAssessment,
    QuestionItemAnalysis,
    ScoreDistributionResult,
    SubmissionDraftRequest,
    SubmissionGradeRequest,
    SubmissionSubmitRequest,
    TimeVsScorePoint,
)
from talent_acquisition.assessments_service import (
    ai_suggest_grades,
    archive_assessment,
    create_assessment_doc,
    dispatch_assessment_reminders,
    cancel_submission,
    duplicate_assessment,
    enrich_assessment,
    get_submission_by_token,
    invite_candidate,
    item_analysis,
    list_assessment_versions,
    list_assessments,
    list_submissions,
    publish_assessment,
    regenerate_assessment_question,
    resend_submission_invite_email,
    save_take_draft,
    set_primary_assessment,
    start_submission,
    submit_and_score,
    suggest_pass_threshold,
    update_assessment,
)
from talent_acquisition.assessment_email import dispatch_queued_invite_emails, get_assessment_email_ops_status
from talent_acquisition.assessment_audit import list_assessment_audit


def create_assessments_router(
    *,
    db,
    get_current_user,
    generate_with_ai: Callable[..., Awaitable[Dict[str, Any]]],
    create_notification: Optional[Callable[..., Awaitable[Any]]] = None,
    llm_chat: Optional[Callable[..., Awaitable[str]]] = None,
    require_admin: Optional[Callable[[dict], dict]] = None,
) -> APIRouter:
    router = APIRouter(tags=["assessments"])

    def _org_from_query(
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> Optional[Dict[str, str]]:
        org = {
            "pillar": pillar or "",
            "department": department or "",
            "sub_department": sub_department or "",
            "project_id": project_id or "",
        }
        return org if any(org.values()) else None

    # --- Analytics (before /{id} routes) ---

    @router.get("/assessments/config", response_model=AssessmentFeatureFlags)
    async def assessments_config(current_user: dict = Depends(get_current_user)):
        flags = get_assessment_feature_flags()
        ops = get_assessment_email_ops_status()
        return AssessmentFeatureFlags(**flags, email_delivery_ready=bool(ops.get("ready_to_send")))

    @router.get("/assessments/analytics/summary")
    async def analytics_summary(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await build_analytics_summary(
            db, window_days=window_days, org=_org_from_query(pillar, department, sub_department, project_id)
        )

    @router.get("/assessments/analytics/funnel")
    async def analytics_funnel(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await build_funnel(
            db,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/pass-rate-by-type")
    async def analytics_pass_rate(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await pass_rate_by_type(
            db,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/score-distribution", response_model=ScoreDistributionResult)
    async def analytics_score_distribution(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await score_distribution(
            db,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/trends")
    async def analytics_trends(
        weeks: int = Query(8, ge=2, le=52),
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await build_trends(
            db,
            weeks=weeks,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/skill-breakdown")
    async def analytics_skill_breakdown(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await skill_breakdown(
            db,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/fit-vs-score")
    async def analytics_fit_vs_score(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await fit_vs_score(
            db,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/time-vs-score", response_model=List[TimeVsScorePoint])
    async def analytics_time_vs_score(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await time_vs_score(
            db,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/calibration", response_model=CalibrationInsights)
    async def analytics_calibration(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        return await calibration_insights(
            db,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/outcome-correlation", response_model=OutcomeCorrelation)
    async def analytics_outcome_correlation(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        if not is_assessment_feature_enabled("outcome_analytics"):
            raise HTTPException(status_code=404, detail="Outcome analytics is disabled")
        return await outcome_correlation(
            db,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
        )

    @router.get("/assessments/analytics/coverage")
    async def analytics_coverage(
        window_days: int = Query(30, ge=1, le=365),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        if not is_assessment_feature_enabled("coverage_heatmap"):
            raise HTTPException(status_code=404, detail="Coverage heatmap is disabled")
        return await build_coverage_matrix(
            db,
            window_days=window_days,
            org=_org_from_query(pillar, department, sub_department, project_id),
        )

    @router.get("/assessments/audit-log", response_model=List[AssessmentAuditEntry])
    async def get_assessment_audit_log(
        assessment_id: Optional[str] = None,
        limit: int = Query(100, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        return await list_assessment_audit(db, assessment_id=assessment_id, limit=limit)

    # --- Submissions ---

    @router.get("/assessments/submissions", response_model=List[AssessmentSubmissionResponse])
    async def get_submissions(
        assessment_id: Optional[str] = None,
        job_id: Optional[str] = None,
        candidate_id: Optional[str] = None,
        status: Optional[str] = None,
        window_days: Optional[int] = Query(None, ge=1, le=365),
        score_min_pct: Optional[float] = Query(None, ge=0, le=100),
        score_max_pct: Optional[float] = Query(None, ge=0, le=100),
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        limit: int = Query(200, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        return await list_submissions(
            db,
            assessment_id=assessment_id,
            job_id=job_id,
            candidate_id=candidate_id,
            status=status,
            org=_org_from_query(pillar, department, sub_department, project_id),
            window_days=window_days,
            score_min_pct=score_min_pct,
            score_max_pct=score_max_pct,
            limit=limit,
        )

    @router.get("/assessments/submissions/{submission_id}", response_model=AssessmentSubmissionResponse)
    async def get_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
        from talent_acquisition.assessments_constants import COL_ASSESSMENT_SUBMISSIONS
        from talent_acquisition.assessments_service import enrich_submission

        sub = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": submission_id}, {"_id": 0})
        if not sub:
            raise HTTPException(status_code=404, detail="Submission not found")
        return await enrich_submission(db, sub)

    @router.post("/assessments/submissions/{submission_id}/cancel", response_model=AssessmentSubmissionResponse)
    async def post_cancel_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
        return await cancel_submission(db, submission_id, actor_id=current_user.get("id"))

    @router.post("/assessments/submissions/{submission_id}/start", response_model=AssessmentSubmissionResponse)
    async def post_start_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
        return await start_submission(db, submission_id)

    @router.post("/assessments/submissions/{submission_id}/submit", response_model=AssessmentSubmissionResponse)
    async def post_submit_submission(
        submission_id: str,
        body: SubmissionSubmitRequest,
        current_user: dict = Depends(get_current_user),
    ):
        answers = [a.model_dump() for a in body.answers]
        return await submit_and_score(
            db,
            submission_id,
            answers,
            graded_by=current_user.get("id"),
            auto_clear_pipeline=body.auto_clear_pipeline
            and is_assessment_feature_enabled("auto_clear_pipeline"),
        )

    @router.patch("/assessments/submissions/{submission_id}", response_model=AssessmentSubmissionResponse)
    async def patch_submission(
        submission_id: str,
        body: SubmissionGradeRequest,
        current_user: dict = Depends(get_current_user),
    ):
        from talent_acquisition.assessments_constants import COL_ASSESSMENT_SUBMISSIONS

        sub = await db[COL_ASSESSMENT_SUBMISSIONS].find_one({"id": submission_id}, {"_id": 0})
        if not sub:
            raise HTTPException(status_code=404, detail="Submission not found")
        answers = body.answers or sub.get("answers") or []
        return await submit_and_score(
            db,
            submission_id,
            answers,
            graded_by=current_user.get("id"),
            manual_score=body.score,
            notes=body.notes,
            passed_override=body.passed,
            override_reason=body.override_reason,
            auto_clear_pipeline=body.auto_clear_pipeline
            and is_assessment_feature_enabled("auto_clear_pipeline"),
        )

    # --- Public candidate take (no auth) ---

    async def _public_take_payload(token: str) -> PublicTakeAssessment:
        sub = await get_submission_by_token(db, token)
        assessment = await db.assessments.find_one({"id": sub["assessment_id"]}, {"_id": 0})
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found")
        questions = [
            {k: v for k, v in q.items() if k != "answer_key"}
            for q in (assessment.get("questions") or [])
        ]
        return PublicTakeAssessment(
            submission_id=sub["id"],
            title=assessment.get("title", "Assessment"),
            duration_minutes=int(assessment.get("duration_minutes") or 60),
            total_marks=int(assessment.get("total_marks") or 0),
            questions=questions,
            status=sub.get("status", "INVITED"),
            expires_at=sub.get("expires_at"),
            saved_answers=sub.get("draft_answers") or [],
            draft_saved_at=sub.get("draft_saved_at"),
        )

    @router.get("/assessments/take/{token}", response_model=PublicTakeAssessment)
    async def public_take_get(token: str):
        if not is_assessment_feature_enabled("public_take"):
            raise HTTPException(status_code=503, detail="Public assessment take is disabled")
        return await _public_take_payload(token)

    @router.post("/assessments/take/{token}/start", response_model=PublicTakeAssessment)
    async def public_take_start(token: str):
        if not is_assessment_feature_enabled("public_take"):
            raise HTTPException(status_code=503, detail="Public assessment take is disabled")
        sub = await get_submission_by_token(db, token)
        await start_submission(db, sub["id"])
        return await _public_take_payload(token)

    @router.post("/assessments/take/{token}/submit", response_model=AssessmentSubmissionResponse)
    async def public_take_submit(token: str, body: SubmissionSubmitRequest):
        if not is_assessment_feature_enabled("public_take"):
            raise HTTPException(status_code=503, detail="Public assessment take is disabled")
        sub = await get_submission_by_token(db, token)
        answers = [a.model_dump() for a in body.answers]
        from talent_acquisition.assessments_service import enrich_submission

        result = await submit_and_score(
            db,
            sub["id"],
            answers,
            graded_by="candidate",
            auto_clear_pipeline=is_assessment_feature_enabled("auto_clear_pipeline"),
        )
        return result

    @router.put("/assessments/take/{token}/draft")
    async def public_take_draft(token: str, body: SubmissionDraftRequest):
        if not is_assessment_feature_enabled("public_take"):
            raise HTTPException(status_code=503, detail="Public assessment take is disabled")
        answers = [a.model_dump() for a in body.answers]
        await save_take_draft(db, token, answers)
        return {"saved": True, "answer_count": len(answers)}

    @router.post("/assessments/submissions/{submission_id}/ai-suggest-grades")
    async def post_ai_suggest_grades(submission_id: str, current_user: dict = Depends(get_current_user)):
        if not is_assessment_feature_enabled("ai_grading"):
            raise HTTPException(status_code=503, detail="AI grading is disabled")
        if not llm_chat:
            raise HTTPException(status_code=503, detail="AI grading is not configured")
        return await ai_suggest_grades(db, submission_id, llm_chat)

    @router.post("/assessments/submissions/{submission_id}/resend-email", response_model=AssessmentSubmissionResponse)
    async def post_resend_submission_email(submission_id: str, current_user: dict = Depends(get_current_user)):
        return await resend_submission_invite_email(
            db,
            submission_id,
            actor_id=current_user.get("id"),
            create_notification=create_notification,
        )

    @router.post("/assessments/admin/dispatch-invite-emails")
    async def post_dispatch_invite_emails(
        limit: int = Query(100, ge=1, le=500),
        current_user: dict = Depends(get_current_user),
    ):
        if require_admin:
            require_admin(current_user)
        elif current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        return await dispatch_queued_invite_emails(db, limit=limit)

    @router.post("/assessments/admin/dispatch-reminders")
    async def post_dispatch_reminders(
        hours_since_invite: int = Query(48, ge=1, le=336),
        current_user: dict = Depends(get_current_user),
    ):
        if require_admin:
            require_admin(current_user)
        elif current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        if not is_assessment_feature_enabled("reminder_emails"):
            raise HTTPException(status_code=503, detail="Assessment reminder emails are disabled")
        return await dispatch_assessment_reminders(
            db,
            hours_since_invite=hours_since_invite,
            create_notification=create_notification,
        )

    @router.get("/assessments/admin/ops-status", response_model=AssessmentOpsStatus)
    async def get_assessments_ops_status(current_user: dict = Depends(get_current_user)):
        if require_admin:
            require_admin(current_user)
        elif current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
        return AssessmentOpsStatus(**get_assessment_email_ops_status())

    # --- CRUD ---

    @router.post("/assessments/generate/{job_id}", response_model=AssessmentResponse)
    async def generate_assessment(
        job_id: str,
        assessment_data: AssessmentCreate,
        publish: bool = Query(False),
        current_user: dict = Depends(get_current_user),
    ):
        job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        generated = await generate_with_ai(job, assessment_data.assessment_type)
        doc = await create_assessment_doc(
            db,
            job_id=job_id,
            assessment_type=assessment_data.assessment_type,
            title=assessment_data.title,
            duration_minutes=assessment_data.duration_minutes,
            questions=generated.get("questions", []),
            rubric=generated.get("rubric"),
            created_by=current_user["id"],
            publish=publish,
        )
        return AssessmentResponse(**doc)

    @router.get("/assessments", response_model=List[AssessmentResponse])
    async def get_assessments_list(
        job_id: Optional[str] = None,
        assessment_type: Optional[str] = None,
        q: Optional[str] = None,
        status: Optional[str] = None,
        sort: str = "-created_at",
        limit: int = Query(100, ge=1, le=500),
        offset: int = Query(0, ge=0),
        usage: Optional[str] = None,
        pillar: Optional[str] = None,
        department: Optional[str] = None,
        sub_department: Optional[str] = None,
        project_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user),
    ):
        rows = await list_assessments(
            db,
            job_id=job_id,
            assessment_type=assessment_type,
            q=q,
            status=status,
            sort=sort,
            limit=limit,
            offset=offset,
            org=_org_from_query(pillar, department, sub_department, project_id),
            usage_filter=usage,
        )
        return [AssessmentResponse(**r) for r in rows]

    @router.get("/assessments/{assessment_id}", response_model=AssessmentResponse)
    async def get_assessment(assessment_id: str, current_user: dict = Depends(get_current_user)):
        doc = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Assessment not found")
        return AssessmentResponse(**await enrich_assessment(db, doc))

    @router.get("/assessments/{assessment_id}/versions", response_model=List[AssessmentVersionSnapshot])
    async def get_assessment_versions(assessment_id: str, current_user: dict = Depends(get_current_user)):
        rows = await list_assessment_versions(db, assessment_id)
        return [AssessmentVersionSnapshot(**r) for r in rows]

    @router.put("/assessments/{assessment_id}", response_model=AssessmentResponse)
    async def put_assessment(
        assessment_id: str,
        body: AssessmentUpdate,
        current_user: dict = Depends(get_current_user),
    ):
        return AssessmentResponse(
            **await update_assessment(
                db,
                assessment_id,
                body.model_dump(exclude_unset=True),
                actor_id=current_user.get("id"),
            )
        )

    @router.post("/assessments/{assessment_id}/publish", response_model=AssessmentResponse)
    async def post_publish(assessment_id: str, current_user: dict = Depends(get_current_user)):
        return AssessmentResponse(**await publish_assessment(db, assessment_id, actor_id=current_user["id"]))

    @router.post("/assessments/{assessment_id}/archive", response_model=AssessmentResponse)
    async def post_archive(assessment_id: str, current_user: dict = Depends(get_current_user)):
        return AssessmentResponse(**await archive_assessment(db, assessment_id, actor_id=current_user["id"]))

    @router.post("/assessments/{assessment_id}/set-primary", response_model=AssessmentResponse)
    async def post_set_primary(assessment_id: str, current_user: dict = Depends(get_current_user)):
        return AssessmentResponse(**await set_primary_assessment(db, assessment_id, actor_id=current_user["id"]))

    @router.post("/assessments/{assessment_id}/duplicate", response_model=AssessmentResponse)
    async def post_duplicate(assessment_id: str, current_user: dict = Depends(get_current_user)):
        return AssessmentResponse(**await duplicate_assessment(db, assessment_id, current_user["id"]))

    @router.post("/assessments/{assessment_id}/invite", response_model=AssessmentSubmissionResponse)
    async def post_invite(
        assessment_id: str,
        body: AssessmentInviteRequest,
        current_user: dict = Depends(get_current_user),
    ):
        return await invite_candidate(
            db,
            assessment_id,
            application_id=body.application_id,
            candidate_id=body.candidate_id,
            job_id=body.job_id,
            invited_by=current_user["id"],
            move_to_assessment_sent=body.move_to_assessment_sent,
            expires_in_hours=body.expires_in_hours,
            send_candidate_email=body.send_candidate_email,
            create_notification=create_notification,
        )

    @router.post("/assessments/{assessment_id}/suggest-pass-threshold", response_model=PassThresholdSuggestion)
    async def post_suggest_pass_threshold(assessment_id: str, current_user: dict = Depends(get_current_user)):
        result = await suggest_pass_threshold(db, assessment_id, llm_chat=llm_chat)
        return PassThresholdSuggestion(**result)

    @router.get("/assessments/{assessment_id}/item-analysis", response_model=List[QuestionItemAnalysis])
    async def get_item_analysis(assessment_id: str, current_user: dict = Depends(get_current_user)):
        return await item_analysis(db, assessment_id)

    @router.post("/assessments/{assessment_id}/questions/{question_id}/regenerate", response_model=AssessmentResponse)
    async def post_regenerate_question(
        assessment_id: str,
        question_id: str,
        current_user: dict = Depends(get_current_user),
    ):
        if not llm_chat:
            raise HTTPException(status_code=503, detail="AI regeneration is not configured")
        updated = await regenerate_assessment_question(
            db,
            assessment_id,
            question_id,
            llm_chat,
            generate_with_ai,
        )
        from talent_acquisition.assessment_audit import log_assessment_audit

        await log_assessment_audit(
            db,
            action="regenerate_question",
            actor_id=current_user["id"],
            assessment_id=assessment_id,
            detail={"question_id": question_id},
        )
        return AssessmentResponse(**updated)

    return router
