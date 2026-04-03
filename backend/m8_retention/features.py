"""M8-1: feature pipeline — tenure, growth, engagement, compensation proxy."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


def _parse_iso_dt(s: Optional[str]) -> Optional[datetime]:
    if not s or not isinstance(s, str):
        return None
    t = s.strip()
    if not t:
        return None
    try:
        if t.endswith("Z"):
            t = t[:-1] + "+00:00"
        return datetime.fromisoformat(t)
    except ValueError:
        return None


def tenure_months(join_date: Optional[str], now: Optional[datetime] = None) -> float:
    """Months since join_date; 0 if unknown."""
    dt = _parse_iso_dt(join_date)
    if not dt:
        return 0.0
    n = now or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = n - dt
    return max(0.0, delta.days / 30.437)


def critical_skill_exposure(emp_skills: List[str], critical_risk_by_skill_lc: Dict[str, float]) -> float:
    """Average shortage-based risk for skills the employee has (0–1)."""
    keys = [s.strip().lower() for s in emp_skills if isinstance(s, str) and s.strip()]
    if not keys:
        return 0.0
    scores = [float(critical_risk_by_skill_lc.get(k, 0.0)) for k in keys]
    return sum(scores) / len(scores) if scores else 0.0


def engagement_gap_feature(avg_rating_1_to_5: Optional[float]) -> Tuple[float, bool]:
    """
    Higher = worse engagement (more attrition risk).
    Returns (feature_value, had_data).
    """
    if avg_rating_1_to_5 is None:
        return 0.45, False  # mild prior when unknown
    r = max(1.0, min(5.0, float(avg_rating_1_to_5)))
    return 1.0 - (r - 1.0) / 4.0, True


def hris_market_percentile_pressure(comp_market_percentile: Optional[float]) -> Tuple[Optional[float], bool]:
    """
    HRIS / survey comp positioning: lower market percentile => higher retention risk proxy.
    Returns (0–1 pressure component, had_data).
    """
    if comp_market_percentile is None:
        return None, False
    try:
        p = float(comp_market_percentile)
    except (TypeError, ValueError):
        return None, False
    p = max(0.0, min(100.0, p))
    # bottom quartile of market -> high pressure
    return 1.0 - (p / 100.0), True


def compensation_pressure_feature(
    compensation_band: Optional[str],
    last_promotion_at: Optional[str],
    now: Optional[datetime] = None,
    comp_market_percentile: Optional[float] = None,
) -> Tuple[float, bool]:
    """
    Proxy: LOW band + long time since promotion => higher pressure.
    Returns (feature 0–1, had_explicit_band).
    """
    n = now or datetime.now(timezone.utc)
    band = (compensation_band or "").strip().upper()
    band_score = {"LOW": 1.0, "MID": 0.55, "MEDIUM": 0.55, "HIGH": 0.25, "LEAD": 0.1}.get(band, 0.5)
    had_band = bool(band)

    promo = _parse_iso_dt(last_promotion_at)
    months_since_promo: Optional[float] = None
    if promo:
        if promo.tzinfo is None:
            promo = promo.replace(tzinfo=timezone.utc)
        months_since_promo = max(0.0, (n - promo).days / 30.437)
    stagnation = min(1.0, (months_since_promo or 24.0) / 48.0)  # default 24mo if unknown

    base = min(1.0, 0.55 * band_score + 0.45 * stagnation)
    hris_p, hris_ok = hris_market_percentile_pressure(comp_market_percentile)
    if hris_ok and hris_p is not None:
        base = min(1.0, 0.4 * base + 0.6 * hris_p)
    return base, had_band or hris_ok


def growth_gap_feature(
    skill_count: int,
    open_assignments: int,
    completed_assignments_12m: int,
) -> float:
    """Higher = less growth signal (risk)."""
    skill_norm = min(1.0, max(0, skill_count) / 12.0)
    assign_activity = min(1.0, (completed_assignments_12m * 0.35 + max(0, 2 - open_assignments) * 0.15))
    growth_signal = min(1.0, 0.5 * skill_norm + 0.5 * assign_activity)
    return 1.0 - growth_signal


def build_feature_row(
    employee: Dict[str, Any],
    *,
    critical_risk_by_skill_lc: Dict[str, float],
    engagement_avg_rating: Optional[float],
    open_assignments: int,
    completed_assignments_12m: int,
    now: Optional[datetime] = None,
    interaction_features_enabled: bool = False,
) -> Dict[str, Any]:
    """Returns raw features + metadata for confidence."""
    now = now or datetime.now(timezone.utc)
    skills = [s for s in (employee.get("skills") or []) if isinstance(s, str)]
    tm = tenure_months(employee.get("join_date"), now=now)
    tenure_insecurity = min(1.0, 1.0 - min(tm / 48.0, 1.0))  # <48mo higher insecurity

    market_exposure = critical_skill_exposure(skills, critical_risk_by_skill_lc)
    eng_gap, eng_ok = engagement_gap_feature(engagement_avg_rating)
    cmp_pct = employee.get("comp_market_percentile")
    try:
        cmp_pct = float(cmp_pct) if cmp_pct is not None and str(cmp_pct).strip() != "" else None
    except (TypeError, ValueError):
        cmp_pct = None

    comp_press, band_ok = compensation_pressure_feature(
        employee.get("compensation_band"),
        employee.get("last_promotion_at"),
        now=now,
        comp_market_percentile=cmp_pct,
    )
    growth_gap = growth_gap_feature(len(skills), open_assignments, completed_assignments_12m)

    vec = {
        "market_exposure": round(market_exposure, 4),
        "tenure_insecurity": round(tenure_insecurity, 4),
        "engagement_gap": round(eng_gap, 4),
        "compensation_pressure": round(comp_press, 4),
        "growth_gap": round(growth_gap, 4),
    }
    if interaction_features_enabled:
        vec["tenure_engagement_interaction"] = round(tenure_insecurity * eng_gap, 4)
        vec["market_growth_interaction"] = round(market_exposure * growth_gap, 4)

    hris_ok = cmp_pct is not None

    return {
        "vector": vec,
        "meta": {
            "tenure_months": round(tm, 2),
            "has_engagement_data": eng_ok,
            "has_compensation_band": band_ok,
            "has_hris_comp_percentile": hris_ok,
            "skill_count": len(skills),
            "open_assignments": open_assignments,
            "completed_assignments_12m": completed_assignments_12m,
        },
    }


def compute_confidence(meta: Dict[str, Any]) -> float:
    """0.35–0.95 based on data availability."""
    c = 0.35
    if meta.get("tenure_months", 0) > 0:
        c += 0.15
    if meta.get("has_engagement_data"):
        c += 0.2
    if meta.get("has_compensation_band") or meta.get("has_hris_comp_percentile"):
        c += 0.1
    if meta.get("skill_count", 0) > 0:
        c += 0.1
    if (meta.get("open_assignments", 0) + meta.get("completed_assignments_12m", 0)) > 0:
        c += 0.1
    return round(min(0.95, c), 3)


def logistic(x: float) -> float:
    try:
        if x > 35:
            return 1.0
        if x < -35:
            return 0.0
        return 1.0 / (1.0 + math.exp(-x))
    except OverflowError:
        return 1.0 if x > 0 else 0.0
