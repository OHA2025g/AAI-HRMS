"""Tests for hiring dashboard trend snapshots."""

from datetime import datetime, timedelta, timezone

import pytest

from talent_acquisition.hiring_dashboard_config import (
    COL_HIRING_DASHBOARD_CONFIG,
    COL_HIRING_DASHBOARD_CONFIG_AUDIT,
    upsert_hiring_dashboard_config,
    config_to_json,
    HiringDashboardConfig,
)
from talent_acquisition.hiring_snapshots import (
    COL_SNAPSHOTS,
    _resolve_monthly_hire_target,
    _snapshot_metadata,
    _week_fit_metrics,
    _week_offer_acceptance_pct,
    get_hiring_dashboard_trends,
    get_hiring_snapshot_health,
    resolve_trends_data_source,
    write_hiring_dashboard_snapshot,
)


class _FakeFitScores:
    def __init__(self, rows):
        self.rows = rows

    def find(self, query, projection=None):
        start = query.get("computed_at", {}).get("$gte")
        end = query.get("computed_at", {}).get("$lt")
        filtered = [
            r
            for r in self.rows
            if (start is None or r.get("computed_at", "") >= start)
            and (end is None or r.get("computed_at", "") < end)
        ]
        return _FakeCursor(filtered)


class _FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, key, direction=1):
        reverse = direction == -1
        self.rows.sort(key=lambda r: r.get(key, ""), reverse=reverse)
        return self

    async def to_list(self, limit):
        return self.rows[:limit]


class _FakeCollection:
    def __init__(self):
        self.docs = {}

    async def count_documents(self, query=None):
        return len(self.docs)

    async def find_one(self, query, projection=None):
        return self.docs.get(query.get("id")) or self.docs.get(query.get("period"))

    async def update_one(self, query, update, upsert=False):
        key = query.get("period") or query.get("id")
        self.docs[key] = update["$set"]

    def find(self, query, projection=None):
        cutoff = query.get("period", {}).get("$gte")
        rows = [v for k, v in sorted(self.docs.items()) if not cutoff or k >= cutoff]
        return _FakeCursor(rows)


class _FakeQueryCollection:
    """Minimal collection for count/find used by synthetic trend helpers."""

    def __init__(self, count: int = 0):
        self._count = count

    async def count_documents(self, query):
        return self._count

    def find(self, query, projection=None):
        return _FakeCursor([])

    def aggregate(self, pipeline):
        return _FakeCursor([])


class _FakeAuditCollection:
    def __init__(self):
        self.rows = []

    async def insert_one(self, doc):
        self.rows.append(doc)

    def find(self, query, projection=None):
        config_id = query.get("config_id")
        filtered = [r for r in self.rows if r.get("config_id") == config_id]
        return _FakeCursor(filtered)


class _FakeDb:
    def __init__(self, *, fit_scores=None, applications_count=0, jobs_open=0, snapshots=None):
        self._config = _FakeCollection()
        self._audit = _FakeAuditCollection()
        self._snapshots = _FakeCollection()
        for row in snapshots or []:
            self._snapshots.docs[row["period"]] = row
        self.fit_scores = _FakeFitScores(fit_scores or [])
        self._applications_count = applications_count
        self._jobs_open = jobs_open
        self.application_stage_history = _FakeQueryCollection(0)

    def __getitem__(self, name):
        if name == COL_HIRING_DASHBOARD_CONFIG:
            return self._config
        if name == COL_HIRING_DASHBOARD_CONFIG_AUDIT:
            return self._audit
        if name == COL_SNAPSHOTS:
            return self._snapshots
        raise KeyError(name)

    @property
    def applications(self):
        return _FakeQueryCollection(self._applications_count)

    @property
    def jobs(self):
        return _FakeJobsCollection(self._jobs_open)


class _FakeJobsCollection:
    def __init__(self, open_count: int):
        self._open_count = open_count

    async def count_documents(self, query):
        if query.get("status") == "OPEN":
            return self._open_count
        return 0

    def find(self, query, projection=None):
        return _FakeCursor([])


@pytest.mark.asyncio
async def test_resolve_hire_target_from_db_config():
    db = _FakeDb()
    await upsert_hiring_dashboard_config(
        db,
        {**config_to_json(HiringDashboardConfig()), "monthly_hire_target": 15},
    )
    assert await _resolve_monthly_hire_target(db) == 15


@pytest.mark.asyncio
async def test_resolve_hire_target_none_when_trend_target_disabled():
    db = _FakeDb()
    await upsert_hiring_dashboard_config(
        db,
        {
            **config_to_json(HiringDashboardConfig()),
            "monthly_hire_target": 15,
            "rule_flags": {"low_fit": True, "stuck_stage": True, "stale_req": True, "trend_target": False},
        },
    )
    assert await _resolve_monthly_hire_target(db) is None


@pytest.mark.asyncio
async def test_write_snapshot_uses_db_hire_target():
    db = _FakeDb()
    await upsert_hiring_dashboard_config(
        db,
        {**config_to_json(HiringDashboardConfig()), "monthly_hire_target": 12},
    )
    doc = await write_hiring_dashboard_snapshot(
        db,
        {
            "window_days": 30,
            "health_score": 70,
            "headline": {
                "open_jobs": {"value": 5},
                "high_fit_pct": {"value": 22},
            },
            "funnel": [],
        },
    )
    assert doc["hire_target"] == 12
    assert doc["high_fit_pct"] == 22.0
    assert doc["seeded"] is False


