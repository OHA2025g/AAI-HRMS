"""Single-request executive dashboard bundle (M9)."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

from m9_analytics.export_packs import list_snapshots
from m9_analytics.narrative import build_executive_narrative
from m9_analytics.service import drill_filter_options, get_drill_dashboard_cached, get_kpi_pack, load_merged_kpi_definitions
from m9_analytics.predictive import get_executive_predictive_views
from m9_analytics.trends import attach_scoped_live_overlay, get_kpi_trends, has_active_drill_filters


async def get_executive_dashboard_bundle(
    db,
    *,
    horizon_months: int = 3,
    window_days: int = 30,
    department: Optional[str] = None,
    manager_root_id: Optional[str] = None,
    role_title_contains: Optional[str] = None,
    compare_period: Optional[str] = None,
    compare_against: Optional[str] = None,
    trends_months: int = 12,
    snapshot_limit: int = 24,
) -> Dict[str, Any]:
    pack_coro = get_kpi_pack(db, horizon_months=horizon_months, window_days=window_days)
    drill_coro = get_drill_dashboard_cached(
        db,
        horizon_months=horizon_months,
        window_days=window_days,
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
        compare_period=compare_period,
        compare_against=compare_against,
    )
    defs_coro = load_merged_kpi_definitions(db)
    trends_coro = get_kpi_trends(
        db,
        months=trends_months,
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    )
    opts_coro = drill_filter_options(db)
    snaps_coro = list_snapshots(db, limit=snapshot_limit)
    predictive_coro = get_executive_predictive_views(
        db,
        horizon_months=horizon_months,
        window_days=window_days,
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
        trends_months=trends_months,
    )

    pack, drill, definitions, trends, drill_options, snapshots, predictive = await asyncio.gather(
        pack_coro,
        drill_coro,
        defs_coro,
        trends_coro,
        opts_coro,
        snaps_coro,
        predictive_coro,
    )

    if has_active_drill_filters(
        department=department,
        manager_root_id=manager_root_id,
        role_title_contains=role_title_contains,
    ):
        trends = attach_scoped_live_overlay(trends, drill.get("dashboard"))

    narrative = build_executive_narrative(
        dashboard=drill.get("dashboard"),
        insights=drill.get("insights") or pack.get("insights"),
        compare=drill.get("compare"),
        trends=trends,
    )

    return {
        "pack": pack,
        "drill": drill,
        "definitions": definitions,
        "trends": trends,
        "drill_options": drill_options,
        "snapshots": snapshots,
        "narrative": narrative,
        "predictive": predictive,
    }
