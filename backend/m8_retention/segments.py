"""M8-2: segment tags from HR flags + risk thresholds."""

from __future__ import annotations

from typing import Any, Dict, List


def default_segment_settings() -> Dict[str, Any]:
    return {
        "high_risk_score_min": 0.65,
        "medium_risk_score_min": 0.4,
        "require_critical_role_for_segment": False,
    }


def compute_segments(
    employee: Dict[str, Any],
    attrition_risk: float,
    settings: Dict[str, Any],
) -> List[str]:
    segs: List[str] = []
    if employee.get("high_performer") is True:
        segs.append("HIGH_PERFORMER")
    if employee.get("critical_role") is True:
        segs.append("CRITICAL_ROLE")

    hi = float(settings.get("high_risk_score_min") or 0.65)
    med = float(settings.get("medium_risk_score_min") or 0.4)

    if attrition_risk >= hi:
        segs.append("HIGH_ATTRITION_RISK")
    elif attrition_risk >= med:
        segs.append("ELEVATED_ATTRITION_RISK")

    crit = settings.get("require_critical_role_for_segment")
    if crit and employee.get("critical_role") is not True:
        segs = [s for s in segs if s not in ("HIGH_ATTRITION_RISK", "ELEVATED_ATTRITION_RISK")]
        segs.append("NON_CRITICAL_MASKED")

    return sorted(set(segs))
