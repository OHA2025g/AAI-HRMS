"""Unit tests for Smart Hiring assessments service."""

import pytest

from talent_acquisition.assessments_service import (
    auto_score_mcq,
    list_submissions,
    pass_threshold_from_rubric,
    score_submission_answers,
    suggest_pass_threshold,
)


def test_auto_score_mcq_match():
    marks, ok = auto_score_mcq("Python", "python")
    assert ok is True
    assert marks == 1.0


def test_pass_threshold_default():
    assert pass_threshold_from_rubric(None) == 70.0
    assert pass_threshold_from_rubric({"pass_threshold": 80}) == 80.0


def test_score_submission_mcq():
    assessment = {
        "total_marks": 10,
        "questions": [
            {"id": "q1", "question_type": "MCQ", "max_marks": 10, "answer_key": "A"},
        ],
    }
    answers = [{"question_id": "q1", "response": "A"}]
    raw, pct, enriched, all_auto = score_submission_answers(assessment, answers)
    assert raw == 10.0
    assert pct == 100.0
    assert enriched[0]["auto_scored"] is True
    assert all_auto is True


def test_score_submission_mixed_pending_manual():
    assessment = {
        "total_marks": 20,
        "questions": [
            {"id": "q1", "question_type": "MCQ", "max_marks": 10, "answer_key": "A"},
            {"id": "q2", "question_type": "SHORT_ANSWER", "max_marks": 10},
        ],
    }
    answers = [
        {"question_id": "q1", "response": "A"},
        {"question_id": "q2", "response": "Some prose"},
    ]
    raw, pct, enriched, all_auto = score_submission_answers(assessment, answers)
    assert raw == 10.0
    assert all_auto is False


def _email_status_from_flags(sent, queued, failed):
    """Mirror enrich_submission email_status logic."""
    if sent:
        return "sent"
    if queued:
        return "queued"
    if failed:
        return "failed"
    return "none"


def test_email_status_derivation():
    assert _email_status_from_flags(True, False, False) == "sent"
    assert _email_status_from_flags(False, True, False) == "queued"
    assert _email_status_from_flags(False, False, True) == "failed"
    assert _email_status_from_flags(False, False, False) == "none"


class _FakeCursor:
    def __init__(self, rows):
        self._rows = rows

    def sort(self, *_args, **_kwargs):
        return self

    def limit(self, _n):
        return self

    async def to_list(self, _limit):
        return self._rows


class _FakeSubmissionsCol:
    def __init__(self, rows):
        self._rows = rows
        self.last_query = None

    def find(self, query, projection=None):
        self.last_query = query
        matched = [r for r in self._rows if all(r.get(k) == v for k, v in query.items() if k != "job_id")]
        if "job_id" in query:
            spec = query["job_id"]
            if isinstance(spec, dict) and "$in" in spec:
                matched = [r for r in self._rows if r.get("job_id") in spec["$in"]]
            else:
                matched = [r for r in self._rows if r.get("job_id") == spec]
        return _FakeCursor(matched)


class _FakeDbSubs:
    def __init__(self):
        self.assessment_submissions = _FakeSubmissionsCol(
            [
                {"id": "s1", "job_id": "job-a", "candidate_id": "c1", "assessment_id": "a1", "status": "INVITED"},
                {"id": "s2", "job_id": "job-b", "candidate_id": "c2", "assessment_id": "a2", "status": "INVITED"},
            ]
        )
        self.assessments = type("A", (), {"find_one": lambda *a, **k: {"title": "T"}})()
        self.candidates = type("C", (), {"find_one": lambda *a, **k: {"full_name": "X"}})()
        self.jobs = type("J", (), {"find_one": lambda *a, **k: {"title": "J"}})()

    def __getitem__(self, name):
        return getattr(self, name)


async def _job_ids_org(_db, org):
    return ["job-a"]


@pytest.mark.asyncio
async def test_list_submissions_filters_by_org(monkeypatch):
    import talent_acquisition.assessments_service as mod

    async def _enrich(_db, sub):
        return sub

    monkeypatch.setattr(mod, "_job_ids_for_org_filter", _job_ids_org)
    monkeypatch.setattr(mod, "enrich_submission", _enrich)
    rows = await list_submissions(_FakeDbSubs(), org={"pillar": "P1"})
    assert len(rows) == 1
    assert rows[0]["job_id"] == "job-a"


def test_score_to_pass_rate_integration():
    """MCQ-only assessment: full score should yield 100% pass rate bucket."""
    assessment = {
        "total_marks": 10,
        "questions": [
            {"id": "q1", "question_type": "MCQ", "max_marks": 10, "answer_key": "A"},
        ],
    }
    answers = [{"question_id": "q1", "response": "A"}]
    raw, pct, enriched, all_auto = score_submission_answers(assessment, answers)
    threshold = pass_threshold_from_rubric(assessment.get("rubric"))
    assert pct == 100.0
    assert pct >= threshold
    assert all_auto is True
    assert enriched[0]["marks_awarded"] == 10.0


class _FakeAssessmentsCol:
    def __init__(self, doc):
        self.doc = doc

    async def find_one(self, query, projection=None):
        if query.get("id") == self.doc.get("id"):
            if projection:
                return {k: self.doc.get(k) for k in projection if k != "_id"}
            return self.doc
        return None

    async def update_one(self, query, update):
        if "$set" in update:
            self.doc.update(update["$set"])


