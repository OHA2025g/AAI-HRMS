"""M3 workforce intelligence: baseline model + DQ (no Mongo)."""

from m3_workforce_intel.baseline_model import (
    BaselineParams,
    evaluate_on_history,
    fit_per_skill_baseline,
    predict_demand,
)
from m3_workforce_intel.pipeline import run_data_quality_checks


def test_data_quality_checks_pass():
    rows = [
        {
            "skill_name_lc": "python",
            "skill_name": "Python",
            "demand_current": 5,
            "supply_count": 2,
        },
        {
            "skill_name_lc": "java",
            "skill_name": "Java",
            "demand_current": 1,
            "supply_count": 3,
        },
    ]
    r = run_data_quality_checks(rows)
    assert r["passed"] is True
    assert any(c["name"] == "row_count_nonzero" for c in r["checks"])


def test_data_quality_checks_duplicate_skill():
    rows = [
        {"skill_name_lc": "python", "skill_name": "Python", "demand_current": 1, "supply_count": 0},
        {"skill_name_lc": "python", "skill_name": "Python", "demand_current": 2, "supply_count": 0},
    ]
    r = run_data_quality_checks(rows)
    assert r["passed"] is False


def test_linear_baseline_predict():
    # Perfect line: 10, 12, 14 -> next step +2
    m = fit_per_skill_baseline({"s": [10.0, 12.0, 14.0]}, min_points=2)["s"]
    assert predict_demand(m, steps_ahead=1) == 16


def test_baseline_flat_series():
    m = fit_per_skill_baseline({"s": [7.0]}, min_points=2)["s"]
    assert m.slope == 0.0
    assert predict_demand(m, steps_ahead=3) == 7


def test_evaluate_on_history_positive():
    series = {"s": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]}
    mape, mae, n, per = evaluate_on_history(series, holdout_ratio=0.25)
    assert n > 0
    assert mae >= 0
    assert mape >= 0
    assert "s" in per


def test_baseline_params_roundtrip():
    p = BaselineParams(slope=1.0, intercept=2.0, n_points=3, last_demand=5.0, last_t=2.0)
    q = BaselineParams.from_dict(p.to_dict())
    assert q.slope == p.slope and q.intercept == p.intercept
