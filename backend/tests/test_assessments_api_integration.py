"""HTTP-level integration test: invite → take → score → pipeline stage via FastAPI router."""

from __future__ import annotations

import copy
from typing import Any, Dict, List, Optional

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from talent_acquisition.assessments_routes import create_assessments_router


class _MemCursor:
    def __init__(self, rows: List[Dict[str, Any]]):
        self._rows = rows
        self._sort_key = None
        self._sort_dir = -1
        self._limit: Optional[int] = None

    def sort(self, key, direction=-1):
        self._sort_key = key
        self._sort_dir = direction
        return self

    def limit(self, n):
        self._limit = n
        return self

    async def to_list(self, _limit):
        rows = list(self._rows)
        if self._sort_key:
            rows.sort(key=lambda r: r.get(self._sort_key) or "", reverse=self._sort_dir == -1)
        if self._limit is not None:
            rows = rows[: self._limit]
        return rows


def _match(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    for key, spec in query.items():
        val = doc.get(key)
        if isinstance(spec, dict):
            if "$in" in spec:
                if val not in spec["$in"]:
                    return False
            elif "$nin" in spec:
                if val in spec["$nin"]:
                    return False
            elif "$gte" in spec:
                if val is None or val < spec["$gte"]:
                    return False
            elif "$lt" in spec:
                if val is None or val >= spec["$lt"]:
                    return False
            elif "$ne" in spec:
                if val == spec["$ne"]:
                    return False
            else:
                return False
        elif val != spec:
            return False
    return True


class _MemCollection:
    def __init__(self, name: str, store: Dict[str, List[Dict[str, Any]]]):
        self.name = name
        self._store = store

    @property
    def _rows(self) -> List[Dict[str, Any]]:
        return self._store.setdefault(self.name, [])

    async def insert_one(self, doc: Dict[str, Any]):
        self._rows.append(copy.deepcopy(doc))

    async def find_one(self, query: Dict[str, Any], projection=None):
        for doc in self._rows:
            if _match(doc, query):
                out = copy.deepcopy(doc)
                if projection and projection.get("_id") == 0:
                    out.pop("_id", None)
                return out
        return None

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        for doc in self._rows:
            if _match(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                return

    async def count_documents(self, query: Dict[str, Any]):
        return sum(1 for doc in self._rows if _match(doc, query))

    def find(self, query: Dict[str, Any], projection=None):
        matched = [copy.deepcopy(d) for d in self._rows if _match(d, query)]
        if projection and projection.get("_id") == 0:
            for d in matched:
                d.pop("_id", None)
        return _MemCursor(matched)


class _MemDb:
    def __init__(self):
        self._store: Dict[str, List[Dict[str, Any]]] = {}

    def __getitem__(self, name: str):
        return _MemCollection(name, self._store)

    def __getattr__(self, name: str):
        return self[name]


@pytest.fixture
def assessment_app(monkeypatch):
    db = _MemDb()

    async def fake_email(*_args, **_kwargs):
        return {"sent": False, "queued": False}

    import talent_acquisition.assessment_email as email_mod

    monkeypatch.setattr(email_mod, "send_assessment_invite_email", fake_email)

    app = FastAPI()
    user = {"id": "recruiter-1", "role": "recruiter", "full_name": "Recruiter"}

    async def get_user():
        return user

    app.include_router(
        create_assessments_router(
            db=db,
            get_current_user=get_user,
            generate_with_ai=lambda *a, **k: {},
            create_notification=None,
            llm_chat=None,
        )
    )
    return app, db, user


@pytest.mark.asyncio
async def test_http_invite_submit_auto_clears_pipeline(assessment_app):
    app, db, user = assessment_app
    now = "2026-05-01T12:00:00+00:00"

    await db.jobs.insert_one({"id": "job-1", "title": "Engineer", "status": "OPEN"})
    await db.candidates.insert_one(
        {"id": "cand-1", "full_name": "Jane Doe", "email": "jane@example.com"}
    )
    await db.applications.insert_one(
        {
            "id": "app-1",
            "job_id": "job-1",
            "candidate_id": "cand-1",
            "stage": "SCREENING",
            "updated_at": now,
        }
    )
    await db.assessments.insert_one(
        {
            "id": "assess-1",
            "job_id": "job-1",
            "assessment_type": "CORE_SKILL",
            "title": "Core Skills",
            "duration_minutes": 30,
            "total_marks": 10,
            "questions": [
                {"id": "q1", "question_type": "MCQ", "max_marks": 10, "answer_key": "A"},
            ],
            "rubric": {"pass_threshold": 70},
            "status": "ACTIVE",
            "is_primary": True,
            "version": 1,
            "created_by": user["id"],
            "created_at": now,
            "updated_at": now,
        }
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        invite_res = await client.post(
            "/assessments/assess-1/invite",
            json={
                "application_id": "app-1",
                "move_to_assessment_sent": True,
                "send_candidate_email": False,
            },
        )
        assert invite_res.status_code == 200, invite_res.text
        submission = invite_res.json()
        assert submission["status"] == "INVITED"
        take_url = submission.get("take_url") or ""
        assert take_url.startswith("/assessment/take/")
        token = take_url.rsplit("/", 1)[-1]

        app_doc = await db.applications.find_one({"id": "app-1"}, {"_id": 0})
        assert app_doc["stage"] == "ASSESSMENT_SENT"

        start_res = await client.post(f"/assessments/take/{token}/start")
        assert start_res.status_code == 200

        submit_res = await client.post(
            f"/assessments/take/{token}/submit",
            json={"answers": [{"question_id": "q1", "response": "A"}]},
        )
        assert submit_res.status_code == 200, submit_res.text
        scored = submit_res.json()
        assert scored["status"] == "SCORED"
        assert scored["passed"] is True
        assert scored["score_pct"] == 100.0

        app_doc = await db.applications.find_one({"id": "app-1"}, {"_id": 0})
        assert app_doc["stage"] == "ASSESSMENT_CLEARED"


@pytest.mark.asyncio
async def test_http_cancel_submission(assessment_app):
    app, db, _user = assessment_app
    now = "2026-05-01T12:00:00+00:00"

    await db.jobs.insert_one({"id": "job-1", "title": "Engineer", "status": "OPEN"})
    await db.candidates.insert_one({"id": "cand-1", "full_name": "Jane Doe", "email": "jane@example.com"})
    await db.applications.insert_one(
        {"id": "app-1", "job_id": "job-1", "candidate_id": "cand-1", "stage": "ASSESSMENT_SENT", "updated_at": now}
    )
    await db.assessments.insert_one(
        {
            "id": "assess-1",
            "job_id": "job-1",
            "assessment_type": "CORE_SKILL",
            "title": "Core",
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
            "questions": [{"id": "q1", "question_type": "MCQ", "max_marks": 10, "answer_key": "A"}],
            "duration_minutes": 30,
            "total_marks": 10,
            "rubric": {"pass_threshold": 70},
            "version": 1,
        }
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        invite_res = await client.post(
            "/assessments/assess-1/invite",
            json={"application_id": "app-1", "send_candidate_email": False},
        )
        assert invite_res.status_code == 200, invite_res.text
        submission_id = invite_res.json()["id"]

        cancel_res = await client.post(f"/assessments/submissions/{submission_id}/cancel")
        assert cancel_res.status_code == 200, cancel_res.text
        assert cancel_res.json()["status"] == "CANCELLED"

        again = await client.post(f"/assessments/submissions/{submission_id}/cancel")
        assert again.status_code == 400


@pytest.mark.asyncio
async def test_http_assessments_config_and_coverage(assessment_app):
    app, db, _user = assessment_app
    now = "2026-05-01T12:00:00+00:00"
    await db.jobs.insert_one({"id": "job-1", "title": "Engineer", "status": "OPEN"})
    await db.assessments.insert_one(
        {
            "id": "a1",
            "job_id": "job-1",
            "assessment_type": "CORE_SKILL",
            "title": "Core",
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
            "questions": [],
            "duration_minutes": 30,
            "total_marks": 10,
            "rubric": {"pass_threshold": 70},
            "version": 1,
        }
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        cfg = await client.get("/assessments/config")
        assert cfg.status_code == 200
        body = cfg.json()
        assert body["public_take"] is True
        assert body["coverage_heatmap"] is True
        assert "email_delivery_ready" in body

        cov = await client.get("/assessments/analytics/coverage", params={"window_days": 30})
        assert cov.status_code == 200
        matrix = cov.json()
        assert matrix["jobs"]
        assert matrix["types"]
        assert matrix["cells"]


@pytest.mark.asyncio
async def test_http_outcome_correlation_respects_feature_flag(assessment_app, monkeypatch):
    app, _db, _user = assessment_app
    monkeypatch.setenv("ASSESSMENT_OUTCOME_ANALYTICS", "0")
    import talent_acquisition.assessment_feature_flags as flags_mod

    flags_mod.get_assessment_feature_flags.cache_clear() if hasattr(flags_mod.get_assessment_feature_flags, "cache_clear") else None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/assessments/analytics/outcome-correlation", params={"window_days": 30})
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_http_admin_ops_status(assessment_app):
    app, _db, user = assessment_app
    user["role"] = "admin"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/assessments/admin/ops-status")
        assert res.status_code == 200
        body = res.json()
        assert "smtp_configured" in body
        assert "warnings" in body
        assert isinstance(body["warnings"], list)


@pytest.mark.asyncio
async def test_http_suggest_pass_threshold(assessment_app):
    app, db, _user = assessment_app
    now = "2026-05-01T12:00:00+00:00"
    await db.jobs.insert_one({"id": "job-1", "title": "Engineer", "status": "OPEN"})
    await db.assessments.insert_one(
        {
            "id": "assess-1",
            "job_id": "job-1",
            "assessment_type": "CORE_SKILL",
            "title": "Core",
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
            "questions": [],
            "rubric": {"pass_threshold": 70},
            "version": 1,
        }
    )
    for pct in (42.0, 58.0, 72.0, 88.0):
        await db.assessment_submissions.insert_one(
            {
                "id": f"sub-{pct}",
                "assessment_id": "assess-1",
                "job_id": "job-1",
                "status": "SCORED",
                "score_pct": pct,
                "passed": pct >= 70,
            }
        )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/assessments/assess-1/suggest-pass-threshold")
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["method"] == "score_distribution"
        assert body["sample_size"] == 4


@pytest.mark.asyncio
async def test_http_calibration_and_time_vs_score(assessment_app):
    app, db, _user = assessment_app
    now = "2026-05-01T12:00:00+00:00"
    await db.jobs.insert_one({"id": "job-1", "title": "Engineer", "status": "OPEN"})
    await db.assessments.insert_one(
        {
            "id": "assess-1",
            "job_id": "job-1",
            "assessment_type": "CORE_SKILL",
            "title": "Core",
            "status": "ACTIVE",
            "created_at": now,
            "updated_at": now,
            "questions": [{"id": "q1", "question_text": "Q?", "max_marks": 10}],
            "rubric": {"pass_threshold": 70},
            "version": 1,
        }
    )
    await db.assessment_submissions.insert_one(
        {
            "id": "sub-1",
            "assessment_id": "assess-1",
            "job_id": "job-1",
            "candidate_id": "c1",
            "status": "SCORED",
            "score_pct": 80.0,
            "passed": True,
            "started_at": now,
            "completed_at": now,
            "answers": [{"question_id": "q1", "marks_awarded": 8, "max_marks": 10}],
        }
    )
    await db.candidates.insert_one({"id": "c1", "full_name": "Jane"})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        cal = await client.get("/assessments/analytics/calibration", params={"window_days": 30})
        assert cal.status_code == 200
        assert "hardest_questions" in cal.json()

        tvs = await client.get("/assessments/analytics/time-vs-score", params={"window_days": 30})
        assert tvs.status_code == 200
        assert isinstance(tvs.json(), list)
