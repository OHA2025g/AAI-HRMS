"""Assessment analytics aggregations (Phases 1 & 3)."""

from __future__ import annotations

import statistics
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from talent_acquisition.assessments_constants import COL_ASSESSMENT_SUBMISSIONS, COL_ASSESSMENTS
from talent_acquisition.assessments_constants import ASSESSMENT_TYPES
from talent_acquisition.assessments_schemas import (
    AssessmentAlert,
    AssessmentAnalyticsSummary,
    AssessmentCoverageCell,
    AssessmentCoverageJob,
    AssessmentCoverageMatrix,
    AssessmentHeadline,
    AssessmentJobRow,
    AssessmentTypeBreakdown,
    CalibrationInsights,
    CalibrationQuestionRow,
    FitVsScorePoint,
    FunnelStep,
    MetricValue,
    OutcomeCorrelation,
    PassRateByType,
    ScoreBucket,
    ScoreDistributionResult,
    SkillBreakdownRow,
    TimeVsScorePoint,
    TrendPoint,
)
from talent_acquisition.assessments_service import _job_ids_for_org_filter, pass_threshold_from_rubric


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _delta(current: float | int, prior: float | int | None) -> MetricValue:
    if prior is None or prior == 0:
        return MetricValue(value=current, prior_value=prior, delta_pct=None)
    delta_pct = round(100.0 * (float(current) - float(prior)) / float(prior), 2)
    return MetricValue(value=current, prior_value=prior, delta_pct=delta_pct)


def _org_job_query(org: Optional[Dict[str, str]], job_ids: Optional[List[str]]) -> Dict[str, Any]:
    if job_ids is not None:
        return {"job_id": {"$in": job_ids}} if job_ids else {"job_id": "__none__"}
    return {}


def _window_cutoff(window_days: Optional[int] = None) -> Optional[str]:
    if window_days is None:
        return None
    wd = max(1, min(int(window_days), 365))
    return (datetime.now(timezone.utc) - timedelta(days=wd)).isoformat()


