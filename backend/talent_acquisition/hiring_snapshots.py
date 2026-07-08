"""Daily snapshots for Smart Hiring Dashboard trends."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from talent_acquisition.hiring_dashboard_config import get_hiring_dashboard_config
from talent_acquisition.hiring_dashboard_insights import compute_offer_acceptance_pct
from talent_acquisition.hiring_threshold_config import get_monthly_hire_target

COL_SNAPSHOTS = "hiring_dashboard_snapshots"


async def _resolve_monthly_hire_target(db) -> Optional[int]:
    """Prefer DB-backed config; fall back to env default. Respects trend_target rule flag."""
    try:
        from talent_acquisition.hiring_dashboard_config import get_hiring_dashboard_config_doc, rule_flag_enabled

        doc = await get_hiring_dashboard_config_doc(db)
        if not rule_flag_enabled(doc.get("rule_flags"), "trend_target"):
            return None
        cfg = await get_hiring_dashboard_config(db)
        return max(0, int(cfg.monthly_hire_target))
    except Exception:
        return get_monthly_hire_target()


async def _week_fit_metrics(db, start_s: str, end_s: str) -> Tuple[Optional[float], Optional[float]]:
    """Avg fit and high-fit (≥90%) share for scores computed in a window."""
    scores = await db.fit_scores.find(
        {"computed_at": {"$gte": start_s, "$lt": end_s}},
        {"_id": 0, "final_score": 1},
    ).to_list(5000)
    vals: List[float] = []
    for s in scores:
        try:
            vals.append(float(s.get("final_score") or 0.0))
        except (TypeError, ValueError):
            continue
    if not vals:
        return None, None
    avg = round(sum(vals) / len(vals), 2)
    high_pct = round(100.0 * sum(1 for v in vals if v >= 90.0) / len(vals), 2)
    return avg, high_pct


def _metric_value(m: Any) -> float:
    if m is None:
        return 0.0
    if hasattr(m, "value"):
        try:
            return float(m.value or 0)
        except (TypeError, ValueError):
            return 0.0
    if isinstance(m, dict):
        return float(m.get("value") or 0)
    try:
        return float(m or 0)
    except (TypeError, ValueError):
        return 0.0


def _summary_avg_days(pack: Dict[str, Any], stage: str) -> Optional[float]:
    for row in pack.get("stage_aging_summary") or []:
        st = row.get("stage") if isinstance(row, dict) else getattr(row, "stage", None)
        if st != stage:
            continue
        avg = row.get("avg_days") if isinstance(row, dict) else getattr(row, "avg_days", None)
        if avg is not None:
            return float(avg)
    return None


def resolve_trends_data_source(
    snapshot_rows: List[Dict[str, Any]],
    *,
    synthetic_fallback: bool = False,
) -> str:
    """Classify trend series: live daily snapshots, backfilled seed, mix, or live synthetic."""
    if synthetic_fallback:
        return "synthetic"
    if not snapshot_rows:
        return "synthetic"
    seeded = sum(1 for row in snapshot_rows if row.get("seeded"))
    if seeded == len(snapshot_rows):
        return "seeded"
    if seeded > 0:
        return "mixed"
    return "snapshots"


def _snapshot_row_to_point(row: Dict[str, Any], hire_target: int) -> Dict[str, Any]:
    return {
        "period": row.get("period"),
        "label": row.get("period"),
        "new_applications": int(row.get("new_applications") or 0),
        "hires": int(row.get("hires") or 0),
        "avg_fit_score": row.get("avg_fit_score"),
        "active_pipeline": int(row.get("active_pipeline") or 0),
        "high_fit_pct": row.get("high_fit_pct"),
        "open_jobs": int(row.get("open_jobs") or 0),
        "funnel_conversion_to_interview": row.get("funnel_conversion_to_interview"),
        "hire_target": row.get("hire_target") if row.get("hire_target") is not None else hire_target,
        "pending_offers": int(row.get("pending_offers") or 0),
        "median_offer_dwell_days": row.get("median_offer_dwell_days"),
        "median_interview_dwell_days": row.get("median_interview_dwell_days"),
        "time_to_fill_days": row.get("time_to_fill_days"),
        "time_to_hire_days": row.get("time_to_hire_days"),
        "offer_acceptance_pct": row.get("offer_acceptance_pct"),
    }


async def write_hiring_dashboard_snapshot(db, pack: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    period = now.strftime("%Y-%m-%d")
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    day_start_s, day_end_s = day_start.isoformat(), day_end.isoformat()
    daily_new_apps = await db.applications.count_documents(
        {"created_at": {"$gte": day_start_s, "$lt": day_end_s}}
    )
    daily_hires = await db.applications.count_documents(
        {"stage": "JOINED", "updated_at": {"$gte": day_start_s, "$lt": day_end_s}}
    )
    headline = pack.get("headline") or {}
    funnel_to_interview = None
    for row in pack.get("funnel") or []:
        stage = row.get("stage") if isinstance(row, dict) else getattr(row, "stage", None)
        conv = (
            row.get("conversion_from_prev_pct")
            if isinstance(row, dict)
            else getattr(row, "conversion_from_prev_pct", None)
        )
        if stage == "INTERVIEW_1" and conv is not None:
            funnel_to_interview = conv
            break
    ttf = headline.get("time_to_fill_days")
    tth = headline.get("time_to_hire_days")
    offer_acc = headline.get("offer_acceptance_pct")
    doc = {
        "period": period,
        "snapshot_at": now.isoformat(),
        "window_days": pack.get("window_days", 30),
        "open_jobs": _metric_value(headline.get("open_jobs")),
        "new_applications": int(daily_new_apps),
        "hires": int(daily_hires),
        "avg_fit_score": _metric_value(headline.get("avg_fit_score")),
        "active_pipeline": _metric_value(headline.get("active_pipeline")),
        "high_fit_pct": _metric_value(headline.get("high_fit_pct")),
        "pending_offers": int(_metric_value(headline.get("pending_offers"))),
        "median_offer_dwell_days": _summary_avg_days(pack, "OFFER"),
        "median_interview_dwell_days": _summary_avg_days(pack, "INTERVIEW_1"),
        "time_to_fill_days": _metric_value(ttf) if ttf is not None else None,
        "time_to_hire_days": _metric_value(tth) if tth is not None else None,
        "offer_acceptance_pct": _metric_value(offer_acc) if offer_acc is not None else None,
        "health_score": pack.get("health_score"),
        "funnel_conversion_to_interview": funnel_to_interview,
        "hire_target": await _resolve_monthly_hire_target(db),
        "seeded": False,
    }
    await db[COL_SNAPSHOTS].update_one({"period": period}, {"$set": doc}, upsert=True)
    return doc


async def seed_hiring_snapshots_if_sparse(db, months: int = 6, min_points: int = 14) -> int:
    """Backfill weekly synthetic snapshot rows when history is too thin for trends."""
    existing = int(await db[COL_SNAPSHOTS].count_documents({}))
    if existing >= min_points:
        return 0
    hire_target = await _resolve_monthly_hire_target(db)
    points = await _synthetic_trends_from_applications(db, months, hire_target)
    written = 0
    for p in points:
        period = p.get("period")
        if not period:
            continue
        doc = {
            "period": period,
            "snapshot_at": datetime.now(timezone.utc).isoformat(),
            "window_days": 30,
            "open_jobs": int(p.get("open_jobs") or 0),
            "new_applications": int(p.get("new_applications") or 0),
            "hires": int(p.get("hires") or 0),
            "avg_fit_score": p.get("avg_fit_score"),
            "active_pipeline": int(p.get("active_pipeline") or 0),
            "high_fit_pct": p.get("high_fit_pct"),
            "pending_offers": int(p.get("pending_offers") or 0),
            "median_offer_dwell_days": p.get("median_offer_dwell_days"),
            "median_interview_dwell_days": p.get("median_interview_dwell_days"),
            "time_to_fill_days": p.get("time_to_fill_days"),
            "time_to_hire_days": p.get("time_to_hire_days"),
            "offer_acceptance_pct": p.get("offer_acceptance_pct"),
            "funnel_conversion_to_interview": p.get("funnel_conversion_to_interview"),
            "hire_target": p.get("hire_target") if p.get("hire_target") is not None else hire_target,
            "seeded": True,
        }
        await db[COL_SNAPSHOTS].update_one({"period": period}, {"$set": doc}, upsert=True)
        written += 1
    return written


def _snapshot_metadata(snapshot_rows: List[Dict[str, Any]]) -> Tuple[int, int, Optional[str]]:
    """Return (total_count, live_count, last_live_snapshot_at)."""
    if not snapshot_rows:
        return 0, 0, None
    live_rows = [row for row in snapshot_rows if not row.get("seeded")]
    last_live_at = None
    if live_rows:
        latest = max(live_rows, key=lambda row: str(row.get("period") or ""))
        last_live_at = str(latest.get("snapshot_at") or latest.get("period") or "") or None
    return len(snapshot_rows), len(live_rows), last_live_at


async def get_hiring_snapshot_health(db, *, stale_after_hours: int = 48) -> Dict[str, Any]:
    """Ops health for hiring trend snapshots (cron maturity, staleness)."""
    now = datetime.now(timezone.utc)
    rows = (
        await db[COL_SNAPSHOTS]
        .find({}, {"_id": 0, "period": 1, "snapshot_at": 1, "seeded": 1})
        .sort("period", -1)
        .to_list(500)
    )
    total, live, last_live_at = _snapshot_metadata(rows)
    seeded = max(0, total - live)
    cron_token_configured = bool((os.environ.get("HIRING_SNAPSHOT_TOKEN") or "").strip())
    snapshot_on_boot_enabled = (os.environ.get("HIRING_SNAPSHOT_ON_BOOT") or "").strip() == "1"

    status = "ok"
    if total == 0:
        status = "no_snapshots"
    elif live == 0:
        status = "seeded_only"
    elif last_live_at:
        try:
            last_dt = datetime.fromisoformat(str(last_live_at).replace("Z", "+00:00"))
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            if now - last_dt > timedelta(hours=max(1, stale_after_hours)):
                status = "stale"
        except ValueError:
            pass

    return {
        "status": status,
        "as_of": now.isoformat(),
        "snapshot_count": total,
        "live_snapshot_count": live,
        "seeded_snapshot_count": seeded,
        "last_live_snapshot_at": last_live_at,
        "cron_token_configured": cron_token_configured,
        "snapshot_on_boot_enabled": snapshot_on_boot_enabled,
    }


async def get_hiring_dashboard_trends(db, months: int = 6) -> Dict[str, Any]:
    months = max(1, min(int(months or 6), 24))
    cutoff = (datetime.now(timezone.utc) - timedelta(days=months * 31)).strftime("%Y-%m-%d")
    hire_target = await _resolve_monthly_hire_target(db)
    rows = (
        await db[COL_SNAPSHOTS]
        .find({"period": {"$gte": cutoff}}, {"_id": 0})
        .sort("period", 1)
        .to_list(months * 31)
    )
    if not rows:
        await seed_hiring_snapshots_if_sparse(db)
        rows = (
            await db[COL_SNAPSHOTS]
            .find({"period": {"$gte": cutoff}}, {"_id": 0})
            .sort("period", 1)
            .to_list(months * 31)
        )

    weeks_months = max(3, min(months, 6))
    points = await _synthetic_trends_from_applications(db, weeks_months, hire_target)
    if len(points) > 12:
        points = points[-12:]
    data_source = resolve_trends_data_source(rows) if rows else "synthetic"
    if not points:
        data_source = "synthetic"
    snapshot_count, live_snapshot_count, last_live_snapshot_at = _snapshot_metadata(rows)
    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "months": months,
        "data_source": data_source,
        "points": points,
        "snapshot_count": snapshot_count,
        "live_snapshot_count": live_snapshot_count,
        "last_live_snapshot_at": last_live_snapshot_at,
    }


async def _synthetic_trends_from_applications(
    db, months: int, hire_target: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Fallback when no snapshots exist — weekly buckets from applications."""
    now = datetime.now(timezone.utc)
    points: List[Dict[str, Any]] = []
    target = hire_target if hire_target is not None else await _resolve_monthly_hire_target(db)
    for w in range(months * 4, 0, -1):
        end = now - timedelta(days=(w - 1) * 7)
        start = end - timedelta(days=7)
        start_s, end_s = start.isoformat(), end.isoformat()
        new_apps = await db.applications.count_documents(
            {"created_at": {"$gte": start_s, "$lt": end_s}}
        )
        hires = await db.applications.count_documents(
            {
                "stage": "JOINED",
                "updated_at": {"$gte": start_s, "$lt": end_s},
            }
        )
        open_jobs = await db.jobs.count_documents({"status": "OPEN"})
        active_pipeline = await db.applications.count_documents(
            {"stage": {"$nin": ["REJECTED", "WITHDRAWN", "JOINED"]}}
        )
        pending_offers = await db.applications.count_documents({"stage": "OFFER"})
        avg_fit, high_fit_pct = await _week_fit_metrics(db, start_s, end_s)
        time_to_fill, time_to_hire = await _week_time_metrics(db, start_s, end_s)
        offer_dwell, interview_dwell = await _week_dwell_metrics(db, start_s, end_s)
        offer_acceptance_pct = await _week_offer_acceptance_pct(db, start_s, end_s)
        points.append(
            {
                "period": start.strftime("%Y-%m-%d"),
                "label": start.strftime("%b %d"),
                "new_applications": int(new_apps),
                "hires": int(hires),
                "avg_fit_score": avg_fit,
                "open_jobs": int(open_jobs),
                "active_pipeline": int(active_pipeline),
                "high_fit_pct": high_fit_pct,
                "funnel_conversion_to_interview": None,
                "hire_target": target,
                "pending_offers": int(pending_offers),
                "median_offer_dwell_days": offer_dwell,
                "median_interview_dwell_days": interview_dwell,
                "time_to_fill_days": time_to_fill,
                "time_to_hire_days": time_to_hire,
                "offer_acceptance_pct": offer_acceptance_pct,
            }
        )
    return points[-24:]


