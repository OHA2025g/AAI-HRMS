"""
M1-4: lightweight regression checks for deterministic ranking components (no Mongo, no LLM).
"""

from server import compute_basic_fit_score, compute_match_score


def _job():
    return {
        "title": "Senior Python Engineer",
        "normalized_title": "Senior Python Engineer",
        "description": "python django rest api microservices",
        "skills": [
            {"skill_name": "Python", "skill_type": "MUST_HAVE"},
            {"skill_name": "Django", "skill_type": "MUST_HAVE"},
            {"skill_name": "AWS", "skill_type": "GOOD_TO_HAVE"},
        ],
        "scoring_rubric": {
            "weights": {"title": 0.2, "skill": 0.5, "activity": 0.0, "experience": 0.0},
        },
    }


def _cand_must_match():
    return {
        "headline": "Senior Python Engineer",
        "skills": [
            {"skill_name": "Python"},
            {"skill_name": "Django"},
            {"skill_name": "AWS"},
        ],
        "resume_text": "python django rest api building microservices",
    }


def _cand_weak():
    return {
        "headline": "Junior Analyst",
        "skills": [{"skill_name": "Excel"}],
        "resume_text": "spreadsheets and reporting",
    }


def test_deterministic_match_ordering():
    job = _job()
    strong = compute_match_score(job, _cand_must_match())
    weak = compute_match_score(job, _cand_weak())
    assert strong["score"] > weak["score"]
    assert strong["must_have_ok"] is True
    assert weak["must_have_ok"] is False


def test_basic_fit_score_ordering_and_factors():
    job = _job()
    a = compute_basic_fit_score(job, _cand_must_match())
    b = compute_basic_fit_score(job, _cand_weak())
    assert a["final_score"] > b["final_score"]
    assert a["score_source"] == "basic"
    assert "score_factors" in a
    assert "skill_weighted" in a["score_factors"]
