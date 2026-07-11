"""
M7: indexes for workflow rules/runs, HR copilot audit, manual baselines.

Idempotent — mirrors `ensure_phase1_indexes` in server.py.
"""

from __future__ import annotations

from automation.constants import COL_HR_COPILOT_AUDIT, COL_MANUAL_WORKFLOW_BASELINES, COL_WORKFLOW_RULES, COL_WORKFLOW_RUNS


async def up(db) -> None:
    await db[COL_WORKFLOW_RULES].create_index("id", unique=True, name="uq_m7_workflow_rule_id")
    await db[COL_WORKFLOW_RULES].create_index([("enabled", 1), ("updated_at", -1)], name="ix_m7_workflow_rule_enabled_updated")
    await db[COL_WORKFLOW_RUNS].create_index("id", unique=True, name="uq_m7_workflow_run_id")
    await db[COL_WORKFLOW_RUNS].create_index([("created_at", -1)], name="ix_m7_workflow_run_created")
    await db[COL_WORKFLOW_RUNS].create_index([("rule_id", 1), ("created_at", -1)], name="ix_m7_workflow_run_rule_created")
    await db[COL_WORKFLOW_RUNS].create_index([("status", 1), ("created_at", -1)], name="ix_m7_workflow_run_status_created")
    await db[COL_HR_COPILOT_AUDIT].create_index([("created_at", -1)], name="ix_m7_copilot_audit_created")
    await db[COL_HR_COPILOT_AUDIT].create_index([("session_id", 1), ("created_at", -1)], name="ix_m7_copilot_audit_session")
    await db[COL_MANUAL_WORKFLOW_BASELINES].create_index("id", unique=True, name="uq_m7_manual_baseline_id")
    await db[COL_MANUAL_WORKFLOW_BASELINES].create_index(
        "workflow_key", unique=True, name="uq_m7_manual_baseline_workflow_key"
    )


async def down(db) -> None:
    pass
