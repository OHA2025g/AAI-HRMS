"""M7-3: estimate minutes / cost saved from automation runs + baselines."""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Sequence


def baseline_map(rows: Sequence[Mapping[str, Any]]) -> Dict[str, Dict[str, float]]:
    """workflow_key -> {minutes_per_run, hourly_fully_loaded_cost_usd}"""
    out: Dict[str, Dict[str, float]] = {}
    for r in rows:
        key = str(r.get("workflow_key") or "").strip().upper()
        if not key:
            continue
        out[key] = {
            "minutes_per_run": max(0.0, float(r.get("minutes_per_run") or 0.0)),
            "hourly_fully_loaded_cost_usd": max(0.0, float(r.get("hourly_fully_loaded_cost_usd") or 0.0)),
        }
    return out


def compute_savings_totals(
    *,
    successful_runs: Sequence[Mapping[str, Any]],
    baselines: Mapping[str, Mapping[str, float]],
) -> Dict[str, float]:
    """
    Each successful run should include `savings_workflow_key` (usually action_type).
    """
    total_minutes = 0.0
    total_usd = 0.0
    for run in successful_runs:
        if (run.get("status") or "").upper() != "SUCCESS":
            continue
        wk = str(run.get("savings_workflow_key") or run.get("action_type") or "").strip().upper()
        if not wk:
            continue
        b = baselines.get(wk) or {}
        mins = float(b.get("minutes_per_run") or 0.0)
        rate = float(b.get("hourly_fully_loaded_cost_usd") or 0.0)
        total_minutes += mins
        if rate > 0 and mins > 0:
            total_usd += (mins / 60.0) * rate
    return {"estimated_minutes_saved": round(total_minutes, 2), "estimated_cost_saved_usd": round(total_usd, 2)}