def _trends_weeks(window_days: Optional[int], weeks: int) -> int:
    if window_days is None:
        return weeks
    wd = max(1, min(int(window_days), 365))
    return max(2, min(weeks, max(2, wd // 7)))


async def build_analytics_summary(
    db,
    *,
    window_days: int = 30,
    org: Optional[Dict[str, str]] = None,
) -> AssessmentAnalyticsSummary:
    wd = max(1, min(window_days, 365))
    now = datetime.now(timezone.utc)
    cur_start = (now - timedelta(days=wd)).isoformat()
    prior_start = (now - timedelta(days=wd * 2)).isoformat()

    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    if job_filter.get("job_id") == "__none__":
        empty = MetricValue(value=0)
        return AssessmentAnalyticsSummary(
            as_of=_now_iso(),
            window_days=wd,
            headline=AssessmentHeadline(
                total_assessments=empty,
                assessments_on_open_jobs=empty,
                jobs_missing_assessment=empty,
                candidates_in_assessment_sent=empty,
                candidates_assessment_cleared=empty,
                active_submissions=empty,
            ),
            alerts=[],
        )

    assess_q: Dict[str, Any] = dict(job_filter)
    assessments = await db[COL_ASSESSMENTS].find(assess_q, {"_id": 0}).to_list(5000)
    total = len(assessments)

    open_jobs_q: Dict[str, Any] = {"status": "OPEN"}
    if job_ids is not None:
        open_jobs_q["id"] = {"$in": job_ids}
    open_jobs = await db.jobs.find(open_jobs_q, {"_id": 0, "id": 1, "title": 1}).to_list(5000)
    open_job_ids = {j["id"] for j in open_jobs if j.get("id")}

    assess_by_job: Dict[str, int] = {}
    for a in assessments:
        jid = a.get("job_id")
        if jid:
            assess_by_job[jid] = assess_by_job.get(jid, 0) + 1

    on_open = sum(1 for a in assessments if a.get("job_id") in open_job_ids)

    app_q = dict(job_filter)
    sent = await db.applications.count_documents({**app_q, "stage": "ASSESSMENT_SENT"})
    cleared = await db.applications.count_documents({**app_q, "stage": "ASSESSMENT_CLEARED"})
    clearance = round(100.0 * cleared / sent, 2) if sent else None

    sub_q = dict(job_filter)
    invited_window = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {**sub_q, "invited_at": {"$gte": cur_start}}
    )
    completed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {**sub_q, "status": "SCORED", "completed_at": {"$gte": cur_start}}
    )
    passed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {**sub_q, "status": "SCORED", "passed": True, "completed_at": {"$gte": cur_start}}
    )
    invited_total = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(sub_q)
    active_submissions = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {**sub_q, "status": {"$in": ["INVITED", "IN_PROGRESS", "SUBMITTED"]}}
    )
    prior_active_submissions = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {
            **sub_q,
            "status": {"$in": ["INVITED", "IN_PROGRESS", "SUBMITTED"]},
            "invited_at": {"$lt": cur_start},
        }
    )
    completion_rate = round(100.0 * completed / invited_total, 2) if invited_total else None
    pass_rate = round(100.0 * passed / completed, 2) if completed else None

    prior_total = await db[COL_ASSESSMENTS].count_documents(
        {**assess_q, "created_at": {"$lt": cur_start}}
    )
    prior_on_open = sum(
        1 for a in assessments if a.get("job_id") in open_job_ids and (a.get("created_at") or "") < cur_start
    )
    prior_sent = await db.applications.count_documents(
        {**app_q, "stage": "ASSESSMENT_SENT", "updated_at": {"$lt": cur_start}}
    )
    prior_cleared = await db.applications.count_documents(
        {**app_q, "stage": "ASSESSMENT_CLEARED", "updated_at": {"$lt": cur_start}}
    )
    prior_completed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {**sub_q, "status": "SCORED", "completed_at": {"$gte": prior_start, "$lt": cur_start}}
    )
    prior_passed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {**sub_q, "status": "SCORED", "passed": True, "completed_at": {"$gte": prior_start, "$lt": cur_start}}
    )
    prior_invited_total = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
        {**sub_q, "invited_at": {"$lt": cur_start}}
    )

    prior_clearance = round(100.0 * prior_cleared / prior_sent, 2) if prior_sent else None
    prior_completion = (
        round(100.0 * prior_completed / prior_invited_total, 2) if prior_invited_total else None
    )
    prior_pass_rate = round(100.0 * prior_passed / prior_completed, 2) if prior_completed else None

    def _rate_delta(current: float | None, prior: float | None) -> float | None:
        if current is None or prior is None or prior == 0:
            return None
        return round(100.0 * (float(current) - float(prior)) / float(prior), 2)

    durations: List[float] = []
    prior_durations: List[float] = []
    scored_all = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        {**sub_q, "status": "SCORED", "started_at": {"$ne": None}, "completed_at": {"$ne": None}},
        {"_id": 0, "started_at": 1, "completed_at": 1},
    ).to_list(2000)
    for s in scored_all:
        try:
            st = datetime.fromisoformat(s["started_at"].replace("Z", "+00:00"))
            en = datetime.fromisoformat(s["completed_at"].replace("Z", "+00:00"))
            minutes = (en - st).total_seconds() / 60.0
            completed_at = s["completed_at"]
            if completed_at >= cur_start:
                durations.append(minutes)
            elif prior_start <= completed_at < cur_start:
                prior_durations.append(minutes)
        except (TypeError, ValueError, KeyError):
            pass
    median_ttc = round(statistics.median(durations), 1) if durations else None
    prior_median_ttc = round(statistics.median(prior_durations), 1) if prior_durations else None

    avg_q = round(
        sum(len(a.get("questions") or []) for a in assessments) / total, 1
    ) if total else None
    avg_dur = round(
        sum(int(a.get("duration_minutes") or 0) for a in assessments) / total, 1
    ) if total else None

    thresholds = [pass_threshold_from_rubric(a.get("rubric")) for a in assessments]
    avg_pass_threshold = round(sum(thresholds) / len(thresholds), 1) if thresholds else 70.0

    by_type_counts: Dict[str, int] = {}
    for a in assessments:
        t = a.get("assessment_type") or "OTHER"
        by_type_counts[t] = by_type_counts.get(t, 0) + 1

    assess_ids_by_type: Dict[str, List[str]] = {}
    for a in assessments:
        t = a.get("assessment_type") or "OTHER"
        assess_ids_by_type.setdefault(t, []).append(a["id"])

    by_type: List[AssessmentTypeBreakdown] = []
    for t, c in sorted(by_type_counts.items(), key=lambda x: -x[1]):
        aids = assess_ids_by_type.get(t, [])
        type_subs = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
            {**sub_q, "assessment_id": {"$in": aids}, "status": "SCORED", "passed": True}
        ) if aids else 0
        type_done = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
            {**sub_q, "assessment_id": {"$in": aids}, "status": "SCORED"}
        ) if aids else 0
        by_type.append(
            AssessmentTypeBreakdown(
                assessment_type=t,
                count=c,
                pct=round(100.0 * c / total, 2) if total else 0,
                pass_rate_pct=round(100.0 * type_subs / type_done, 2) if type_done else None,
            )
        )

    jobs_missing = 0
    prior_jobs_missing = 0
    by_job: List[AssessmentJobRow] = []
    for job in open_jobs:
        jid = job.get("id")
        if not jid:
            continue
        j_sent = await db.applications.count_documents({"job_id": jid, "stage": "ASSESSMENT_SENT"})
        j_cleared = await db.applications.count_documents({"job_id": jid, "stage": "ASSESSMENT_CLEARED"})
        j_inv = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents({"job_id": jid})
        j_done = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents({"job_id": jid, "status": "SCORED"})
        j_pass = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents({"job_id": jid, "passed": True})
        ac = assess_by_job.get(jid, 0)
        if (j_sent > 0 or j_cleared > 0) and ac == 0:
            jobs_missing += 1
        j_sent_prior = await db.applications.count_documents(
            {**app_q, "job_id": jid, "stage": "ASSESSMENT_SENT", "updated_at": {"$lt": cur_start}}
        )
        j_cleared_prior = await db.applications.count_documents(
            {**app_q, "job_id": jid, "stage": "ASSESSMENT_CLEARED", "updated_at": {"$lt": cur_start}}
        )
        if (j_sent_prior > 0 or j_cleared_prior > 0) and ac == 0:
            prior_jobs_missing += 1
        by_job.append(
            AssessmentJobRow(
                job_id=jid,
                title=job.get("title", jid),
                assessment_count=ac,
                sent=j_sent,
                cleared=j_cleared,
                invited=j_inv,
                completed=j_done,
                pass_rate_pct=round(100.0 * j_pass / j_done, 2) if j_done else None,
                has_assessment=ac > 0,
            )
        )
    by_job.sort(key=lambda r: (-r.sent, r.title))

    alerts: List[AssessmentAlert] = []
    if jobs_missing:
        alerts.append(
            AssessmentAlert(
                id=str(uuid.uuid4()),
                severity="warning",
                title="Jobs in assessment with no test",
                message="Open jobs have candidates in assessment stages but no assessment created.",
                action_path="/assessments?tab=library&usage=missing",
                count=jobs_missing,
            )
        )
    unused = sum(1 for a in assessments if assess_by_job.get(a.get("job_id"), 0) == 0)
    if unused >= 3:
        alerts.append(
            AssessmentAlert(
                id=str(uuid.uuid4()),
                severity="info",
                title="Unused assessments",
                message="Several assessments have never been sent to candidates.",
                action_path="/assessments?tab=library&usage=unused",
                count=unused,
            )
        )

    headline = AssessmentHeadline(
        total_assessments=_delta(total, prior_total),
        assessments_on_open_jobs=_delta(on_open, prior_on_open),
        jobs_missing_assessment=_delta(jobs_missing, prior_jobs_missing),
        candidates_in_assessment_sent=_delta(sent, prior_sent),
        candidates_assessment_cleared=_delta(cleared, prior_cleared),
        clearance_rate_pct=clearance,
        clearance_rate_delta_pct=_rate_delta(clearance, prior_clearance),
        completion_rate_pct=completion_rate,
        completion_rate_delta_pct=_rate_delta(completion_rate, prior_completion),
        pass_rate_pct=pass_rate,
        pass_rate_delta_pct=_rate_delta(pass_rate, prior_pass_rate),
        median_time_to_complete_minutes=median_ttc,
        median_time_delta_pct=_rate_delta(median_ttc, prior_median_ttc),
        avg_questions_per_assessment=avg_q,
        avg_duration_minutes=avg_dur,
        pass_threshold_pct=avg_pass_threshold,
        active_submissions=_delta(active_submissions, prior_active_submissions),
    )

    return AssessmentAnalyticsSummary(
        as_of=_now_iso(),
        window_days=wd,
        headline=headline,
        by_type=by_type,
        by_job=by_job[:20],
        alerts=alerts,
    )


