"""Configurable alert thresholds for Smart Hiring Dashboard."""

from __future__ import annotations

import json
import os
from typing import Dict

DEFAULT_STAGE_SLA_DAYS: Dict[str, int] = {
    "SCREENING": 14,
    "ASSESSMENT_SENT": 10,
    "ASSESSMENT_CLEARED": 14,
    "INTERVIEW_1": 21,
    "INTERVIEW_2": 14,
    "INTERVIEW_3": 14,
    "HR_ROUND": 14,
    "OFFER": 7,
}

DEFAULT_LOW_FIT_THRESHOLD = 50.0
DEFAULT_STUCK_CRITICAL_COUNT = 25
DEFAULT_MONTHLY_HIRE_TARGET = 10


def get_monthly_hire_target() -> int:
    try:
        return max(0, int(os.environ.get("HIRING_MONTHLY_HIRE_TARGET", DEFAULT_MONTHLY_HIRE_TARGET)))
    except (TypeError, ValueError):
        return DEFAULT_MONTHLY_HIRE_TARGET


def get_stage_sla_days() -> Dict[str, int]:
    raw = (os.environ.get("HIRING_STAGE_SLA_DAYS_JSON") or "").strip()
    if not raw:
        return dict(DEFAULT_STAGE_SLA_DAYS)
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return {str(k): int(v) for k, v in parsed.items()}
    except (TypeError, ValueError, json.JSONDecodeError):
        pass
    return dict(DEFAULT_STAGE_SLA_DAYS)


def get_low_fit_threshold() -> float:
    try:
        return float(os.environ.get("HIRING_LOW_FIT_THRESHOLD", DEFAULT_LOW_FIT_THRESHOLD))
    except (TypeError, ValueError):
        return DEFAULT_LOW_FIT_THRESHOLD


def get_stuck_critical_count() -> int:
    try:
        return int(os.environ.get("HIRING_STUCK_CRITICAL_COUNT", DEFAULT_STUCK_CRITICAL_COUNT))
    except (TypeError, ValueError):
        return DEFAULT_STUCK_CRITICAL_COUNT
