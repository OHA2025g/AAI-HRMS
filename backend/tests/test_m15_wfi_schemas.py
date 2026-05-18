from m15_workforce_intelligence.schemas import WorkforceHeadcountCreate, WorkforceSnapshotCreate, WorkforceForecastCreate


def test_snapshot_totals():
    try:
        WorkforceSnapshotCreate(
            snapshot_date="2026-04-01",
            total_workforce=10,
            active_workforce=8,
            inactive_workforce=5,
        )
        assert False, "expected validation error"
    except Exception:
        assert True


def test_headcount_filled_not_above_current():
    try:
        WorkforceHeadcountCreate(
            snapshot_date="2026-04-01",
            business_unit="Enterprise",
            department="Engineering",
            geography="India",
            current_headcount=10,
            filled_positions=12,
        )
        assert False, "expected validation error"
    except Exception:
        assert True


def test_forecast_confidence_range():
    try:
        WorkforceForecastCreate(
            forecast_type="HEADCOUNT",
            forecast_period="2026-Q2",
            confidence_score=2.0,
        )
        assert False, "expected validation error"
    except Exception:
        assert True