async def build_coverage_matrix(
    db,
    *,
    window_days: int = 30,
    org: Optional[Dict[str, str]] = None,
) -> AssessmentCoverageMatrix:
    """Job × assessment-type matrix for coverage heatmap."""
    wd = max(1, min(window_days, 365))
    cutoff = _window_cutoff(wd)

    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    if job_filter.get("job_id") == "__none__":
        return AssessmentCoverageMatrix(as_of=_now_iso(), window_days=wd, types=sorted(ASSESSMENT_TYPES))

    open_jobs_q: Dict[str, Any] = {"status": "OPEN"}
    if job_ids is not None:
        open_jobs_q["id"] = {"$in": job_ids}
    open_jobs = await db.jobs.find(open_jobs_q, {"_id": 0, "id": 1, "title": 1}).to_list(100)

    assessments = await db[COL_ASSESSMENTS].find(
        {**job_filter, "status": {"$ne": "ARCHIVED"}},
        {"_id": 0, "id": 1, "job_id": 1, "assessment_type": 1},
    ).to_list(5000)

    assess_count: Dict[tuple, int] = {}
    assess_ids_by_cell: Dict[tuple, List[str]] = {}
    for a in assessments:
        jid = a.get("job_id")
        atype = a.get("assessment_type") or "OTHER"
        if not jid:
            continue
        key = (jid, atype)
        assess_count[key] = assess_count.get(key, 0) + 1
        assess_ids_by_cell.setdefault(key, []).append(a["id"])

    types = sorted(ASSESSMENT_TYPES)
    job_rows: List[AssessmentCoverageJob] = []
    cells: List[AssessmentCoverageCell] = []
    max_intensity = 0.0

    for job in open_jobs[:25]:
        jid = job.get("id")
        if not jid:
            continue
        j_sent = await db.applications.count_documents({"job_id": jid, "stage": "ASSESSMENT_SENT"})
        j_cleared = await db.applications.count_documents({"job_id": jid, "stage": "ASSESSMENT_CLEARED"})
        pipeline_active = j_sent > 0 or j_cleared > 0
        job_rows.append(
            AssessmentCoverageJob(job_id=jid, title=job.get("title", jid), pipeline_active=pipeline_active)
        )
        for atype in types:
            key = (jid, atype)
            ac = assess_count.get(key, 0)
            aids = assess_ids_by_cell.get(key, [])
            invited = 0
            completed = 0
            if aids:
                invited_q: Dict[str, Any] = {"assessment_id": {"$in": aids}}
                completed_q: Dict[str, Any] = {"assessment_id": {"$in": aids}, "status": "SCORED"}
                if cutoff:
                    invited_q["invited_at"] = {"$gte": cutoff}
                    completed_q["completed_at"] = {"$gte": cutoff}
                invited = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(invited_q)
                completed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(completed_q)
            intensity = float(ac * 10 + invited * 2 + completed)
            max_intensity = max(max_intensity, intensity)
            cells.append(
                AssessmentCoverageCell(
                    job_id=jid,
                    assessment_type=atype,
                    assessment_count=ac,
                    invited=invited,
                    completed=completed,
                    intensity=intensity,
                )
            )

    if max_intensity > 0:
        normalized_cells = []
        for cell in cells:
            normalized_cells.append(
                cell.model_copy(update={"intensity": round(cell.intensity / max_intensity, 3)})
            )
        cells = normalized_cells

    job_rows.sort(key=lambda j: (-int(j.pipeline_active), j.title))
    return AssessmentCoverageMatrix(
        as_of=_now_iso(),
        window_days=wd,
        types=types,
        jobs=job_rows,
        cells=cells,
    )


