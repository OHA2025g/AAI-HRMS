"""Unit tests for career trajectory report generation."""

import pytest

from career_trajectory.report_generator import analyze_resume_text


SAMPLE_RESUME = """
Jane Doe
Senior Engineering Manager
2018-2024 Acme Corp — Led cross-functional team of 12, delivered cloud migration,
increased revenue 18%, managed stakeholders and mentored engineers.
2014-2018 Beta Inc — Software architect, Kubernetes, AI/ML initiatives.
Skills: Python, leadership, strategy, transformation.
""" * 2


def test_analyze_resume_text_produces_overall_score():
    report = analyze_resume_text(SAMPLE_RESUME, candidate_id="cand-1")
    overall = (report.get("scores") or {}).get("overall_career_trajectory", {}).get("score")
    assert overall is not None
    assert report["id"]
    assert report["candidate_id"] == "cand-1"


def test_analyze_resume_text_rejects_short_text():
    with pytest.raises(ValueError):
        analyze_resume_text("too short")