async def _week_offer_acceptance_pct(db, start_s: str, end_s: str) -> Optional[float]:
    """Offer acceptance for applications with offer activity in a weekly window."""
    pipeline = [
        {
            "$match": {
                "updated_at": {"$gte": start_s, "$lt": end_s},
                "offer_status": {"$in": ["SENT", "ACCEPTED", "DECLINED"]},
            }
        },
        {"$group": {"_id": "$offer_status", "count": {"$sum": 1}}},
    ]
    rows = await db.applications.aggregate(pipeline).to_list(10)
    if not rows:
        return None
    counts = [{"status": row["_id"], "count": row["count"]} for row in rows if row.get("_id")]
    return compute_offer_acceptance_pct(counts)


async def _week_time_metrics(db, start_s: str, end_s: str) -> Tuple[Optional[float], Optional[float]]:
    """Median time-to-fill and time-to-hire for hires joined in a weekly window."""
    from talent_acquisition.hiring_dashboard import (
        _application_started_at_map,
        compute_time_to_fill_days,
        compute_time_to_hire_days,
        _parse_dt,
    )

    joined_apps = await db.applications.find(
        {"stage": "JOINED", "updated_at": {"$gte": start_s, "$lt": end_s}},
        {"_id": 0, "id": 1, "job_id": 1, "updated_at": 1, "created_at": 1},
    ).to_list(500)
    if not joined_apps:
        return None, None

    job_ids = {a["job_id"] for a in joined_apps if a.get("job_id")}
    jobs = await db.jobs.find(
        {"id": {"$in": list(job_ids)}},
        {"_id": 0, "id": 1, "created_at": 1},
    ).to_list(len(job_ids))
    job_created = {j["id"]: _parse_dt(j.get("created_at")) for j in jobs if j.get("id")}
    started_map = await _application_started_at_map(db, joined_apps)
    ttf_median, _ = compute_time_to_fill_days(job_created, joined_apps)
    tth_median, _ = compute_time_to_hire_days(started_map, joined_apps)
    return ttf_median, tth_median