def test_snapshot_metadata():
    total, live, last_at = _snapshot_metadata([])
    assert total == 0 and live == 0 and last_at is None
    total, live, last_at = _snapshot_metadata(
        [
            {"period": "2026-01-01", "seeded": True},
            {"period": "2026-01-08", "seeded": True},
        ]
    )
    assert total == 2 and live == 0 and last_at is None
    total, live, last_at = _snapshot_metadata(
        [
            {"period": "2026-01-01", "seeded": True},
            {"period": "2026-01-08", "seeded": False, "snapshot_at": "2026-01-08T02:00:00+00:00"},
        ]
    )
    assert total == 2 and live == 1
    assert last_at == "2026-01-08T02:00:00+00:00"


def test_resolve_trends_data_source():
    assert resolve_trends_data_source([], synthetic_fallback=True) == "synthetic"
    assert resolve_trends_data_source([{"seeded": True}, {"seeded": True}]) == "seeded"
    assert resolve_trends_data_source([{"seeded": False}]) == "snapshots"
    assert resolve_trends_data_source([{"seeded": True}, {"seeded": False}]) == "mixed"


@pytest.mark.asyncio
async def test_snapshot_health_no_snapshots():
    db = _FakeDb(applications_count=0, jobs_open=0)
    health = await get_hiring_snapshot_health(db)
    assert health["status"] == "no_snapshots"
    assert health["snapshot_count"] == 0
    assert health["live_snapshot_count"] == 0


@pytest.mark.asyncio
async def test_snapshot_health_seeded_only():
    db = _FakeDb(
        snapshots=[
            {"period": "2026-01-01", "seeded": True},
            {"period": "2026-01-08", "seeded": True},
        ],
        applications_count=0,
        jobs_open=0,
    )
    health = await get_hiring_snapshot_health(db)
    assert health["status"] == "seeded_only"
    assert health["snapshot_count"] == 2
    assert health["live_snapshot_count"] == 0
    assert health["seeded_snapshot_count"] == 2


@pytest.mark.asyncio
async def test_snapshot_health_ok_with_live():
    db = _FakeDb(
        snapshots=[
            {"period": "2026-01-01", "seeded": True},
            {
                "period": "2026-01-08",
                "seeded": False,
                "snapshot_at": datetime.now(timezone.utc).isoformat(),
            },
        ],
        applications_count=0,
        jobs_open=0,
    )
    health = await get_hiring_snapshot_health(db)
    assert health["status"] == "ok"
    assert health["live_snapshot_count"] == 1
    assert health["last_live_snapshot_at"]


@pytest.mark.asyncio
async def test_week_fit_metrics_high_fit_pct():
    db = _FakeDb(
        fit_scores=[
            {"final_score": 95, "computed_at": "2026-01-01T00:00:00+00:00"},
            {"final_score": 80, "computed_at": "2026-01-02T00:00:00+00:00"},
            {"final_score": 92, "computed_at": "2026-01-03T00:00:00+00:00"},
        ]
    )
    avg, high = await _week_fit_metrics(db, "2026-01-01T00:00:00+00:00", "2026-02-01T00:00:00+00:00")
    assert avg == pytest.approx(89.0, abs=0.1)
    assert high == pytest.approx(66.67, abs=0.1)


@pytest.mark.asyncio
async def test_synthetic_trends_include_high_fit_when_scores_exist():
    now = datetime.now(timezone.utc)
    recent = (now - timedelta(days=3)).isoformat()
    db = _FakeDb(
        fit_scores=[
            {"final_score": 91, "computed_at": recent},
            {"final_score": 85, "computed_at": recent},
        ],
        applications_count=2,
        jobs_open=3,
    )
    await upsert_hiring_dashboard_config(
        db,
        {**config_to_json(HiringDashboardConfig()), "monthly_hire_target": 8},
    )
    trends = await get_hiring_dashboard_trends(db, months=1)
    assert trends["data_source"] in ("synthetic", "seeded")
    assert trends["points"]
    assert any(p.get("high_fit_pct") is not None for p in trends["points"])
    assert all(p.get("hire_target") == 8 for p in trends["points"])


@pytest.mark.asyncio
async def test_week_offer_acceptance_pct_computes_from_status_counts():
    class _OfferApps:
        def aggregate(self, pipeline):
            return _FakeCursor([{"_id": "ACCEPTED", "count": 8}, {"_id": "SENT", "count": 2}])

    db = type("DB", (), {"applications": _OfferApps()})()
    pct = await _week_offer_acceptance_pct(db, "2026-01-01T00:00:00+00:00", "2026-02-01T00:00:00+00:00")
    assert pct == 80.0


@pytest.mark.asyncio
async def test_write_snapshot_persists_offer_acceptance_pct():
    db = _FakeDb(applications_count=10)
    pack = {
        "window_days": 30,
        "health_score": 70,
        "headline": {
            "open_jobs": {"value": 5},
            "new_applications": {"value": 10},
            "hires": {"value": 1},
            "offer_acceptance_pct": {"value": 82},
        },
        "funnel": [],
        "stage_aging_summary": [],
    }
    doc = await write_hiring_dashboard_snapshot(db, pack)
    assert doc.get("offer_acceptance_pct") == 82.0
    assert doc.get("new_applications") == 10
    assert doc.get("hires") == 10
