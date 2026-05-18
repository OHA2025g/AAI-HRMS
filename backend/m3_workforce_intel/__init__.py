"""
M3 Workforce Intelligence (Demand–Supply): historical pipeline, baseline forecast model, monitoring.

Public helpers are re-exported for tests and optional CLI use.
"""

from m3_workforce_intel.baseline_model import BaselineParams, fit_per_skill_baseline, predict_demand
from m3_workforce_intel.pipeline import run_data_quality_checks

__all__ = [
    "BaselineParams",
    "fit_per_skill_baseline",
    "predict_demand",
    "run_data_quality_checks",
]
