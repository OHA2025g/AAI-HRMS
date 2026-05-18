"""
M6: indexes for engagement templates, schedules, and privacy audit.

Idempotent — matches `ensure_phase1_indexes` in server.py for versioned rollout.
"""

from __future__ import annotations

from m6_engagement.constants import COL_PRIVACY_AUDIT, COL_SURVEY_SCHEDULES, COL_SURVEY_TEMPLATES


async def up(db) -> None:
    await db[COL_SURVEY_TEMPLATES].create_index("id", unique=True, name="uq_engagement_survey_template_id")
    await db[COL_SURVEY_TEMPLATES].create_index([("updated_at", -1)], name="ix_engagement_template_updated")
    await db[COL_SURVEY_SCHEDULES].create_index("id", unique=True, name="uq_engagement_survey_schedule_id")
    await db[COL_SURVEY_SCHEDULES].create_index([("enabled", 1), ("next_run_at", 1)], name="ix_engagement_schedule_due")
    await db[COL_SURVEY_SCHEDULES].create_index("template_id", name="ix_engagement_schedule_template")
    await db[COL_PRIVACY_AUDIT].create_index([("created_at", -1)], name="ix_engagement_privacy_audit_created")
    await db[COL_PRIVACY_AUDIT].create_index([("survey_id", 1), ("created_at", -1)], name="ix_engagement_privacy_audit_survey")


async def down(db) -> None:
    pass
