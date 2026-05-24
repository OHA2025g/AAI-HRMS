"""Tests for assessment analytics pass-rate-by-type filtering."""

import pytest
from datetime import datetime, timedelta, timezone

from talent_acquisition.assessments_analytics import (
    build_funnel,
    outcome_correlation,
    pass_rate_by_type,
    _window_cutoff,
)


class _FakeCursor:
    def __init__(self, rows):
        self._rows = rows

    async def to_list(self, _limit):
        return self._rows


class _FakeSubmissions:
    def __init__(self, counts):
        self.counts = counts

    async def count_documents(self, query):
        aids = tuple(query.get("assessment_id", {}).get("$in", []))
        status = query.get("status")
        passed = query.get("passed")
        return self.counts.get((aids, status, passed), 0)


class _FakeAssessments:
    def __init__(self, rows):
        self._rows = rows

    def find(self, query, projection=None):
        return _FakeCursor(self._rows)


class _FakeDb:
    def __init__(self):
        self.assessments = _FakeAssessments(
            [
                {"id": "a-core", "assessment_type": "CORE_SKILL"},
                {"id": "a-screen", "assessment_type": "SCREENING"},
            ]
        )
        self.assessment_submissions = _FakeSubmissions(
            {
                (("a-core",), "SCORED", True): 2,
                (("a-core",), "SCORED", None): 4,
                (("a-screen",), "SCORED", True): 0,
                (("a-screen",), "SCORED", None): 0,
            }
        )

    def __getitem__(self, name):
        return getattr(self, name)


async def _job_ids_for_org_filter(_db, _org=None):
    return ["job1"]


@pytest.mark.asyncio
async def test_pass_rate_by_type_scopes_to_assessment_ids(monkeypatch):
    import talent_acquisition.assessments_analytics as mod

    monkeypatch.setattr(mod, "_job_ids_for_org_filter", _job_ids_for_org_filter)
    rows = await pass_rate_by_type(_FakeDb())
    by_type = {r.assessment_type: r for r in rows}
    assert by_type["CORE_SKILL"].pass_rate_pct == 50.0
    assert by_type["SCREENING"].pass_rate_pct is None


class _FakeApps:
    def __init__(self, rows):
        self._rows = rows

    def find(self, query, projection=None):
        ids = query.get("id", {}).get("$in", [])
        return _FakeCursor([r for r in self._rows if r["id"] in ids])


class _FakeSubmissionsScored:
    def __init__(self, rows):
        self._rows = rows

    def find(self, query, projection=None):
        if query.get("status") == "SCORED":
            return _FakeCursor(self._rows)
        return _FakeCursor([])


class _FakeDbOutcome:
    def __init__(self):
        self.assessment_submissions = _FakeSubmissionsScored(
            [
                {"passed": True, "application_id": "app1"},
                {"passed": False, "application_id": "app2"},
                {"passed": True, "application_id": "app3"},
            ]
        )
        self.applications = _FakeApps(
            [
                {"id": "app1", "stage": "INTERVIEW_1"},
                {"id": "app2", "stage": "ASSESSMENT_SENT"},
                {"id": "app3", "stage": "HIRED"},
            ]
        )

    def __getitem__(self, name):
        return getattr(self, name)


@pytest.mark.asyncio
async def test_outcome_correlation_counts_interview_and_hire(monkeypatch):
    import talent_acquisition.assessments_analytics as mod

    monkeypatch.setattr(mod, "_job_ids_for_org_filter", _job_ids_for_org_filter)
    result = await outcome_correlation(_FakeDbOutcome())
    assert result.scored == 3
    assert result.passed == 2
    assert result.reached_interview == 2
    assert result.hired == 1


class _CountingSubmissions:
    def __init__(self):
        self.queries = []

    async def count_documents(self, query):
        self.queries.append(query)
        status = query.get("status")
        if isinstance(status, dict) and status.get("$in"):
            return 4
        return 1


class _CountingApps:
    async def count_documents(self, query):
        return 1


class _FakeDbFunnel:
    def __init__(self):
        self.assessment_submissions = _CountingSubmissions()
        self.applications = _CountingApps()

    def __getitem__(self, name):
        return getattr(self, name)


@pytest.mark.asyncio
async def test_build_funnel_applies_window_days(monkeypatch):
    import talent_acquisition.assessments_analytics as mod

    monkeypatch.setattr(mod, "_job_ids_for_org_filter", _job_ids_for_org_filter)
    db = _FakeDbFunnel()
    await build_funnel(db, window_days=30)
    invited_queries = [q for q in db.assessment_submissions.queries if q.get("invited_at")]
    assert invited_queries
    assert "$gte" in invited_queries[0]["invited_at"]
    assert invited_queries[0]["invited_at"]["$gte"].endswith("+00:00")


@pytest.mark.asyncio
async def test_build_analytics_summary_includes_active_submissions(monkeypatch):
    import talent_acquisition.assessments_analytics as mod

    class _Apps:
        async def count_documents(self, q):
            return 0

    class _EmptyFindSubmissions:
        async def count_documents(self, query):
            status = query.get("status")
            if isinstance(status, dict) and status.get("$in"):
                return 4
            return 0

        def find(self, query, projection=None):
            return _FakeCursor([])

    class _Assessments:
        def find(self, *a, **k):
            return _FakeCursor([])

        async def count_documents(self, q):
            return 0

    class _FullFakeDb:
        def __init__(self):
            self.assessments = _Assessments()
            self.jobs = type("J", (), {"find": lambda *a, **k: _FakeCursor([])})()
            self.applications = _Apps()
            self.assessment_submissions = _EmptyFindSubmissions()

        def __getitem__(self, name):
            return getattr(self, name)

    monkeypatch.setattr(mod, "_job_ids_for_org_filter", _job_ids_for_org_filter)
    summary = await mod.build_analytics_summary(_FullFakeDb(), window_days=30)
    assert summary.headline.active_submissions.value == 4


def test_window_cutoff_clamps_days():
    cutoff = _window_cutoff(7)
    assert cutoff is not None
    parsed = datetime.fromisoformat(cutoff.replace("Z", "+00:00"))
    delta = datetime.now(timezone.utc) - parsed
    assert 6 <= delta.days <= 8


@pytest.mark.asyncio
async def test_score_distribution_buckets(monkeypatch):
    import talent_acquisition.assessments_analytics as mod
    from talent_acquisition.assessments_analytics import score_distribution

    async def _all_jobs(_db, _org=None):
        return None

    class _Subs:
        def find(self, query, projection=None):
            if query.get("status") == "SCORED":
                return _FakeCursor(
                    [
                        {"score_pct": 42.0},
                        {"score_pct": 58.0},
                        {"score_pct": 88.0},
                    ]
                )
            return _FakeCursor([])

    class _Assess:
        def find(self, query, projection=None):
            return _FakeCursor([{"rubric": {"pass_threshold": 70}}])

    class _Db:
        def __init__(self):
            self.assessment_submissions = _Subs()
            self.assessments = _Assess()

        def __getitem__(self, name):
            return getattr(self, name)

    monkeypatch.setattr(mod, "_job_ids_for_org_filter", _all_jobs)
    result = await score_distribution(_Db(), window_days=30)
    assert result.pass_threshold_pct == 70.0
    assert len(result.buckets) == 10
    assert sum(b.count for b in result.buckets) == 3
