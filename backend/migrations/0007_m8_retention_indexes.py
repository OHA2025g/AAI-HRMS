"""M8: attrition risk v1, segments, playbooks, interventions — indexes + seed playbooks."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from retention.constants import (
    COL_ATTRITION_MODEL_STATE,
    COL_ATTRITION_SCORES_LATEST,
    COL_RETENTION_INTERVENTIONS,
    COL_RETENTION_PLAYBOOKS,
    COL_RETENTION_SEGMENT_SETTINGS,
    RETENTION_SETTINGS_DOC_ID,
)


async def up(db) -> None:
    await db[COL_ATTRITION_MODEL_STATE].create_index("id", unique=True, name="uq_m8_attrition_model_id")
    await db[COL_ATTRITION_SCORES_LATEST].create_index("employee_id", unique=True, name="uq_m8_attrition_score_emp")
    await db[COL_ATTRITION_SCORES_LATEST].create_index([("attrition_risk", -1)], name="ix_m8_attrition_risk")
    await db[COL_ATTRITION_SCORES_LATEST].create_index([("risk_band", 1), ("department", 1)], name="ix_m8_attrition_band_dept")
    await db[COL_ATTRITION_SCORES_LATEST].create_index("segments", name="ix_m8_attrition_segments")

    await db[COL_RETENTION_SEGMENT_SETTINGS].create_index("id", unique=True, name="uq_retention_segment_settings")

    await db[COL_RETENTION_PLAYBOOKS].create_index("id", unique=True, name="uq_retention_playbook_id")
    await db[COL_RETENTION_PLAYBOOKS].create_index([("category", 1), ("title", 1)], name="ix_m8_playbook_cat_title")

    await db[COL_RETENTION_INTERVENTIONS].create_index("id", unique=True, name="uq_retention_intervention_id")
    await db[COL_RETENTION_INTERVENTIONS].create_index([("employee_id", 1), ("created_at", -1)], name="ix_m8_intervention_emp_created")
    await db[COL_RETENTION_INTERVENTIONS].create_index([("status", 1), ("created_at", -1)], name="ix_m8_intervention_status_created")

    n = await db[COL_RETENTION_PLAYBOOKS].count_documents({})
    if n == 0:
        now = datetime.now(timezone.utc).isoformat()
        seeds = [
            {
                "id": str(uuid.uuid4()),
                "title": "Stay interview + growth plan",
                "description": "Manager-led stay interview, document motivators and agree a 90-day development plan.",
                "category": "MANAGER",
                "suggested_duration_days": 21,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Compensation / leveling review",
                "description": "HRBP triggers comp benchmarking and role leveling discussion for critical talent.",
                "category": "COMPENSATION",
                "suggested_duration_days": 45,
                "created_at": now,
                "updated_at": now,
            },
        ]
        await db[COL_RETENTION_PLAYBOOKS].insert_many(seeds)

    await db[COL_RETENTION_SEGMENT_SETTINGS].update_one(
        {"id": RETENTION_SETTINGS_DOC_ID},
        {
            "$setOnInsert": {
                "id": RETENTION_SETTINGS_DOC_ID,
                "high_risk_score_min": 0.65,
                "medium_risk_score_min": 0.4,
                "require_critical_role_for_segment": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )


async def down(db) -> None:
    pass