async def build_funnel(
    db,
    org: Optional[Dict[str, str]] = None,
    window_days: Optional[int] = None,
    job_ids: Optional[List[str]] = None,
) -> List[FunnelStep]:
    if job_ids is None:
        job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    if job_filter.get("job_id") == "__none__":
        return []

    cutoff = _window_cutoff(window_days)

    steps_def = [
        ("invited", "Invited", {"status": {"$in": ["INVITED", "IN_PROGRESS", "SUBMITTED", "SCORED"]}}, "invited_at"),
        ("started", "Started", {"status": {"$in": ["IN_PROGRESS", "SUBMITTED", "SCORED"]}}, "invited_at"),
        ("submitted", "Submitted", {"status": {"$in": ["SUBMITTED", "SCORED"]}}, "invited_at"),
        ("passed", "Passed", {"status": "SCORED", "passed": True}, "completed_at"),
        ("cleared", "Pipeline cleared", {}, None),
        ("interview", "Interview scheduled", {}, None),
    ]

    counts = []
    for key, label, qextra, time_field in steps_def:
        if key == "cleared":
            q: Dict[str, Any] = {**job_filter, "stage": "ASSESSMENT_CLEARED"}
            if cutoff:
                q["updated_at"] = {"$gte": cutoff}
            c = await db.applications.count_documents(q)
        elif key == "interview":
            q = {
                **job_filter,
                "stage": {"$in": ["INTERVIEW_1", "INTERVIEW_2", "INTERVIEW_3", "HR_ROUND"]},
            }
            if cutoff:
                q["updated_at"] = {"$gte": cutoff}
            c = await db.applications.count_documents(q)
        else:
            q = {**job_filter, **qextra}
            if cutoff and time_field:
                q[time_field] = {"$gte": cutoff}
            c = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(q)
        counts.append((key, label, c))

    funnel: List[FunnelStep] = []
    prev = None
    for key, label, c in counts:
        conv = round(100.0 * c / prev, 2) if prev and prev > 0 else None
        funnel.append(FunnelStep(stage=key, label=label, count=c, conversion_from_prev_pct=conv))
        prev = c
    return funnel


