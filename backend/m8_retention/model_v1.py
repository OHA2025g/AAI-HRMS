"""M8-1: linear-logistic attrition risk + per-factor contributions (explainability)."""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from m8_retention.constants import FEATURE_KEYS, INTERACTION_FEATURE_KEYS
from m8_retention.features import logistic


def default_model_state() -> Dict[str, Any]:
    """Interpretable default weights (higher logit => higher attrition risk)."""
    return {
        "bias": -0.35,
        "weights": {
            "market_exposure": 1.25,
            "tenure_insecurity": 0.85,
            "engagement_gap": 0.95,
            "compensation_pressure": 0.75,
            "growth_gap": 0.55,
        },
        "feature_keys": list(FEATURE_KEYS),
        "interaction_features_enabled": False,
        "reference_features": {k: 0.5 for k in FEATURE_KEYS},
        "reference_feature_default": 0.5,
        "ensemble_mode": "linear",
    }


def default_interaction_weights() -> Dict[str, float]:
    return {
        "tenure_engagement_interaction": 0.35,
        "market_growth_interaction": 0.25,
    }


def effective_feature_keys(state: Dict[str, Any]) -> List[str]:
    raw = list(state.get("feature_keys") or list(FEATURE_KEYS))
    if state.get("interaction_features_enabled"):
        out = list(raw)
        for k in INTERACTION_FEATURE_KEYS:
            if k not in out:
                out.append(k)
        return out
    return raw


def score_from_state(
    feature_vector: Dict[str, float],
    state: Dict[str, Any],
) -> Tuple[float, float, List[Dict[str, Any]]]:
    """
    Returns (risk_probability, raw_logit, factors explainability list).
    Each factor: feature, value, weight, contribution (w*v), direction.
    """
    bias = float(state.get("bias") or 0.0)
    weights = state.get("weights") or {}
    keys = effective_feature_keys(state)
    logit = bias
    factors: List[Dict[str, Any]] = []

    for k in keys:
        v = float(feature_vector.get(k) or 0.0)
        w = float(weights.get(k) or 0.0)
        contrib = w * v
        logit += contrib
        factors.append(
            {
                "feature": k,
                "value": round(v, 4),
                "weight": round(w, 4),
                "contribution": round(contrib, 4),
                "direction": "increases_risk" if contrib > 0 else ("decreases_risk" if contrib < 0 else "neutral"),
            }
        )

    factors.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    risk = round(logistic(logit), 4)
    return risk, round(logit, 4), factors


def risk_band(score: float, high: float = 0.65, med: float = 0.4) -> str:
    if score >= high:
        return "HIGH"
    if score >= med:
        return "MEDIUM"
    return "LOW"
