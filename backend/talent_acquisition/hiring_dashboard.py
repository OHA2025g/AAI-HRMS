"""Smart Hiring Dashboard aggregations (hiring-pack)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from analytics.talent_kpis import compute_talent_acquisition_metrics
from talent_acquisition.candidate_source import (
    is_ai_generated_candidate,
    is_excel_imported_candidate,
    is_talent_pool_only_candidate,
)
from talent_acquisition.hiring_alerts import build_hiring_alerts, compute_health_score
from talent_acquisition.hiring_rbac import job_team_access_filter
from talent_acquisition.job_org_fields import effective_job_org
from talent_acquisition.hiring_dashboard_config import get_hiring_dashboard_config
from talent_acquisition.hiring_dashboard_schemas import (
    AiMatchAdoption,
    AssessmentHiringSlice,
    CareerTrajectoryCoverage,
    DeltaMetric,
    FunnelStage,
    HiringDashboardHeadline,
    HiringDashboardPack,
    InterviewRoundMetric,
    OfferAgingBucket,
    OfferAgingRow,
    OfferStatusCount,
    ConversionBottleneckStage,
    BottleneckSlowHireRow,
    HireJourneyRow,
    HireJourneyStageDwell,
    InterviewJourneyRow,
    ReferralMetrics,
    ReqAgingBucket,
    SourceMixItem,
    StageAgingCell,
    StageAgingSummary,
    TopJobRow,
)
from talent_acquisition.hiring_constants import (
    CAREER_TRAJECTORY_REPORTS_COLLECTION,
    STAGE_AGING_BUCKET_LABELS,
)

from talent_acquisition.hiring_threshold_config import get_low_fit_threshold

PIPELINE_STAGES = [
    "SOURCED",
    "SCREENING",
    "ASSESSMENT_SENT",
    "ASSESSMENT_CLEARED",
    "INTERVIEW_1",
    "INTERVIEW_2",
    "INTERVIEW_3",
    "HR_ROUND",
    "OFFER",
    "JOINED",
    "REJECTED",
]
FUNNEL_STAGES = [
    "SOURCED",
    "SCREENING",
    "ASSESSMENT_SENT",
    "ASSESSMENT_CLEARED",
    "INTERVIEW_1",
    "INTERVIEW_2",
    "INTERVIEW_3",
    "HR_ROUND",
    "OFFER",
    "JOINED",
]
TERMINAL_STAGES = frozenset({"JOINED", "REJECTED"})
INTERVIEW_STAGES = ("INTERVIEW_1", "INTERVIEW_2", "INTERVIEW_3", "HR_ROUND")
ACTIVE_STAGES = [s for s in PIPELINE_STAGES if s not in TERMINAL_STAGES]

FIT_BUCKETS = [
    ("<50", 0, 50),
    ("50-70", 50, 70),
    ("70-90", 70, 90),
    ("90+", 90, 101),
]

REQ_AGING_DEFS = [
    ("0-30 days", 0, 30),
    ("31-60 days", 31, 60),
    ("61-90 days", 61, 90),
    ("90+ days", 91, None),
]

OFFER_AGING_DEFS = [
    ("0-7 days", 0, 7),
    ("8-14 days", 8, 14),
    ("15-30 days", 15, 30),
    ("31+ days", 31, None),
]

OFFER_STATUS_LABELS = {
    "SENT": "Offer sent",
    "NEGOTIATION": "In negotiation",
    "ACCEPTED": "Accepted",
    "DECLINED": "Declined",
}

INTERVIEW_FUNNEL_STAGES = ("INTERVIEW_1", "INTERVIEW_2", "INTERVIEW_3", "HR_ROUND")

DISPLAY_CHANNELS = (
    ("Talent Pool-Ex", "talent_pool_ex"),
    ("Talent Pool", "talent_pool"),
    ("LinkedIn", "linkedin"),
    ("Other", "other"),
)


def _clamp_window(window_days: int) -> int:
    return max(1, min(int(window_days or 30), 365))


def _window_bounds(window_days: int) -> Tuple[str, str, str]:
    wd = _clamp_window(window_days)
    now = datetime.now(timezone.utc)
    cur_start = (now - timedelta(days=wd)).isoformat()
    prior_end = cur_start
    prior_start = (now - timedelta(days=wd * 2)).isoformat()
    return cur_start, prior_start, prior_end


def _delta_metric(current: float | int, prior: float | int | None) -> DeltaMetric:
    cur = float(current or 0)
    prv = float(prior) if prior is not None else None
    delta_pct = None
    if prv is not None and prv > 0:
        delta_pct = round(((cur - prv) / prv) * 100.0, 2)
    elif prv == 0 and cur > 0:
        delta_pct = 100.0
    return DeltaMetric(value=cur if isinstance(current, float) else int(current), prior_value=prv, delta_pct=delta_pct)


def display_source_channel(candidate: Dict[str, Any]) -> str:
    if is_excel_imported_candidate(candidate):
        return "talent_pool_ex"
    if is_ai_generated_candidate(candidate):
        return "linkedin"
    if is_talent_pool_only_candidate(candidate):
        return "talent_pool"
    return "other"


def _channel_label(channel: str) -> str:
    for label, key in DISPLAY_CHANNELS:
        if key == channel:
            return label
    return "Other"


def build_funnel(stage_counts: Dict[str, int]) -> List[FunnelStage]:
    out: List[FunnelStage] = []
    prev = None
    for stage in FUNNEL_STAGES:
        count = int(stage_counts.get(stage) or 0)
        conv = None
        if prev is not None and prev > 0:
            conv = round((count / prev) * 100.0, 2)
        out.append(
            FunnelStage(
                stage=stage,
                label=stage.replace("_", " ").title(),
                count=count,
                conversion_from_prev_pct=conv,
            )
        )
        prev = count
    return out


OFFER_FUNNEL_ORDER = ("SENT", "NEGOTIATION", "ACCEPTED", "DECLINED")


def build_offer_funnel(offer_status_counts: List[OfferStatusCount]) -> List[FunnelStage]:
    """Virtual offer lifecycle funnel from offer_status counts (apps in OFFER stage)."""
    counts_by = {row.status: row.count for row in offer_status_counts}
    out: List[FunnelStage] = []
    for status in OFFER_FUNNEL_ORDER:
        count = int(counts_by.get(status) or 0)
        out.append(
            FunnelStage(
                stage=f"OFFER_{status}",
                label=OFFER_STATUS_LABELS.get(status, status.replace("_", " ").title()),
                count=count,
                conversion_from_prev_pct=None,
            )
        )
    return out


def _days_in_stage_bucket(days: int) -> str:
    if days <= 7:
        return STAGE_AGING_BUCKET_LABELS[0]
    if days <= 14:
        return STAGE_AGING_BUCKET_LABELS[1]
    if days <= 30:
        return STAGE_AGING_BUCKET_LABELS[2]
    return STAGE_AGING_BUCKET_LABELS[3]


async def _scoped_job_ids(
    db,
    department: Optional[str],
    scope: str,
    user_id: Optional[str],
    job_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    business_pillar: Optional[str] = None,
    business_sub_department: Optional[str] = None,
    project_id: Optional[str] = None,
) -> Optional[List[str]]:
    if job_id:
        row = await db.jobs.find_one({"id": job_id}, {"_id": 0, "id": 1})
        return [job_id] if row and row.get("id") else []

    job_filter: Dict[str, Any] = {}
    scope_norm = (scope or "all").strip().lower()

    if scope_norm == "my_department":
        dept = department
        if not dept and user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
            email = (user or {}).get("email")
            if email:
                emp = await db.employees.find_one(
                    {"email": {"$regex": f"^{email}$", "$options": "i"}},
                    {"_id": 0, "department": 1, "business_department": 1},
                )
                if emp:
                    dept = emp.get("business_department") or emp.get("department")
        if dept:
            job_filter["$or"] = [
                {"business_department": {"$regex": dept, "$options": "i"}},
                {"department": {"$regex": dept, "$options": "i"}},
            ]
        elif user_id:
            job_filter["created_by"] = user_id
        else:
            return []
    elif department:
        job_filter["$or"] = [
            {"business_department": {"$regex": department, "$options": "i"}},
            {"department": {"$regex": department, "$options": "i"}},
        ]

    if owner_id:
        job_filter["created_by"] = owner_id
    elif scope_norm == "mine":
        if not user_id:
            return []
        job_filter = job_team_access_filter(user_id)

    if business_pillar:
        job_filter["business_pillar"] = {"$regex": business_pillar, "$options": "i"}
    if business_sub_department:
        job_filter["business_sub_department"] = {"$regex": business_sub_department, "$options": "i"}
    if project_id:
        job_filter["project_id"] = {"$regex": project_id, "$options": "i"}

    if not job_filter:
        return None
    rows = await db.jobs.find(job_filter, {"_id": 0, "id": 1}).to_list(5000)
    return [r["id"] for r in rows if r.get("id")]


def _with_job_scope(base: Dict[str, Any], job_ids: Optional[List[str]]) -> Dict[str, Any]:
    q = dict(base or {})
    if job_ids is not None:
        q["job_id"] = {"$in": job_ids or ["__none__"]}
    return q


def _with_job_filter(base: Dict[str, Any], job_ids: Optional[List[str]]) -> Dict[str, Any]:
    q = dict(base or {})
    if job_ids is not None:
        q["id"] = {"$in": job_ids or ["__none__"]}
    return q


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _median(values: List[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2:
        return round(ordered[mid], 2)
    return round((ordered[mid - 1] + ordered[mid]) / 2, 2)


def compute_time_to_fill_days(
    job_created_at: Dict[str, Optional[datetime]],
    joined_apps: List[Dict[str, Any]],
) -> Tuple[float | None, float | None]:
    """Median and average days from job open to JOINED for hires in window."""
    days_list: List[float] = []
    for app in joined_apps:
        jid = app.get("job_id")
        joined = _parse_dt(app.get("updated_at"))
        created = job_created_at.get(jid) if jid else None
        if not joined or not created:
            continue
        delta_days = (joined - created).total_seconds() / 86400.0
        if delta_days >= 0:
            days_list.append(delta_days)
    if not days_list:
        return None, None
    avg = round(sum(days_list) / len(days_list), 1)
    median = _median(days_list)
    return median, avg


def compute_time_to_hire_days(
    app_started_at: Dict[str, Optional[datetime]],
    joined_apps: List[Dict[str, Any]],
) -> Tuple[float | None, float | None]:
    """Median and average days from first pipeline entry to JOINED for hires in window."""
    days_list: List[float] = []
    for app in joined_apps:
        aid = app.get("id")
        joined = _parse_dt(app.get("updated_at"))
        started = app_started_at.get(aid) if aid else None
        if not joined or not started:
            continue
        delta_days = (joined - started).total_seconds() / 86400.0
        if delta_days >= 0:
            days_list.append(delta_days)
    if not days_list:
        return None, None
    avg = round(sum(days_list) / len(days_list), 1)
    median = _median(days_list)
    return median, avg


async def _application_started_at_map(
    db,
    apps: List[Dict[str, Any]],
) -> Dict[str, Optional[datetime]]:
    """Earliest stage-history timestamp per application, fallback to created_at."""
    app_ids = [a["id"] for a in apps if a.get("id")]
    earliest: Dict[str, datetime] = {}
    if app_ids:
        hist_rows = await db.application_stage_history.find(
            {"application_id": {"$in": app_ids}},
            {"_id": 0, "application_id": 1, "changed_at": 1},
        ).sort("changed_at", 1).to_list(50000)
        for row in hist_rows:
            aid = row.get("application_id")
            changed = _parse_dt(row.get("changed_at"))
            if aid and changed and aid not in earliest:
                earliest[aid] = changed
    out: Dict[str, Optional[datetime]] = {}
    for app in apps:
        aid = app.get("id")
        if not aid:
            continue
        out[aid] = earliest.get(aid) or _parse_dt(app.get("created_at"))
    return out


async def _time_to_fill_metrics(
    db,
    cur_start: str,
    prior_start: str,
    prior_end: str,
    job_ids: Optional[List[str]],
) -> Tuple[float | None, float | None, float | None, float | None]:
    """Returns (cur_median, cur_avg, prior_median, prior_avg)."""
    cur_match = _with_job_scope({"stage": "JOINED", "updated_at": {"$gte": cur_start}}, job_ids)
    prior_match = _with_job_scope(
        {"stage": "JOINED", "updated_at": {"$gte": prior_start, "$lt": prior_end}},
        job_ids,
    )
    cur_apps = await db.applications.find(cur_match, {"_id": 0, "id": 1, "job_id": 1, "updated_at": 1, "created_at": 1}).to_list(5000)
    prior_apps = await db.applications.find(prior_match, {"_id": 0, "id": 1, "job_id": 1, "updated_at": 1, "created_at": 1}).to_list(5000)

    async def _job_created_map(apps: List[Dict[str, Any]]) -> Dict[str, Optional[datetime]]:
        job_id_set = {a["job_id"] for a in apps if a.get("job_id")}
        if not job_id_set:
            return {}
        jobs = await db.jobs.find(
            {"id": {"$in": list(job_id_set)}},
            {"_id": 0, "id": 1, "created_at": 1},
        ).to_list(len(job_id_set))
        return {j["id"]: _parse_dt(j.get("created_at")) for j in jobs if j.get("id")}

    cur_jobs = await _job_created_map(cur_apps)
    prior_jobs = await _job_created_map(prior_apps)
    cur_median, cur_avg = compute_time_to_fill_days(cur_jobs, cur_apps)
    prior_median, prior_avg = compute_time_to_fill_days(prior_jobs, prior_apps)
    return cur_median, cur_avg, prior_median, prior_avg


async def _time_to_hire_metrics(
    db,
    cur_start: str,
    prior_start: str,
    prior_end: str,
    job_ids: Optional[List[str]],
) -> Tuple[float | None, float | None, float | None, float | None]:
    """Returns (cur_median, cur_avg, prior_median, prior_avg) for application journey."""
    cur_match = _with_job_scope({"stage": "JOINED", "updated_at": {"$gte": cur_start}}, job_ids)
    prior_match = _with_job_scope(
        {"stage": "JOINED", "updated_at": {"$gte": prior_start, "$lt": prior_end}},
        job_ids,
    )
    cur_apps = await db.applications.find(cur_match, {"_id": 0, "id": 1, "updated_at": 1, "created_at": 1}).to_list(5000)
    prior_apps = await db.applications.find(prior_match, {"_id": 0, "id": 1, "updated_at": 1, "created_at": 1}).to_list(5000)
    cur_started = await _application_started_at_map(db, cur_apps)
    prior_started = await _application_started_at_map(db, prior_apps)
    cur_median, cur_avg = compute_time_to_hire_days(cur_started, cur_apps)
    prior_median, prior_avg = compute_time_to_hire_days(prior_started, prior_apps)
    return cur_median, cur_avg, prior_median, prior_avg


async def _stage_aging(
    db,
    job_ids: Optional[List[str]],
) -> Tuple[List[StageAgingCell], List[StageAgingSummary]]:
    now = datetime.now(timezone.utc)
    match = _with_job_scope({"stage": {"$nin": list(TERMINAL_STAGES)}}, job_ids)
    apps = await db.applications.find(match, {"_id": 0, "id": 1, "stage": 1, "updated_at": 1}).to_list(10000)
    app_ids = [a["id"] for a in apps if a.get("id")]

    stage_entered_at: Dict[str, str] = {}
    if app_ids:
        hist_rows = await db.application_stage_history.find(
            {"application_id": {"$in": app_ids}},
            {"_id": 0, "application_id": 1, "to_stage": 1, "changed_at": 1},
        ).to_list(50000)
        latest: Dict[str, str] = {}
        for row in hist_rows:
            aid = row.get("application_id")
            stage = row.get("to_stage")
            changed = row.get("changed_at")
            if not aid or not stage or not changed:
                continue
            key = f"{aid}|{stage}"
            if key not in latest or str(changed) > latest[key]:
                latest[key] = str(changed)
        for app in apps:
            aid = app.get("id")
            stage = str(app.get("stage") or "")
            if not aid or not stage:
                continue
            stage_entered_at[aid] = latest.get(f"{aid}|{stage}") or app.get("updated_at") or ""

    matrix: Dict[str, Dict[str, int]] = {}
    totals: Dict[str, List[int]] = {}
    for app in apps:
        stage = str(app.get("stage") or "")
        aid = app.get("id")
        if not stage:
            continue
        entered = stage_entered_at.get(aid) or app.get("updated_at")
        dt = _parse_dt(entered)
        days = max(0, (now - dt).days) if dt else 0
        bucket = _days_in_stage_bucket(days)
        matrix.setdefault(stage, {b: 0 for b in STAGE_AGING_BUCKET_LABELS})
        matrix[stage][bucket] = matrix[stage].get(bucket, 0) + 1
        totals.setdefault(stage, []).append(days)

    cells: List[StageAgingCell] = []
    summary: List[StageAgingSummary] = []
    for stage, buckets in sorted(matrix.items()):
        label = stage.replace("_", " ").title()
        days_list = totals.get(stage) or []
        summary.append(
            StageAgingSummary(
                stage=stage,
                label=label,
                avg_days=round(sum(days_list) / len(days_list), 1) if days_list else None,
                count=len(days_list),
            )
        )
        for bucket, count in buckets.items():
            if count <= 0:
                continue
            cells.append(StageAgingCell(stage=stage, label=label, bucket=bucket, count=count))
    return cells, summary


def _stage_entered_at_map(
    apps: List[Dict[str, Any]],
    hist_rows: List[Dict[str, Any]],
) -> Dict[str, str]:
    """Map application_id -> ISO timestamp when current stage was entered."""
    latest: Dict[str, str] = {}
    app_stage: Dict[str, str] = {}
    for app in apps:
        aid = app.get("id")
        stage = str(app.get("stage") or "")
        if aid and stage:
            app_stage[aid] = stage

    for row in hist_rows:
        aid = row.get("application_id")
        stage = row.get("to_stage")
        changed = row.get("changed_at")
        if not aid or not stage or not changed:
            continue
        if app_stage.get(aid) != stage:
            continue
        key = f"{aid}|{stage}"
        if key not in latest or str(changed) > latest[key]:
            latest[key] = str(changed)

    entered_at: Dict[str, str] = {}
    for app in apps:
        aid = app.get("id")
        stage = str(app.get("stage") or "")
        if not aid or not stage:
            continue
        entered_at[aid] = latest.get(f"{aid}|{stage}") or app.get("updated_at") or ""
    return entered_at


async def _offer_aging_list(
    db,
    job_ids: Optional[List[str]],
    offer_sla_days: int,
) -> Tuple[List[OfferAgingRow], List[OfferAgingBucket]]:
    now = datetime.now(timezone.utc)
    match = _with_job_scope({"stage": "OFFER"}, job_ids)
    apps = await db.applications.find(
        match,
        {"_id": 0, "id": 1, "candidate_id": 1, "job_id": 1, "updated_at": 1, "offer_status": 1},
    ).to_list(500)
    if not apps:
        return [], [
            OfferAgingBucket(label=label, min_days=lo, max_days=hi, count=0)
            for label, lo, hi in OFFER_AGING_DEFS
        ]

    app_ids = [a["id"] for a in apps if a.get("id")]
    hist_rows = await db.application_stage_history.find(
        {"application_id": {"$in": app_ids}, "to_stage": "OFFER"},
        {"_id": 0, "application_id": 1, "changed_at": 1},
    ).to_list(5000)
    entered_at = _stage_entered_at_map(apps, hist_rows)

    cand_ids = list({a.get("candidate_id") for a in apps if a.get("candidate_id")})
    job_id_set = list({a.get("job_id") for a in apps if a.get("job_id")})
    cands = await db.candidates.find(
        {"id": {"$in": cand_ids}},
        {"_id": 0, "id": 1, "full_name": 1, "expected_ctc": 1},
    ).to_list(500)
    jobs = await db.jobs.find({"id": {"$in": job_id_set}}, {"_id": 0, "id": 1, "title": 1}).to_list(500)
    cand_name = {c["id"]: str(c.get("full_name") or "Unknown") for c in cands if c.get("id")}
    cand_ctc = {c["id"]: c.get("expected_ctc") for c in cands if c.get("id")}
    job_title = {j["id"]: str(j.get("title") or "Untitled") for j in jobs if j.get("id")}

    rows: List[OfferAgingRow] = []
    bucket_counts = {label: 0 for label, _, _ in OFFER_AGING_DEFS}
    for app in apps:
        aid = app.get("id")
        if not aid:
            continue
        entered_s = entered_at.get(aid) or app.get("updated_at") or ""
        dt = _parse_dt(entered_s)
        days = max(0, (now - dt).days) if dt else 0
        for label, lo, hi in OFFER_AGING_DEFS:
            if hi is None and days >= lo:
                bucket_counts[label] += 1
                break
            if hi is not None and lo <= days <= hi:
                bucket_counts[label] += 1
                break
        rows.append(
            OfferAgingRow(
                application_id=aid,
                candidate_id=str(app.get("candidate_id") or ""),
                candidate_name=cand_name.get(app.get("candidate_id"), "Unknown"),
                job_id=str(app.get("job_id") or ""),
                job_title=job_title.get(app.get("job_id"), "Untitled"),
                days_in_offer=days,
                entered_offer_at=entered_s,
                sla_days=offer_sla_days,
                sla_breached=days > offer_sla_days,
                offer_status=app.get("offer_status"),
                offer_value=cand_ctc.get(app.get("candidate_id")),
                action_path=f"/pipeline?application_id={aid}",
            )
        )
    rows.sort(key=lambda r: r.days_in_offer, reverse=True)
    buckets = [
        OfferAgingBucket(label=label, min_days=lo, max_days=hi, count=bucket_counts[label])
        for label, lo, hi in OFFER_AGING_DEFS
    ]
    return rows, buckets


async def _offer_status_counts(db, job_ids: Optional[List[str]]) -> List[OfferStatusCount]:
    match = _with_job_scope({"stage": "OFFER"}, job_ids)
    pipeline = [{"$match": match}, {"$group": {"_id": "$offer_status", "count": {"$sum": 1}}}]
    rows = await db.applications.aggregate(pipeline).to_list(20)
    out: List[OfferStatusCount] = []
    unset = 0
    for r in rows:
        status = r.get("_id")
        count = int(r.get("count") or 0)
        if not status:
            unset += count
            continue
        out.append(
            OfferStatusCount(
                status=str(status),
                label=OFFER_STATUS_LABELS.get(str(status), str(status).replace("_", " ").title()),
                count=count,
            )
        )
    if unset:
        out.append(OfferStatusCount(status="UNSET", label="Not set", count=unset))
    out.sort(key=lambda x: x.count, reverse=True)
    return out


def _interview_round_metrics(
    stage_counts: Dict[str, int],
    stage_aging_summary: List[StageAgingSummary],
) -> List[InterviewRoundMetric]:
    summary_by_stage = {s.stage: s for s in stage_aging_summary}
    out: List[InterviewRoundMetric] = []
    stages = list(INTERVIEW_FUNNEL_STAGES)
    for i, stage in enumerate(stages):
        count = int(stage_counts.get(stage) or 0)
        nxt = int(stage_counts.get(stages[i + 1]) or 0) if i + 1 < len(stages) else int(stage_counts.get("OFFER") or 0)
        conv = round(100.0 * nxt / count, 2) if count > 0 else None
        summ = summary_by_stage.get(stage)
        out.append(
            InterviewRoundMetric(
                stage=stage,
                label=stage.replace("_", " ").title(),
                active_count=count,
                avg_days=summ.avg_days if summ else None,
                conversion_to_next_pct=conv,
            )
        )
    return out


def _application_stage_dwell_rows(
    rows: List[Dict[str, Any]],
    joined_at: Optional[str],
) -> List[Tuple[str, float]]:
    """Ordered (stage, days) pairs for one application's history."""
    if not rows:
        return []
    ordered = sorted(rows, key=lambda r: str(r.get("changed_at") or ""))
    dwell: List[Tuple[str, float]] = []
    for i, row in enumerate(ordered):
        stage = str(row.get("to_stage") or "")
        if not stage or stage in TERMINAL_STAGES:
            continue
        entered = _parse_dt(row.get("changed_at"))
        if not entered:
            continue
        if i + 1 < len(ordered):
            exited = _parse_dt(ordered[i + 1].get("changed_at"))
        else:
            exited = _parse_dt(joined_at)
        if not exited or exited <= entered:
            continue
        days = round((exited - entered).total_seconds() / 86400.0, 1)
        if days >= 0:
            dwell.append((stage, days))
    return dwell


