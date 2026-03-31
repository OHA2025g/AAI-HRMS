"""Optional HistGradientBoosting for non-linear attrition risk (requires scikit-learn)."""

from __future__ import annotations

import base64
import pickle
from typing import Any, Dict, List, Tuple

from m8_retention.constants import FEATURE_KEYS


def sklearn_available() -> bool:
    try:
        import sklearn  # noqa: F401

        return True
    except ImportError:
        return False


def train_hist_gradient_boosting(X: List[List[float]], y: List[float]) -> bytes:
    from sklearn.ensemble import HistGradientBoostingClassifier

    clf = HistGradientBoostingClassifier(
        max_depth=5,
        max_iter=120,
        learning_rate=0.08,
        random_state=42,
    )
    clf.fit(X, y)
    return pickle.dumps(clf, protocol=pickle.HIGHEST_PROTOCOL)


def predict_proba_churn(blob: bytes, x_row: List[float]) -> float:
    clf = pickle.loads(blob)
    p = clf.predict_proba([x_row])
    # binary: class order [0,1] — assume 1 is positive (churn / high risk)
    if p.shape[1] == 2:
        return float(p[0, 1])
    return float(p[0].max())


def delta_feature_explanation(
    blob: bytes,
    x_row: List[float],
    *,
    reference_row: List[float],
    feature_names: List[str],
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Local explanation: approximate marginal effect vs reference input (finite differences).
    """
    base_p = predict_proba_churn(blob, x_row)
    factors: List[Dict[str, Any]] = []
    for i, name in enumerate(feature_names):
        if i >= len(x_row):
            break
        alt = list(x_row)
        alt[i] = float(reference_row[i]) if i < len(reference_row) else 0.5
        p_alt = predict_proba_churn(blob, alt)
        delta = base_p - p_alt
        ref_val = float(reference_row[i]) if i < len(reference_row) else 0.5
        factors.append(
            {
                "feature": name,
                "value": round(float(x_row[i]), 4),
                "reference": round(ref_val, 4),
                "delta_probability": round(delta, 5),
                "direction": "increases_risk" if delta > 0 else ("decreases_risk" if delta < 0 else "neutral"),
            }
        )
    factors.sort(key=lambda z: abs(z["delta_probability"]), reverse=True)
    return round(base_p, 4), factors


def blob_to_b64(blob: bytes) -> str:
    return base64.standard_b64encode(blob).decode("ascii")


def b64_to_blob(s: str) -> bytes:
    return base64.standard_b64decode(s.encode("ascii"))
