"""
ETL: persist feature snapshots, optional demo backfill, data-quality checks.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from m3_workforce_intel.constants import COL_ETL_RUNS, COL_HIST_FEATURES
from m3_workforce_intel.features import extract_workforce_intel_feature_rows


def run_data_quality_checks(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Lightweight DQ for a single snapshot's feature rows.
    """
    checks: List[Dict[str, Any]] = []
    ok = True

    n = len(rows)
    checks.append(
        {
            "name": "row_count_nonzero",
            "pass": n > 0,
            "detail": f"rows={n}",
        }
    )
    ok = ok and checks[-1]["pass"]

    null_skills = sum(1 for r in rows if not (r.get("skill_name_lc") or "").strip())
    checks.append(
        {
            "name": "skill_key_present",
            "pass": null_skills == 0,
            "detail": f"null_skill_keys={null_skills}",
        }
    )
    ok = ok and checks[-1]["pass"]

    neg_demand = sum(1 for r in rows if int(r.get("demand_current") or 0) < 0)
    neg_supply = sum(1 for r in rows if int(r.get("supply_count") or 0) < 0)
    checks.append(
        {
            "name": "non_negative_counts",
            "pass": neg_demand == 0 and neg_supply == 0,
            "detail": f"neg_demand={neg_demand}, neg_supply={neg_supply}",
        }
    )
    ok = ok and checks[-1]["pass"]

    dup = {}
    for r in rows:
        k = (r.get("skill_name_lc") or "").strip().lower()
        dup[k] = dup.get(k, 0) + 1
    dup_cnt = sum(1 for _k, c in dup.items() if c > 1)
    checks.append(
        {
            "name": "unique_skill_per_snapshot",
            "pass": dup_cnt == 0,
            "detail": f"duplicate_skill_keys={dup_cnt}",
        }
    )
    ok = ok and checks[-1]["pass"]

    return {"passed": ok, "checks": checks}


def _row_id(snapshot_at: datetime, skill_lc: str, demand_source: str, suffix: str = "") -> str:
    raw = f"{snapshot_at.isoformat()}|{skill_lc}|{demand_source}|{suffix}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


async def etl_snapshot(
    db: AsyncIOMotorDatabase,
    *,
    enforce_dq: bool = True,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    rows, demand_source, supply_source = await extract_workforce_intel_feature_rows(db)
    dq = run_data_quality_checks(rows)
    run_id = str(uuid.uuid4())
    started = datetime.now(timezone.utc)

    if enforce_dq and not dq.get("passed"):
        ended = datetime.now(timezone.utc)
        await db[COL_ETL_RUNS].insert_one(
            {
                "run_id": run_id,
                "started_at": started,
                "ended_at": ended,
                "rows_written": 0,
                "demand_source": demand_source,
                "supply_source": supply_source,
                "dq_passed": False,
                "dq_report": dq,
                "status": "failed_dq",
                "actor_id": actor_id,
            }
        )
        return {
            "run_id": run_id,
            "status": "failed_dq",
            "rows_written": 0,
            "dq_report": dq,
            "demand_source": demand_source,
            "supply_source": supply_source,
        }

    docs = []
    snapshot_at = rows[0]["snapshot_at"] if rows else started
    for r in rows:
        sid = _row_id(snapshot_at, r["skill_name_lc"], demand_source)
        docs.append(
            {
                "id": sid,
                "snapshot_at": r["snapshot_at"],
                "skill_name_lc": r["skill_name_lc"],
                "skill_name": r["skill_name"],
                "priority": r["priority"],
                "demand_current": r["demand_current"],
                "supply_count": r["supply_count"],
                "gap": r["gap"],
                "demand_source": demand_source,
                "supply_source": supply_source,
                "etl_run_id": run_id,
            }
        )

    if docs:
        await db[COL_HIST_FEATURES].insert_many(docs)

    ended = datetime.now(timezone.utc)
    await db[COL_ETL_RUNS].insert_one(
        {
            "run_id": run_id,
            "started_at": started,
            "ended_at": ended,
            "rows_written": len(docs),
            "demand_source": demand_source,
            "supply_source": supply_source,
            "dq_passed": True,
            "dq_report": dq,
            "status": "ok",
            "actor_id": actor_id,
        }
    )
    return {
        "run_id": run_id,
        "status": "ok",
        "rows_written": len(docs),
        "dq_report": dq,
        "demand_source": demand_source,
        "supply_source": supply_source,
    }


async def etl_backfill_demo(
    db: AsyncIOMotorDatabase,
    *,
    days: int = 30,
    seed: int = 42,
    actor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Deterministic synthetic history for environments without prior snapshots.
    Varies demand_current slightly per day so the baseline model can train.
    """
    import random

    days = max(1, min(int(days), 365))
    rnd = random.Random(int(seed))

    rows, demand_source, supply_source = await extract_workforce_intel_feature_rows(db)
    dq = run_data_quality_checks(rows)
    run_id = str(uuid.uuid4())
    started = datetime.now(timezone.utc)
    if not dq.get("passed"):
        return {"run_id": run_id, "status": "failed_dq", "rows_written": 0, "dq_report": dq}

    now = datetime.now(timezone.utc)
    docs: List[Dict[str, Any]] = []
    for day_offset in range(days, 0, -1):
        snapshot_at = now - timedelta(days=day_offset)
        for r in rows:
            base = max(0, int(r["demand_current"]))
            jitter = rnd.randint(-max(1, base // 10 + 1), max(1, base // 10 + 1))
            demand = max(0, base + jitter)
            gap = max(0, demand - int(r["supply_count"]))
            skill_lc = r["skill_name_lc"]
            sid = _row_id(snapshot_at, skill_lc, demand_source, run_id)
            docs.append(
                {
                    "id": sid,
                    "snapshot_at": snapshot_at,
                    "skill_name_lc": skill_lc,
                    "skill_name": r["skill_name"],
                    "priority": r["priority"],
                    "demand_current": demand,
                    "supply_count": int(r["supply_count"]),
                    "gap": gap,
                    "demand_source": demand_source,
                    "supply_source": supply_source,
                    "etl_run_id": run_id,
                    "synthetic": True,
                }
            )

    if docs:
        await db[COL_HIST_FEATURES].insert_many(docs)

    ended = datetime.now(timezone.utc)
    await db[COL_ETL_RUNS].insert_one(
        {
            "run_id": run_id,
            "started_at": started,
            "ended_at": ended,
            "rows_written": len(docs),
            "demand_source": demand_source,
            "supply_source": supply_source,
            "dq_passed": True,
            "dq_report": dq,
            "status": "ok_backfill_demo",
            "backfill_days": days,
            "actor_id": actor_id,
        }
    )
    return {
        "run_id": run_id,
        "status": "ok_backfill_demo",
        "rows_written": len(docs),
        "dq_report": dq,
        "demand_source": demand_source,
        "supply_source": supply_source,
        "backfill_days": days,
    }