class _FakeDbVersions:
    def __init__(self, assessment_doc):
        self.assessments = _FakeAssessmentsCol(assessment_doc)

    def __getitem__(self, name):
        return getattr(self, name)


@pytest.mark.asyncio
async def test_list_assessment_versions_returns_snapshots():
    from talent_acquisition.assessments_service import list_assessment_versions

    doc = {
        "id": "a1",
        "version_snapshots": [
            {"version": 1, "saved_at": "2026-01-01", "action": "create", "question_count": 2},
            {"version": 2, "saved_at": "2026-01-02", "action": "publish", "question_count": 2},
        ],
    }
    rows = await list_assessment_versions(_FakeDbVersions(doc), "a1")
    assert len(rows) == 2
    assert rows[0]["version"] == 2


class _FakeSubmissionsColDraft:
    def __init__(self, sub):
        self.sub = sub
        self.updates = []

    async def find_one(self, query, projection=None):
        if query.get("take_token") == self.sub.get("take_token"):
            return self.sub
        return None

    async def update_one(self, query, update):
        self.updates.append(update)
        if "$set" in update:
            self.sub.update(update["$set"])


class _FakeDbDraft:
    def __init__(self, sub):
        self.assessment_submissions = _FakeSubmissionsColDraft(sub)

    def __getitem__(self, name):
        return getattr(self, name)


@pytest.mark.asyncio
async def test_save_take_draft_persists_answers(monkeypatch):
    from talent_acquisition.assessments_service import save_take_draft

    sub = {"id": "s1", "take_token": "tok", "status": "INVITED"}
    db = _FakeDbDraft(sub)
    async def _get_sub(_db, token):
        return sub if token == "tok" else None

    monkeypatch.setattr("talent_acquisition.assessments_service.get_submission_by_token", _get_sub)
    out = await save_take_draft(
        db,
        "tok",
        [{"question_id": "q1", "response": "hello"}],
    )
    assert out["status"] == "IN_PROGRESS"
    assert out["draft_answers"][0]["response"] == "hello"
    assert db.assessment_submissions.updates


class _FakeSubmissionsColScore:
    def __init__(self, rows):
        self.rows = rows
        self.last_query = None

    def find(self, query, projection=None):
        self.last_query = query
        matched = list(self.rows)
        if query.get("status"):
            matched = [r for r in matched if r.get("status") == query["status"]]
        score_q = query.get("score_pct")
        if isinstance(score_q, dict):
            if "$gte" in score_q:
                matched = [r for r in matched if (r.get("score_pct") or 0) >= score_q["$gte"]]
            if "$lte" in score_q:
                matched = [r for r in matched if (r.get("score_pct") or 0) <= score_q["$lte"]]
        return _FakeCursor(matched)


class _FakeDbScoreFilter:
    def __init__(self):
        self.assessment_submissions = _FakeSubmissionsColScore(
            [
                {"id": "s1", "job_id": "job-a", "status": "SCORED", "score_pct": 55},
                {"id": "s2", "job_id": "job-a", "status": "SCORED", "score_pct": 85},
            ]
        )
        self.assessments = type("A", (), {"find_one": lambda *a, **k: {"title": "T"}})()
        self.candidates = type("C", (), {"find_one": lambda *a, **k: {"full_name": "X"}})()
        self.jobs = type("J", (), {"find_one": lambda *a, **k: {"title": "J"}})()

    def __getitem__(self, name):
        return getattr(self, name)


@pytest.mark.asyncio
async def test_list_submissions_score_pct_filter(monkeypatch):
    import talent_acquisition.assessments_service as mod

    async def _enrich(_db, sub):
        return sub

    monkeypatch.setattr(mod, "enrich_submission", _enrich)
    db = _FakeDbScoreFilter()
    rows = await list_submissions(db, score_min_pct=60, score_max_pct=90)
    assert len(rows) == 1
    assert rows[0]["score_pct"] == 85


class _FakeAssessSuggest:
    async def find_one(self, query, projection=None):
        return {"id": "a1", "rubric": {"pass_threshold": 70}, "job_id": "j1", "assessment_type": "CORE_SKILL", "questions": []}


class _FakeJobsSuggest:
    async def find_one(self, query, projection=None):
        return {"title": "Engineer"}


class _FakeSubsSuggest:
    def find(self, query, projection=None):
        return _FakeCursor(
            [
                {"score_pct": 40.0},
                {"score_pct": 55.0},
                {"score_pct": 72.0},
                {"score_pct": 88.0},
            ]
        )


class _FakeDbSuggest:
    def __init__(self):
        self.assessments = _FakeAssessSuggest()
        self.jobs = _FakeJobsSuggest()
        self.assessment_submissions = _FakeSubsSuggest()

    def __getitem__(self, name):
        return getattr(self, name)


@pytest.mark.asyncio
async def test_suggest_pass_threshold_from_score_distribution():
    result = await suggest_pass_threshold(_FakeDbSuggest(), "a1", llm_chat=None)
    assert result["method"] == "score_distribution"
    assert result["sample_size"] == 4
    assert 0 <= result["suggested_pass_threshold_pct"] <= 100
