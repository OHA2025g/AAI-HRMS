"""
Baseline demand forecaster v1: per-skill linear trend on snapshot index (numpy only).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Mapping, Optional, Tuple

import numpy as np


@dataclass
class BaselineParams:
    """Serializable per-skill coefficients."""

    slope: float
    intercept: float
    n_points: int
    last_demand: float
    last_t: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "slope": float(self.slope),
            "intercept": float(self.intercept),
            "n_points": int(self.n_points),
            "last_demand": float(self.last_demand),
            "last_t": float(self.last_t),
        }

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> "BaselineParams":
        return cls(
            slope=float(d.get("slope", 0.0)),
            intercept=float(d.get("intercept", 0.0)),
            n_points=int(d.get("n_points", 0)),
            last_demand=float(d.get("last_demand", 0.0)),
            last_t=float(d.get("last_t", 0.0)),
        )


def _ols_line(x: np.ndarray, y: np.ndarray) -> Tuple[float, float]:
    """Returns (slope, intercept). Falls back to flat last value if degenerate."""
    if x.size < 2:
        lv = float(y[-1]) if y.size else 0.0
        return 0.0, lv
    x = x.astype(np.float64)
    y = y.astype(np.float64)
    x_mean = float(np.mean(x))
    y_mean = float(np.mean(y))
    var_x = float(np.var(x))
    if var_x < 1e-12:
        return 0.0, y_mean
    cov_xy = float(np.mean((x - x_mean) * (y - y_mean)))
    slope = cov_xy / var_x
    intercept = y_mean - slope * x_mean
    return slope, intercept


def fit_per_skill_baseline(
    series_by_skill: Mapping[str, List[float]],
    *,
    min_points: int = 2,
) -> Dict[str, BaselineParams]:
    """
    `series_by_skill`: skill_name_lc -> demand values in time order (oldest first).
    """
    out: Dict[str, BaselineParams] = {}
    for sk, ys in series_by_skill.items():
        if not ys:
            continue
        y = np.array([max(0.0, float(v)) for v in ys], dtype=np.float64)
        n = y.size
        x = np.arange(n, dtype=np.float64)
        if n < min_points:
            slope, intercept = 0.0, float(y[-1])
        else:
            slope, intercept = _ols_line(x, y)
        out[sk] = BaselineParams(
            slope=slope,
            intercept=intercept,
            n_points=int(n),
            last_demand=float(y[-1]),
            last_t=float(n - 1),
        )
    return out


def predict_demand(params: BaselineParams, *, steps_ahead: int = 1) -> int:
    """Predict demand `steps_ahead` snapshot periods after the last training point."""
    steps_ahead = max(1, int(steps_ahead))
    t_future = params.last_t + float(steps_ahead)
    raw = params.intercept + params.slope * t_future
    # Mild clamp: non-negative, not exploding from bad fits
    raw = max(0.0, raw)
    cap = max(10_000.0, params.last_demand * 50.0)
    raw = min(raw, cap)
    return int(round(raw))


def evaluate_on_history(
    series_by_skill: Mapping[str, List[float]],
    *,
    holdout_ratio: float = 0.2,
) -> Tuple[float, float, int, Dict[str, Dict[str, float]]]:
    """
    For each skill with enough points, train on prefix and score last k points (multi-step from train end).
    Returns (mape_pct, mae, n_points_scored, per_skill_metrics).
    """
    holdout_ratio = min(0.49, max(0.05, float(holdout_ratio)))
    abs_errs: List[float] = []
    pct_errs: List[float] = []
    per_skill: Dict[str, Dict[str, float]] = {}
    total_scored = 0

    for sk, ys in series_by_skill.items():
        if len(ys) < 4:
            continue
        n = len(ys)
        k = max(1, int(round(n * holdout_ratio)))
        train = ys[: n - k]
        test = ys[n - k :]
        p = fit_per_skill_baseline({sk: train}, min_points=2)[sk]
        skill_abs: List[float] = []
        skill_pct: List[float] = []
        for i, actual in enumerate(test):
            steps = i + 1
            y_hat = float(predict_demand(p, steps_ahead=steps))
            a = max(0.0, float(actual))
            ae = abs(y_hat - a)
            skill_abs.append(ae)
            abs_errs.append(ae)
            denom = max(1.0, abs(a))
            pe = ae / denom
            skill_pct.append(pe)
            pct_errs.append(pe)
            total_scored += 1
        last_pred = float(predict_demand(p, steps_ahead=len(test)))
        per_skill[sk] = {
            "mae": float(np.mean(skill_abs)) if skill_abs else 0.0,
            "mape_pct": float(np.mean(skill_pct)) * 100.0 if skill_pct else 0.0,
            "last_actual": float(test[-1]),
            "last_pred": last_pred,
            "train_n": float(len(train)),
        }

    if not abs_errs:
        return 0.0, 0.0, 0, per_skill
    mae = float(np.mean(abs_errs))
    mape = float(np.mean(pct_errs)) * 100.0
    return mape, mae, total_scored, per_skill
