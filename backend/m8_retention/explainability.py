"""Linear SHAP-style attributions: φ_i ≈ w_i * (x_i - ref_i) for additive logit model."""

from __future__ import annotations

from typing import Any, Dict, List


def linear_shap_attributions(
    feature_vector: Dict[str, float],
    state: Dict[str, Any],
    *,
    keys: List[str],
) -> List[Dict[str, Any]]:
    """
    For a linear model logit = b + Σ w_i x_i, with reference point ref,
    contribution of feature i relative to reference is w_i * (x_i - ref_i).
    (Exact for purely linear term; probability effect is non-linear in output.)
    """
    weights = state.get("weights") or {}
    ref = state.get("reference_features") or {}
    default_ref = float(state.get("reference_feature_default") or 0.5)
    out: List[Dict[str, Any]] = []
    for k in keys:
        x = float(feature_vector.get(k) or 0.0)
        r = float(ref.get(k, default_ref))
        w = float(weights.get(k) or 0.0)
        phi = w * (x - r)
        out.append(
            {
                "feature": k,
                "value": round(x, 4),
                "reference": round(r, 4),
                "weight": round(w, 4),
                "shap_value": round(phi, 4),
                "direction": "increases_risk_vs_ref" if phi > 0 else ("decreases_risk_vs_ref" if phi < 0 else "neutral"),
            }
        )
    out.sort(key=lambda z: abs(z["shap_value"]), reverse=True)
    return out
