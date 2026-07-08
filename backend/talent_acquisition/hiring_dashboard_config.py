"""DB-backed configuration for Smart Hiring Dashboard alert thresholds (Phase 4.2)."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from talent_acquisition.hiring_threshold_config import (
    DEFAULT_LOW_FIT_THRESHOLD,
    DEFAULT_MONTHLY_HIRE_TARGET,
    DEFAULT_STAGE_SLA_DAYS,
    DEFAULT_STUCK_CRITICAL_COUNT,
)

COL_HIRING_DASHBOARD_CONFIG = "hiring_dashboard_config"
COL_HIRING_DASHBOARD_CONFIG_AUDIT = "hiring_dashboard_config_audit"
CONFIG_DOC_ID = "default"

DEFAULT_RULE_FLAGS: Dict[str, bool] = {
    "low_fit": True,
    "stuck_stage": True,
    "stale_req": True,
    "trend_target": True,
    "no_pipeline": True,
    "no_ai_matches": True,
    "high_fit_recent": True,
}


@dataclass
class HiringDashboardConfig:
    stage_sla_days: Dict[str, int] = field(default_factory=lambda: dict(DEFAULT_STAGE_SLA_DAYS))
    low_fit_threshold: float = DEFAULT_LOW_FIT_THRESHOLD
    stuck_critical_count: int = DEFAULT_STUCK_CRITICAL_COUNT
    monthly_hire_target: int = DEFAULT_MONTHLY_HIRE_TARGET
    stale_req_zero_interviews_days: int = 90
    rule_flags: Dict[str, bool] = field(default_factory=lambda: dict(DEFAULT_RULE_FLAGS))
    llm_insights_enabled: bool = False


def _parse_rule_flags(raw: Any) -> Dict[str, bool]:
    if not isinstance(raw, dict):
        return dict(DEFAULT_RULE_FLAGS)
    out = dict(DEFAULT_RULE_FLAGS)
    for key in DEFAULT_RULE_FLAGS:
        if key in raw:
            out[key] = bool(raw[key])
    return out


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
        rule_flags=_parse_rule_flags(doc.get("rule_flags")),
        llm_insights_enabled=bool(doc.get("llm_insights_enabled")),
    )


def _diff_config(old: HiringDashboardConfig, new: HiringDashboardConfig) -> Dict[str, Any]:
    changes: Dict[str, Any] = {}
    scalar_fields = (
        "low_fit_threshold",
        "stuck_critical_count",
        "monthly_hire_target",
        "stale_req_zero_interviews_days",
        "llm_insights_enabled",
    )
    for name in scalar_fields:
        old_val = getattr(old, name)
        new_val = getattr(new, name)
        if old_val != new_val:
            changes[name] = {"from": old_val, "to": new_val}
    if old.stage_sla_days != new.stage_sla_days:
        changes["stage_sla_days"] = {"from": old.stage_sla_days, "to": new.stage_sla_days}
    if old.rule_flags != new.rule_flags:
        changes["rule_flags"] = {"from": old.rule_flags, "to": new.rule_flags}
    return changes


def _audit_summary(changes: Dict[str, Any]) -> str:
    if not changes:
        return "Configuration saved"
    keys = list(changes.keys())
    if len(keys) == 1:
        return f"Updated {keys[0].replace('_', ' ')}"
    return f"Updated {len(keys)} settings"


async def append_config_audit(
    db,
    *,
    actor_id: Optional[str],
    actor_name: Optional[str],
    changes: Dict[str, Any],
) -> None:
    if not changes:
        return
    now = datetime.now(timezone.utc).isoformat()
    await db[COL_HIRING_DASHBOARD_CONFIG_AUDIT].insert_one(
        {
            "id": str(uuid.uuid4()),
            "config_id": CONFIG_DOC_ID,
            "user_id": actor_id,
            "user_name": actor_name or "Admin",
            "summary": _audit_summary(changes),
            "changes": changes,
            "created_at": now,
        }
    )


async def list_config_audit(db, limit: int = 10) -> List[Dict[str, Any]]:
    rows = (
        await db[COL_HIRING_DASHBOARD_CONFIG_AUDIT]
        .find({"config_id": CONFIG_DOC_ID}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(max(1, min(limit, 50)))
    )
    return rows


async def get_hiring_dashboard_config(db) -> HiringDashboardConfig:
    """Load dashboard config from MongoDB, falling back to code defaults."""
    doc = await db[COL_HIRING_DASHBOARD_CONFIG].find_one({"id": CONFIG_DOC_ID}, {"_id": 0})
    if not doc:
        return HiringDashboardConfig()
    return config_from_document(doc)


async def upsert_hiring_dashboard_config(
    db,
    payload: Dict[str, Any],
    *,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
) -> HiringDashboardConfig:
    old_doc = await db[COL_HIRING_DASHBOARD_CONFIG].find_one({"id": CONFIG_DOC_ID}, {"_id": 0}) or {}
    merged_doc = {**old_doc, **payload, "id": CONFIG_DOC_ID}
    merged = config_from_document(merged_doc)
    old_cfg = config_from_document(old_doc)
    changes = _diff_config(old_cfg, merged)
    now = datetime.now(timezone.utc).isoformat()
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
                "rule_flags": merged.rule_flags,
                "llm_insights_enabled": merged.llm_insights_enabled,
                "updated_at": now,
            }
        },
        upsert=True,
    )
    await append_config_audit(db, actor_id=actor_id, actor_name=actor_name, changes=changes)
    return merged


async def get_hiring_dashboard_config_doc(db) -> Dict[str, Any]:
    """Load raw config document including metadata."""
    doc = await db[COL_HIRING_DASHBOARD_CONFIG].find_one({"id": CONFIG_DOC_ID}, {"_id": 0})
    if not doc:
        cfg = HiringDashboardConfig()
        return {**config_to_json(cfg), "updated_at": None}
    return doc


def config_to_json(config: HiringDashboardConfig, *, updated_at: Optional[str] = None) -> Dict[str, Any]:
    out = {
        "id": CONFIG_DOC_ID,
        "stage_sla_days": config.stage_sla_days,
        "low_fit_threshold": config.low_fit_threshold,
        "stuck_critical_count": config.stuck_critical_count,
        "monthly_hire_target": config.monthly_hire_target,
        "stale_req_zero_interviews_days": config.stale_req_zero_interviews_days,
        "rule_flags": config.rule_flags,
        "llm_insights_enabled": config.llm_insights_enabled,
    }
    if updated_at is not None:
        out["updated_at"] = updated_at
    return out


def rule_flag_enabled(rule_flags: Optional[Dict[str, bool]], key: str) -> bool:
    flags = rule_flags or DEFAULT_RULE_FLAGS
    return bool(flags.get(key, DEFAULT_RULE_FLAGS.get(key, True)))