async def pass_rate_by_type(
    db, org: Optional[Dict[str, str]] = None, window_days: Optional[int] = None
) -> List[PassRateByType]:
    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    if job_filter.get("job_id") == "__none__":
        return []

    cutoff = _window_cutoff(window_days)

    assessments = await db[COL_ASSESSMENTS].find(job_filter, {"_id": 0, "id": 1, "assessment_type": 1}).to_list(5000)
    by_type: Dict[str, List[str]] = {}
    for a in assessments:
        t = a.get("assessment_type") or "OTHER"
        by_type.setdefault(t, []).append(a["id"])

    rows = []
    for t, aids in by_type.items():
        invited_q: Dict[str, Any] = {"assessment_id": {"$in": aids}}
        completed_q: Dict[str, Any] = {"assessment_id": {"$in": aids}, "status": "SCORED"}
        passed_q: Dict[str, Any] = {"assessment_id": {"$in": aids}, "status": "SCORED", "passed": True}
        if cutoff:
            invited_q["invited_at"] = {"$gte": cutoff}
            completed_q["completed_at"] = {"$gte": cutoff}
            passed_q["completed_at"] = {"$gte": cutoff}
        invited = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(invited_q)
        completed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(completed_q)
        passed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(passed_q)
        rows.append(
            PassRateByType(
                assessment_type=t,
                invited=invited,
                completed=completed,
                passed=passed,
                pass_rate_pct=round(100.0 * passed / completed, 2) if completed else None,
            )
        )
    return sorted(rows, key=lambda r: r.assessment_type)