async def _week_dwell_metrics(db, start_s: str, end_s: str) -> Tuple[Optional[float], Optional[float]]:
    """Median OFFER and INTERVIEW_1 dwell for hires joined in a weekly window."""
    from talent_acquisition.hiring_dashboard import _application_stage_dwell_rows, _median

    joined_apps = await db.applications.find(
        {"stage": "JOINED", "updated_at": {"$gte": start_s, "$lt": end_s}},
        {"_id": 0, "id": 1, "updated_at": 1},
    ).to_list(200)
    if not joined_apps:
        return None, None

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

    offer_days: List[float] = []
    interview_days: List[float] = []
    for app in joined_apps:
        aid = app.get("id")
        if not aid:
            continue
        joined_s = str(app.get("updated_at") or "")
        for stage, days in _application_stage_dwell_rows(by_app.get(aid) or [], joined_s):
            if stage == "OFFER":
                offer_days.append(days)
            elif stage == "INTERVIEW_1":
                interview_days.append(days)
    return _median(offer_days), _median(interview_days)


async def _snapshot_dwell_estimates(db) -> Tuple[Optional[float], Optional[float]]:
    """Current avg dwell by stage for synthetic trend fallback."""
    from talent_acquisition.hiring_dashboard import _stage_aging

    _cells, summary = await _stage_aging(db, None)
    offer = next((s.avg_days for s in summary if s.stage == "OFFER"), None)
    interview = next((s.avg_days for s in summary if s.stage == "INTERVIEW_1"), None)
    return offer, interview