async def _conversion_bottleneck(
    db,
    cur_start: str,
    job_ids: Optional[List[str]],
) -> List[ConversionBottleneckStage]:
    match = _with_job_scope({"stage": "JOINED", "updated_at": {"$gte": cur_start}}, job_ids)
    joined_apps = await db.applications.find(match, {"_id": 0, "id": 1, "updated_at": 1}).to_list(2000)
    app_ids = [a["id"] for a in joined_apps if a.get("id")]
    if not app_ids:
        return []

    joined_at = {a["id"]: a.get("updated_at") for a in joined_apps if a.get("id")}
    hist_rows = await db.application_stage_history.find(
        {"application_id": {"$in": app_ids}},
        {"_id": 0, "application_id": 1, "to_stage": 1, "changed_at": 1},
    ).to_list(50000)

    by_app: Dict[str, List[Dict[str, Any]]] = {}
    for row in hist_rows:
        aid = row.get("application_id")
        if aid:
            by_app.setdefault(aid, []).append(row)

    stage_days: Dict[str, List[float]] = {}
    for aid, rows in by_app.items():
        for stage, days in _application_stage_dwell_rows(rows, joined_at.get(aid)):
            stage_days.setdefault(stage, []).append(days)

    result: List[ConversionBottleneckStage] = []
    for stage, days_list in stage_days.items():
        if not days_list:
            continue
        result.append(
            ConversionBottleneckStage(
                stage=stage,
                label=stage.replace("_", " ").title(),
                median_days=_median(days_list),
                avg_days=round(sum(days_list) / len(days_list), 1),
                sample_size=len(days_list),
            )
        )
    result.sort(key=lambda x: x.median_days or 0, reverse=True)
    return result


