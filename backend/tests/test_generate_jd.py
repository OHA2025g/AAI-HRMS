"""Unit tests for JD generation helpers (template fallback + request shaping)."""

from server import generate_default_jd_text, _dedupe_skill_names


def test_dedupe_skill_names_preserves_order_case_insensitive():
    assert _dedupe_skill_names([" Python ", "SQL", "python", "Excel", "sql"]) == [
        "Python",
        "SQL",
        "Excel",
    ]


def test_generate_default_jd_text_includes_skills_and_meta():
    text = generate_default_jd_text(
        "Data Analyst",
        ["SQL", "Excel"],
        ["Power BI", "SQL"],
        location="Mumbai",
        work_mode="hybrid",
        seniority="Mid-Level",
        experience_range="3–5 years",
        business_pillar="Technology",
        business_department="Analytics",
    )
    assert "Role: Data Analyst" in text
    assert "Must-have skills" in text
    assert "- SQL" in text
    assert "- Excel" in text
    assert "Good-to-have skills" in text
    assert "- Power BI" in text
    assert text.count("- SQL") == 1  # not duplicated in good-to-have
    assert "Seniority: Mid-Level" in text
    assert "Location: Mumbai" in text
    assert "Technology / Analytics" in text
