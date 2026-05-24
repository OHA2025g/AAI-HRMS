"""Integration-style tests for assessment invite → score → resend flows."""

import pytest

from talent_acquisition.assessments_service import (
    cancel_submission,
    resend_submission_invite_email,
    score_submission_answers,
)


def test_mcq_score_yields_pass_at_default_threshold():
    assessment = {
        "total_marks": 10,
        "rubric": {"pass_threshold": 70},
        "questions": [
            {"id": "q1", "question_type": "MCQ", "max_marks": 10, "answer_key": "A"},
        ],
    }
    answers = [{"question_id": "q1", "response": "A"}]
    raw, pct, enriched, all_auto = score_submission_answers(assessment, answers)
    assert pct == 100.0
    assert all_auto is True
    threshold = assessment["rubric"]["pass_threshold"]
    assert pct >= threshold


class _FakeEmailResult:
    async def __call__(self, *args, **kwargs):
        return {"sent": True, "queued": False}


class _FakeSubmissionsCol:
    def __init__(self, doc):
        self._doc = doc
        self.updates = []

    async def find_one(self, query, projection=None):
        if query.get("id") == self._doc["id"]:
            return dict(self._doc)
        return None

    async def update_one(self, query, update):
        self.updates.append((query, update))
        if query.get("id") == self._doc["id"]:
            self._doc.update(update.get("$set", {}))


class _FakeAssessmentsCol:
    def __init__(self, doc):
        self._doc = doc

    async def find_one(self, query, projection=None):
        if query.get("id") == self._doc["id"]:
            return dict(self._doc)
        return None


class _FakeCandidatesCol:
    async def find_one(self, query, projection=None):
        return {"id": "c1", "full_name": "Jane Doe", "email": "jane@example.com"}


class _FakeJobsCol:
    async def find_one(self, query, projection=None):
        return {"id": "job1", "title": "Engineer"}


class _FakeAuditCol:
    def __init__(self):
        self.rows = []

    async def insert_one(self, doc):
        self.rows.append(doc)


class _FakeDbResend:
    def __init__(self):
        self.assessment_submissions = _FakeSubmissionsCol(
            {
                "id": "sub1",
                "assessment_id": "a1",
                "candidate_id": "c1",
                "job_id": "job1",
                "status": "INVITED",
                "access_token": "tok123",
                "invited_by": "user-inviter",
            }
        )
        self.assessments = _FakeAssessmentsCol({"id": "a1", "title": "Core Skills Test"})
        self.candidates = _FakeCandidatesCol()
        self.jobs = _FakeJobsCol()
        self.assessment_audit_log = _FakeAuditCol()

    def __getitem__(self, name):
        return getattr(self, name)


@pytest.mark.asyncio
async def test_resend_email_notifies_inviter(monkeypatch):
    import talent_acquisition.assessment_email as email_mod

    async def fake_send(*args, **kwargs):
        return {"sent": True, "queued": False}

    monkeypatch.setattr(email_mod, "send_assessment_invite_email", fake_send)

    notifications = []

    async def fake_notification(**kwargs):
        notifications.append(kwargs)

    db = _FakeDbResend()

    async def fake_enrich(_db, sub):
        return sub

    import talent_acquisition.assessments_service as svc

    monkeypatch.setattr(svc, "enrich_submission", fake_enrich)

    await resend_submission_invite_email(
        db,
        "sub1",
        actor_id="user-resender",
        create_notification=fake_notification,
    )

    assert len(notifications) == 1
    assert notifications[0]["recipient_id"] == "user-inviter"
    assert notifications[0]["notification_type"] == "ASSESSMENT_INVITE"
    assert "resent" in notifications[0]["title"].lower() or "resent" in notifications[0]["message"].lower()


@pytest.mark.asyncio
async def test_cancel_submission_sets_status_and_audits(monkeypatch):
    db = _FakeDbResend()

    async def fake_enrich(_db, sub):
        return sub

    import talent_acquisition.assessments_service as svc

    monkeypatch.setattr(svc, "enrich_submission", fake_enrich)

    result = await cancel_submission(db, "sub1", actor_id="user-cancel")
    assert result["status"] == "CANCELLED"
    assert db.assessment_submissions._doc["status"] == "CANCELLED"
    assert db.assessment_audit_log.rows
    assert db.assessment_audit_log.rows[-1]["action"] == "cancel_submission"
