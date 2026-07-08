from career_trajectory.routes import _trajectory_compare_summary


def test_trajectory_compare_summary_includes_dimension_scores():
    doc = {
        "id": "rpt-1",
        "created_at": "2026-06-18T00:00:00+00:00",
        "primary_archetype": {"name": "Deep Specialist"},
        "decision_gate": {"category": "Moderate fit: Validate"},
        "scores": {
            "overall_career_trajectory": {"score": 67.0},
            "career_progression": {"score": 62.5},
            "leadership_maturity": {"score": 58.0},
            "project_complexity": {"score": 71.0},
            "business_impact": {"score": 64.0},
            "retention_risk": {"score": 35.0},
        },
    }
    summary = _trajectory_compare_summary(doc)
    assert summary["overall_score"] == 67.0
    assert summary["career_progression"] == 62.5
    assert summary["leadership_maturity"] == 58.0
    assert summary["project_complexity"] == 71.0
    assert summary["business_impact"] == 64.0
    assert summary["retention_risk"] == 35.0
    assert summary["primary_archetype"] == "Deep Specialist"
    assert summary["decision_gate"] == "Moderate fit: Validate"
