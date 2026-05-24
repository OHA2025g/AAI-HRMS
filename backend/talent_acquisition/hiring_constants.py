"""Shared constants for Smart Hiring Dashboard."""

from __future__ import annotations

# In-process TTL for hiring-pack (seconds)
HIRING_PACK_CACHE_TTL_SEC = 60

# Map application stage ids → Pipeline page tab keys
STAGE_TO_PIPELINE_TAB = {
    "SOURCED": "SOURCED",
    "SCREENING": "SCREENING",
    "ASSESSMENT_SENT": "ASSESSMENT",
    "ASSESSMENT_CLEARED": "ASSESSMENT",
    "INTERVIEW_1": "INTERVIEW",
    "INTERVIEW_2": "INTERVIEW",
    "INTERVIEW_3": "INTERVIEW",
    "HR_ROUND": "INTERVIEW",
    "OFFER": "SALARY",
    "JOINED": "SALARY",
}

STAGE_AGING_BUCKET_LABELS = ("0-7d", "8-14d", "15-30d", "31+d")

# Mirrors career_trajectory.constants.COL_REPORTS when that package is present
CAREER_TRAJECTORY_REPORTS_COLLECTION = "career_trajectory_reports"


def pipeline_tab_for_stage(stage: str) -> str:
    return STAGE_TO_PIPELINE_TAB.get(stage, "SOURCED")


def pipeline_path_for_stage(stage: str) -> str:
    return f"/pipeline?stage={pipeline_tab_for_stage(stage)}"


def candidates_path_for_channel(channel: str) -> str:
    return f"/candidates?display_channel={channel}"
