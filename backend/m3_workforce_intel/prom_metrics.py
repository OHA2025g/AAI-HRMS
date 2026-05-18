"""Prometheus gauges for M3 workforce-intel evaluation (scrape via GET /metrics)."""

from __future__ import annotations

from prometheus_client import Gauge

# Set from monitoring.evaluate_active_model_vs_current after each successful eval.
M3_MODEL_MAE = Gauge(
    "aai_m3_workforce_intel_model_mae",
    "Mean absolute error of active M3 model vs live demand snapshot (last eval).",
)
M3_HEURISTIC_MAE = Gauge(
    "aai_m3_workforce_intel_heuristic_mae",
    "MAE of naive last-demand persistence vs same actuals (last eval).",
)
M3_MODEL_BEATS_HEURISTIC = Gauge(
    "aai_m3_workforce_intel_model_beats_heuristic",
    "1 if model MAE < heuristic MAE on last eval slice, else 0.",
)
M3_LAST_MAPE_PCT = Gauge(
    "aai_m3_workforce_intel_last_mape_pct",
    "Mean absolute percent error from last evaluation run.",
)
M3_EVAL_SKILLS_COUNT = Gauge(
    "aai_m3_workforce_intel_eval_skills_count",
    "Skills compared in the last evaluation run.",
)


def set_from_evaluation(
    *,
    model_mae: float,
    heuristic_mae: float,
    mape_pct: float,
    n_skills: int,
) -> None:
    M3_MODEL_MAE.set(float(model_mae))
    M3_HEURISTIC_MAE.set(float(heuristic_mae))
    beats = 1.0 if float(model_mae) < float(heuristic_mae) else 0.0
    M3_MODEL_BEATS_HEURISTIC.set(beats)
    M3_LAST_MAPE_PCT.set(float(mape_pct))
    M3_EVAL_SKILLS_COUNT.set(float(n_skills))


def clear_to_stale() -> None:
    """Optional: mark gauges as unknown (use -1) when eval skipped."""
    M3_MODEL_MAE.set(-1.0)
    M3_HEURISTIC_MAE.set(-1.0)
    M3_MODEL_BEATS_HEURISTIC.set(-1.0)
    M3_LAST_MAPE_PCT.set(-1.0)
    M3_EVAL_SKILLS_COUNT.set(0.0)
