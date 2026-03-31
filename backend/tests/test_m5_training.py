"""M5 training recommendation rules + catalog normalization (no Mongo)."""

from m5_training.catalog_normalize import normalize_course_record, normalize_skill_tags
from m5_training.recommendation_rules import (
    build_employee_recommendation_payloads,
    build_recommendation_reason,
    recommend_skills_for_employee,
    sort_gap_skills,
)


def test_sort_gap_skills_priority_then_gap():
    rows = [
        {"skill_name": "A", "gap": 5, "priority": "MEDIUM", "demand_count": 10, "supply_count": 5},
        {"skill_name": "B", "gap": 100, "priority": "LOW", "demand_count": 100, "supply_count": 0},
        {"skill_name": "C", "gap": 1, "priority": "HIGH", "demand_count": 2, "supply_count": 1},
    ]
    s = sort_gap_skills(rows)
    assert [r["skill_name"] for r in s] == ["C", "A", "B"]


def test_recommend_skills_respects_max_and_existing():
    gap = [
        {"skill_name": "Python", "gap": 3, "priority": "HIGH", "demand_count": 5, "supply_count": 2},
        {"skill_name": "Java", "gap": 2, "priority": "MEDIUM", "demand_count": 4, "supply_count": 2},
    ]
    emp_skills = {"python"}
    tpl = {}
    out = recommend_skills_for_employee(emp_skills, sort_gap_skills(gap), tpl, max_skills=1)
    assert len(out) == 1
    assert out[0]["skill_name"] == "Java"


def test_path_template_override():
    gap = [
        {"skill_name": "Go", "gap": 1, "priority": "HIGH", "demand_count": 2, "supply_count": 1},
    ]
    tpl = {"go": [{"step_title": "Custom", "description": "X"}]}
    out = recommend_skills_for_employee(set(), sort_gap_skills(gap), tpl, max_skills=3)
    assert out[0]["path_steps"][0]["step_title"] == "Custom"


def test_build_recommendation_reason_contains_gap():
    r = build_recommendation_reason({"demand_count": 4, "supply_count": 1, "gap": 3, "priority": "HIGH"})
    assert "gap 3" in r
    assert "HIGH" in r


def test_build_employee_recommendation_payloads_shape():
    emps = [{"employee_code": "E1", "full_name": "One", "skills": []}]
    gaps = [{"skill_name": "Rust", "gap": 2, "priority": "MEDIUM", "demand_count": 2, "supply_count": 0}]
    p = build_employee_recommendation_payloads(emps, gaps, {}, max_skills_per_employee=2)
    assert len(p) == 1
    assert p[0]["employee_code"] == "E1"
    assert p[0]["recommended_skills"][0]["skill_name"] == "Rust"


def test_normalize_course_record():
    n = normalize_course_record(
        {"id": "x1", "title": "  Hello  ", "skills": ["Python", "AWS"], "duration_hours": "4.5"},
        provider="acme",
    )
    assert n["external_id"] == "x1"
    assert n["title_norm"] == "Hello"
    assert "python" in n["skill_tags_lc"]
    assert n["duration_hours"] == 4.5


def test_normalize_skill_tags_string():
    assert normalize_skill_tags("A, B; c") == ["a", "b", "c"]
