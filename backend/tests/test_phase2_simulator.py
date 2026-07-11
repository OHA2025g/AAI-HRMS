from candidate_fit.simulator import build_phase2_report


def _sample_phase1() -> dict:
    return {
        "id": "traj-1",
        "job_id": "job-1",
        "executive_summary": "Candidate shows deep specialist progression with enterprise delivery exposure.",
        "primary_archetype": {"name": "Deep Specialist"},
        "secondary_archetype": {"name": "Stable Enterprise Leader"},
        "decision_gate": {
            "category": "Moderate fit: Validate",
            "reason": "Heuristic scoring from résumé text.",
        },
        "scores": {
            "overall_career_trajectory": {"score": 67.0},
            "career_progression": {"score": 61.0},
            "leadership_maturity": {"score": 58.0},
            "adaptability": {"score": 64.0},
            "project_complexity": {"score": 65.5},
            "business_impact": {"score": 60.0},
            "retention_risk": {"score": 42.0},
            "future_role_readiness": {"score": 63.0},
        },
        "strengths": [{"title": "Scope and ownership language", "evidence": "CV verbs"}],
        "risks": [
            {
                "title": "Evidence gaps",
                "severity": "medium",
                "evidence": "Some claims need validation.",
                "recommended_validation": "Ask for metrics per role.",
            }
        ],
        "recommended_interview_probes": [
            {"area": "Leadership scope", "question": "Largest team led?"},
        ],
        "career_timeline": [{"role": "Engineer", "company": "Acme"}],
    }


def test_phase2_report_has_rich_guidance():
    report = build_phase2_report(
        candidate_id="cand-1",
        trajectory_report=_sample_phase1(),
        job={"id": "job-1", "title": "Senior Engineer", "skills": [{"skill_name": "Python"}]},
        candidate={"full_name": "Jane Doe"},
    )
    assert len(report["insights"]) >= 6
    assert len(report["recommendations"]) >= 5
    assert len(report["action_items"]) >= 5
    assert len(report["recommended_next_steps"]) >= 5
    assert all(rec.get("rationale") for rec in report["recommendations"])
    assert all(act.get("priority") for act in report["action_items"])
    assert "Jane Doe" in report["executive_summary"]
    assert "Senior Engineer" in report["executive_summary"]


def test_phase2_recommendations_include_job_skills():
    report = build_phase2_report(
        candidate_id="cand-1",
        trajectory_report=_sample_phase1(),
        job={
            "id": "job-1",
            "title": "Data Engineer",
            "skills": [{"skill_name": "Python"}, {"skill_name": "Spark"}],
        },
        candidate={"full_name": "Jane Doe"},
    )
    skill_rec = next(r for r in report["recommendations"] if r["id"] == "rec-skills")
    assert "Python" in skill_rec["rationale"]
    assert "Spark" in skill_rec["rationale"]
