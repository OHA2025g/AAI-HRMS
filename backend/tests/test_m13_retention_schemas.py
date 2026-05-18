"""M13 High-Skill Talent Retention — schema validation (no Mongo)."""

import pytest
from pydantic import ValidationError

from m13_high_skill_talent_retention.schemas import StayInterviewCreate


def test_stay_interview_conducted_not_before_scheduled():
    with pytest.raises(ValidationError):
        StayInterviewCreate(
            employee_id="E001",
            scheduled_on="2026-05-10T10:00:00+00:00",
            conducted_on="2026-05-10T09:00:00+00:00",
        )

