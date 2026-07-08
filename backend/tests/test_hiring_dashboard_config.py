"""Tests for DB-backed hiring dashboard configuration."""

import pytest

from talent_acquisition.hiring_dashboard_config import (
    COL_HIRING_DASHBOARD_CONFIG,
    COL_HIRING_DASHBOARD_CONFIG_AUDIT,
    CONFIG_DOC_ID,
    DEFAULT_RULE_FLAGS,
    HiringDashboardConfig,
    config_from_document,
    config_to_json,
    get_hiring_dashboard_config,
    list_config_audit,
    rule_flag_enabled,
    upsert_hiring_dashboard_config,
)


class _FakeCollection:
    def __init__(self):
        self.docs = {}
        self.audit_rows = []

    async def find_one(self, query, projection=None):
        return self.docs.get(query.get("id"))

    async def update_one(self, query, update, upsert=False):
        doc_id = query["id"]
        self.docs[doc_id] = update["$set"]

    async def insert_one(self, doc):
        self.audit_rows.append(doc)

    def find(self, query, projection=None):
        return _FakeAuditCursor(self.audit_rows, query.get("config_id"))


class _FakeAuditCursor:
    def __init__(self, rows, config_id):
        self.rows = [r for r in rows if r.get("config_id") == config_id]

    def sort(self, _field, _direction):
        self.rows = sorted(self.rows, key=lambda r: r.get("created_at") or "", reverse=True)
        return self

    async def to_list(self, limit):
        return self.rows[:limit]


class _FakeDb:
    def __init__(self):
        self._config = _FakeCollection()
        self._audit = _FakeCollection()

    def __getitem__(self, name):
        if name == COL_HIRING_DASHBOARD_CONFIG:
            return self._config
        if name == COL_HIRING_DASHBOARD_CONFIG_AUDIT:
            return self._audit
        raise KeyError(name)


def test_config_from_document_merges_defaults():
    cfg = config_from_document({"low_fit_threshold": 55, "rule_flags": {"low_fit": False}})
    assert cfg.low_fit_threshold == 55.0
    assert cfg.rule_flags["low_fit"] is False
    assert cfg.rule_flags["stuck_stage"] is True
    assert "SCREENING" in cfg.stage_sla_days


def test_rule_flag_enabled_defaults_to_true():
    assert rule_flag_enabled(None, "stale_req") is True
    assert rule_flag_enabled({"stale_req": False}, "stale_req") is False


@pytest.mark.asyncio
async def test_upsert_and_load_config():
    db = _FakeDb()
    saved = await upsert_hiring_dashboard_config(
        db,
        {
            **config_to_json(HiringDashboardConfig()),
            "stuck_critical_count": 30,
        },
        actor_id="user-1",
        actor_name="Admin User",
    )
    assert saved.stuck_critical_count == 30
    loaded = await get_hiring_dashboard_config(db)
    assert loaded.stuck_critical_count == 30
    assert CONFIG_DOC_ID == "default"


@pytest.mark.asyncio
async def test_upsert_writes_audit_trail():
    db = _FakeDb()
    await upsert_hiring_dashboard_config(
        db,
        {
            **config_to_json(HiringDashboardConfig()),
            "rule_flags": {**DEFAULT_RULE_FLAGS, "low_fit": False},
        },
        actor_id="admin-1",
        actor_name="Ops Admin",
    )
    audit = await list_config_audit(db, limit=5)
    assert len(audit) == 1
    assert audit[0]["user_name"] == "Ops Admin"
    assert "rule_flags" in audit[0]["changes"]
