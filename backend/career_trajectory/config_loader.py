"""Default scoring config for Career Trajectory."""

from __future__ import annotations

from datetime import datetime, timezone

from career_trajectory.constants import DEFAULT_CONFIG_ID


def default_config_document() -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": DEFAULT_CONFIG_ID,
        "version": 1,
        "weights": {
            "experience_depth": 0.25,
            "role_progression": 0.25,
            "skill_alignment": 0.25,
            "stability": 0.25,
        },
        "created_at": now,
        "updated_at": now,
    }