async def score_distribution(
    db, org: Optional[Dict[str, str]] = None, window_days: Optional[int] = None
) -> ScoreDistributionResult:
    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    cutoff = _window_cutoff(window_days)
    buckets_def = [(i, i + 10) for i in range(0, 100, 10)]
    assess_q: Dict[str, Any] = dict(job_filter)
    assessments = await db[COL_ASSESSMENTS].find(assess_q, {"_id": 0, "rubric": 1}).to_list(5000)
    thresholds = [pass_threshold_from_rubric(a.get("rubric")) for a in assessments]
    pass_threshold = round(sum(thresholds) / len(thresholds), 1) if thresholds else 70.0

    sub_q: Dict[str, Any] = {**job_filter, "status": "SCORED", "score_pct": {"$ne": None}}
    if cutoff:
        sub_q["completed_at"] = {"$gte": cutoff}
    subs = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        sub_q,
        {"_id": 0, "score_pct": 1},
    ).to_list(5000)
    out = []
    for lo, hi in buckets_def:
        label = f"{lo}-{hi}"
        count = sum(
            1
            for s in subs
            if lo <= float(s.get("score_pct") or 0) < hi
            or (hi == 100 and float(s.get("score_pct") or 0) == 100)
        )
        out.append(ScoreBucket(bucket=label, min_score=lo, max_score=hi, count=count))
    return ScoreDistributionResult(buckets=out, pass_threshold_pct=pass_threshold)


async def build_trends(
    db, *, weeks: int = 8, org: Optional[Dict[str, str]] = None, window_days: Optional[int] = None
) -> List[TrendPoint]:
    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    now = datetime.now(timezone.utc)
    effective_weeks = _trends_weeks(window_days, weeks)
    window_start = now - timedelta(days=max(1, min(int(window_days or 365), 365))) if window_days else None
    points = []
    for w in range(effective_weeks - 1, -1, -1):
        end = now - timedelta(days=w * 7)
        start = end - timedelta(days=7)
        if window_start and end < window_start:
            continue
        s_iso, e_iso = start.isoformat(), end.isoformat()
        invited = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
            {**job_filter, "invited_at": {"$gte": s_iso, "$lt": e_iso}}
        )
        completed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
            {**job_filter, "completed_at": {"$gte": s_iso, "$lt": e_iso}, "status": "SCORED"}
        )
        passed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
            {
                **job_filter,
                "completed_at": {"$gte": s_iso, "$lt": e_iso},
                "status": "SCORED",
                "passed": True,
            }
        )
        points.append(
            TrendPoint(
                period=e_iso[:10],
                label=end.strftime("%b %d"),
                invited=invited,
                completed=completed,
                pass_rate_pct=round(100.0 * passed / completed, 2) if completed else None,
            )
        )
    return points


async def skill_breakdown(
    db, org: Optional[Dict[str, str]] = None, window_days: Optional[int] = None
) -> List[SkillBreakdownRow]:
    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    cutoff = _window_cutoff(window_days)
    sub_q: Dict[str, Any] = {**job_filter, "status": "SCORED"}
    if cutoff:
        sub_q["completed_at"] = {"$gte": cutoff}
    subs = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        sub_q,
        {"_id": 0, "answers": 1, "assessment_id": 1},
    ).to_list(2000)

    assess_cache: Dict[str, Dict] = {}
    skill_stats: Dict[str, List[float]] = {}

    for sub in subs:
        aid = sub.get("assessment_id")
        if aid not in assess_cache:
            assess_cache[aid] = await db[COL_ASSESSMENTS].find_one({"id": aid}, {"_id": 0, "questions": 1}) or {}
        qmap = {q["id"]: q for q in (assess_cache[aid].get("questions") or []) if q.get("id")}
        for ans in sub.get("answers") or []:
            q = qmap.get(ans.get("question_id"), {})
            skill = q.get("skill_tested") or "General"
            max_m = float(q.get("max_marks") or ans.get("max_marks") or 10)
            marks = float(ans.get("marks_awarded") or 0)
            skill_stats.setdefault(skill, []).append(100.0 * marks / max_m if max_m else 0)

    rows = []
    for skill, pcts in skill_stats.items():
        rows.append(
            SkillBreakdownRow(
                skill=skill,
                attempts=len(pcts),
                avg_score_pct=round(sum(pcts) / len(pcts), 2) if pcts else None,
            )
        )
    return sorted(rows, key=lambda r: -r.attempts)[:15]


