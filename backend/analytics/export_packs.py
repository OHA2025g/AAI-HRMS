"""Leadership export packs: monthly snapshots, CSV/PDF formatting, delivery hooks."""

from __future__ import annotations

import csv
import io
import json
import os
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from analytics.constants import COL_M9_LEADERSHIP_SNAPSHOTS
from analytics.freshness import compute_source_freshness
from analytics.narrative import build_executive_narrative
from analytics.service import get_kpi_pack, load_merged_kpi_definitions
from analytics.drill_scope import resolve_drill_scope_ids
from analytics.strategic_aggregate import build_strategic_dashboard_data
from analytics.snapshot_scope import attach_snapshot_scope, snapshot_scope_key
from analytics.trends import has_active_drill_filters, normalize_drill_filters

M9_CRON_SCOPED_DEPARTMENT_LIMIT = max(
    0,
    min(int(os.environ.get("M9_CRON_SCOPED_DEPARTMENT_LIMIT", "5") or 5), 20),
)
M9_PDF_BRAND_TITLE = (os.environ.get("M9_PDF_BRAND_TITLE") or "AAI HRMS - Leadership Report").strip()


def _pdf_safe(text: Any) -> str:
    """Helvetica built-in fonts are latin-1; strip unsupported Unicode."""
    s = str(text or "")
    return s.encode("latin-1", errors="replace").decode("latin-1")


def _validate_year_month(ym: str) -> str:
    s = (ym or "").strip()
    parts = s.split("-")
    if len(parts) != 2:
        raise ValueError("period must be YYYY-MM")
    y, m = int(parts[0]), int(parts[1])
    if y < 2000 or y > 2100 or m < 1 or m > 12:
        raise ValueError("invalid period")
    return f"{y:04d}-{m:02d}"


def default_snapshot_period_previous_month_utc() -> str:
    """YYYY-MM for the calendar month immediately before the current UTC month."""
    now = datetime.now(timezone.utc)
    first_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = first_this - timedelta(days=1)
    return f"{last_month_end.year:04d}-{last_month_end.month:02d}"


