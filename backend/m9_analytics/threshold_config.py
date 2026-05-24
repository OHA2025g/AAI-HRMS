"""Mongo-backed KPI threshold overrides (M9 admin)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from m9_analytics.constants import COL_M9_KPI_THRESHOLDS
from m9_analytics.thresholds import DEFAULT_THRESHOLDS


async def load_merged_threshold_rules(db) -> Dict[str, Dict[str, Any]]:
    rules = {k: dict(v) for k, v in DEFAULT_THRESHOLDS.items()}
    rows = await db[COL_M9_KPI_THRESHOLDS].find({}, {"_id": 0}).to_list(500)
    for row in rows:
        kid = row.get("kpi_id")
        if not kid:
            continue
        base = dict(rules.get(kid) or {})
        for key in ("warn", "critical", "higher_is_worse"):
            if row.get(key) is not None:
                base[key] = row[key]
        rules[kid] = base
    return rules


async def list_threshold_overrides(db) -> List[Dict[str, Any]]:
    merged = await load_merged_threshold_rules(db)
    stored = {
        r["kpi_id"]: r
        for r in await db[COL_M9_KPI_THRESHOLDS].find({}, {"_id": 0}).to_list(500)
        if r.get("kpi_id")
    }
    out: List[Dict[str, Any]] = []
    for kid in sorted(merged.keys()):
        eff = merged[kid]
        row = stored.get(kid, {})
        out.append(
            {
                "kpi_id": kid,
                "warn": eff.get("warn"),
                "critical": eff.get("critical"),
                "higher_is_worse": bool(eff.get("higher_is_worse", True)),
                "has_override": kid in stored,
                "updated_at": row.get("updated_at"),
            }
        )
    return out


async def upsert_threshold_override(db, kpi_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    from datetime import datetime, timezone

    kid = (kpi_id or "").strip()
    if not kid:
        raise ValueError("kpi_id required")
    doc: Dict[str, Any] = {
        "kpi_id": kid,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if patch.get("warn") is not None:
        doc["warn"] = float(patch["warn"])
    if patch.get("critical") is not None:
        doc["critical"] = float(patch["critical"])
    if patch.get("higher_is_worse") is not None:
        doc["higher_is_worse"] = bool(patch["higher_is_worse"])
    await db[COL_M9_KPI_THRESHOLDS].update_one({"kpi_id": kid}, {"$set": doc}, upsert=True)
    merged = await load_merged_threshold_rules(db)
    eff = merged.get(kid, {})
    return {
        "kpi_id": kid,
        "warn": eff.get("warn"),
        "critical": eff.get("critical"),
        "higher_is_worse": bool(eff.get("higher_is_worse", True)),
        "has_override": True,
        "updated_at": doc["updated_at"],
    }


async def delete_threshold_override(db, kpi_id: str) -> bool:
    res = await db[COL_M9_KPI_THRESHOLDS].delete_one({"kpi_id": (kpi_id or "").strip()})
    return res.deleted_count > 0
