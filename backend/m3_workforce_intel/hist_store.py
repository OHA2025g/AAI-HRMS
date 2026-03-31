"""
Read historical feature rows as aligned time series per skill.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from m3_workforce_intel.constants import COL_HIST_FEATURES


async def load_demand_series_by_skill(
    db: AsyncIOMotorDatabase,
    demand_source: str,
    *,
    max_snapshots: int = 200,
) -> Tuple[Dict[str, List[float]], List[datetime]]:
    """
    Returns (series_by_skill, snapshot_times_asc).
    For each ordered snapshot, missing skills are filled with 0 so lengths align to timeline.
    """
    pipeline = [
        {"$match": {"demand_source": demand_source}},
        {"$group": {"_id": "$snapshot_at"}},
        {"$sort": {"_id": 1}},
        {"$limit": int(max_snapshots)},
    ]
    snap_docs = await db[COL_HIST_FEATURES].aggregate(pipeline).to_list(max_snapshots + 10)
    times: List[datetime] = []
    for s in snap_docs:
        t = s.get("_id")
        if isinstance(t, datetime):
            times.append(t)
    if not times:
        return {}, []

    rows = await db[COL_HIST_FEATURES].find(
        {"demand_source": demand_source, "snapshot_at": {"$in": times}},
        {"_id": 0, "snapshot_at": 1, "skill_name_lc": 1, "demand_current": 1},
    ).to_list(200000)

    by_t: Dict[datetime, Dict[str, int]] = {}
    for r in rows:
        t = r.get("snapshot_at")
        if not isinstance(t, datetime):
            continue
        sk = (r.get("skill_name_lc") or "").strip().lower()
        if not sk:
            continue
        by_t.setdefault(t, {})[sk] = max(0, int(r.get("demand_current") or 0))

    all_skills = set()
    for m in by_t.values():
        all_skills.update(m.keys())

    series: Dict[str, List[float]] = {sk: [] for sk in all_skills}
    for t in times:
        m = by_t.get(t, {})
        for sk in all_skills:
            series[sk].append(float(m.get(sk, 0)))

    return series, times
