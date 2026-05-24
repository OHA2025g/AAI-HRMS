"""Environment-backed feature flags for Smart Hiring assessments."""

from __future__ import annotations

import os
from typing import Dict

_FLAG_DEFAULTS: Dict[str, bool] = {
    "command_center": True,
    "public_take": True,
    "ai_grading": True,
    "auto_clear_pipeline": True,
    "reminder_emails": True,
    "outcome_analytics": True,
    "coverage_heatmap": True,
}

_ENV_KEYS: Dict[str, str] = {
    "command_center": "ASSESSMENT_COMMAND_CENTER",
    "public_take": "ASSESSMENT_PUBLIC_TAKE",
    "ai_grading": "ASSESSMENT_AI_GRADING",
    "auto_clear_pipeline": "ASSESSMENT_AUTO_CLEAR_PIPELINE",
    "reminder_emails": "ASSESSMENT_REMINDER_EMAILS",
    "outcome_analytics": "ASSESSMENT_OUTCOME_ANALYTICS",
    "coverage_heatmap": "ASSESSMENT_COVERAGE_HEATMAP",
}


def _env_bool(key: str, default: bool) -> bool:
    raw = os.environ.get(key)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def get_assessment_feature_flags() -> Dict[str, bool]:
    return {
        name: _env_bool(_ENV_KEYS[name], default)
        for name, default in _FLAG_DEFAULTS.items()
    }


def is_assessment_feature_enabled(name: str) -> bool:
    env_key = _ENV_KEYS.get(name)
    if not env_key:
        return False
    return _env_bool(env_key, _FLAG_DEFAULTS.get(name, False))