async def create_monthly_snapshot_and_deliver(
    db,
    *,
    year_month: Optional[str] = None,
    horizon_months: int = 3,
    window_days: int = 30,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build payload, persist, POST leadership webhook (if configured).
    If year_month is empty, uses previous calendar month (UTC).
    """
    ym = (year_month or "").strip() or default_snapshot_period_previous_month_utc()
    snap = await build_monthly_snapshot_payload(
        db,
        year_month=ym,
        horizon_months=horizon_months,
        window_days=window_days,
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )
    sid, _created = await persist_snapshot_idempotent(db, snap)
    hook = await deliver_snapshot_webhook(snap)
    return {"id": sid, "period": snap["period"], "delivery_hook": hook, "snapshot_scope": snap.get("snapshot_scope")}


async def build_monthly_snapshot_payload(
    db,
    *,
    year_month: str,
    horizon_months: int = 3,
    window_days: int = 30,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
) -> Dict[str, Any]:
    period = _validate_year_month(year_month)
    strategic = await build_strategic_dashboard_data(
        db,
        horizon_months=horizon_months,
        window_days=window_days,
        scope_employee_ids=None,
    )
    kpi_pack = await get_kpi_pack(db, horizon_months=horizon_months, window_days=window_days)
    freshness = await compute_source_freshness(db)
    definitions = await load_merged_kpi_definitions(db)
    narrative = build_executive_narrative(
        dashboard=strategic,
        insights=kpi_pack.get("insights"),
    )
    payload: Dict[str, Any] = {
        "snapshot_kind": "MONTHLY_LEADERSHIP",
        "period": period,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "strategic_dashboard": strategic,
        "kpi_pack": {"catalog_version": kpi_pack["catalog_version"], "values": kpi_pack["values"]},
        "freshness": freshness,
        "kpi_definition_count": len(definitions),
        "executive_narrative": narrative,
    }
    if has_active_drill_filters(
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    ):
        filters = normalize_drill_filters(
            department=department,
            manager_root_id=manager_root_id,
            role_title_contains=role_title_contains,
        )
        scope_ids = await resolve_drill_scope_ids(
            db,
            department=filters["department"] or None,
            manager_root_id=filters["manager_root_id"] or None,
            role_title_contains=filters["role_title_contains"] or None,
        )
        scoped = await build_strategic_dashboard_data(
            db,
            horizon_months=horizon_months,
            window_days=window_days,
            scope_employee_ids=scope_ids,
        )
        payload["drill_filters"] = filters
        payload["scoped_strategic_dashboard"] = scoped
    return attach_snapshot_scope(payload)


async def top_departments_by_headcount(db, *, limit: int = 5) -> List[str]:
    """Departments ranked by active employee count (for cron scoped snapshots)."""
    limit = max(1, min(int(limit or 5), 20))
    pipeline = [
        {
            "$match": {
                "department": {"$exists": True, "$nin": [None, ""]},
                "status": {"$in": ["ACTIVE", "ONBOARDING"]},
            }
        },
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    rows = await db.employees.aggregate(pipeline).to_list(limit)
    out: List[str] = []
    for row in rows:
        name = str(row.get("_id") or "").strip()
        if name:
            out.append(name)
    return out


async def create_monthly_cron_snapshots(
    db,
    *,
    year_month: Optional[str] = None,
    horizon_months: int = 3,
    window_days: int = 30,
    scoped_department_limit: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Cron batch: one organization snapshot + top-N department scoped snapshots (idempotent per period+scope).
    Webhook fires only for the organization snapshot.
    """
    ym = (year_month or "").strip() or default_snapshot_period_previous_month_utc()
    dept_limit = (
        M9_CRON_SCOPED_DEPARTMENT_LIMIT
        if scoped_department_limit is None
        else max(0, min(int(scoped_department_limit), 20))
    )

    org_snap = await build_monthly_snapshot_payload(
        db, year_month=ym, horizon_months=horizon_months, window_days=window_days
    )
    org_id, org_created = await persist_snapshot_idempotent(db, org_snap)
    hook = await deliver_snapshot_webhook(org_snap)

    dept_results: List[Dict[str, Any]] = []
    departments = await top_departments_by_headcount(db, limit=dept_limit) if dept_limit > 0 else []
    for dept in departments:
        scoped_snap = await build_monthly_snapshot_payload(
            db,
            year_month=ym,
            horizon_months=horizon_months,
            window_days=window_days,
            department=dept,
        )
        sid, created = await persist_snapshot_idempotent(db, scoped_snap)
        dept_results.append(
            {
                "department": dept,
                "id": sid,
                "created": created,
                "snapshot_scope": scoped_snap.get("snapshot_scope"),
            }
        )

    return {
        "period": org_snap["period"],
        "organization": {
            "id": org_id,
            "created": org_created,
            "snapshot_scope": org_snap.get("snapshot_scope"),
        },
        "scoped_departments": dept_results,
        "delivery_hook": hook,
    }


def format_snapshot_csv(payload: Dict[str, Any]) -> bytes:
    """Flatten key KPI rows for spreadsheet consumers."""
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["section", "key", "value"])
    w.writerow(["meta", "period", payload.get("period")])
    w.writerow(["meta", "generated_at", payload.get("generated_at")])
    sd = payload.get("strategic_dashboard") or {}
    for k, v in sd.items():
        if isinstance(v, (dict, list)):
            continue
        w.writerow(["strategic", k, v])
    vals = (payload.get("kpi_pack") or {}).get("values") or {}
    for kid, row in vals.items():
        if isinstance(row, dict):
            w.writerow(["kpi_values", kid, row.get("value")])
        else:
            w.writerow(["kpi_values", kid, row])
    for chk in (payload.get("freshness") or {}).get("checks") or []:
        w.writerow(
            [
                "freshness",
                chk.get("source"),
                json.dumps(
                    {
                        "sla_ok": chk.get("sla_ok"),
                        "age_hours": chk.get("age_hours"),
                        "last_event_at": chk.get("last_event_at"),
                    }
                ),
            ]
        )
    ta = (payload.get("kpi_pack") or {}).get("talent_acquisition") or {}
    if ta:
        w.writerow(["talent_acquisition", "window_days", ta.get("window_days")])
        w.writerow(["talent_acquisition", "dedup_audit_events", ta.get("dedup_audit_events_in_window")])
        w.writerow(["talent_acquisition", "candidates_in_window", ta.get("candidates_created_in_window")])
        w.writerow(["talent_acquisition", "precision_proxy_pct", ta.get("top_match_precision_proxy_pct")])
        w.writerow(["talent_acquisition", "primary_source_concentration_pct", ta.get("primary_source_concentration_pct")])
        w.writerow(["talent_acquisition", "source_mix_json", json.dumps(ta.get("source_mix_by_channel") or {})])
    return buf.getvalue().encode("utf-8")


def _pdf_section_heading(pdf, title: str) -> None:
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 8, title, ln=True)
    pdf.set_font("Helvetica", size=9)
    pdf.set_text_color(51, 65, 85)


