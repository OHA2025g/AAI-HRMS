"""
Extract demand–supply feature rows from Mongo (mirrors /workforce/intelligence heuristics source data).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase


def _priority_rank(priority: str) -> int:
    p = (priority or "").upper()
    if p == "HIGH":
        return 3
    if p == "MEDIUM":
        return 2
    return 1


async def _derived_supply_from_employees(db: AsyncIOMotorDatabase) -> Dict[str, int]:
    employees = await db.employees.find({}, {"_id": 0, "skills": 1}).to_list(2000)
    derived: Dict[str, int] = {}
    for e in employees:
        uniq_skills = set(
            (s.strip().lower() for s in (e.get("skills") or []) if isinstance(s, str) and s.strip())
        )
        for sk in uniq_skills:
            derived[sk] = derived.get(sk, 0) + 1
    return derived


async def _get_project_demand_map(db: AsyncIOMotorDatabase) -> Dict[str, Dict[str, Any]]:
    docs = await db.project_skill_demands.find(
        {}, {"_id": 0, "skill_name": 1, "skill_name_lc": 1, "demand_count": 1, "priority": 1}
    ).to_list(50000)
    out: Dict[str, Dict[str, Any]] = {}
    for d in docs:
        sk_lc = (d.get("skill_name_lc") or "").strip().lower()
        if not sk_lc:
            continue
        demand = max(0, int(d.get("demand_count") or 0))
        pri = (d.get("priority") or "MEDIUM").upper()
        if sk_lc not in out:
            out[sk_lc] = {
                "skill_name": d.get("skill_name") or d.get("skill_name_lc") or sk_lc,
                "demand_count": demand,
                "priority": pri,
            }
        else:
            out[sk_lc]["demand_count"] += demand
            if _priority_rank(pri) > _priority_rank(out[sk_lc].get("priority") or "MEDIUM"):
                out[sk_lc]["priority"] = pri
    return out


async def _get_project_allocations_supply_map(db: AsyncIOMotorDatabase) -> Dict[str, Dict[str, Any]]:
    docs = await db.project_skill_allocations.find(
        {},
        {"_id": 0, "skill_name": 1, "skill_name_lc": 1, "allocated_count": 1},
    ).to_list(100000)
    out: Dict[str, Dict[str, Any]] = {}
    for d in docs:
        sk_lc = (d.get("skill_name_lc") or "").strip().lower()
        if not sk_lc:
            continue
        allocated = max(0, int(d.get("allocated_count") or 0))
        if sk_lc not in out:
            out[sk_lc] = {
                "skill_name": d.get("skill_name") or d.get("skill_name_lc") or sk_lc,
                "allocated_count": allocated,
            }
        else:
            out[sk_lc]["allocated_count"] += allocated
    return out


async def extract_workforce_intel_feature_rows(
    db: AsyncIOMotorDatabase,
) -> Tuple[List[Dict[str, Any]], str, str]:
    """
    Returns (rows, demand_source, supply_source) where each row is suitable for hist insert + model training.
    """
    project_demand_count = await db.project_skill_demands.count_documents({})
    allocation_count = await db.project_skill_allocations.count_documents({})
    demand_source = "projects" if project_demand_count > 0 else "workforce_skills"
    supply_source = "allocations" if allocation_count > 0 else "employees"

    skills = await db.workforce_skills.find({}, {"_id": 0}).sort("gap", -1).to_list(500)
    derived_supply = await _derived_supply_from_employees(db)
    demand_map: Optional[Dict[str, Dict[str, Any]]] = None
    if project_demand_count > 0:
        demand_map = await _get_project_demand_map(db)

    allocation_supply: Dict[str, Dict[str, Any]] = {}
    if allocation_count > 0:
        allocation_supply = await _get_project_allocations_supply_map(db)

    inv_by_skill_lc: Dict[str, Dict[str, Any]] = {}
    for row in skills:
        skill_key = (row.get("skill_name") or "").strip().lower()
        if skill_key:
            inv_by_skill_lc[skill_key] = row

    rows: List[Dict[str, Any]] = []
    snapshot_at = datetime.now(timezone.utc)

    if demand_map:
        derived_supply_proj = await _derived_supply_from_employees(db)
        for sk_lc, d in demand_map.items():
            inv_row = inv_by_skill_lc.get(sk_lc)
            if allocation_count > 0:
                supply_count = int(allocation_supply.get(sk_lc, {}).get("allocated_count", 0))
            else:
                manual = int(inv_row.get("supply_count", 0) or 0) if inv_row else 0
                auto = int(derived_supply_proj.get(sk_lc, 0) or 0)
                supply_count = max(manual, auto) if inv_row else auto
            demand_current = max(0, int(d.get("demand_count") or 0))
            priority = str((inv_row.get("priority") if inv_row else d.get("priority")) or "MEDIUM").upper()
            name = inv_row.get("skill_name") if inv_row else (d.get("skill_name") or sk_lc)
            gap = max(0, demand_current - supply_count)
            rows.append(
                {
                    "snapshot_at": snapshot_at,
                    "skill_name_lc": sk_lc,
                    "skill_name": name,
                    "priority": priority,
                    "demand_current": demand_current,
                    "supply_count": supply_count,
                    "gap": gap,
                    "demand_source": demand_source,
                    "supply_source": supply_source,
                }
            )
    else:
        for row in skills:
            name = row.get("skill_name") or ""
            if not name:
                continue
            sk_lc = name.strip().lower()
            manual_supply = max(0, int(row.get("supply_count") or 0))
            auto_supply = derived_supply.get(sk_lc, 0)
            merged_supply = max(manual_supply, auto_supply)
            demand_current = max(0, int(row.get("demand_count") or 0))
            if allocation_count > 0:
                merged_supply = int(allocation_supply.get(sk_lc, {}).get("allocated_count", 0))
            priority = str(row.get("priority") or "MEDIUM").upper()
            gap = max(0, demand_current - merged_supply)
            rows.append(
                {
                    "snapshot_at": snapshot_at,
                    "skill_name_lc": sk_lc,
                    "skill_name": name,
                    "priority": priority,
                    "demand_current": demand_current,
                    "supply_count": merged_supply,
                    "gap": gap,
                    "demand_source": demand_source,
                    "supply_source": supply_source,
                }
            )

    return rows, demand_source, supply_source
