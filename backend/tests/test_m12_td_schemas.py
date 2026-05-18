"""M12 Training & Development — Pydantic validation (no Mongo)."""

import pytest
from pydantic import ValidationError

from m12_training_development.schemas import TrainingSessionCreate


def test_session_end_must_not_be_before_start():
    with pytest.raises(ValidationError):
        TrainingSessionCreate(
            training_id="t1",
            session_title="S1",
            start_datetime="2026-05-01T10:00:00+00:00",
            end_datetime="2026-05-01T09:00:00+00:00",
        )


def test_session_valid_window():
    s = TrainingSessionCreate(
        training_id="t1",
        session_title="S1",
        start_datetime="2026-05-01T10:00:00+00:00",
        end_datetime="2026-05-01T11:00:00+00:00",
    )
    assert s.end_datetime > s.start_datetime
