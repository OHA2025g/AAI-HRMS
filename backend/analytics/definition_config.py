"""Mongo overrides for M9 KPI definitions (semantic layer)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from analytics.constants import COL_M9_KPI_DEFINITIONS
from analytics.kpi_catalog import default_kpi_definitions


async def delete_definition_override(db, kpi_id: str) -> bool:
    kid = (kpi_id or "").strip()
    if not kid:
        return False
    res = await db[COL_M9_KPI_DEFINITIONS].delete_one({"kpi_id": kid})
    return res.deleted_count > 0


def default_definition_by_id(kpi_id: str) -> Optional[Dict[str, Any]]:
    for row in default_kpi_definitions():
        if row.get("kpi_id") == kpi_id:
            return dict(row)
    return None
