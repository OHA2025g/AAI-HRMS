"""DB-backed configuration for Smart Hiring Dashboard alert thresholds (Phase 4.2)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

from talent_acquisition.hiring_threshold_config import (
    DEFAULT_LOW_FIT_THRESHOLD,
    DEFAULT_MONTHLY_HIRE_TARGET,
    DEFAULT_STAGE_SLA_DAYS,
    DEFAULT_STUCK_CRITICAL_COUNT,
)

COL_HIRING_DASHBOARD_CONFIG = "hiring_dashboard_config"
CONFIG_DOC_ID = "default"


@dataclass
class HiringDashboardConfig:
    stage_sla_days: Dict[str, int] = field(default_factory=lambda: dict(DEFAULT_STAGE_SLA_DAYS))
    low_fit_threshold: float = DEFAULT_LOW_FIT_THRESHOLD
    stuck_critical_count: int = DEFAULT_STUCK_CRITICAL_COUNT
    monthly_hire_target: int = DEFAULT_MONTHLY_HIRE_TARGET
    stale_req_zero_interviews_days: int = 90


def _parse_stage_sla(raw: Any) -> Dict[str, int]:
    if not isinstance(raw, dict):
        return dict(DEFAULT_STAGE_SLA_DAYS)
    out: Dict[str, int] = {}
    for k, v in raw.items():
        try:
            out[str(k)] = int(v)
        except (TypeError, ValueError):
            continue
    return out or dict(DEFAULT_STAGE_SLA_DAYS)


def config_from_document(doc: Optional[Dict[str, Any]]) -> HiringDashboardConfig:
    doc = doc or {}
    return HiringDashboardConfig(
        stage_sla_days=_parse_stage_sla(doc.get("stage_sla_days")),
        low_fit_threshold=float(doc.get("low_fit_threshold", DEFAULT_LOW_FIT_THRESHOLD)),
        stuck_critical_count=int(doc.get("stuck_critical_count", DEFAULT_STUCK_CRITICAL_COUNT)),
        monthly_hire_target=int(doc.get("monthly_hire_target", DEFAULT_MONTHLY_HIRE_TARGET)),
        stale_req_zero_interviews_days=int(doc.get("stale_req_zero_interviews_days", 90)),
    )


async def get_hiring_dashboard_config(db) -> HiringDashboardConfig:
    """Load dashboard config from MongoDB, falling back to code defaults."""
    doc = await db[COL_HIRING_DASHBOARD_CONFIG].find_one({"id": CONFIG_DOC_ID}, {"_id": 0})
    if not doc:
        return HiringDashboardConfig()
    return config_from_document(doc)


async def upsert_hiring_dashboard_config(db, payload: Dict[str, Any]) -> HiringDashboardConfig:
    merged = config_from_document(payload)
    await db[COL_HIRING_DASHBOARD_CONFIG].update_one(
        {"id": CONFIG_DOC_ID},
        {
            "$set": {
                "id": CONFIG_DOC_ID,
                "stage_sla_days": merged.stage_sla_days,
                "low_fit_threshold": merged.low_fit_threshold,
                "stuck_critical_count": merged.stuck_critical_count,
                "monthly_hire_target": merged.monthly_hire_target,
                "stale_req_zero_interviews_days": merged.stale_req_zero_interviews_days,
            }
        },
        upsert=True,
    )
    return merged


def config_to_json(config: HiringDashboardConfig) -> Dict[str, Any]:
    return {
        "id": CONFIG_DOC_ID,
        "stage_sla_days": config.stage_sla_days,
        "low_fit_threshold": config.low_fit_threshold,
        "stuck_critical_count": config.stuck_critical_count,
        "monthly_hire_target": config.monthly_hire_target,
        "stale_req_zero_interviews_days": config.stale_req_zero_interviews_days,
    }
