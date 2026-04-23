"""M8 retention: features, scoring, segments (no Mongo)."""

from m8_retention.features import (
    build_feature_row,
    compute_confidence,
    critical_skill_exposure,
    engagement_gap_feature,
    tenure_months,
)
from m8_retention.model_v1 import default_model_state, risk_band, score_from_state
from m8_retention.segments import compute_segments, default_segment_settings
from m8_retention.training import train_logistic_regression
from m8_retention.explainability import linear_shap_attributions


def test_tenure_months_zero_without_join():
    assert tenure_months(None) == 0.0
    assert tenure_months("") == 0.0


def test_critical_skill_exposure():
    m = {"python": 0.8, "java": 0.2}
    assert critical_skill_exposure(["Python", "Java"], m) == 0.5


def test_score_and_explainability():
    state = default_model_state()
    vec = {k: 0.5 for k in state["weights"].keys()}
    risk, logit, factors = score_from_state(vec, state)
    assert 0 <= risk <= 1
    assert isinstance(logit, float)
    assert len(factors) == 5
    assert factors[0]["feature"]


def test_risk_band():
    assert risk_band(0.9) == "HIGH"
    assert risk_band(0.5) == "MEDIUM"
    assert risk_band(0.2) == "LOW"


def test_segments_high_performer():
    emp = {"high_performer": True, "critical_role": True}
    segs = compute_segments(emp, 0.7, default_segment_settings())
    assert "HIGH_PERFORMER" in segs
    assert "CRITICAL_ROLE" in segs
    assert "HIGH_ATTRITION_RISK" in segs


def test_train_requires_five_rows():
    state = train_logistic_regression([])
    assert "weights" in state


def test_build_feature_row_structure():
    emp = {
        "skills": ["Python"],
        "join_date": "2020-01-01T00:00:00+00:00",
        "compensation_band": "LOW",
        "last_promotion_at": None,
    }
    crit = {"python": 0.6}
    row = build_feature_row(
        emp,
        critical_risk_by_skill_lc=crit,
        engagement_avg_rating=2.0,
        open_assignments=1,
        completed_assignments_12m=0,
    )
    assert set(row["vector"].keys()) == {
        "market_exposure",
        "tenure_insecurity",
        "engagement_gap",
        "compensation_pressure",
        "growth_gap",
    }
    assert compute_confidence(row["meta"]) >= 0.35


def test_engagement_gap():
    g, ok = engagement_gap_feature(5.0)
    assert ok
    assert g < 0.2


def test_linear_shap_attributions():
    state = default_model_state()
    vec = {k: 0.8 for k in state["weights"].keys()}
    keys = list(state["weights"].keys())
    shap = linear_shap_attributions(vec, state, keys=keys)
    assert shap[0]["feature"]
    assert "shap_value" in shap[0]


def test_hris_percentile_in_compensation():
    from m8_retention.features import compensation_pressure_feature

    p, ok = compensation_pressure_feature("MID", None, comp_market_percentile=20.0)
    assert ok
    p_hi, _ = compensation_pressure_feature("MID", None, comp_market_percentile=90.0)
    assert p > p_hi
