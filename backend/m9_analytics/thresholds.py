"""KPI threshold evaluation for executive health status (M9)."""

from __future__ import annotations

from typing import Any, Dict, Literal, Optional

Status = Literal["ok", "warn", "critical", "unknown"]

DEFAULT_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "attrition_rate_pct": {"warn": 8.0, "critical": 12.0, "higher_is_worse": True},
    "skill_coverage_pct": {"warn": 75.0, "critical": 60.0, "higher_is_worse": False},
    "forecast_gap_total": {"warn": 25.0, "critical": 50.0, "higher_is_worse": True},
    "retention_avg_risk_score": {"warn": 0.4, "critical": 0.65, "higher_is_worse": True},
    "engagement_avg_rating": {"warn": 3.0, "critical": 2.5, "higher_is_worse": False},
    "talent_acq_top_match_precision_proxy_pct": {"warn": 50.0, "critical": 35.0, "higher_is_worse": False},
    "talent_acq_primary_source_concentration_pct": {"warn": 70.0, "critical": 85.0, "higher_is_worse": True},
    "automation_fail_rate_pct": {"warn": 10.0, "critical": 25.0, "higher_is_worse": True},
}


def evaluate_status(kpi_id: str, value: Optional[float], rules: Optional[Dict[str, Dict[str, Any]]] = None) -> Status:
    if value is None:
        return "unknown"
    cfg = (rules or DEFAULT_THRESHOLDS).get(kpi_id)
    if not cfg:
        return "ok"
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "unknown"
    warn = float(cfg.get("warn", 0))
    critical = float(cfg.get("critical", 0))
    higher_is_worse = bool(cfg.get("higher_is_worse", True))
    if higher_is_worse:
        if v >= critical:
            return "critical"
        if v >= warn:
            return "warn"
        return "ok"
    if v <= critical:
        return "critical"
    if v <= warn:
        return "warn"
    return "ok"


def automation_fail_rate_pct(ok_runs: int, fail_runs: int) -> Optional[float]:
    total = int(ok_runs or 0) + int(fail_runs or 0)
    if total <= 0:
        return None
    return round(100.0 * int(fail_runs or 0) / total, 2)


def attach_status_to_values(values: Dict[str, Any], rules: Optional[Dict[str, Dict[str, Any]]] = None) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for kid, row in (values or {}).items():
        if not isinstance(row, dict):
            continue
        merged = dict(row)
        merged["status"] = evaluate_status(kid, row.get("value"), rules)
        out[kid] = merged
    return out
