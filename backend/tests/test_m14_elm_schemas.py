from m14_employee_lifecycle_management.schemas import OnboardingCreate, ProbationCreate, ResignationCreate


def test_onboarding_end_not_before_start():
    try:
        OnboardingCreate(
            employee_id="e1",
            onboarding_start_date="2026-04-10",
            onboarding_end_date="2026-04-01",
        )
        assert False, "expected validation error"
    except Exception:
        assert True


def test_probation_end_not_before_start():
    try:
        ProbationCreate(
            employee_id="e1",
            probation_start_date="2026-04-10",
            probation_end_date="2026-04-01",
        )
        assert False, "expected validation error"
    except Exception:
        assert True


def test_resignation_lwd_not_before_submitted():
    try:
        ResignationCreate(
            employee_id="e1",
            resignation_submitted_on="2026-04-10",
            last_working_day="2026-04-01",
        )
        assert False, "expected validation error"
    except Exception:
        assert True

