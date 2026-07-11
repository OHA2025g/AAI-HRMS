"""Compare leadership snapshots for period-over-period deltas."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from analytics.constants import COL_M9_LEADERSHIP_SNAPSHOTS
from analytics.snapshots import unwrap_snapshot_doc


def _num(v: Any) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _delta_pct(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    if current is None or previous is None:
        return None
    if previous == 0:
        return round(100.0 * current, 2) if current else 0.0
    return round(100.0 * (current - previous) / abs(previous), 2)


async def load_snapshot_by_period(db, period: str) -> Optional[Dict[str, Any]]:
    return await db[COL_M9_LEADERSHIP_SNAPSHOTS].find_one(
        {"period": period},
        {"_id": 0},
        sort=[("created_at", -1)],
    )


def _extract_metric_map(snapshot: Dict[str, Any]) -> Dict[str, float]:
    out: Dict[str, float] = {}
    body = unwrap_snapshot_doc(snapshot)
    sd = body.get("strategic_dashboard") or {}
    for key in (
        "employee_count",
        "active_employee_count",
        "attrition_rate_pct",
        "forecast_gap_total",
        "resource_total_shortage",
        "engagement_avg_rating",
        "retention_avg_risk_score",
        "estimated_cost_saved_usd_30d",
    ):
        n = _num(sd.get(key))
        if n is not None:
            out[key] = n
    pack = body.get("kpi_pack") or {}
    values = pack.get("values") or {}
    for kid, row in values.items():
        if isinstance(row, dict):
            n = _num(row.get("value"))
            if n is not None:
                out[kid] = n
    sc = _num(sd.get("skill_coverage_pct"))
    if sc is not None:
        out["skill_coverage_pct"] = sc
    elif "skill_coverage_pct" in values and isinstance(values["skill_coverage_pct"], dict):
        n = _num(values["skill_coverage_pct"].get("value"))
        if n is not None:
            out["skill_coverage_pct"] = n
    return out


async def compare_snapshots(
    db,
    *,
    period: str,
    against_period: Optional[str] = None,
) -> Dict[str, Any]:
    current_doc = await load_snapshot_by_period(db, period)
    if not current_doc:
        return {"period": period, "against_period": against_period, "found": False, "deltas": []}

    against = against_period
    if not against:
        prior = (
            await db[COL_M9_LEADERSHIP_SNAPSHOTS]
            .find({"period": {"$lt": period}}, {"_id": 0, "period": 1})
            .sort("period", -1)
            .limit(1)
            .to_list(1)
        )
        against = prior[0]["period"] if prior else None

    prev_doc = await load_snapshot_by_period(db, against) if against else None
    cur_map = _extract_metric_map(current_doc)
    prev_map = _extract_metric_map(prev_doc) if prev_doc else {}

    deltas: List[Dict[str, Any]] = []
    for kid in sorted(set(cur_map) | set(prev_map)):
        c = cur_map.get(kid)
        p = prev_map.get(kid)
        deltas.append(
            {
                "kpi_id": kid,
                "current": c,
                "previous": p,
                "delta_abs": round(c - p, 4) if c is not None and p is not None else None,
                "delta_pct": _delta_pct(c, p),
            }
        )

    return {
        "found": True,
        "period": period,
        "against_period": against,
        "current_snapshot_id": current_doc.get("id"),
        "against_snapshot_id": prev_doc.get("id") if prev_doc else None,
        "deltas": deltas,
    }
