"""Optional logistic refit from (feature vector, label) pairs — pure Python."""

from __future__ import annotations

import random
from typing import Any, Dict, List, Optional, Tuple

from m8_retention.constants import FEATURE_KEYS, INTERACTION_FEATURE_KEYS
from m8_retention.features import logistic
from m8_retention.model_v1 import default_interaction_weights, default_model_state


def _infer_feature_keys(rows: List[Tuple[Dict[str, float], float]]) -> List[str]:
    if not rows:
        return list(FEATURE_KEYS)
    seen = list(rows[0][0].keys())
    ordered: List[str] = []
    for k in list(FEATURE_KEYS) + list(INTERACTION_FEATURE_KEYS):
        if k in seen and k not in ordered:
            ordered.append(k)
    for k in seen:
        if k not in ordered:
            ordered.append(k)
    return ordered


def _dot(w: List[float], x: List[float]) -> float:
    return sum(a * b for a, b in zip(w, x))


def train_logistic_regression(
    rows: List[Tuple[Dict[str, float], float]],
    *,
    feature_keys: Optional[List[str]] = None,
    epochs: int = 400,
    lr: float = 0.35,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    rows: list of (feature_vector, y) with y in {0,1} (1 = churned / high risk).
    Returns model state dict compatible with score_from_state.
    """
    if len(rows) < 5:
        return default_model_state()

    keys = feature_keys or _infer_feature_keys(rows)
    rng = random.Random(seed)
    d = len(keys)
    w = [0.0] * d
    b = 0.0
    base = default_model_state()
    merged_w = {**(base.get("weights") or {}), **default_interaction_weights()}
    for i, k in enumerate(keys):
        w[i] = float(merged_w.get(k) or 0.1)
    b = float(base.get("bias") or 0.0)

    data: List[Tuple[List[float], float]] = []
    for vec, y in rows:
        x = [float(vec.get(k) or 0.0) for k in keys]
        yy = 1.0 if float(y) >= 0.5 else 0.0
        data.append((x, yy))

    n = len(data)
    for _ in range(epochs):
        rng.shuffle(data)
        for x, y in data:
            z = b + _dot(w, x)
            p = logistic(z)
            err = p - y
            gb = err
            gw = [err * xi for xi in x]
            b -= lr * gb / n
            for j in range(d):
                w[j] -= lr * gw[j] / n

    weights = {keys[i]: round(w[i], 4) for i in range(d)}
    ref: Dict[str, float] = {k: 0.0 for k in keys}
    for vec, _y in rows:
        for k in keys:
            ref[k] += float(vec.get(k) or 0.0)
    for k in keys:
        ref[k] = round(ref[k] / len(rows), 4)

    return {
        "bias": round(b, 4),
        "weights": weights,
        "feature_keys": list(keys),
        "reference_features": ref,
        "reference_feature_default": 0.5,
    }


def compute_row_reference_means(rows: List[Tuple[Dict[str, float], float]], keys: List[str]) -> Dict[str, float]:
    ref: Dict[str, float] = {k: 0.0 for k in keys}
    if not rows:
        return {k: 0.5 for k in keys}
    for vec, _ in rows:
        for k in keys:
            ref[k] += float(vec.get(k) or 0.0)
    for k in keys:
        ref[k] = round(ref[k] / len(rows), 4)
    return ref