def format_snapshot_pdf(payload: Dict[str, Any]) -> bytes:
    """Branded leadership PDF (fpdf2 — `pip install -r requirements.txt`)."""
    try:
        from fpdf import FPDF
    except ImportError as e:
        raise RuntimeError("PDF export requires fpdf2; install backend dependencies.") from e

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.alias_nb_pages()
    pdf.add_page()

    # Header band
    pdf.set_fill_color(79, 70, 229)
    pdf.rect(0, 0, 210, 28, style="F")
    pdf.set_y(8)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, _pdf_safe(M9_PDF_BRAND_TITLE[:80]), ln=True, align="C")
    pdf.set_font("Helvetica", size=9)
    pdf.cell(0, 5, "Executive KPI leadership pack", ln=True, align="C")
    pdf.ln(10)

    pdf.set_text_color(30, 41, 59)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(0, 6, f"Reporting period: {payload.get('period')}", ln=True)
    pdf.cell(0, 6, f"Generated (UTC): {payload.get('generated_at')}", ln=True)
    scope = payload.get("snapshot_scope") or "organization"
    pdf.cell(0, 6, f"Scope: {scope}", ln=True)
    df = payload.get("drill_filters") or {}
    if df.get("department"):
        pdf.cell(0, 6, f"Department filter: {df.get('department')}", ln=True)
    pdf.ln(4)

    sd = payload.get("strategic_dashboard") or {}
    scoped_sd = payload.get("scoped_strategic_dashboard") or {}
    display_sd = scoped_sd if scoped_sd and df else sd

    _pdf_section_heading(pdf, "Strategic KPIs")
    labels = {
        "employee_count": "Total employees",
        "active_employee_count": "Active headcount",
        "attrition_rate_pct": "Attrition rate (%)",
        "forecast_gap_total": "Forecast skill gap",
        "engagement_avg_rating": "Engagement average",
        "retention_avg_risk_score": "Retention risk score",
        "estimated_cost_saved_usd_30d": "Automation USD saved (30d)",
    }
    for key, label in labels.items():
        if key in display_sd and display_sd.get(key) is not None:
            pdf.cell(0, 5, f"{label}: {display_sd.get(key)}", ln=True)
    pdf.ln(2)

    narrative = payload.get("executive_narrative") or {}
    if narrative:
        _pdf_section_heading(pdf, "Executive narrative")
        summary = str(narrative.get("summary") or "")[:800]
        if summary:
            pdf.multi_cell(0, 5, summary)
        for bullet in (narrative.get("bullets") or [])[:8]:
            pdf.multi_cell(0, 5, _pdf_safe(f"  - {str(bullet)[:240]}"))
        pdf.ln(2)

    _pdf_section_heading(pdf, "Data freshness")
    for chk in (payload.get("freshness") or {}).get("checks") or []:
        flag = "OK" if chk.get("sla_ok") else "STALE"
        pdf.cell(
            0,
            5,
            f"{chk.get('source')}: {flag} (age {chk.get('age_hours')}h)",
            ln=True,
        )
    pdf.ln(2)

    ta = (payload.get("kpi_pack") or {}).get("talent_acquisition") or {}
    if ta:
        _pdf_section_heading(pdf, "Talent acquisition")
        pdf.cell(0, 5, f"Dedup audit events: {ta.get('dedup_audit_events_in_window')}", ln=True)
        pdf.cell(0, 5, f"Candidates in window: {ta.get('candidates_created_in_window')}", ln=True)
        pdf.cell(0, 5, f"Precision proxy %: {ta.get('top_match_precision_proxy_pct')}", ln=True)
        pdf.cell(0, 5, f"Source concentration %: {ta.get('primary_source_concentration_pct')}", ln=True)
        pdf.ln(2)

    gaps = (display_sd.get("top_skill_gaps") or sd.get("top_skill_gaps") or [])[:5]
    if gaps:
        _pdf_section_heading(pdf, "Top skill gaps")
        for g in gaps:
            pdf.cell(
                0,
                5,
                f"{g.get('skill_name')}: gap {g.get('gap')} (demand {g.get('demand_count')}, supply {g.get('supply_count')})",
                ln=True,
            )

    pdf.set_y(-15)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 8, _pdf_safe(f"Page {pdf.page_no()}/{{nb}} - Confidential - {M9_PDF_BRAND_TITLE[:40]}"), align="C")

    out = pdf.output()
    if isinstance(out, str):
        return out.encode("latin-1")
    return bytes(out)


async def persist_snapshot(db, payload: Dict[str, Any]) -> str:
    sid, _ = await persist_snapshot_idempotent(db, payload)
    return sid


