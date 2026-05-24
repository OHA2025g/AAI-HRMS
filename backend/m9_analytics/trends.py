"""Headcount / attrition trends from leadership snapshots (M9)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from m9_analytics.constants import COL_M9_LEADERSHIP_SNAPSHOTS
from m9_analytics.snapshots import unwrap_snapshot_doc


def normalize_drill_filters(
    *,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
) -> Dict[str, str]:
    return {
        "department": (department or "").strip(),
        "manager_root_id": (manager_root_id or "").strip(),
        "role_title_contains": (role_title_contains or "").strip(),
    }


def has_active_drill_filters(
    *,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
) -> bool:
    f = normalize_drill_filters(
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )
    return bool(f["department"] or f["manager_root_id"] or f["role_title_contains"])


def drill_filters_match(stored: Optional[Dict[str, Any]], current: Dict[str, str]) -> bool:
    if not stored:
        return False
    for key in ("department", "manager_root_id", "role_title_contains"):
        if (stored.get(key) or "").strip() != (current.get(key) or "").strip():
            return False
    return True


def _metrics_from_strategic(sd: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "employee_count": sd.get("employee_count"),
        "active_employee_count": sd.get("active_employee_count"),
        "attrition_rate_pct": sd.get("attrition_rate_pct"),
        "skill_coverage_pct": sd.get("skill_coverage_pct"),
        "forecast_gap_total": sd.get("forecast_gap_total"),
    }


def attach_scoped_live_overlay(trends: Dict[str, Any], dashboard: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Add live filtered-scope point alongside org-wide snapshot series."""
    out = dict(trends)
    if not dashboard:
        return out
    out["scope_mode"] = "organization_snapshots_plus_scoped_history"
    out["scoped_overlay"] = {
        "label": "Current filter scope",
        "period": "live",
        **_metrics_from_strategic(dashboard),
    }
    return out


async def get_kpi_trends(
    db,
    *,
    months: int = 12,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
) -> Dict[str, Any]:
    months = max(1, min(int(months or 12), 36))
    rows = (
        await db[COL_M9_LEADERSHIP_SNAPSHOTS]
        .find({}, {"_id": 0})
        .sort("period", 1)
        .to_list(months * 2)
    )
    by_period: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        body = unwrap_snapshot_doc(r)
        p = body.get("period") or r.get("period")
        if not p:
            continue
        key = str(p)
        scope = body.get("snapshot_scope") or (
            "organization" if not body.get("drill_filters") else None
        )
        if scope == "organization" or not body.get("drill_filters"):
            by_period[key] = body
        elif key not in by_period:
            by_period[key] = body

    series: List[Dict[str, Any]] = []
    scoped_series: List[Dict[str, Any]] = []
    filters_norm = normalize_drill_filters(
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )
    filters_active = has_active_drill_filters(
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )

    for period in sorted(by_period.keys())[-months:]:
        doc = by_period[period]
        sd = doc.get("strategic_dashboard") or {}
        series.append({"period": period, **_metrics_from_strategic(sd)})
        if filters_active and drill_filters_match(doc.get("drill_filters"), filters_norm):
            scoped_sd = doc.get("scoped_strategic_dashboard") or {}
            scoped_series.append({"period": period, **_metrics_from_strategic(scoped_sd)})

    note = "Derived from organization-wide monthly leadership snapshots."
    if filters_active:
        note += (
            " Scoped series uses snapshots saved with the same drill filters;"
            " generate a snapshot while filters are active to add history."
        )

    return {
        "months_requested": months,
        "points": len(series),
        "series": series,
        "scoped_series": scoped_series,
        "scoped_points_from_snapshots": len(scoped_series),
        "scope": "organization",
        "active_drill_filters": filters_norm if filters_active else None,
        "note": note,
    }