async def fit_vs_score(
    db, org: Optional[Dict[str, str]] = None, window_days: Optional[int] = None
) -> List[FitVsScorePoint]:
    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    cutoff = _window_cutoff(window_days)
    sub_q: Dict[str, Any] = {**job_filter, "status": "SCORED", "score_pct": {"$ne": None}}
    if cutoff:
        sub_q["completed_at"] = {"$gte": cutoff}
    subs = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        sub_q,
        {"_id": 0, "candidate_id": 1, "job_id": 1, "score_pct": 1},
    ).to_list(1000)

    points = []
    for s in subs:
        fs = await db.fit_scores.find_one(
            {"candidate_id": s["candidate_id"], "job_id": s["job_id"]},
            {"_id": 0, "final_score": 1},
        )
        if not fs:
            continue
        cand = await db.candidates.find_one({"id": s["candidate_id"]}, {"_id": 0, "full_name": 1})
        fit = float(fs.get("final_score") or 0)
        asc = float(s.get("score_pct") or 0)
        if fit >= 70 and asc >= 70:
            quad = "high_fit_pass"
        elif fit >= 70 and asc < 70:
            quad = "high_fit_fail"
        elif fit < 70 and asc >= 70:
            quad = "low_fit_pass"
        else:
            quad = "low_fit_fail"
        points.append(
            FitVsScorePoint(
                candidate_id=s["candidate_id"],
                candidate_name=(cand or {}).get("full_name", "Candidate"),
                fit_score=fit,
                assessment_score_pct=asc,
                quadrant=quad,
            )
        )
    return points


async def time_vs_score(
    db, org: Optional[Dict[str, str]] = None, window_days: Optional[int] = None
) -> List[TimeVsScorePoint]:
    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    cutoff = _window_cutoff(window_days)
    sub_q: Dict[str, Any] = {
        **job_filter,
        "status": "SCORED",
        "score_pct": {"$ne": None},
        "started_at": {"$ne": None},
        "completed_at": {"$ne": None},
    }
    if cutoff:
        sub_q["completed_at"] = {"$gte": cutoff}
    subs = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        sub_q,
        {"_id": 0, "candidate_id": 1, "score_pct": 1, "started_at": 1, "completed_at": 1},
    ).to_list(1000)

    points = []
    for s in subs:
        try:
            st = datetime.fromisoformat(s["started_at"].replace("Z", "+00:00"))
            en = datetime.fromisoformat(s["completed_at"].replace("Z", "+00:00"))
            minutes = round((en - st).total_seconds() / 60.0, 1)
        except (TypeError, ValueError, KeyError):
            continue
        cand = await db.candidates.find_one({"id": s["candidate_id"]}, {"_id": 0, "full_name": 1})
        points.append(
            TimeVsScorePoint(
                candidate_id=s["candidate_id"],
                candidate_name=(cand or {}).get("full_name", "Candidate"),
                minutes=minutes,
                score_pct=float(s.get("score_pct") or 0),
            )
        )
    return points


async def calibration_insights(
    db, org: Optional[Dict[str, str]] = None, window_days: Optional[int] = None
) -> CalibrationInsights:
    from talent_acquisition.assessments_service import item_analysis

    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    assess_q: Dict[str, Any] = dict(job_filter)
    assessments = await db[COL_ASSESSMENTS].find(assess_q, {"_id": 0}).to_list(500)
    cutoff = _window_cutoff(window_days or 30)

    low_pass = []
    stale_unused = []
    hardest: List[CalibrationQuestionRow] = []

    for a in assessments:
        aid = a.get("id")
        if not aid:
            continue
        invited = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents({"assessment_id": aid})
        completed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
            {"assessment_id": aid, "status": "SCORED"}
        )
        passed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(
            {"assessment_id": aid, "status": "SCORED", "passed": True}
        )
        pass_rate = round(100.0 * passed / completed, 2) if completed else None
        if pass_rate is not None and pass_rate < 40 and completed >= 3:
            low_pass.append(
                {
                    "assessment_id": aid,
                    "title": a.get("title"),
                    "pass_rate_pct": pass_rate,
                    "completed": completed,
                }
            )
        if invited == 0 and (a.get("created_at") or "") < cutoff and a.get("status") != "ARCHIVED":
            stale_unused.append(
                {
                    "assessment_id": aid,
                    "title": a.get("title"),
                    "created_at": a.get("created_at"),
                }
            )
        if completed >= 2:
            rows = await item_analysis(db, aid)
            for row in rows:
                if row.get("pct_correct") is not None and row.get("pct_correct") < 50:
                    hardest.append(
                        CalibrationQuestionRow(
                            assessment_id=aid,
                            assessment_title=a.get("title", ""),
                            question_id=row["question_id"],
                            question_text=row["question_text"],
                            pct_correct=row.get("pct_correct"),
                            flag=row.get("flag"),
                        )
                    )

    hardest.sort(key=lambda r: (r.pct_correct is None, r.pct_correct or 0))
    return CalibrationInsights(
        low_pass_assessments=low_pass[:10],
        stale_unused_assessments=stale_unused[:10],
        hardest_questions=hardest[:5],
    )


