"""Tests for DB-backed hiring dashboard configuration."""

import pytest

from talent_acquisition.hiring_dashboard_config import (
    COL_HIRING_DASHBOARD_CONFIG,
    CONFIG_DOC_ID,
    HiringDashboardConfig,
    config_from_document,
    config_to_json,
    get_hiring_dashboard_config,
    upsert_hiring_dashboard_config,
)


class _FakeCollection:
    def __init__(self):
        self.docs = {}

    async def find_one(self, query, projection=None):
        return self.docs.get(query.get("id"))

    async def update_one(self, query, update, upsert=False):
        doc_id = query["id"]
        self.docs[doc_id] = update["$set"]

    async def insert_one(self, doc):
        self.docs[doc["id"]] = doc


class _FakeDb:
    def __init__(self):
        self._col = _FakeCollection()

    def __getitem__(self, name):
        assert name == COL_HIRING_DASHBOARD_CONFIG
        return self._col


def test_config_from_document_merges_defaults():
    cfg = config_from_document({"low_fit_threshold": 55})
    assert cfg.low_fit_threshold == 55.0
    assert "SCREENING" in cfg.stage_sla_days


@pytest.mark.asyncio
async def test_upsert_and_load_config():
    db = _FakeDb()
    saved = await upsert_hiring_dashboard_config(
        db,
        {
            **config_to_json(HiringDashboardConfig()),
            "stuck_critical_count": 30,
        },
    )
    assert saved.stuck_critical_count == 30
    loaded = await get_hiring_dashboard_config(db)
    assert loaded.stuck_critical_count == 30
    assert CONFIG_DOC_ID == "default"
