"""Load settings / demand / employees from Mongo and apply solver results."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from m4_resource_optimization.constants import COL_ALLOCATION_SETTINGS, DEFAULT_SETTINGS, SETTINGS_DOC_ID
from m4_resource_optimization.solver import DemandRecord, result_to_api_dict, solve_capacity_allocation


async def get_merged_settings(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    doc = await db[COL_ALLOCATION_SETTINGS].find_one({"_id": SETTINGS_DOC_ID}, {"_id": 0})
    out = {k: v for k, v in DEFAULT_SETTINGS.items() if k != "_id"}
    if doc:
        for k, v in doc.items():
            if k in out and v is not None:
                out[k] = v
            elif k not in ("_id",) and v is not None:
                out[k] = v
    return out


async def ensure_default_settings(db: AsyncIOMotorDatabase) -> None:
    await db[COL_ALLOCATION_SETTINGS].update_one(
        {"_id": SETTINGS_DOC_ID},
        {"$setOnInsert": DEFAULT_SETTINGS},
        upsert=True,
    )


def _stable_run_key(demand_rows: List[DemandRecord], settings: Dict[str, Any]) -> str:
    payload = {
        "demands": [
            {
                "p": r.project_id,
                "s": r.skill_lc,
                "min": r.effective_min(),
                "max": r.effective_max(),
                "t": r.constraint_type,
            }
            for r in sorted(demand_rows, key=lambda x: (x.project_id, x.skill_lc))
        ],
        "settings": {k: settings.get(k) for k in sorted(settings.keys()) if k != "_id"},
    }
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def _merge_demand_docs(
    mongo_rows: List[Dict[str, Any]],
    project_names: Dict[str, str],
    overrides: Optional[List[Dict[str, Any]]],
) -> List[DemandRecord]:
    ov_by: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for o in overrides or []:
        pid = (o.get("project_id") or "").strip()
        slc = (o.get("skill_name_lc") or (o.get("skill_name") or "").strip().lower()).strip().lower()
        if pid and slc:
            ov_by[(pid, slc)] = o

    out: List[DemandRecord] = []
    for r in mongo_rows:
        pid = r.get("project_id") or ""
        slc = (r.get("skill_name_lc") or "").strip().lower()
        if not pid or not slc:
            continue
        o = ov_by.get((pid, slc))
        base = dict(r)
        if o:
            for k, v in o.items():
                if k in (
                    "demand_count",
                    "demand_min",
                    "demand_max",
                    "constraint_type",
                    "priority",
                    "skill_name",
                ):
                    base[k] = v

        dcount = max(0, int(base.get("demand_count") or 0))
        dmin = base.get("demand_min")
        dmax = base.get("demand_max")
        ctype = str(base.get("constraint_type") or "HARD").upper()
        if ctype not in ("HARD", "SOFT"):
            ctype = "HARD"

        if ctype == "SOFT":
            dmin_i = max(0, int(dmin)) if dmin is not None else 0
            dmax_i = max(dmin_i, int(dmax)) if dmax is not None else max(dmin_i, dcount)
        else:
            dmin_i = int(dmin) if dmin is not None else dcount
            dmax_i = int(dmax) if dmax is not None else dcount
            dmax_i = max(dmin_i, dmax_i)

        out.append(
            DemandRecord(
                project_id=str(pid),
                project_name=str(project_names.get(pid) or pid),
                skill_lc=slc,
                skill_name=str(base.get("skill_name") or slc),
                demand_count=dcount,
                priority=str(base.get("priority") or "MEDIUM"),
                demand_min=dmin_i,
                demand_max=dmax_i,
                constraint_type=ctype,  # type: ignore[arg-type]
            )
        )
    return out


async def load_employee_skill_tuples(db: AsyncIOMotorDatabase) -> List[Tuple[str, Set[str]]]:
    emps = await db.employees.find({}, {"_id": 0, "employee_code": 1, "skills": 1}).to_list(5000)
    out: List[Tuple[str, Set[str]]] = []
    for e in emps:
        code = (e.get("employee_code") or "").strip()
        if not code:
            continue
        skills = e.get("skills") or []
        sk = {str(s).strip().lower() for s in skills if isinstance(s, str) and str(s).strip()}
        out.append((code, sk))
    return out


async def run_allocation_solve(
    db: AsyncIOMotorDatabase,
    *,
    demand_overrides: Optional[List[Dict[str, Any]]] = None,
    constraint_overrides: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    await ensure_default_settings(db)
    settings = await get_merged_settings(db)
    if constraint_overrides:
        for k, v in constraint_overrides.items():
            if k in settings and v is not None:
                settings[k] = v

    projects = await db.projects.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
    pmap = {str(p["id"]): str(p.get("name") or p["id"]) for p in projects}

    mongo_demands = await db.project_skill_demands.find({}, {"_id": 0}).to_list(100000)
    demand_records = _merge_demand_docs(mongo_demands, pmap, demand_overrides)

    employees = await load_employee_skill_tuples(db)
    run_key = _stable_run_key(demand_records, settings)

    if not demand_records:
        return {
            "assignments": [],
            "explain_steps": [
                {
                    "action": "SKIP",
                    "reason": "no_project_skill_demands",
                }
            ],
            "metrics": {
                "total_seats": 0,
                "filled_seats": 0,
                "unfilled_hard_seats": 0,
                "unfilled_soft_seats": 0,
                "utilization_pct": 0.0,
                "distinct_employees_used": 0,
                "distinct_projects": 0,
            },
            "score_breakdown": {"objective_score": 0.0, "run_key": run_key},
            "run_key": run_key,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    res = solve_capacity_allocation(
        demand_records,
        employees,
        max_projects_per_employee=int(settings.get("max_projects_per_employee") or 3),
        max_seats_per_employee_per_project=int(settings.get("max_seats_per_employee_per_project") or 1),
        shortage_penalty_hard=float(settings.get("shortage_penalty_hard") or 10.0),
        shortage_penalty_soft=float(settings.get("shortage_penalty_soft") or 3.0),
        utilization_weight=float(settings.get("utilization_weight") or 4.0),
        target_utilization_pct=float(settings.get("target_utilization_pct") or 85.0),
        run_key=run_key,
    )
    out = result_to_api_dict(res)
    out["generated_at"] = datetime.now(timezone.utc).isoformat()
    return out


async def apply_assignments_to_project_allocations(
    db: AsyncIOMotorDatabase,
    solve_result: Dict[str, Any],
    *,
    actor_id: str,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Aggregate assignments into per-project skill allocated_count and upsert project_skill_allocations.
    """
    assigns = solve_result.get("assignments") or []
    counts: Dict[Tuple[str, str], Dict[str, Any]] = {}
    for a in assigns:
        pid = a.get("project_id")
        slc = (a.get("skill_lc") or "").strip().lower()
        skn = (a.get("skill_name") or slc).strip() or slc
        if not pid or not slc:
            continue
        key = (pid, slc)
        if key not in counts:
            counts[key] = {"project_id": pid, "skill_name_lc": slc, "skill_name": skn, "n": 0}
        counts[key]["n"] += 1

    updated = 0
    created = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    preview: List[Dict[str, Any]] = []

    for _k, agg in counts.items():
        pid = agg["project_id"]
        slc = agg["skill_name_lc"]
        skn = agg["skill_name"]
        n = int(agg["n"])
        preview.append({"project_id": pid, "skill_name": skn, "allocated_count": n})
        if dry_run:
            continue
        ex = await db.project_skill_allocations.find_one({"project_id": pid, "skill_name_lc": slc}, {"_id": 0, "id": 1})
        if ex:
            await db.project_skill_allocations.update_one(
                {"id": ex["id"]},
                {"$set": {"allocated_count": n, "skill_name": skn, "updated_at": now_iso, "source": "m4_solver_apply"}},
            )
            updated += 1
        else:
            doc = {
                "id": str(uuid.uuid4()),
                "project_id": pid,
                "skill_name": skn,
                "skill_name_lc": slc,
                "allocated_count": n,
                "created_at": now_iso,
                "updated_at": now_iso,
                "source": "m4_solver_apply",
                "applied_by": actor_id,
            }
            await db.project_skill_allocations.insert_one(doc)
            created += 1

    return {"dry_run": dry_run, "created": created, "updated": updated, "preview": preview}
