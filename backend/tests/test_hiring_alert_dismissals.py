"""Unit tests for hiring alert dismissals persistence."""

import pytest

from talent_acquisition.hiring_alert_dismissals import (
    COL_HIRING_ALERT_DISMISSALS,
    dismiss_alert,
    list_dismissed_alert_ids,
    restore_alert,
)


class _FakeCollection:
    def __init__(self):
        self.docs = {}

    def find(self, query, projection=None):
        user_id = query.get("user_id")
        matches = [v for k, v in self.docs.items() if v.get("user_id") == user_id]

        class _Cursor:
            def __init__(self, rows):
                self._rows = rows

            async def to_list(self, _limit):
                return list(self._rows)

        return _Cursor(matches)

    async def update_one(self, query, update, upsert=False):
        key = (query["user_id"], query["alert_id"])
        self.docs[key] = update["$set"]

    async def delete_one(self, query):
        key = (query["user_id"], query["alert_id"])
        self.docs.pop(key, None)


class _FakeDb:
    def __init__(self):
        self._col = _FakeCollection()

    def __getitem__(self, name):
        assert name == COL_HIRING_ALERT_DISMISSALS
        return self._col


@pytest.mark.asyncio
async def test_dismiss_and_list_alert_ids():
    db = _FakeDb()
    await dismiss_alert(db, "user-1", "stuck-screening")
    await dismiss_alert(db, "user-1", "req-aging-60")
    ids = await list_dismissed_alert_ids(db, "user-1")
    assert set(ids) == {"stuck-screening", "req-aging-60"}


@pytest.mark.asyncio
async def test_restore_alert():
    db = _FakeDb()
    await dismiss_alert(db, "user-1", "stuck-screening")
    await restore_alert(db, "user-1", "stuck-screening")
    ids = await list_dismissed_alert_ids(db, "user-1")
    assert ids == []
