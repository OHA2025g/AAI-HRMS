"""
M5: optional seed learning-path template (idempotent).

Safe to run multiple times — upserts one template for `python` skill.
"""

from __future__ import annotations

from datetime import datetime, timezone


async def up(db) -> None:
    from m5_training.constants import COL_LEARNING_PATH_TEMPLATES

    now = datetime.now(timezone.utc).isoformat()
    await db[COL_LEARNING_PATH_TEMPLATES].update_one(
        {"skill_name_lc": "python"},
        {
            "$setOnInsert": {
                "id": "tpl-python-default",
                "skill_name": "Python",
                "skill_name_lc": "python",
                "steps": [
                    {
                        "step_title": "Python syntax & data structures",
                        "description": "Variables, collections, control flow, and functions.",
                    },
                    {
                        "step_title": "Testing & packaging",
                        "description": "pytest basics, virtualenvs, and publishing internal modules.",
                    },
                    {
                        "step_title": "Capstone assessment",
                        "description": "Timed exercise + peer review checklist.",
                    },
                ],
                "created_at": now,
            }
        },
        upsert=True,
    )


async def down(db) -> None:
    pass
