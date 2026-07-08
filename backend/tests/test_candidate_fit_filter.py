import pytest

from talent_acquisition.candidate_fit_filter import best_fit_scores_for_candidates


@pytest.mark.asyncio
async def test_best_fit_scores_for_candidates(db):
    await db.fit_scores.delete_many({"candidate_id": {"$in": ["c-fit-a", "c-fit-b"]}})
    await db.fit_scores.insert_many(
        [
            {"candidate_id": "c-fit-a", "job_id": "j1", "final_score": 72.0},
            {"candidate_id": "c-fit-a", "job_id": "j2", "final_score": 88.5},
            {"candidate_id": "c-fit-b", "job_id": "j1", "final_score": 65.0},
        ]
    )

    scores = await best_fit_scores_for_candidates(db, ["c-fit-a", "c-fit-b", "missing"])
    assert scores["c-fit-a"] == 88.5
    assert scores["c-fit-b"] == 65.0
    assert "missing" not in scores
