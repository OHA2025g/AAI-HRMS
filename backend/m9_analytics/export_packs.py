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

from m9_analytics.constants import COL_M9_LEADERSHIP_SNAPSHOTS
from m9_analytics.freshness import compute_source_freshness
from m9_analytics.service import get_kpi_pack, load_merged_kpi_definitions
from m9_analytics.strategic_aggregate import build_strategic_dashboard_data


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
    )
    sid = await persist_snapshot(db, snap)
    hook = await deliver_snapshot_webhook(snap)
    return {"id": sid, "period": snap["period"], "delivery_hook": hook}


async def build_monthly_snapshot_payload(
    db,
    *,
    year_month: str,
    horizon_months: int = 3,
    window_days: int = 30,
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
    return {
        "snapshot_kind": "MONTHLY_LEADERSHIP",
        "period": period,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "strategic_dashboard": strategic,
        "kpi_pack": {"catalog_version": kpi_pack["catalog_version"], "values": kpi_pack["values"]},
        "freshness": freshness,
        "kpi_definition_count": len(definitions),
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


def format_snapshot_pdf(payload: Dict[str, Any]) -> bytes:
    """Simple text PDF (fpdf2 — `pip install -r requirements.txt`)."""
    try:
        from fpdf import FPDF
    except ImportError as e:
        raise RuntimeError("PDF export requires fpdf2; install backend dependencies.") from e

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Leadership snapshot", ln=True)
    pdf.set_font("Helvetica", size=10)
    pdf.cell(0, 6, f"Period: {payload.get('period')}", ln=True)
    pdf.cell(0, 6, f"Generated: {payload.get('generated_at')}", ln=True)
    pdf.ln(4)
    sd = payload.get("strategic_dashboard") or {}
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Strategic KPIs", ln=True)
    pdf.set_font("Helvetica", size=9)
    for key in [
        "employee_count",
        "active_employee_count",
        "attrition_rate_pct",
        "forecast_gap_total",
        "engagement_avg_rating",
        "retention_avg_risk_score",
        "estimated_cost_saved_usd_30d",
    ]:
        if key in sd:
            pdf.cell(0, 5, f"{key}: {sd.get(key)}", ln=True)
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Freshness SLA", ln=True)
    pdf.set_font("Helvetica", size=9)
    for chk in (payload.get("freshness") or {}).get("checks") or []:
        pdf.cell(
            0,
            5,
            f"{chk.get('source')}: ok={chk.get('sla_ok')} age_h={chk.get('age_hours')}",
            ln=True,
        )
    ta = (payload.get("kpi_pack") or {}).get("talent_acquisition") or {}
    if ta:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "Talent acquisition (window)", ln=True)
        pdf.set_font("Helvetica", size=9)
        pdf.cell(0, 5, f"Dedup audit events: {ta.get('dedup_audit_events_in_window')}", ln=True)
        pdf.cell(0, 5, f"Candidates in window: {ta.get('candidates_created_in_window')}", ln=True)
        pdf.cell(0, 5, f"Precision proxy %: {ta.get('top_match_precision_proxy_pct')}", ln=True)
        pdf.cell(0, 5, f"Primary source concentration %: {ta.get('primary_source_concentration_pct')}", ln=True)
    out = pdf.output(dest="S")
    if isinstance(out, str):
        return out.encode("latin-1")
    return bytes(out)


async def persist_snapshot(db, payload: Dict[str, Any]) -> str:
    sid = str(uuid.uuid4())
    doc = {
        "id": sid,
        "period": payload["period"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    await db[COL_M9_LEADERSHIP_SNAPSHOTS].insert_one(doc)
    return sid


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
) -> Dict[str, Any]:
    """Persist monthly snapshot and return raw ZIP bytes + snapshot id."""
    ym = (year_month or "").strip() or default_snapshot_period_previous_month_utc()
    snap = await build_monthly_snapshot_payload(
        db,
        year_month=ym,
        horizon_months=horizon_months,
        window_days=window_days,
    )
    sid = await persist_snapshot(db, snap)
    zbytes = build_full_leadership_pack_zip_bytes(snap)
    return {"id": sid, "period": snap["period"], "zip_bytes": zbytes}


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
