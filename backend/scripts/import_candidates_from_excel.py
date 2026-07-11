#!/usr/bin/env python3
"""
Import candidates from Excel into MongoDB `candidates`, with pin_rank so they appear
first in GET /candidates (sort: pin_rank desc, created_at desc).

Prefer the in-app bulk import wizard (POST /api/ats/candidates/import/*) for HR users.
This CLI uses the same extract/transform helpers as the API ETL module but keeps
Docker-seed upsert semantics (TALENT_POOL source, legacy import_stable_id namespace).

Default file: `Candidates 1.xlsx` at repo root, `docs/`, or `backend/docs/`.
Override: CANDIDATES_EXCEL_PATH=/full/path.xlsx

Requires: MONGO_URL, DB_NAME. Depends: pandas, openpyxl (requirements.txt).

Run from backend/:
  python scripts/import_candidates_from_excel.py

Idempotent per spreadsheet row via `import_stable_id`.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from talent_acquisition.candidate_import.etl_utils import (
    auto_map_columns,
    norm_email,
    norm_full_name_lc,
    norm_phone_digits,
    norm_spaces,
    read_excel_bytes,
    resume_hash,
    transform_row,
)

SEED_MARKER = "excel_candidates_v1"
SOURCE_TAG = "TALENT_POOL"
PIN_BASE = 1_000_000


def _load_env() -> None:
    try:
        from dotenv import load_dotenv

        load_dotenv(BACKEND_DIR / ".env")
    except ImportError:
        pass
    try:
        from secrets_loader import apply_secret_store

        apply_secret_store()
    except ImportError:
        pass


def _iso_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    s = dt.astimezone(timezone.utc).isoformat()
    return s.replace("+00:00", "Z")


def _resolve_excel_path() -> Path:
    env = os.environ.get("CANDIDATES_EXCEL_PATH") or os.environ.get("EXCEL_PATH")
    if env:
        p = Path(env).expanduser()
        if p.is_file():
            return p
        raise SystemExit(f"CANDIDATES_EXCEL_PATH file not found: {p}")
    paths = [
        Path("/data/excel/Candidates 1.xlsx"),
        BACKEND_DIR.parent / "data" / "excel" / "Candidates 1.xlsx",
        BACKEND_DIR.parent / "Candidates 1.xlsx",
        BACKEND_DIR.parent / "docs" / "Candidates 1.xlsx",
        BACKEND_DIR / "Candidates 1.xlsx",
        BACKEND_DIR / "scripts" / "Candidates 1.xlsx",
    ]
    for p in paths:
        if p.is_file():
            return p
    raise SystemExit(
        "Place 'Candidates 1.xlsx' in data/excel/ (or project root), or set CANDIDATES_EXCEL_PATH.\n"
        f"Tried: {[str(x) for x in paths]}"
    )


def _read_rows(path: Path) -> List[Dict[str, Any]]:
    """Extract + transform using shared candidate import ETL helpers."""
    content = path.read_bytes()
    _sheet_names, columns, raw_rows = read_excel_bytes(content, path.name)
    if not columns:
        raise SystemExit(f"No columns found in {path.name}")
    mapping = {k: v for k, v in auto_map_columns(columns).items() if v}
    if "full_name" not in mapping.values():
        raise SystemExit(f"No mappable name column. Headers: {columns}")

    rows: List[Dict[str, Any]] = []
    for row_number, original in enumerate(raw_rows, start=2):
        transformed = transform_row(original, mapping, row_number)
        if not norm_spaces(transformed.get("full_name") or ""):
            continue
        transformed.pop("_source_raw", None)
        transformed["source"] = SOURCE_TAG
        rows.append(transformed)
    return rows


def _legacy_stable_id(*, file_name: str, digest16: str, row_index: int, row: Dict[str, Any]) -> str:
    key_bits = f"{row.get('email') or ''}|{row['full_name']}"
    return str(
        uuid.uuid5(
            uuid.NAMESPACE_DNS,
            f"aai-hrms.excel-candidate::{file_name}::{digest16}::{row_index}::{key_bits[:200]}",
        )
    )


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = (os.environ.get("DB_NAME") or "aai_hrms").strip() or "aai_hrms"
    if not mongo_url:
        raise SystemExit("MONGO_URL is required")

    path = _resolve_excel_path()
    rows = _read_rows(path)
    if not rows:
        raise SystemExit("No candidate rows with a name were found.")

    digest16 = hashlib.sha256(path.read_bytes()).hexdigest()[:16]

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        now_iso = datetime.now(timezone.utc).isoformat()

        latest = await db.candidates.find({}, {"created_at": 1}).sort("created_at", -1).limit(1).to_list(1)
        base_ts = datetime.now(timezone.utc)
        if latest and latest[0].get("created_at"):
            try:
                raw = latest[0]["created_at"]
                if isinstance(raw, datetime):
                    base_ts = raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
                else:
                    s = str(raw).replace("Z", "+00:00")
                    base_ts = datetime.fromisoformat(s)
                    if base_ts.tzinfo is None:
                        base_ts = base_ts.replace(tzinfo=timezone.utc)
            except Exception:
                pass

        n = len(rows)
        new_n = 0
        upd_n = 0

        for i, r in enumerate(rows):
            pin_rank = PIN_BASE - i
            created_ts = base_ts + timedelta(seconds=float(n - i))
            created_at = _iso_utc(created_ts)
            stable = _legacy_stable_id(file_name=path.name, digest16=digest16, row_index=i, row=r)

            email_lc = norm_email(r.get("email"))
            phone_lc = norm_phone_digits(r.get("phone"))
            fn_lc = norm_full_name_lc(r.get("full_name"))
            rh = resume_hash(r.get("resume_text"))

            doc: Dict[str, Any] = {
                "id": stable,
                "full_name": r["full_name"],
                "email": r.get("email"),
                "phone": r.get("phone"),
                "location": r.get("location"),
                "headline": r.get("headline"),
                "total_experience_years": r.get("total_experience_years"),
                "skills": r.get("skills") or [],
                "experience": r.get("experience") or [],
                "education": r.get("education") or [],
                "resume_text": r.get("resume_text"),
                "source": r.get("source") or SOURCE_TAG,
                "created_at": created_at,
                "updated_at": now_iso,
                "email_lc": email_lc,
                "full_name_lc": fn_lc,
                "phone_lc": phone_lc,
                "resume_content_hash": rh,
                "pin_rank": pin_rank,
                "seed_marker": SEED_MARKER,
                "import_stable_id": stable,
                "import_source_file": path.name,
                "import_row_index": i,
            }

            res = await db.candidates.update_one(
                {"import_stable_id": stable},
                {"$set": doc},
                upsert=True,
            )
            if res.upserted_id is not None:
                new_n += 1
            else:
                upd_n += 1

        print(
            f"Excel candidate import complete. file={path.name} rows={n} "
            f"upserts_new={new_n} updates={upd_n} db={db_name}. "
            f"List sorts by pin_rank (first row highest) then created_at.",
            flush=True,
        )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
