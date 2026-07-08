"""HTTP integration tests: candidate Excel import upload → validate → commit."""

from __future__ import annotations

import copy
import io
import re
from typing import Any, Dict, List, Optional

import pandas as pd
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from talent_acquisition.candidate_import.routes import create_candidate_import_router


class _MemCursor:
    def __init__(self, rows: List[Dict[str, Any]]):
        self._rows = rows
        self._sort_spec = None
        self._limit: Optional[int] = None

    def sort(self, key, direction=-1):
        self._sort_spec = (key, direction)
        return self

    def limit(self, n):
        self._limit = n
        return self

    async def to_list(self, _limit):
        rows = list(self._rows)
        if self._sort_spec:
            key, direction = self._sort_spec
            if isinstance(key, list):
                key = key[0][0]
            rows.sort(key=lambda r: r.get(key) or "", reverse=direction == -1)
        if self._limit is not None:
            rows = rows[: self._limit]
        return rows


def _match(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    if "$or" in query:
        return any(_match(doc, sub) for sub in query["$or"])
    for key, spec in query.items():
        if key == "$or":
            continue
        val = doc.get(key)
        if isinstance(spec, dict):
            if "$regex" in spec:
                pattern = spec["$regex"]
                if not isinstance(val, str) or not re.search(pattern, val):
                    return False
            if "$in" in spec and val not in spec["$in"]:
                return False
            if "$ne" in spec and val == spec["$ne"]:
                return False
            if "$lt" in spec and not (val is not None and val < spec["$lt"]):
                return False
            if "$exists" in spec:
                has = key in doc and doc.get(key) is not None
                if spec["$exists"] and not has:
                    return False
                if not spec["$exists"] and has:
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

    async def insert_many(self, docs: List[Dict[str, Any]]):
        for doc in docs:
            await self.insert_one(doc)

    async def delete_many(self, query: Dict[str, Any]):
        self._store[self.name] = [d for d in self._rows if not _match(d, query)]

    async def find_one(self, query: Dict[str, Any], projection=None):
        for doc in self._rows:
            if _match(doc, query):
                out = copy.deepcopy(doc)
                if projection and projection.get("_id") == 0:
                    out.pop("_id", None)
                if projection and projection.get("file_content") == 0:
                    out.pop("file_content", None)
                return out
        return None

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        for doc in self._rows:
            if _match(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                if "$unset" in update:
                    for key in update["$unset"]:
                        doc.pop(key, None)
                return

    def find(self, query: Dict[str, Any], projection=None):
        matched = [copy.deepcopy(d) for d in self._rows if _match(d, query)]
        if projection and projection.get("_id") == 0:
            for d in matched:
                d.pop("_id", None)
        if projection and projection.get("file_content") == 0:
            for d in matched:
                d.pop("file_content", None)
        return _MemCursor(matched)


class _MemDb:
    def __init__(self):
        self._store: Dict[str, List[Dict[str, Any]]] = {}

    def __getitem__(self, name: str):
        return _MemCollection(name, self._store)

    def __getattr__(self, name: str):
        return self[name]


def _mixed_valid_invalid_xlsx_bytes() -> bytes:
    df = pd.DataFrame(
        [
            {
                "Full Name": "Valid User",
                "Email": "valid.user@example.com",
                "Phone": "9123456700",
            },
            {
                "Full Name": "",
                "Email": "not-an-email",
                "Phone": "123",
            },
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    return buf.getvalue()


def _sample_xlsx_bytes() -> bytes:
    df = pd.DataFrame(
        [
            {
                "Full Name": "Alice Import",
                "Email": "alice.import@example.com",
                "Phone": "9123456780",
                "Skills": "Python, SQL",
            },
            {
                "Full Name": "Bob Import",
                "Email": "bob.import@example.com",
                "Phone": "9123456781",
                "Skills": "React",
            },
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    return buf.getvalue()


@pytest.fixture
def import_app():
    db = _MemDb()
    app = FastAPI()
    user = {"id": "hr-1", "role": "hr_admin", "full_name": "HR Admin", "email": "hr@test.com"}

    async def get_user():
        return user

    app.include_router(
        create_candidate_import_router(
            db=db,
            get_current_user=get_user,
            trigger_auto_analyze=None,
        )
    )
    return app, db


@pytest.fixture
def import_app_viewer():
    db = _MemDb()
    app = FastAPI()
    user = {"id": "viewer-1", "role": "hr_viewer", "full_name": "Viewer", "email": "viewer@test.com"}

    async def get_user():
        return user

    app.include_router(
        create_candidate_import_router(
            db=db,
            get_current_user=get_user,
            trigger_auto_analyze=None,
        )
    )
    return app, db


@pytest.mark.asyncio
async def test_import_upload_validate_commit_flow(import_app):
    app, db = import_app
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "candidates.xlsx",
                _sample_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up = await client.post("/ats/candidates/import/upload", files=files)
        assert up.status_code == 200, up.text
        batch_id = up.json()["batch_id"]
        assert up.json()["detected_row_count"] == 2

        mapping = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone": "phone",
            "Skills": "skills",
        }
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping, "duplicate_strategy": "skip"},
        )
        assert preview.status_code == 200, preview.text
        body = preview.json()
        assert body["valid_rows"] == 2
        assert body["invalid_rows"] == 0

        commit = await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "skip"},
        )
        assert commit.status_code == 200, commit.text
        assert commit.json()["inserted_count"] == 2
        assert commit.json()["status"] == "COMPLETED"

    batches = db._store.get("candidate_import_batches", [])
    assert batches
    assert batches[0].get("file_content") is None
    assert batches[0].get("file_content_purged_at")

    candidates = db._store.get("candidates", [])
    assert len(candidates) == 2
    assert all(c.get("import_stable_id") for c in candidates)
    ranks = [c.get("pin_rank") for c in candidates]
    assert max(ranks) == 1_000_000
    assert min(ranks) == 999_999
    assert all(c.get("source") == "EXCEL_IMPORT" for c in candidates)


@pytest.mark.asyncio
async def test_import_detects_stable_id_duplicate_on_revalidate(import_app):
    app, db = import_app
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "candidates.xlsx",
                _sample_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up = await client.post("/ats/candidates/import/upload", files=files)
        batch_id = up.json()["batch_id"]
        mapping = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone": "phone",
            "Skills": "skills",
        }
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "skip"},
        )

        up2 = await client.post("/ats/candidates/import/upload", files=files)
        batch_id2 = up2.json()["batch_id"]
        preview2 = await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id2, "mapping": mapping},
        )
        assert preview2.json()["duplicate_rows"] == 2


