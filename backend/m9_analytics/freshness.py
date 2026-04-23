"""Data freshness probes vs KPI SLA (M9-1)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from m7_automation.constants import COL_WORKFLOW_RUNS
from m9_analytics.constants import DEFAULT_SOURCE_SLA_HOURS


def _parse_iso(ts: Optional[str]) -> Optional[datetime]:
    if not ts or not isinstance(ts, str):
        return None
    try:
        raw = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(raw)
    except Exception:
        return None


async def _max_ts_employees(db) -> Optional[str]:
    cur = await db.employees.find({}, {"_id": 0, "updated_at": 1, "created_at": 1}).to_list(8000)
    best: Optional[datetime] = None
    for row in cur:
        for k in ("updated_at", "created_at"):
            dt = _parse_iso(row.get(k))
            if dt and (best is None or dt > best):
                best = dt
    return best.isoformat() if best else None


async def _max_ts_workforce_skills(db) -> Optional[str]:
    row = await db.workforce_skills.find_one({}, {"_id": 0, "updated_at": 1}, sort=[("updated_at", -1)])
    if not row:
        return None
    return row.get("updated_at")


async def _max_ts_engagement(db) -> Optional[str]:
    row = await db.employee_engagement_responses.find_one({}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
    if not row:
        return None
    return row.get("created_at")


async def _max_ts_workflow_runs(db) -> Optional[str]:
    row = await db[COL_WORKFLOW_RUNS].find_one({}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
    if not row:
        return None
    return row.get("created_at")


async def compute_source_freshness(db) -> Dict[str, Any]:
    """
    Per underlying source: last observed event timestamp + SLA pass/fail.
    """
    probes = {
        "employees": await _max_ts_employees(db),
        "workforce_skills": await _max_ts_workforce_skills(db),
        "employee_engagement_responses": await _max_ts_engagement(db),
        "workflow_runs": await _max_ts_workflow_runs(db),
    }
    now = datetime.now(timezone.utc)
    checks: List[Dict[str, Any]] = []
    for source, last_iso in probes.items():
        sla_h = float(DEFAULT_SOURCE_SLA_HOURS.get(source, 24))
        last_dt = _parse_iso(last_iso) if last_iso else None
        age_hours: Optional[float] = None
        ok = True
        if last_dt:
            age_hours = (now - last_dt).total_seconds() / 3600.0
            ok = age_hours <= sla_h
        else:
            ok = False  # no data — treat as stale vs SLA expectation
        checks.append(
            {
                "source": source,
                "last_event_at": last_iso,
                "sla_max_age_hours": sla_h,
                "age_hours": round(age_hours, 3) if age_hours is not None else None,
                "sla_ok": ok,
            }
        )
    overall_ok = all(c["sla_ok"] for c in checks)
    return {"checked_at": now.isoformat(), "checks": checks, "overall_sla_ok": overall_ok}
