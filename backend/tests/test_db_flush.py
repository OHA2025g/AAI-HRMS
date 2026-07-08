"""Unit tests for database flush helpers."""

import pytest
from fastapi import HTTPException

from talent_acquisition.db_flush import FLUSH_CONFIRM_PHRASE, flush_database, get_database_stats


class _FakeColl:
    def __init__(self, name: str, docs: list):
        self.name = name
        self._docs = list(docs)

    async def count_documents(self, _query):
        return len(self._docs)

    def find(self, query, projection=None):
        ids = (query or {}).get("id", {}).get("$in") or []
        rows = [d for d in self._docs if d.get("id") in ids]

        class _Cur:
            async def to_list(self, _limit):
                return rows

        return _Cur()

    async def insert_many(self, rows):
        self._docs.extend(rows)

    async def delete_many(self, _query):
        self._docs.clear()


class _FakeDb:
    def __init__(self):
        self.name = "test_db"
        self._cols = {
            "users": _FakeColl("users", [{"id": "admin-1", "email": "a@x.com", "role": "admin"}]),
            "jobs": _FakeColl("jobs", [{"id": "j1"}]),
            "_schema_migrations": _FakeColl("_schema_migrations", [{"_id": "001"}]),
        }
        self.dropped = []

    def __getitem__(self, name):
        return self._cols[name]

    async def list_collection_names(self):
        return list(self._cols.keys())

    async def drop_collection(self, name):
        self.dropped.append(name)
        self._cols.pop(name, None)


@pytest.mark.asyncio
async def test_get_database_stats(monkeypatch):
    monkeypatch.setenv("ALLOW_DB_FLUSH", "1")
    db = _FakeDb()
    stats = await get_database_stats(db)
    assert stats["collection_count"] == 3
    assert stats["document_count"] == 3
    assert stats["flush_enabled"] is True


@pytest.mark.asyncio
async def test_flush_preserves_migrations_and_user(monkeypatch):
    monkeypatch.setenv("ALLOW_DB_FLUSH", "1")
    db = _FakeDb()
    result = await flush_database(
        db,
        confirm=FLUSH_CONFIRM_PHRASE,
        preserve_migration_registry=True,
        preserve_user_ids=["admin-1"],
        actor_id="admin-1",
    )
    assert "jobs" in result["dropped_collections"]
    assert "_schema_migrations" in result["preserved_collections"]
    assert result["preserved_users"] == 1
    assert "users" in db._cols
    assert len(db._cols["users"]._docs) == 1


@pytest.mark.asyncio
async def test_flush_rejects_bad_confirm(monkeypatch):
    monkeypatch.setenv("ALLOW_DB_FLUSH", "1")
    db = _FakeDb()
    with pytest.raises(HTTPException) as exc:
        await flush_database(db, confirm="wrong")
    assert exc.value.status_code == 400