async def _recent_hire_journeys(
    db,
    cur_start: str,
    job_ids: Optional[List[str]],
    limit: int = 12,
) -> List[HireJourneyRow]:
    match = _with_job_scope({"stage": "JOINED", "updated_at": {"$gte": cur_start}}, job_ids)
    joined_apps = await db.applications.find(
        match,
        {"_id": 0, "id": 1, "candidate_id": 1, "job_id": 1, "updated_at": 1, "created_at": 1},
    ).sort("updated_at", -1).to_list(limit)
    if not joined_apps:
        return []

    app_ids = [a["id"] for a in joined_apps if a.get("id")]
    hist_rows = await db.application_stage_history.find(
        {"application_id": {"$in": app_ids}},
        {"_id": 0, "application_id": 1, "to_stage": 1, "changed_at": 1},
    ).to_list(50000)
    by_app: Dict[str, List[Dict[str, Any]]] = {}
    for row in hist_rows:
        aid = row.get("application_id")
        if aid:
            by_app.setdefault(aid, []).append(row)

    started_map = await _application_started_at_map(db, joined_apps)

    cand_ids = list({a.get("candidate_id") for a in joined_apps if a.get("candidate_id")})
    job_id_set = list({a.get("job_id") for a in joined_apps if a.get("job_id")})
    cands = await db.candidates.find({"id": {"$in": cand_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(limit)
    jobs = await db.jobs.find({"id": {"$in": job_id_set}}, {"_id": 0, "id": 1, "title": 1}).to_list(limit)
    cand_name = {c["id"]: str(c.get("full_name") or "Unknown") for c in cands if c.get("id")}
    job_title = {j["id"]: str(j.get("title") or "Untitled") for j in jobs if j.get("id")}

    journeys: List[HireJourneyRow] = []
    for app in joined_apps:
        aid = app.get("id")
        if not aid:
            continue
        joined_s = str(app.get("updated_at") or "")
        joined_dt = _parse_dt(joined_s)
        started_dt = started_map.get(aid)
        if not joined_dt or not started_dt:
            continue
        total_days = round(max(0.0, (joined_dt - started_dt).total_seconds() / 86400.0), 1)
        dwell = _application_stage_dwell_rows(by_app.get(aid) or [], joined_s)
        breakdown = [
            HireJourneyStageDwell(stage=st, label=st.replace("_", " ").title(), days=d)
            for st, d in dwell
        ]
        bottleneck_stage = None
        bottleneck_days = None
        if dwell:
            bottleneck_stage, bottleneck_days = max(dwell, key=lambda x: x[1])
        journeys.append(
            HireJourneyRow(
                application_id=aid,
                candidate_id=str(app.get("candidate_id") or ""),
                candidate_name=cand_name.get(app.get("candidate_id"), "Unknown"),
                job_id=str(app.get("job_id") or ""),
                job_title=job_title.get(app.get("job_id"), "Untitled"),
                total_days=total_days,
                bottleneck_stage=bottleneck_stage,
                bottleneck_label=bottleneck_stage.replace("_", " ").title() if bottleneck_stage else None,
                bottleneck_days=bottleneck_days,
                stage_breakdown=breakdown,
                joined_at=joined_s,
            )
        )
    journeys.sort(key=lambda j: j.total_days, reverse=True)
    return journeys


def _stage_display_label(stage: str) -> str:
    return stage.replace("_", " ").title()


def _journey_path_from_history(rows: List[Dict[str, Any]]) -> str:
    ordered: List[str] = []
    seen: set[str] = set()
    for row in sorted(rows, key=lambda item: str(item.get("changed_at") or "")):
        stage = row.get("to_stage")
        if not stage or stage in TERMINAL_STAGES or stage in seen:
            continue
        seen.add(str(stage))
        ordered.append(_stage_display_label(str(stage)))
    return " → ".join(ordered[:8])


def _interview_status(stage: str, days_in_stage: float | None) -> tuple[str, str]:
    if stage == "HR_ROUND":
        return "Ready", "green"
    if days_in_stage is not None and days_in_stage >= 7:
        return "Pending feedback", "orange"
    if days_in_stage is not None and days_in_stage >= 5:
        return "Delayed", "warn"
    return "In progress", "orange"


async def _recent_interview_journeys(
    db,
    job_ids: Optional[List[str]],
    *,
    limit: int = 8,
) -> List[InterviewJourneyRow]:
    match = _with_job_scope({"stage": {"$in": list(INTERVIEW_STAGES)}}, job_ids)
    apps = await db.applications.find(
        match,
        {"_id": 0, "id": 1, "candidate_id": 1, "job_id": 1, "stage": 1, "updated_at": 1},
    ).sort("updated_at", -1).to_list(limit)
    if not apps:
        return []

    app_ids = [a["id"] for a in apps if a.get("id")]
    hist_rows = await db.application_stage_history.find(
        {"application_id": {"$in": app_ids}},
        {"_id": 0, "application_id": 1, "to_stage": 1, "changed_at": 1},
    ).to_list(50000)
    by_app: Dict[str, List[Dict[str, Any]]] = {}
    for row in hist_rows:
        aid = row.get("application_id")
        if aid:
            by_app.setdefault(aid, []).append(row)

    cand_ids = list({a.get("candidate_id") for a in apps if a.get("candidate_id")})
    job_id_set = list({a.get("job_id") for a in apps if a.get("job_id")})
    cands = await db.candidates.find({"id": {"$in": cand_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(limit)
    jobs = await db.jobs.find({"id": {"$in": job_id_set}}, {"_id": 0, "id": 1, "title": 1}).to_list(limit)
    cand_name = {c["id"]: str(c.get("full_name") or "Unknown") for c in cands if c.get("id")}
    job_title = {j["id"]: str(j.get("title") or "Untitled") for j in jobs if j.get("id")}

    fit_map: Dict[tuple[str, str], float | None] = {}
    for app in apps:
        cid, jid = app.get("candidate_id"), app.get("job_id")
        if not cid or not jid:
            continue
        score_doc = await db.fit_scores.find_one(
            {"candidate_id": cid, "job_id": jid},
            {"_id": 0, "final_score": 1},
            sort=[("computed_at", -1)],
        )
        fit_map[(cid, jid)] = (
            float(score_doc.get("final_score"))
            if score_doc and score_doc.get("final_score") is not None
            else None
        )

    from talent_acquisition.hiring_dashboard_insights import _fit_score_label

    journeys: List[InterviewJourneyRow] = []
    now = datetime.now(timezone.utc)
    for app in apps:
        aid = app.get("id")
        cid = str(app.get("candidate_id") or "")
        jid = str(app.get("job_id") or "")
        stage = str(app.get("stage") or "")
        if not aid or not stage:
            continue
        entered_at = app.get("updated_at")
        for row in reversed(by_app.get(aid) or []):
            if row.get("to_stage") == stage and row.get("changed_at"):
                entered_at = row.get("changed_at")
                break
        days_in_stage = None
        entered_dt = _parse_dt(str(entered_at or ""))
        if entered_dt:
            days_in_stage = round(max(0.0, (now - entered_dt).total_seconds() / 86400.0), 1)
        fit_score = fit_map.get((cid, jid))
        status, tone = _interview_status(stage, days_in_stage)
        journeys.append(
            InterviewJourneyRow(
                application_id=str(aid),
                candidate_id=cid,
                candidate_name=cand_name.get(cid, "Unknown"),
                job_title=job_title.get(jid, "Untitled"),
                stage=stage,
                stage_label=_stage_display_label(stage),
                fit_score=fit_score,
                fit_label=_fit_score_label(fit_score),
                status=status,
                status_tone=tone,  # type: ignore[arg-type]
                path=_journey_path_from_history(by_app.get(aid) or []),
            )
        )
    return journeys


async def _bottleneck_slow_hires(
    db,
    cur_start: str,
    job_ids: Optional[List[str]],
    sla_by_stage: Dict[str, int],
    limit: int = 30,
) -> List[BottleneckSlowHireRow]:
    """Hires in window where a stage dwell exceeded configured SLA."""
    match = _with_job_scope({"stage": "JOINED", "updated_at": {"$gte": cur_start}}, job_ids)
    joined_apps = await db.applications.find(
        match,
        {"_id": 0, "id": 1, "candidate_id": 1, "job_id": 1, "updated_at": 1},
    ).sort("updated_at", -1).to_list(500)
    if not joined_apps:
        return []

    app_ids = [a["id"] for a in joined_apps if a.get("id")]
    hist_rows = await db.application_stage_history.find(
        {"application_id": {"$in": app_ids}},
        {"_id": 0, "application_id": 1, "to_stage": 1, "changed_at": 1},
    ).to_list(50000)
    by_app: Dict[str, List[Dict[str, Any]]] = {}
    for row in hist_rows:
        aid = row.get("application_id")
        if aid:
            by_app.setdefault(aid, []).append(row)

    cand_ids = list({a.get("candidate_id") for a in joined_apps if a.get("candidate_id")})
    job_id_set = list({a.get("job_id") for a in joined_apps if a.get("job_id")})
    cands = await db.candidates.find({"id": {"$in": cand_ids}}, {"_id": 0, "id": 1, "full_name": 1}).to_list(500)
    jobs = await db.jobs.find({"id": {"$in": job_id_set}}, {"_id": 0, "id": 1, "title": 1}).to_list(500)
    cand_name = {c["id"]: str(c.get("full_name") or "Unknown") for c in cands if c.get("id")}
    job_title = {j["id"]: str(j.get("title") or "Untitled") for j in jobs if j.get("id")}

    slow: List[BottleneckSlowHireRow] = []
    for app in joined_apps:
        aid = app.get("id")
        if not aid:
            continue
        joined_s = str(app.get("updated_at") or "")
        for stage, days in _application_stage_dwell_rows(by_app.get(aid) or [], joined_s):
            sla = int(sla_by_stage.get(stage) or 0)
            if sla <= 0 or days <= sla:
                continue
            slow.append(
                BottleneckSlowHireRow(
                    application_id=aid,
                    candidate_id=str(app.get("candidate_id") or ""),
                    candidate_name=cand_name.get(app.get("candidate_id"), "Unknown"),
                    job_title=job_title.get(app.get("job_id"), "Untitled"),
                    stage=stage,
                    label=stage.replace("_", " ").title(),
                    days=days,
                    sla_days=sla,
                    over_sla_days=round(days - sla, 1),
                    joined_at=joined_s,
                )
            )
    slow.sort(key=lambda r: r.over_sla_days, reverse=True)
    return slow[:limit]


async def _count_applications(
    db,
    query: Dict[str, Any],
) -> int:
    return int(await db.applications.count_documents(query))


async def _stage_counts(db, extra: Optional[Dict[str, Any]] = None, job_ids: Optional[List[str]] = None) -> Dict[str, int]:
    match = _with_job_scope(dict(extra or {}), job_ids)
    pipeline = []
    if match:
        pipeline.append({"$match": match})
    pipeline.extend(
        [
            {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
    )
    rows = await db.applications.aggregate(pipeline).to_list(50)
    out = {s: 0 for s in PIPELINE_STAGES}
    for r in rows:
        st = str(r.get("_id") or "")
        if st:
            out[st] = int(r.get("count") or 0)
    return out


async def _aggregate_source_mix(
    db, cutoff: str, job_ids: Optional[List[str]] = None
) -> List[SourceMixItem]:
    if job_ids is not None:
        app_match = _with_job_scope({"created_at": {"$gte": cutoff}}, job_ids)
        candidate_ids = await db.applications.distinct("candidate_id", app_match)
        if not candidate_ids:
            return []
        rows = await db.candidates.find(
            {"id": {"$in": candidate_ids}},
            {"_id": 0, "source": 1, "seed_marker": 1, "import_source_file": 1, "email": 1, "seed_job_id": 1, "seed_slot": 1},
        ).to_list(5000)
    else:
        rows = await db.candidates.find(
            {"created_at": {"$gte": cutoff}},
            {"_id": 0, "source": 1, "seed_marker": 1, "import_source_file": 1, "email": 1, "seed_job_id": 1, "seed_slot": 1},
        ).to_list(5000)
    counts = {key: 0 for _, key in DISPLAY_CHANNELS}
    for c in rows:
        ch = display_source_channel(c)
        counts[ch] = counts.get(ch, 0) + 1
    total = sum(counts.values()) or 1
    items: List[SourceMixItem] = []
    for label, key in DISPLAY_CHANNELS:
        n = counts.get(key, 0)
        if n <= 0:
            continue
        items.append(
            SourceMixItem(
                label=label,
                channel=key,
                count=n,
                pct=round(100.0 * n / total, 2),
            )
        )
    return items


async def _fit_metrics(
    db, cutoff: str, job_ids: Optional[List[str]] = None
) -> Tuple[float | None, float | None, float | None, float | None, List[Dict[str, Any]], List[Dict[str, Any]]]:
    score_filter: Dict[str, Any] = {"computed_at": {"$gte": cutoff}}
    if job_ids is not None:
        score_filter["job_id"] = {"$in": job_ids or ["__none__"]}
    scores = await db.fit_scores.find(
        score_filter,
        {"_id": 0, "final_score": 1, "candidate_id": 1},
    ).to_list(10000)
    vals: List[float] = []
    by_cand: Dict[str, float] = {}
    for s in scores:
        try:
            fs = float(s.get("final_score") or 0.0)
        except (TypeError, ValueError):
            continue
        vals.append(fs)
        cid = s.get("candidate_id")
        if cid:
            by_cand[cid] = fs

    avg = round(sum(vals) / len(vals), 2) if vals else None
    median = _median(vals)
    good_pct = round(100.0 * sum(1 for v in vals if v >= 70.0) / len(vals), 2) if vals else None
    high_pct = round(100.0 * sum(1 for v in vals if v >= 90.0) / len(vals), 2) if vals else None

    bucket_counts = {b[0]: 0 for b in FIT_BUCKETS}
    for v in vals:
        for name, lo, hi in FIT_BUCKETS:
            if lo <= v < hi:
                bucket_counts[name] += 1
                break
    total = len(vals) or 1
    distribution = [
        {"bucket": name, "count": bucket_counts[name], "pct": round(100.0 * bucket_counts[name] / total, 2)}
        for name, _, _ in FIT_BUCKETS
        if bucket_counts[name] > 0 or name in ("50-70", "70-90")
    ]

    # Quality by source — sample candidates with scores
    quality: List[Dict[str, Any]] = []
    if by_cand:
        cids = list(by_cand.keys())[:800]
        cands = await db.candidates.find({"id": {"$in": cids}}, {"_id": 0}).to_list(800)
        channel_scores: Dict[str, List[float]] = {}
        for c in cands:
            cid = c.get("id")
            if not cid or cid not in by_cand:
                continue
            ch = display_source_channel(c)
            channel_scores.setdefault(ch, []).append(by_cand[cid])
        for label, key in DISPLAY_CHANNELS:
            arr = channel_scores.get(key) or []
            if not arr:
                continue
            quality.append(
                {
                    "label": label,
                    "channel": key,
                    "avg_fit_score": round(sum(arr) / len(arr), 2),
                    "count": len(arr),
                }
            )
    return avg, good_pct, high_pct, median, distribution, quality


async def _ai_match_adoption(db, job_ids: Optional[List[str]] = None) -> AiMatchAdoption:
    open_jobs = await db.jobs.find(
        _with_job_filter({"status": "OPEN"}, job_ids),
        {"_id": 0, "id": 1, "title": 1},
    ).to_list(5000)
    open_ids = [j["id"] for j in open_jobs if j.get("id")]
    if not open_ids:
        return AiMatchAdoption()

    jobs_with_scores = set(
        await db.fit_scores.distinct("job_id", {"job_id": {"$in": open_ids}})
    )
    with_matches = sum(1 for jid in open_ids if jid in jobs_with_scores)
    without_ids = [jid for jid in open_ids if jid not in jobs_with_scores]
    title_by_id = {j["id"]: str(j.get("title") or "Untitled") for j in open_jobs if j.get("id")}
    without_list = [
        {"job_id": jid, "title": title_by_id.get(jid, "Untitled")}
        for jid in without_ids[:12]
    ]
    adoption_pct = round(100.0 * with_matches / len(open_ids), 2) if open_ids else None
    return AiMatchAdoption(
        adoption_pct=adoption_pct,
        open_jobs=len(open_ids),
        jobs_with_matches=with_matches,
        jobs_without_matches_count=len(without_ids),
        jobs_without_matches=without_list,
    )


async def _department_risk_metrics(
    db,
    job_ids: Optional[List[str]] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, int], Dict[str, float], Dict[str, int]]:
    """Aggregate open-job, ageing, stuck-candidate, and empty-pipeline signals by department."""
    from talent_acquisition.hiring_dashboard_insights import department_label_from_job
    from talent_acquisition.hiring_threshold_config import get_stage_sla_days

    now = datetime.now(timezone.utc)
    jobs = await db.jobs.find(
        _with_job_filter({"status": "OPEN"}, job_ids),
        {
            "_id": 0,
            "id": 1,
            "status": 1,
            "created_at": 1,
            "title": 1,
            "business_department": 1,
            "department": 1,
            "business_pillar": 1,
            "business_sub_department": 1,
        },
    ).to_list(5000)

    job_dept: Dict[str, str] = {}
    req_age_sum: Dict[str, float] = {}
    req_age_count: Dict[str, int] = {}

    for job in jobs:
        dept = department_label_from_job(job)
        jid = job.get("id")
        if jid:
            job_dept[jid] = dept
        created = _parse_dt(job.get("created_at"))
        if created:
            days = max(0, (now - created).days)
            req_age_sum[dept] = req_age_sum.get(dept, 0.0) + days
            req_age_count[dept] = req_age_count.get(dept, 0) + 1

    req_age_by_dept = {
        dept: round(req_age_sum[dept] / req_age_count[dept], 1)
        for dept in req_age_sum
        if req_age_count.get(dept)
    }

    open_ids = [j["id"] for j in jobs if j.get("id")]
    jobs_with_apps: set[str] = set()
    if open_ids:
        jobs_with_apps = set(await db.applications.distinct("job_id", {"job_id": {"$in": open_ids}}))

    empty_pipeline_by_dept: Dict[str, int] = {}
    for job in jobs:
        jid = job.get("id")
        if not jid or jid in jobs_with_apps:
            continue
        dept = department_label_from_job(job)
        empty_pipeline_by_dept[dept] = empty_pipeline_by_dept.get(dept, 0) + 1

    stuck_by_dept: Dict[str, int] = {}
    if open_ids:
        sla_map = get_stage_sla_days()
        apps = await db.applications.find(
            {"job_id": {"$in": open_ids}},
            {"_id": 0, "job_id": 1, "stage": 1, "updated_at": 1},
        ).to_list(20000)
        for app in apps:
            stage = app.get("stage")
            sla = sla_map.get(stage)
            if not sla:
                continue
            updated = _parse_dt(app.get("updated_at"))
            if not updated or (now - updated).days <= sla:
                continue
            dept = job_dept.get(app.get("job_id") or "")
            if dept:
                stuck_by_dept[dept] = stuck_by_dept.get(dept, 0) + 1

    return jobs, stuck_by_dept, req_age_by_dept, empty_pipeline_by_dept


async def _req_aging(db, job_ids: Optional[List[str]] = None) -> Tuple[List[ReqAgingBucket], int, int]:
    now = datetime.now(timezone.utc)
    jobs = await db.jobs.find(_with_job_filter({"status": "OPEN"}, job_ids), {"_id": 0, "id": 1, "created_at": 1}).to_list(5000)
    buckets = {label: 0 for label, _, _ in REQ_AGING_DEFS}
    over_60 = 0
    over_90 = 0
    for j in jobs:
        created = j.get("created_at")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
        except ValueError:
            continue
        days = max(0, (now - dt).days)
        if days > 60:
            over_60 += 1
        if days > 90:
            over_90 += 1
        for label, lo, hi in REQ_AGING_DEFS:
            if hi is None and days >= lo:
                buckets[label] += 1
                break
            if hi is not None and lo <= days <= hi:
                buckets[label] += 1
                break
    return (
        [ReqAgingBucket(label=label, min_days=lo, max_days=hi, count=buckets[label]) for label, lo, hi in REQ_AGING_DEFS],
        over_60,
        over_90,
    )


async def _top_jobs(db, job_ids: Optional[List[str]] = None, limit: int = 10) -> List[TopJobRow]:
    jobs = await db.jobs.find(_with_job_filter({"status": "OPEN"}, job_ids), {"_id": 0, "id": 1, "title": 1, "status": 1, "created_at": 1}).to_list(200)
    now = datetime.now(timezone.utc)
    rows: List[TopJobRow] = []
    for j in jobs:
        jid = j.get("id")
        if not jid:
            continue
        pipeline_count = await db.applications.count_documents({"job_id": jid, "stage": {"$nin": list(TERMINAL_STAGES)}})
        created = j.get("created_at")
        open_days = 0
        if created:
            try:
                dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                open_days = max(0, (now - dt).days)
            except ValueError:
                pass
        fit_rows = await db.fit_scores.find({"job_id": jid}, {"_id": 0, "final_score": 1}).to_list(500)
        avg_fit = None
        if fit_rows:
            vals = [float(x.get("final_score") or 0) for x in fit_rows]
            avg_fit = round(sum(vals) / len(vals), 2)
        rows.append(
            TopJobRow(
                job_id=jid,
                title=str(j.get("title") or "Untitled"),
                status=str(j.get("status") or "OPEN"),
                open_days=open_days,
                pipeline_count=int(pipeline_count),
                avg_fit_score=avg_fit,
            )
        )
    rows.sort(key=lambda r: (-r.pipeline_count, -r.open_days))
    return rows[:limit]


async def _first_low_fit_open_job_id(
    db,
    job_ids: Optional[List[str]] = None,
    threshold: float = 0,
) -> Optional[str]:
    if threshold <= 0:
        threshold = get_low_fit_threshold()
    open_ids = [
        j["id"]
        for j in await db.jobs.find(
            _with_job_filter({"status": "OPEN"}, job_ids),
            {"_id": 0, "id": 1},
        ).to_list(5000)
        if j.get("id")
    ]
    if not open_ids:
        return None

    rows = await db.fit_scores.aggregate(
        [
            {"$match": {"job_id": {"$in": open_ids}}},
            {"$group": {"_id": "$job_id", "avg_fit": {"$avg": "$final_score"}}},
            {"$match": {"avg_fit": {"$lt": threshold}}},
            {"$limit": 1},
        ]
    ).to_list(1)
    if not rows:
        return None
    return str(rows[0].get("_id") or "")


async def _count_high_fit_candidates_7d(
    db,
    job_ids: Optional[List[str]] = None,
    min_score: float = 90.0,
) -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    app_match = _with_job_scope({"created_at": {"$gte": cutoff}}, job_ids)
    pipeline = [
        {"$match": app_match},
        {
            "$lookup": {
                "from": "fit_scores",
                "let": {"jid": "$job_id", "cid": "$candidate_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$eq": ["$job_id", "$$jid"]},
                                    {"$eq": ["$candidate_id", "$$cid"]},
                                    {"$gte": ["$final_score", min_score]},
                                ]
                            }
                        }
                    },
                    {"$limit": 1},
                ],
                "as": "fit",
            }
        },
        {"$match": {"fit.0": {"$exists": True}}},
        {"$count": "n"},
    ]
    rows = await db.applications.aggregate(pipeline).to_list(1)
    if not rows:
        return 0
    return int(rows[0].get("n") or 0)


async def _count_low_fit_open_jobs(
    db,
    job_ids: Optional[List[str]] = None,
    threshold: float = 0,
) -> int:
    if threshold <= 0:
        threshold = get_low_fit_threshold()
    open_ids = [
        j["id"]
        for j in await db.jobs.find(
            _with_job_filter({"status": "OPEN"}, job_ids),
            {"_id": 0, "id": 1},
        ).to_list(5000)
        if j.get("id")
    ]
    if not open_ids:
        return 0

    rows = await db.fit_scores.aggregate(
        [
            {"$match": {"job_id": {"$in": open_ids}}},
            {"$group": {"_id": "$job_id", "avg_fit": {"$avg": "$final_score"}}},
            {"$match": {"avg_fit": {"$lt": threshold}}},
        ]
    ).to_list(5000)
    return len(rows)


async def _referral_metrics(
    db,
    cur_start: str,
    job_ids: Optional[List[str]],
    new_apps: int,
) -> ReferralMetrics:
    ref_filter: Dict[str, Any] = {"created_at": {"$gte": cur_start}}
    if job_ids is not None:
        ref_filter["job_id"] = {"$in": job_ids or ["__none__"]}
    referrals_in_window = await db.referrals.count_documents(ref_filter)
    referral_share = round(100.0 * referrals_in_window / new_apps, 2) if new_apps else None

    hire_filter = _with_job_scope({"stage": "JOINED", "updated_at": {"$gte": cur_start}}, job_ids)
    hired_apps = await db.applications.find(
        hire_filter,
        {"_id": 0, "candidate_id": 1, "job_id": 1},
    ).to_list(5000)
    ref_pairs = {
        (r.get("candidate_id"), r.get("job_id"))
        for r in await db.referrals.find(ref_filter, {"_id": 0, "candidate_id": 1, "job_id": 1}).to_list(5000)
        if r.get("candidate_id") and r.get("job_id")
    }
    hires_from_referrals = sum(
        1
        for app in hired_apps
        if (app.get("candidate_id"), app.get("job_id")) in ref_pairs
    )

    return ReferralMetrics(
        referrals_in_window=int(referrals_in_window),
        referral_share_pct=referral_share,
        hires_from_referrals_in_window=int(hires_from_referrals),
    )


async def _career_trajectory_coverage(
    db,
    job_ids: Optional[List[str]] = None,
) -> CareerTrajectoryCoverage:
    active_match = _with_job_scope({"stage": {"$nin": list(TERMINAL_STAGES)}}, job_ids)
    candidate_ids = await db.applications.distinct("candidate_id", active_match)
    candidate_ids = [cid for cid in candidate_ids if cid]
    if not candidate_ids:
        return CareerTrajectoryCoverage()

    with_report = await db[CAREER_TRAJECTORY_REPORTS_COLLECTION].distinct(
        "candidate_id",
        {"candidate_id": {"$in": candidate_ids}},
    )
    with_report = [cid for cid in with_report if cid]
    coverage = round(100.0 * len(with_report) / len(candidate_ids), 2) if candidate_ids else None
    return CareerTrajectoryCoverage(
        candidates_with_report=len(with_report),
        active_pipeline_candidates=len(candidate_ids),
        coverage_pct=coverage,
    )


async def _stuck_by_stage(db, job_ids: Optional[List[str]] = None) -> Dict[str, int]:
    from talent_acquisition.hiring_threshold_config import get_stage_sla_days

    now = datetime.now(timezone.utc)
    out: Dict[str, int] = {}
    for stage, sla in get_stage_sla_days().items():
        cutoff = now - timedelta(days=sla)
        match = _with_job_scope({"stage": stage}, job_ids)
        apps = await db.applications.find(match, {"_id": 0, "id": 1, "updated_at": 1}).to_list(10000)
        app_ids = [a["id"] for a in apps if a.get("id")]
        entered_at: Dict[str, str] = {}
        if app_ids:
            hist_rows = await db.application_stage_history.find(
                {"application_id": {"$in": app_ids}, "to_stage": stage},
                {"_id": 0, "application_id": 1, "changed_at": 1},
            ).to_list(50000)
            latest: Dict[str, str] = {}
            for row in hist_rows:
                aid = row.get("application_id")
                changed = row.get("changed_at")
                if not aid or not changed:
                    continue
                if aid not in latest or str(changed) > latest[aid]:
                    latest[aid] = str(changed)
            for app in apps:
                aid = app.get("id")
                if aid:
                    entered_at[aid] = latest.get(aid) or app.get("updated_at") or ""

        stuck = 0
        for app in apps:
            aid = app.get("id")
            dt = _parse_dt(entered_at.get(aid) if aid else None)
            if dt and dt <= cutoff:
                stuck += 1
        out[stage] = stuck
    return out


async def _recent_activities(db, job_ids: Optional[List[str]] = None, limit: int = 10) -> List[Dict[str, Any]]:
    q = _with_job_scope({}, job_ids)
    cursor = db.applications.find(q, {"_id": 0}).sort("updated_at", -1).limit(limit)
    recent_apps = await cursor.to_list(limit)
    out: List[Dict[str, Any]] = []
    for app in recent_apps:
        candidate = await db.candidates.find_one({"id": app.get("candidate_id")}, {"_id": 0, "full_name": 1})
        job = await db.jobs.find_one({"id": app.get("job_id")}, {"_id": 0, "title": 1})
        out.append(
            {
                "type": "application",
                "application_id": app.get("id"),
                "candidate_id": app.get("candidate_id"),
                "job_id": app.get("job_id"),
                "candidate_name": (candidate or {}).get("full_name") or "Unknown",
                "job_title": (job or {}).get("title") or "Unknown",
                "stage": app.get("stage"),
                "timestamp": app.get("updated_at"),
            }
        )
    return out


async def _count_stale_open_jobs_zero_interviews(
    db,
    job_ids: Optional[List[str]],
    *,
    stale_days: int = 90,
) -> int:
    """Open jobs older than stale_days with no applications in interview stages."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=stale_days)
    open_jobs = await db.jobs.find(
        _with_job_filter({"status": "OPEN"}, job_ids),
        {"_id": 0, "id": 1, "created_at": 1},
    ).to_list(5000)
    stale_ids = [
        j["id"]
        for j in open_jobs
        if j.get("id") and _parse_dt(j.get("created_at")) and _parse_dt(j.get("created_at")) < cutoff
    ]
    if not stale_ids:
        return 0
    with_interview = set(
        await db.applications.distinct(
            "job_id",
            {"job_id": {"$in": stale_ids}, "stage": {"$in": list(INTERVIEW_STAGES)}},
        )
    )
    return max(0, len(stale_ids) - len(with_interview))


def _org_field_matches(value: Any, needle: Optional[str]) -> bool:
    if not needle or not value:
        return False
    return str(needle).strip().lower() in str(value).strip().lower()


def _job_department_label(job: Dict[str, Any]) -> Optional[str]:
    org = effective_job_org(job)
    return org.get("business_department")


def _job_matches_org_filters(
    job: Dict[str, Any],
    *,
    business_pillar: Optional[str] = None,
    department: Optional[str] = None,
    business_sub_department: Optional[str] = None,
) -> bool:
    org = effective_job_org(job)
    if business_pillar and not _org_field_matches(org.get("business_pillar"), business_pillar):
        return False
    if department and not _org_field_matches(org.get("business_department"), department):
        return False
    if business_sub_department and not _org_field_matches(org.get("business_sub_department"), business_sub_department):
        return False
    return True


async def get_dashboard_filter_options(
    db,
    job_ids: Optional[List[str]] = None,
    business_pillar: Optional[str] = None,
    department: Optional[str] = None,
    business_sub_department: Optional[str] = None,
) -> Dict[str, List[str]]:
    """Distinct org filter values from scoped open jobs (cascading by parent selections)."""
    filt = _with_job_filter({"status": "OPEN"}, job_ids)
    jobs = await db.jobs.find(
        filt,
        {
            "_id": 0,
            "business_pillar": 1,
            "business_department": 1,
            "department": 1,
            "business_sub_department": 1,
            "project_id": 1,
        },
    ).to_list(5000)

    def _uniq_org(job_list: List[Dict[str, Any]], field: str) -> List[str]:
        seen = set()
        out: List[str] = []
        for j in job_list:
            val = effective_job_org(j).get(field)
            if val and str(val).strip() and str(val) not in seen:
                seen.add(str(val))
                out.append(str(val).strip())
        return sorted(out)

    dept_jobs = [j for j in jobs if _job_matches_org_filters(j, business_pillar=business_pillar)]
    sub_dept_jobs = [
        j
        for j in jobs
        if _job_matches_org_filters(j, business_pillar=business_pillar, department=department)
    ]
    project_jobs = [
        j
        for j in jobs
        if _job_matches_org_filters(
            j,
            business_pillar=business_pillar,
            department=department,
            business_sub_department=business_sub_department,
        )
    ]

    return {
        "pillars": _uniq_org(jobs, "business_pillar"),
        "departments": _uniq_org(dept_jobs, "business_department"),
        "sub_departments": _uniq_org(sub_dept_jobs, "business_sub_department"),
        "project_ids": _uniq_org(project_jobs, "project_id"),
    }


async def _count_high_fit_awaiting_review(db, job_ids: Optional[List[str]]) -> int:
    match = _with_job_scope(
        {"stage": {"$in": ["SOURCED", "SCREENING"]}},
        job_ids,
    )
    apps = await db.applications.find(match, {"_id": 0, "id": 1, "candidate_id": 1, "job_id": 1}).to_list(5000)
    if not apps:
        return 0
    count = 0
    for app in apps:
        cid, jid = app.get("candidate_id"), app.get("job_id")
        if not cid or not jid:
            continue
        score = await db.fit_scores.find_one(
            {"candidate_id": cid, "job_id": jid},
            {"_id": 0, "final_score": 1},
            sort=[("computed_at", -1)],
        )
        if score and float(score.get("final_score") or 0) >= 90:
            count += 1
    return count


async def _aggregate_talent_intelligence(db, job_ids: Optional[List[str]]) -> Dict[str, int]:
    match = _with_job_scope({"stage": {"$nin": list(TERMINAL_STAGES)}}, job_ids)
    apps = await db.applications.find(match, {"_id": 0, "candidate_id": 1, "job_id": 1}).to_list(2000)
    cand_ids = list({a.get("candidate_id") for a in apps if a.get("candidate_id")})
    job_id_list = list({a.get("job_id") for a in apps if a.get("job_id")})
    skill_counts: Dict[str, int] = {}
    if cand_ids:
        cands = await db.candidates.find({"id": {"$in": cand_ids}}, {"_id": 0, "skills": 1}).to_list(2000)
        for c in cands:
            for sk in c.get("skills") or []:
                name = sk.get("skill_name") if isinstance(sk, dict) else str(sk)
                if name and name.strip():
                    key = name.strip()
                    skill_counts[key] = skill_counts.get(key, 0) + 1
    if job_id_list:
        jobs = await db.jobs.find({"id": {"$in": job_id_list}}, {"_id": 0, "must_have_skills": 1}).to_list(500)
        for j in jobs:
            for sk in j.get("must_have_skills") or []:
                key = str(sk).strip()
                if key:
                    skill_counts[key] = skill_counts.get(key, 0) + 1
    return skill_counts


async def _recruiter_performance_rows(db, job_ids: Optional[List[str]]) -> List[Dict[str, Any]]:
    filt = _with_job_filter({}, job_ids)
    jobs = await db.jobs.find(filt, {"_id": 0, "id": 1, "created_by": 1, "status": 1}).to_list(5000)
    by_recruiter: Dict[str, Dict[str, int]] = {}
    for j in jobs:
        uid = j.get("created_by")
        if not uid:
            continue
        bucket = by_recruiter.setdefault(str(uid), {"open": 0, "filled": 0})
        if str(j.get("status") or "").upper() == "OPEN":
            bucket["open"] += 1
        elif str(j.get("status") or "").upper() in ("CLOSED", "FILLED"):
            bucket["filled"] += 1
    user_ids = list(by_recruiter.keys())
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "full_name": 1, "email": 1}).to_list(500)
    user_map = {u["id"]: u.get("full_name") or u.get("email") or u["id"] for u in users if u.get("id")}
    rows: List[Dict[str, Any]] = []
    for uid, stats in by_recruiter.items():
        total = stats["open"] + stats["filled"]
        fill_rate = round(100.0 * stats["filled"] / total, 2) if total else None
        stuck = await db.applications.count_documents(
            _with_job_scope({"stage": "ASSESSMENT_SENT"}, [j["id"] for j in jobs if j.get("created_by") == uid][:500])
        )
        from talent_acquisition.hiring_dashboard_insights import recruiter_health_score

        rows.append(
            {
                "recruiter_id": uid,
                "recruiter_name": user_map.get(uid, f"Recruiter ({uid[:8]}…)"),
                "reqs": stats["open"],
                "fill_rate_pct": fill_rate,
                "health_score": recruiter_health_score(stuck, 0),
            }
        )
    return rows


async def build_hiring_dashboard_pack(
    db,
    *,
    window_days: int = 30,
    department: Optional[str] = None,
    scope: str = "all",
    user_id: Optional[str] = None,
    job_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    business_pillar: Optional[str] = None,
    business_sub_department: Optional[str] = None,
    project_id: Optional[str] = None,
) -> HiringDashboardPack:
    wd = _clamp_window(window_days)
    cur_start, prior_start, prior_end = _window_bounds(wd)
    now_iso = datetime.now(timezone.utc).isoformat()
    scope_norm = (scope or "all").strip().lower()
    job_ids = await _scoped_job_ids(
        db,
        department,
        scope_norm,
        user_id,
        job_id=job_id,
        owner_id=owner_id,
        business_pillar=business_pillar,
        business_sub_department=business_sub_department,
        project_id=project_id,
    )
    dashboard_config = await get_hiring_dashboard_config(db)

    open_jobs = await db.jobs.count_documents(_with_job_filter({"status": "OPEN"}, job_ids))
    total_jobs = await db.jobs.count_documents(_with_job_filter({}, job_ids) if job_ids is not None else {})
    total_candidates = await db.candidates.count_documents({})
    total_applications = await db.applications.count_documents(_with_job_scope({}, job_ids))

    new_open_in_cur = await db.jobs.count_documents(
        _with_job_filter({"status": "OPEN", "created_at": {"$gte": cur_start}}, job_ids)
    )
    new_open_in_prior = await db.jobs.count_documents(
        _with_job_filter({"status": "OPEN", "created_at": {"$gte": prior_start, "$lt": prior_end}}, job_ids)
    )
    prior_open = max(0, int(open_jobs - new_open_in_cur + new_open_in_prior))

    active_pipeline = await _count_applications(
        db, _with_job_scope({"stage": {"$nin": list(TERMINAL_STAGES)}}, job_ids)
    )
    prior_active = await _count_applications(
        db,
        _with_job_scope(
            {
                "stage": {"$nin": list(TERMINAL_STAGES)},
                "updated_at": {"$gte": prior_start, "$lt": prior_end},
            },
            job_ids,
        ),
    )

    new_apps = await _count_applications(db, _with_job_scope({"created_at": {"$gte": cur_start}}, job_ids))
    prior_new_apps = await _count_applications(
        db, _with_job_scope({"created_at": {"$gte": prior_start, "$lt": prior_end}}, job_ids)
    )

    hires = await _count_applications(
        db, _with_job_scope({"stage": "JOINED", "updated_at": {"$gte": cur_start}}, job_ids)
    )
    prior_hires = await _count_applications(
        db, _with_job_scope({"stage": "JOINED", "updated_at": {"$gte": prior_start, "$lt": prior_end}}, job_ids)
    )

    cur_ttf_median, _, prior_ttf_median, _ = await _time_to_fill_metrics(
        db, cur_start, prior_start, prior_end, job_ids
    )
    cur_tth_median, _, prior_tth_median, _ = await _time_to_hire_metrics(
        db, cur_start, prior_start, prior_end, job_ids
    )

    avg_fit, good_fit_pct, high_fit_pct, median_fit, fit_distribution, quality_by_source = await _fit_metrics(
        db, cur_start, job_ids
    )
    _, prior_good, prior_high, _, prior_fit_distribution, _ = await _fit_metrics(db, prior_start, job_ids)
    prior_avg = None
    if prior_fit_distribution:
        prior_filter: Dict[str, Any] = {"computed_at": {"$gte": prior_start, "$lt": prior_end}}
        if job_ids is not None:
            prior_filter["job_id"] = {"$in": job_ids or ["__none__"]}
        prior_scores = await db.fit_scores.find(
            prior_filter,
            {"_id": 0, "final_score": 1},
        ).to_list(5000)
        pvals = [float(s.get("final_score") or 0) for s in prior_scores]
        prior_avg = round(sum(pvals) / len(pvals), 2) if pvals else None
        prior_high = round(100.0 * sum(1 for v in pvals if v >= 90) / len(pvals), 2) if pvals else None
        prior_good = round(100.0 * sum(1 for v in pvals if v >= 70) / len(pvals), 2) if pvals else None
    else:
        prior_high = None
        prior_good = None

    stage_counts = await _stage_counts(db, job_ids=job_ids)
    stage_counts_window = await _stage_counts(
        db, extra={"created_at": {"$gte": cur_start}}, job_ids=job_ids
    )
    funnel = build_funnel(stage_counts)
    stage_aging, stage_aging_summary = await _stage_aging(db, job_ids)

    pending_offers = int(stage_counts.get("OFFER") or 0)
    prior_pending = await _count_applications(
        db,
        _with_job_scope(
            {"stage": "OFFER", "updated_at": {"$gte": prior_start, "$lt": prior_end}},
            job_ids,
        ),
    )

    offer_sla = int((dashboard_config.stage_sla_days or {}).get("OFFER") or 7)
    offer_aging, offer_aging_buckets = await _offer_aging_list(db, job_ids, offer_sla)
    offer_status_counts = await _offer_status_counts(db, job_ids)
    offer_funnel = build_offer_funnel(offer_status_counts)
    interview_round_metrics = _interview_round_metrics(stage_counts, stage_aging_summary)
    conversion_bottleneck = await _conversion_bottleneck(db, cur_start, job_ids)
    hire_journeys = await _recent_hire_journeys(db, cur_start, job_ids)
    interview_journeys = await _recent_interview_journeys(db, job_ids)
    sla_map = dict(dashboard_config.stage_sla_days or {})
    bottleneck_slow_hires = await _bottleneck_slow_hires(db, cur_start, job_ids, sla_map)

    sourced = stage_counts.get("SOURCED") or 0
    interview = stage_counts.get("INTERVIEW_1") or 0
    interview_yield = round(100.0 * interview / sourced, 2) if sourced else None

    sent = stage_counts.get("ASSESSMENT_SENT") or 0
    cleared = stage_counts.get("ASSESSMENT_CLEARED") or 0
    assessment_pass = round(100.0 * cleared / sent, 2) if sent else None

    source_mix = await _aggregate_source_mix(db, cur_start, job_ids)
    req_aging, over_60, over_90 = await _req_aging(db, job_ids)
    top_jobs = await _top_jobs(db, job_ids)
    stuck = await _stuck_by_stage(db, job_ids)
    stuck_total = sum(stuck.values())
    ai_match_adoption = await _ai_match_adoption(db, job_ids)
    referral_metrics = await _referral_metrics(db, cur_start, job_ids, new_apps)
    career_trajectory_coverage = await _career_trajectory_coverage(db, job_ids)

    open_job_ids = {
        j["id"]
        for j in await db.jobs.find(_with_job_filter({"status": "OPEN"}, job_ids), {"_id": 0, "id": 1}).to_list(5000)
        if j.get("id")
    }
    jobs_with_apps = set()
    if open_job_ids:
        app_jobs = await db.applications.distinct("job_id", {"job_id": {"$in": list(open_job_ids)}})
        jobs_with_apps = set(app_jobs)
    jobs_without_pipeline = max(0, len(open_job_ids) - len(jobs_with_apps))

    low_fit_jobs = await _count_low_fit_open_jobs(db, job_ids)
    low_fit_job_id = await _first_low_fit_open_job_id(db, job_ids) if low_fit_jobs else None
    high_fit_candidates_7d = await _count_high_fit_candidates_7d(db, job_ids)

    funnel_to_interview = None
    if funnel:
        for f in funnel:
            if f.stage == "INTERVIEW_1" and f.conversion_from_prev_pct is not None:
                funnel_to_interview = f.conversion_from_prev_pct
                break

    health_score, health_status = compute_health_score(
        funnel_conversion_to_interview=funnel_to_interview,
        avg_fit=avg_fit,
        req_aging_over_60=over_60,
        open_jobs=open_jobs,
        stuck_total=stuck_total,
    )

    stale_zero_interviews = await _count_stale_open_jobs_zero_interviews(
        db,
        job_ids,
        stale_days=dashboard_config.stale_req_zero_interviews_days,
    )

    alerts = build_hiring_alerts(
        stuck_by_stage=stuck,
        req_aging_over_60=over_60,
        req_aging_over_90=over_90,
        jobs_without_pipeline=jobs_without_pipeline,
        low_fit_jobs=low_fit_jobs,
        jobs_without_ai_matches=ai_match_adoption.jobs_without_matches_count,
        high_fit_candidates_7d=high_fit_candidates_7d,
        low_fit_job_id=low_fit_job_id,
        stale_req_zero_interviews=stale_zero_interviews,
        dashboard_config=dashboard_config,
    )

    talent_acquisition = await compute_talent_acquisition_metrics(db, window_days=wd, job_ids=job_ids)
    recent = await _recent_activities(db, job_ids)

    from talent_acquisition.assessments_analytics import build_assessment_hiring_slice

    assessment_slice_raw = await build_assessment_hiring_slice(db, window_days=wd, job_ids=job_ids)
    assessment_slice = AssessmentHiringSlice(
        funnel=assessment_slice_raw.get("funnel") or [],
        completion_rate_pct=assessment_slice_raw.get("completion_rate_pct"),
        pass_rate_pct=assessment_slice_raw.get("pass_rate_pct"),
        command_center_path=assessment_slice_raw.get("command_center_path") or "/assessments?tab=overview",
    )

    from talent_acquisition.hiring_dashboard_insights import (
        build_ai_insights,
        build_ai_recommendation,
        build_analytics_summary,
        build_department_risk,
        build_hero_risk_metrics,
        build_interview_action_queue,
        build_offer_insight,
        build_offer_priority_actions,
        build_recruiter_performance,
        build_signal_recommendations,
        build_signal_strength,
        build_smart_actions,
        build_tab_kpis,
        build_talent_intelligence,
        build_talent_quality,
        compute_expected_hires,
        compute_offer_acceptance_pct,
    )

    high_fit_awaiting = await _count_high_fit_awaiting_review(db, job_ids)
    hero_risk = build_hero_risk_metrics(
        over_60=over_60,
        over_90=over_90,
        stale_zero_interviews=stale_zero_interviews,
        high_fit_awaiting=high_fit_awaiting,
    )
    alerts_dicts = [a if isinstance(a, dict) else (a.model_dump() if hasattr(a, 'model_dump') else dict(a)) for a in alerts]
    ai_rec = build_ai_recommendation(alerts_dicts)
    ai_insights = build_ai_insights(alerts_dicts)
    insights_source = "rule_based"

    offer_acceptance = compute_offer_acceptance_pct(offer_status_counts)
    interview_ready = int(stage_counts.get("ASSESSMENT_CLEARED") or 0) + int(stage_counts.get("INTERVIEW_1") or 0)
    expected_hires_val = compute_expected_hires(
        window_days=wd,
        hires_in_window=hires,
        pending_offers=pending_offers,
        interview_ready=interview_ready,
        monthly_target=dashboard_config.monthly_hire_target,
    )
    prior_expected = compute_expected_hires(
        window_days=wd,
        hires_in_window=prior_hires,
        pending_offers=prior_pending,
        interview_ready=0,
        monthly_target=dashboard_config.monthly_hire_target,
    )

    open_jobs_rows, stuck_by_dept, req_age_by_dept, empty_pipeline_by_dept = await _department_risk_metrics(
        db, job_ids
    )
    dept_risk = build_department_risk(
        open_jobs_rows,
        stuck_by_dept,
        req_age_by_dept,
        empty_pipeline_by_dept,
    )
    skill_counts = await _aggregate_talent_intelligence(db, job_ids)
    talent_intel = build_talent_intelligence(skill_counts)
    recruiter_rows = build_recruiter_performance(await _recruiter_performance_rows(db, job_ids))
    stuck_assessment = int(stuck.get("ASSESSMENT_SENT") or 0)
    schedule_interviews = int(stage_counts.get("ASSESSMENT_CLEARED") or 0)
    smart_actions = build_smart_actions(
        pending_offers=pending_offers,
        high_fit_count=high_fit_awaiting,
        schedule_interviews=schedule_interviews,
        escalate_delays=over_60 + over_90,
        hiring_risks=len([a for a in alerts if (a.severity if hasattr(a, 'severity') else a.get('severity')) == 'critical']),
    )
    interview_action_queue = build_interview_action_queue(interview_round_metrics, smart_actions)
    ai_recommended = await _count_applications(
        db,
        _with_job_scope({"stage": {"$in": list(INTERVIEW_STAGES)}}, job_ids),
    )
    talent_quality = build_talent_quality(fit_distribution, ai_recommended)

    sourced_avg = None
    for s in stage_aging_summary:
        if s.stage == "SOURCED":
            sourced_avg = s.avg_days
            break
    funnel_to_offer = None
    if funnel and funnel[0].count > 0:
        offer_count = int(stage_counts.get("OFFER") or 0)
        funnel_to_offer = round(100.0 * offer_count / funnel[0].count, 2)

    tab_kpis = build_tab_kpis(
        stage_counts=stage_counts,
        active_pipeline=active_pipeline,
        stuck_assessment=stuck_assessment,
        offer_status_counts=offer_status_counts,
        offer_aging=offer_aging,
        interview_round_metrics=interview_round_metrics,
        new_apps=new_apps,
        avg_fit=avg_fit,
        high_fit_pct=high_fit_pct,
        funnel_to_offer_pct=funnel_to_offer,
        avg_stage_age=sourced_avg,
    )
    offer_at_risk = sum(1 for r in offer_aging if r.sla_breached)
    offer_insight = build_offer_insight(offer_aging, offer_at_risk)
    offer_priority = build_offer_priority_actions(offer_aging)
    signal_strength = build_signal_strength(
        ai_adoption_pct=ai_match_adoption.adoption_pct,
        avg_fit=avg_fit,
        trajectory_coverage_pct=career_trajectory_coverage.coverage_pct,
        referral_share_pct=referral_metrics.referral_share_pct,
    )
    signal_recs = build_signal_recommendations(
        trajectory_coverage_pct=career_trajectory_coverage.coverage_pct,
        ai_adoption_pct=ai_match_adoption.adoption_pct,
        referral_share_pct=referral_metrics.referral_share_pct,
    )
    analytics_summary = build_analytics_summary(
        new_apps=new_apps,
        prior_new_apps=prior_new_apps,
        sourced_avg_days=sourced_avg,
        sourced_count=int(stage_counts.get("SOURCED") or 0),
        median_fit=median_fit,
    )

    headline = HiringDashboardHeadline(
        open_jobs=_delta_metric(open_jobs, prior_open),
        active_pipeline=_delta_metric(active_pipeline, prior_active),
        new_applications=_delta_metric(new_apps, prior_new_apps),
        hires=_delta_metric(hires, prior_hires),
        avg_fit_score=_delta_metric(avg_fit or 0, prior_avg),
        good_fit_pct=_delta_metric(good_fit_pct or 0, prior_good),
        high_fit_pct=_delta_metric(high_fit_pct or 0, prior_high),
        median_fit_score=median_fit,
        interview_yield_pct=interview_yield,
        assessment_pass_pct=assessment_pass,
        assessment_clearance_pct=assessment_pass,
        time_to_fill_days=_delta_metric(cur_ttf_median or 0, prior_ttf_median)
        if cur_ttf_median is not None
        else None,
        time_to_hire_days=_delta_metric(cur_tth_median or 0, prior_tth_median)
        if cur_tth_median is not None
        else None,
        pending_offers=_delta_metric(pending_offers, prior_pending),
        expected_hires=_delta_metric(expected_hires_val, prior_expected),
        offer_acceptance_pct=_delta_metric(offer_acceptance or 0, None)
        if offer_acceptance is not None
        else None,
    )

    return HiringDashboardPack(
        as_of=now_iso,
        window_days=wd,
        data_freshness="live",
        scope=scope_norm,
        department=department,
        business_pillar=business_pillar,
        business_sub_department=business_sub_department,
        project_id=project_id,
        job_id=job_id,
        owner_id=owner_id,
        health_score=health_score,
        health_status=health_status,
        headline=headline,
        pipeline_by_stage=stage_counts,
        pipeline_by_stage_window=stage_counts_window,
        funnel=funnel,
        offer_funnel=offer_funnel,
        source_mix=source_mix,
        fit_distribution=fit_distribution,
        quality_by_source=quality_by_source,
        stage_aging=stage_aging,
        stage_aging_summary=stage_aging_summary,
        offer_aging=offer_aging,
        offer_aging_buckets=offer_aging_buckets,
        offer_status_counts=offer_status_counts,
        interview_round_metrics=interview_round_metrics,
        conversion_bottleneck=conversion_bottleneck,
        bottleneck_slow_hires=bottleneck_slow_hires,
        hire_journeys=hire_journeys,
        interview_journeys=interview_journeys,
        interview_action_queue=interview_action_queue,
        req_aging=req_aging,
        top_jobs=top_jobs,
        alerts=alerts,
        talent_acquisition=talent_acquisition,
        ai_match_adoption=ai_match_adoption,
        referral_metrics=referral_metrics,
        career_trajectory_coverage=career_trajectory_coverage,
        assessment=assessment_slice,
        recent_activities=recent,
        hero_risk_metrics=hero_risk,
        ai_recommendation=ai_rec,
        ai_insights=ai_insights,
        ai_insights_source=insights_source,
        department_risk=dept_risk,
        talent_intelligence=talent_intel,
        recruiter_performance=recruiter_rows,
        smart_actions=smart_actions,
        talent_quality=talent_quality,
        tab_kpis=tab_kpis,
        offer_insight=offer_insight,
        offer_priority_actions=offer_priority,
        signal_strength=signal_strength,
        signal_recommendations=signal_recs,
        analytics_summary=analytics_summary,
        total_jobs=total_jobs,
        total_candidates=total_candidates,
        total_applications=total_applications,
        applications_by_stage=stage_counts,
    )
