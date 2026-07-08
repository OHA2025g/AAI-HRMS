"""Assessment generation question count."""

from talent_acquisition.assessments_constants import ASSESSMENT_QUESTIONS_PER_TYPE


def test_assessment_questions_per_type_is_25():
    assert ASSESSMENT_QUESTIONS_PER_TYPE == 25
