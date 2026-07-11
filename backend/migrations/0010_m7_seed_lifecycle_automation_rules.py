"""
12-week plan / Week 6: seed ≥3 lifecycle-related workflow automations (idempotent).

Rules are enabled for QA/staging proof paths; tune thresholds in production.
Dispatch: POST /api/admin/workflow-automation/dispatch-triggered (cron + admin JWT).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from automation.constants import COL_WORKFLOW_RULES, WORKFLOW_ENGINE_VERSION


async def up(db) -> None:
    now = datetime.now(timezone.utc).isoformat()

    seeds = [
        {
            "seed_key": "12wk_w6_notify_backlog_3",
            "name": "12wk W6 — Notify HR when lifecycle backlog ≥3",
            "enabled": True,
            "trigger_type": "ON_LIFECYCLE_PENDING_THRESHOLD",
            "trigger_config": {"min_pending": 3},
            "action_type": "NOTIFY_HR",
            "action_config": {
                "title": "Lifecycle backlog threshold",
                "message": "Pending lifecycle events reached the configured threshold (12wk seed rule).",
            },
            "max_retries": 3,
            "retry_backoff_sec": 2.0,
            "flow_graph": None,
        },
        {
            "seed_key": "12wk_w6_reprocess_backlog_10",
            "name": "12wk W6 — Reprocess lifecycle when backlog ≥10",
            "enabled": True,
            "trigger_type": "ON_LIFECYCLE_PENDING_THRESHOLD",
            "trigger_config": {"min_pending": 10},
            "action_type": "REPROCESS_LIFECYCLE",
            "action_config": {"limit": 25},
            "max_retries": 3,
            "retry_backoff_sec": 2.0,
            "flow_graph": None,
        },
        {
            "seed_key": "12wk_w6_schedule_noop_daily",
            "name": "12wk W6 — Daily automation health (NOOP)",
            "enabled": True,
            "trigger_type": "ON_SCHEDULE",
            "trigger_config": {},
            "action_type": "NOOP",
            "action_config": {},
            "max_retries": 3,
            "retry_backoff_sec": 2.0,
            "flow_graph": None,
            "schedule_interval_minutes": 1440,
            "schedule_next_run_at": now,
        },
    ]

    for s in seeds:
        sk = s["seed_key"]
        exists = await db[COL_WORKFLOW_RULES].find_one({"seed_key": sk}, {"_id": 1})
        if exists:
            continue
        rid = str(uuid.uuid4())
        doc = {
            "id": rid,
            "seed_key": sk,
            "name": s["name"],
            "enabled": bool(s["enabled"]),
            "trigger_type": s["trigger_type"],
            "trigger_config": dict(s.get("trigger_config") or {}),
            "action_type": s["action_type"],
            "action_config": dict(s.get("action_config") or {}),
            "max_retries": int(s["max_retries"]),
            "retry_backoff_sec": float(s["retry_backoff_sec"]),
            "engine_version": WORKFLOW_ENGINE_VERSION,
            "created_by": "migration_0010_m7_seed_lifecycle_automation_rules",
            "created_at": now,
            "updated_at": now,
            "flow_graph": s.get("flow_graph"),
        }
        if s["trigger_type"] == "ON_SCHEDULE":
            doc["schedule_interval_minutes"] = int(s.get("schedule_interval_minutes") or 1440)
            doc["schedule_next_run_at"] = s.get("schedule_next_run_at") or now
        await db[COL_WORKFLOW_RULES].insert_one(doc)


async def down(db) -> None:
    await db[COL_WORKFLOW_RULES].delete_many(
        {
            "seed_key": {
                "$in": [
                    "12wk_w6_notify_backlog_3",
                    "12wk_w6_reprocess_backlog_10",
                    "12wk_w6_schedule_noop_daily",
                ]
            }
        }
    )