@pytest.mark.asyncio
async def test_import_commit_only_valid_rows(import_app):
    app, db = import_app
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "mixed.xlsx",
                _mixed_valid_invalid_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up = await client.post("/ats/candidates/import/upload", files=files)
        batch_id = up.json()["batch_id"]
        mapping = {"Full Name": "full_name", "Email": "email", "Phone": "phone"}
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        assert preview.status_code == 200
        assert preview.json()["valid_rows"] == 1
        assert preview.json()["invalid_rows"] == 1

        commit = await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "skip"},
        )
        assert commit.status_code == 200
        assert commit.json()["inserted_count"] == 1
        assert commit.json()["failed_count"] == 1

    batches = db._store.get("candidate_import_batches", [])
    assert batches
    assert batches[0].get("file_content") is None

    assert len(db._store.get("candidates", [])) == 1


@pytest.mark.asyncio
async def test_import_error_report_download(import_app):
    app, _db = import_app
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "mixed.xlsx",
                _mixed_valid_invalid_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up = await client.post("/ats/candidates/import/upload", files=files)
        batch_id = up.json()["batch_id"]
        mapping = {"Full Name": "full_name", "Email": "email", "Phone": "phone"}
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        dl = await client.get(f"/ats/candidates/import/{batch_id}/errors/download")
        assert dl.status_code == 200
        assert (
            dl.headers.get("content-type")
            == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        assert len(dl.content) > 100
        err_df = pd.read_excel(io.BytesIO(dl.content), sheet_name="Errors")
        assert len(err_df) == 2
        assert "validation_status" in err_df.columns


@pytest.mark.asyncio
async def test_import_rbac_denies_hr_viewer(import_app_viewer):
    app, _db = import_app_viewer
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/ats/candidates/import/schema")
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_import_unknown_recruiter_email_warning(import_app):
    app, db = import_app
    await db.users.insert_one(
        {"id": "rec-1", "email": "known.recruiter@example.com", "full_name": "Known Rec"}
    )
    df = pd.DataFrame(
        [
            {
                "Full Name": "Warn User",
                "Email": "warn.user@example.com",
                "Phone": "9123456799",
                "Recruiter Email": "unknown.recruiter@example.com",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "warn.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone": "phone",
            "Recruiter Email": "recruiter_email",
        }
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        assert preview.status_code == 200
        assert preview.json()["valid_rows"] == 1
        row = preview.json()["preview"][0]
        assert any("recruiter" in (w.get("warning") or "").lower() for w in row.get("warnings", []))


@pytest.mark.asyncio
async def test_import_job_creates_application_stage_history(import_app):
    app, db = import_app
    await db.jobs.insert_one(
        {
            "id": "job-001",
            "title": "Software Engineer",
            "import_stable_id": "job001",
            "status": "OPEN",
        }
    )
    df = pd.DataFrame(
        [
            {
                "Full Name": "Job Linked",
                "Email": "job.linked@example.com",
                "Phone": "9123456701",
                "Job Code / Requisition ID": "JOB-001",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "job.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone": "phone",
            "Job Code / Requisition ID": "job_code",
        }
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        commit = await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "skip"},
        )
        assert commit.status_code == 200
        assert commit.json()["inserted_count"] == 1

    apps = db._store.get("applications", [])
    assert len(apps) == 1
    assert apps[0]["stage"] == "SOURCED"
    history = db._store.get("application_stage_history", [])
    assert len(history) == 1
    assert history[0]["to_stage"] == "SOURCED"
    assert history[0]["application_id"] == apps[0]["id"]
    candidate = db._store.get("candidates", [])[0]
    assert candidate.get("pipeline_stage") == "SOURCED"


@pytest.mark.asyncio
async def test_import_in_file_duplicate_detected(import_app):
    app, db = import_app
    df = pd.DataFrame(
        [
            {
                "Full Name": "Dup In File A",
                "Email": "dup.infile@example.com",
                "Phone": "9123456710",
            },
            {
                "Full Name": "Dup In File B",
                "Email": "dup.infile@example.com",
                "Phone": "9123456711",
            },
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "dup.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {"Full Name": "full_name", "Email": "email", "Phone": "phone"}
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        body = preview.json()
        assert body["valid_rows"] == 1
        assert body["duplicate_rows"] == 1
        assert body["validation_summary"].get("in_file_duplicate") == 1

        commit = await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "skip"},
        )
        assert commit.json()["inserted_count"] == 1
        assert commit.json()["skipped_duplicate_count"] == 1

    assert len(db._store.get("candidates", [])) == 1


@pytest.mark.asyncio
async def test_import_honors_mapped_source(import_app):
    app, db = import_app
    df = pd.DataFrame(
        [
            {
                "Full Name": "LinkedIn Lead",
                "Email": "linkedin.lead@example.com",
                "Phone": "9123456712",
                "Source": "LinkedIn",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "source.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone": "phone",
            "Source": "source",
        }
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "skip"},
        )

    candidate = db._store.get("candidates", [])[0]
    assert candidate.get("source") == "LINKEDIN"


@pytest.mark.asyncio
async def test_import_duplicate_lookup_scoped_to_file_keys(import_app):
    """Duplicate detection uses indexed $in queries, not a full-table scan."""
    app, db = import_app
    for i in range(120):
        await db.candidates.insert_one(
            {
                "id": f"decoy-{i}",
                "full_name": f"Decoy {i}",
                "email": f"decoy{i}@example.com",
                "email_lc": f"decoy{i}@example.com",
                "phone_lc": f"900000{i:04d}",
            }
        )
    await db.candidates.insert_one(
        {
            "id": "existing-match",
            "full_name": "Existing Match",
            "email": "match.me@example.com",
            "email_lc": "match.me@example.com",
            "phone_lc": "9111223344",
            "full_name_lc": "existing match",
        }
    )

    df = pd.DataFrame(
        [
            {
                "Full Name": "Existing Match",
                "Email": "match.me@example.com",
                "Phone": "9111223344",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "match.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {"Full Name": "full_name", "Email": "email", "Phone": "phone"}
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        assert preview.status_code == 200
        assert preview.json()["duplicate_rows"] == 1
        assert preview.json()["valid_rows"] == 0


@pytest.mark.asyncio
async def test_import_unknown_source_warning(import_app):
    app, _db = import_app
    df = pd.DataFrame(
        [
            {
                "Full Name": "Mystery Source",
                "Email": "mystery@example.com",
                "Phone": "9123456790",
                "Source": "MySpace",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "source-warn.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone": "phone",
            "Source": "source",
        }
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        body = preview.json()
        assert body["validation_summary"]["unknown_source"] == 1
        assert body["preview"][0]["warnings"]


@pytest.mark.asyncio
async def test_import_commit_update_duplicate(import_app):
    app, db = import_app
    await db.candidates.insert_one(
        {
            "id": "cand-update-me",
            "full_name": "Old Name",
            "email": "update.me@example.com",
            "email_lc": "update.me@example.com",
            "phone": "9111111111",
            "phone_lc": "9111111111",
            "skills": ["Java"],
        }
    )
    df = pd.DataFrame(
        [
            {
                "Full Name": "Updated Name",
                "Email": "update.me@example.com",
                "Phone": "9111111111",
                "Skills": "Python, SQL",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "update.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {"Full Name": "full_name", "Email": "email", "Phone": "phone", "Skills": "skills"}
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        commit = await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "update"},
        )
        assert commit.json()["updated_count"] == 1
        assert commit.json()["inserted_count"] == 0

    updated = next(c for c in db._store["candidates"] if c["id"] == "cand-update-me")
    assert updated["full_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_import_commit_create_new_duplicate(import_app):
    app, db = import_app
    await db.candidates.insert_one(
        {
            "id": "cand-existing",
            "full_name": "Existing",
            "email": "create.new@example.com",
            "email_lc": "create.new@example.com",
            "phone": "9222222222",
            "phone_lc": "9222222222",
        }
    )
    df = pd.DataFrame(
        [
            {
                "Full Name": "Existing Copy",
                "Email": "create.new@example.com",
                "Phone": "9222222222",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "create-new.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {"Full Name": "full_name", "Email": "email", "Phone": "phone"}
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        commit = await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "create_new"},
        )
        assert commit.json()["inserted_count"] == 1

    assert len(db._store.get("candidates", [])) == 2


@pytest.mark.asyncio
async def test_import_batch_detail_includes_audit_timeline(import_app):
    app, db = import_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "candidates.xlsx",
                _sample_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up = await client.post("/ats/candidates/import/upload", files=files)
        batch_id = up.json()["batch_id"]
        detail = await client.get(f"/ats/candidates/import/history/{batch_id}")
        assert detail.status_code == 200
        events = detail.json().get("audit_events") or []
        assert len(events) >= 1
        assert any("UPLOAD" in (e.get("action") or "") for e in events)


@pytest.mark.asyncio
async def test_import_commit_merge_keeps_existing_fields(import_app):
    app, db = import_app
    await db.candidates.insert_one(
        {
            "id": "cand-merge-me",
            "full_name": "Merge Me",
            "email": "merge.me@example.com",
            "email_lc": "merge.me@example.com",
            "phone": "9333333333",
            "phone_lc": "9333333333",
            "skills": [{"skill_name": "Java", "proficiency": None}],
            "headline": "Original Title",
            "location": None,
        }
    )
    df = pd.DataFrame(
        [
            {
                "Full Name": "Merge Me",
                "Email": "merge.me@example.com",
                "Phone": "9333333333",
                "Skills": "Python, SQL",
                "Headline / Designation": "New Title",
                "Location": "Mumbai",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "merge.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone": "phone",
            "Skills": "skills",
            "Headline / Designation": "headline",
            "Location": "location",
        }
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        commit = await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "merge"},
        )
        assert commit.json()["updated_count"] == 1

    updated = next(c for c in db._store["candidates"] if c["id"] == "cand-merge-me")
    assert updated["headline"] == "Original Title"
    assert updated["location"] == "Mumbai"
    skill_names = [s.get("skill_name") for s in (updated.get("skills") or [])]
    assert "Java" in skill_names
    assert "Python" not in skill_names


@pytest.mark.asyncio
async def test_import_template_download(import_app):
    app, _db = import_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/ats/candidates/import/template")
        assert resp.status_code == 200
        assert resp.headers.get("content-type") == (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        assert len(resp.content) > 500
        xl = pd.ExcelFile(io.BytesIO(resp.content))
        assert "Allowed Values" in xl.sheet_names


@pytest.mark.asyncio
async def test_import_history_list(import_app):
    app, _db = import_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "candidates.xlsx",
                _sample_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up = await client.post("/ats/candidates/import/upload", files=files)
        batch_id = up.json()["batch_id"]
        hist = await client.get("/ats/candidates/import/history")
        assert hist.status_code == 200
        items = hist.json().get("items") or []
        assert any(i.get("batch_id") == batch_id for i in items)


@pytest.mark.asyncio
async def test_import_commit_imports_invalid_when_not_only_valid(import_app):
    app, db = import_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "mixed.xlsx",
                _mixed_valid_invalid_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up = await client.post("/ats/candidates/import/upload", files=files)
        batch_id = up.json()["batch_id"]
        mapping = {"Full Name": "full_name", "Email": "email", "Phone": "phone"}
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        commit = await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": False, "duplicate_strategy": "skip"},
        )
        assert commit.status_code == 200, commit.text
        body = commit.json()
        assert body["inserted_count"] == 2
        assert body["failed_count"] == 0
        assert len(db._store.get("candidates", [])) == 2


@pytest.mark.asyncio
async def test_import_recruiter_name_resolves_user(import_app):
    app, db = import_app
    await db.users.insert_one(
        {"id": "rec-by-name", "email": "rec.by.name@example.com", "full_name": "Priya Recruiter"}
    )
    df = pd.DataFrame(
        [
            {
                "Full Name": "Rec Name User",
                "Email": "recname.user@example.com",
                "Phone": "9123456701",
                "Recruiter Name": "Priya Recruiter",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "recname.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        batch_id = up.json()["batch_id"]
        mapping = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone": "phone",
            "Recruiter Name": "recruiter_name",
        }
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        assert preview.status_code == 200, preview.text
        row = preview.json()["preview"][0]
        assert row["transformed_candidate"].get("recruiter_id") == "rec-by-name"
        await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "skip"},
        )
    inserted = next(
        c for c in db._store["candidates"] if c.get("email") == "recname.user@example.com"
    )
    assert inserted.get("recruiter_id") == "rec-by-name"


@pytest.mark.asyncio
async def test_import_writes_global_audit_log(import_app):
    app, db = import_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "candidates.xlsx",
                _sample_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up = await client.post("/ats/candidates/import/upload", files=files)
        batch_id = up.json()["batch_id"]
        mapping = {"Full Name": "full_name", "Email": "email", "Phone": "phone", "Skills": "skills"}
        await client.post(
            "/ats/candidates/import/validate-preview",
            json={"batch_id": batch_id, "mapping": mapping},
        )
        await client.post(
            "/ats/candidates/import/commit",
            json={"batch_id": batch_id, "import_only_valid": True, "duplicate_strategy": "skip"},
        )
    global_logs = db._store.get("import_audit_logs") or []
    assert len(global_logs) >= 3
    assert any(
        log.get("module") == "candidate_excel_import" and log.get("mode") == "commit"
        for log in global_logs
    )
    assert any(log.get("summary", {}).get("batch_id") == batch_id for log in global_logs)


@pytest.mark.asyncio
async def test_import_schema_includes_dynamic_fields(import_app):
    app, db = import_app
    await db.candidates.insert_one(
        {
            "id": "schema-sample",
            "full_name": "Schema Sample",
            "email": "schema.sample@example.com",
            "import_source": "EXCEL_IMPORT",
            "created_at": "2099-01-01T00:00:00+00:00",
            "custom_demo_field": "value",
        }
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/ats/candidates/import/schema")
        assert resp.status_code == 200
        fields = {f["field"]: f for f in resp.json().get("fields") or []}
        assert "recruiter_name" in fields
        assert fields.get("custom_demo_field", {}).get("dynamic") is True


@pytest.mark.asyncio
async def test_import_cleanup_cron(import_app, monkeypatch):
    monkeypatch.setenv("CANDIDATE_IMPORT_CLEANUP_TOKEN", "test-cleanup-token")
    app, _db = import_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        denied = await client.post("/ats/candidates/import/cleanup-cron")
        assert denied.status_code == 401
        ok = await client.post(
            "/ats/candidates/import/cleanup-cron",
            headers={"X-Candidate-Import-Cleanup-Token": "test-cleanup-token"},
        )
        assert ok.status_code == 200
        assert ok.json().get("ok") is True
        assert "staging_batches_purged" in ok.json()


@pytest.mark.asyncio
async def test_import_sequential_batch_ids(import_app):
    app, _db = import_app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "file": (
                "candidates.xlsx",
                _sample_xlsx_bytes(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        up1 = await client.post("/ats/candidates/import/upload", files=files)
        up2 = await client.post("/ats/candidates/import/upload", files=files)
        assert up1.status_code == 200
        assert up2.status_code == 200
        id1 = up1.json()["batch_id"]
        id2 = up2.json()["batch_id"]
        assert id1.startswith("IMP-")
        assert id2.startswith("IMP-")
        assert id1 != id2
        assert int(id2.split("-")[-1]) == int(id1.split("-")[-1]) + 1


@pytest.mark.asyncio
async def test_import_file_digest_reimport_warning(import_app):
    app, db = import_app
    df = pd.DataFrame([{"Full Name": "Digest User", "Email": "digest@example.com", "Phone": "9123456702"}])
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    import hashlib

    digest = hashlib.sha256(xlsx).hexdigest()
    await db.candidate_import_batches.insert_one(
        {
            "batch_id": "IMP-20260101-0001",
            "file_digest": digest,
            "status": "COMPLETED",
            "file_name": "prior.xlsx",
            "uploaded_at": "2026-01-01T00:00:00+00:00",
        }
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "digest.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert up.json().get("prior_import_warning") is not None
        batch_id = up.json()["batch_id"]
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={
                "batch_id": batch_id,
                "mapping": {"Full Name": "full_name", "Email": "email", "Phone": "phone"},
            },
        )
        assert preview.json().get("prior_import_warning") is not None
        assert preview.json()["validation_summary"]["duplicate_file_upload"] == 1


@pytest.mark.asyncio
async def test_import_validate_large_file(import_app):
    app, _db = import_app
    rows = [
        {
            "Full Name": f"Bulk User {i}",
            "Email": f"bulk.user.{i}@example.com",
            "Phone": f"91{9000000000 + i}",
        }
        for i in range(1000)
    ]
    buf = io.BytesIO()
    pd.DataFrame(rows).to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "bulk1000.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert up.status_code == 200
        assert up.json()["detected_row_count"] == 1000
        preview = await client.post(
            "/ats/candidates/import/validate-preview",
            json={
                "batch_id": up.json()["batch_id"],
                "mapping": {"Full Name": "full_name", "Email": "email", "Phone": "phone"},
            },
        )
        assert preview.status_code == 200
        assert preview.json()["valid_rows"] == 1000


@pytest.mark.asyncio
async def test_import_upload_rejects_over_max_rows(import_app):
    app, _db = import_app
    rows = [
        {
            "Full Name": f"Max User {i}",
            "Email": f"max.user.{i}@example.com",
            "Phone": f"91{9100000000 + i}",
        }
        for i in range(5001)
    ]
    buf = io.BytesIO()
    pd.DataFrame(rows).to_excel(buf, index=False, engine="openpyxl")
    xlsx = buf.getvalue()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        up = await client.post(
            "/ats/candidates/import/upload",
            files={
                "file": (
                    "too_many.xlsx",
                    xlsx,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert up.status_code == 400
        assert "5000" in up.text


def test_cli_read_rows_uses_shared_etl(tmp_path):
    import pandas as pd

    from scripts.import_candidates_from_excel import _read_rows

    df = pd.DataFrame(
        [
            {"Candidate Name": "CLI Shared User", "Email ID": "cli.shared@example.com", "Mobile": "9876543210"},
        ]
    )
    path = tmp_path / "cli_candidates.xlsx"
    df.to_excel(path, index=False, engine="openpyxl")

    rows = _read_rows(path)
    assert len(rows) == 1
    assert rows[0]["full_name"] == "CLI Shared User"
    assert rows[0]["email"] == "cli.shared@example.com"
    assert rows[0]["source"] == "TALENT_POOL"
    assert rows[0]["skills"] == []