INTERVIEW_PLUS_STAGES = frozenset(
    {"INTERVIEW_1", "INTERVIEW_2", "INTERVIEW_3", "HR_ROUND", "OFFER", "HIRED"}
)


async def outcome_correlation(
    db, org: Optional[Dict[str, str]] = None, window_days: Optional[int] = None
) -> OutcomeCorrelation:
    """Pass/scored submissions vs pipeline interview and hire outcomes."""
    job_ids = await _job_ids_for_org_filter(db, org)
    job_filter = _org_job_query(org, job_ids)
    if job_filter.get("job_id") == "__none__":
        return OutcomeCorrelation()

    cutoff = _window_cutoff(window_days)
    sub_q: Dict[str, Any] = {**job_filter, "status": "SCORED"}
    if cutoff:
        sub_q["completed_at"] = {"$gte": cutoff}
    subs = await db[COL_ASSESSMENT_SUBMISSIONS].find(
        sub_q,
        {"_id": 0, "passed": 1, "application_id": 1},
    ).to_list(5000)

    scored = len(subs)
    passed = sum(1 for s in subs if s.get("passed"))
    reached_interview = 0
    hired = 0

    app_ids = list({s["application_id"] for s in subs if s.get("application_id")})
    if app_ids:
        apps = await db.applications.find(
            {"id": {"$in": app_ids}},
            {"_id": 0, "id": 1, "stage": 1},
        ).to_list(len(app_ids))
        stage_by_app = {a["id"]: a.get("stage") or "" for a in apps}
        for s in subs:
            aid = s.get("application_id")
            if not aid:
                continue
            stage = stage_by_app.get(aid, "")
            if stage in INTERVIEW_PLUS_STAGES:
                reached_interview += 1
            if stage == "HIRED":
                hired += 1

    return OutcomeCorrelation(
        scored=scored,
        passed=passed,
        reached_interview=reached_interview,
        hired=hired,
        pass_to_interview_pct=round(100.0 * reached_interview / passed, 2) if passed else None,
        scored_to_interview_pct=round(100.0 * reached_interview / scored, 2) if scored else None,
        pass_to_hire_pct=round(100.0 * hired / passed, 2) if passed else None,
    )


async def build_assessment_hiring_slice(
    db,
    *,
    window_days: int = 30,
    job_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Assessment funnel + rates for embedding in GET /dashboard/hiring-pack."""
    funnel = await build_funnel(db, window_days=window_days, job_ids=job_ids)
    job_filter = _org_job_query(None, job_ids)
    cutoff = _window_cutoff(window_days)
    invited_q: Dict[str, Any] = {
        **job_filter,
        "status": {"$in": ["INVITED", "IN_PROGRESS", "SUBMITTED", "SCORED"]},
    }
    if cutoff:
        invited_q["invited_at"] = {"$gte": cutoff}
    invited = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(invited_q)
    scored_q: Dict[str, Any] = {**job_filter, "status": "SCORED"}
    if cutoff:
        scored_q["completed_at"] = {"$gte": cutoff}
    scored = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(scored_q)
    passed_q = {**scored_q, "passed": True}
    passed = await db[COL_ASSESSMENT_SUBMISSIONS].count_documents(passed_q)
    completion = round(100.0 * scored / invited, 2) if invited else None
    pass_rate = round(100.0 * passed / scored, 2) if scored else None
    return {
        "funnel": [step.model_dump() for step in funnel],
        "completion_rate_pct": completion,
        "pass_rate_pct": pass_rate,
        "command_center_path": "/assessments?tab=overview",
    }