async def persist_snapshot_idempotent(db, payload: Dict[str, Any]) -> tuple[str, bool]:
    """Replace existing snapshot for the same period + snapshot_scope, else insert."""
    scoped = attach_snapshot_scope(payload)
    period = scoped["period"]
    scope = scoped.get("snapshot_scope") or snapshot_scope_key(drill_filters=scoped.get("drill_filters"))
    existing = await db[COL_M9_LEADERSHIP_SNAPSHOTS].find_one(
        {"period": period, "snapshot_scope": scope},
        {"_id": 0, "id": 1},
    )
    now = datetime.now(timezone.utc).isoformat()
    if existing and existing.get("id"):
        sid = str(existing["id"])
        await db[COL_M9_LEADERSHIP_SNAPSHOTS].update_one(
            {"id": sid},
            {"$set": {"created_at": now, "payload": scoped, "snapshot_scope": scope, "period": period}},
        )
        return sid, False
    sid = str(uuid.uuid4())
    doc = {
        "id": sid,
        "period": period,
        "snapshot_scope": scope,
        "created_at": now,
        "payload": scoped,
    }
    await db[COL_M9_LEADERSHIP_SNAPSHOTS].insert_one(doc)
    return sid, True


async def list_snapshots(db, limit: int = 24) -> List[Dict[str, Any]]:
    limit = max(1, min(limit, 100))
    cur = (
        await db[COL_M9_LEADERSHIP_SNAPSHOTS]
        .find({}, {"_id": 0, "payload": 0})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(limit)
    )
    return cur


async def get_snapshot_doc(db, snapshot_id: str) -> Optional[Dict[str, Any]]:
    return await db[COL_M9_LEADERSHIP_SNAPSHOTS].find_one({"id": snapshot_id}, {"_id": 0})


def build_full_leadership_pack_zip_bytes(payload: Dict[str, Any]) -> bytes:
    """ZIP: JSON + CSV + PDF + README (Week 11 one-click leadership pack)."""
    buf = io.BytesIO()
    period = (payload.get("period") or "snapshot").replace("/", "-")
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"m9-leadership-{period}.json", json.dumps(payload, indent=2, default=str))
        zf.writestr(f"m9-leadership-{period}.csv", format_snapshot_csv(payload).decode("utf-8"))
        try:
            zf.writestr(f"m9-leadership-{period}.pdf", format_snapshot_pdf(payload))
        except RuntimeError as e:
            zf.writestr(
                "PDF_SKIPPED.txt",
                f"PDF not included: {e}\nInstall fpdf2 in the API environment to include leadership.pdf.\n",
            )
        zf.writestr(
            "README.txt",
            "AAI-HRMS leadership pack (ZIP)\n"
            f"- m9-leadership-{period}.json — full snapshot payload\n"
            f"- m9-leadership-{period}.csv — flattened KPI + freshness + talent rows\n"
            f"- m9-leadership-{period}.pdf — one-pager when fpdf2 is installed (else see PDF_SKIPPED.txt)\n",
        )
    return buf.getvalue()


async def create_full_leadership_pack_zip(
    db,
    *,
    year_month: Optional[str] = None,
    horizon_months: int = 3,
    window_days: int = 30,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist monthly snapshot and return raw ZIP bytes + snapshot id."""
    ym = (year_month or "").strip() or default_snapshot_period_previous_month_utc()
    snap = await build_monthly_snapshot_payload(
        db,
        year_month=ym,
        horizon_months=horizon_months,
        window_days=window_days,
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )
    sid, _ = await persist_snapshot_idempotent(db, snap)
    zbytes = build_full_leadership_pack_zip_bytes(snap)
    return {"id": sid, "period": snap["period"], "zip_bytes": zbytes, "snapshot_scope": snap.get("snapshot_scope")}


async def deliver_snapshot_webhook(
    payload: Dict[str, Any],
    *,
    webhook_url: Optional[str] = None,
    secret_header: Optional[str] = None,
    timeout_sec: float = 15.0,
) -> Dict[str, Any]:
    url = (webhook_url or os.environ.get("M9_LEADERSHIP_WEBHOOK_URL") or "").strip()
    if not url:
        return {"ok": False, "error": "no_webhook_configured"}
    headers = {"Content-Type": "application/json"}
    token = (secret_header or os.environ.get("M9_LEADERSHIP_WEBHOOK_SECRET") or "").strip()
    if token:
        headers["X-M9-Signature"] = token
    body = {
        "event": "m9.leadership_snapshot",
        "period": payload.get("period"),
        "generated_at": payload.get("generated_at"),
        "summary": {
            "employee_count": (payload.get("strategic_dashboard") or {}).get("employee_count"),
            "attrition_rate_pct": (payload.get("strategic_dashboard") or {}).get("attrition_rate_pct"),
        },
    }
    try:
        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            r = await client.post(url, headers=headers, json=body)
            ok = 200 <= r.status_code < 300
            return {"ok": ok, "status_code": r.status_code, "body_preview": (r.text or "")[:500]}
    except Exception as e:
        return {"ok": False, "error": str(e)}
