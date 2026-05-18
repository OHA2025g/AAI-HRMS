#!/usr/bin/env python3
"""
Import candidates from Excel into MongoDB `candidates`, with pin_rank so they appear
first in GET /candidates (sort: pin_rank desc, created_at desc).

Default file: `Candidates 1.xlsx` at repo root, `docs/`, or `backend/docs/`.
Override: CANDIDATES_EXCEL_PATH=/full/path.xlsx

Supports exports that match the app's candidate shape (full_name, email, skills string, …)
plus flexible synonyms (Name, Phone Number, Skills, Summary, Years of Experience, …).

Skills: comma / semicolon / newline separated → [{skill_name, proficiency: null}]
Experience free text → single experience entry with description (preserves ATS exports)

Requires: MONGO_URL, DB_NAME. Depends: pandas, openpyxl (requirements.txt).

Run from backend/:
  python scripts/import_candidates_from_excel.py

Idempotent per spreadsheet row via `import_stable_id`.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from candidate_resume_compose import compose_resume_text, parse_education_cell
from experience_parser import normalize_experience_list, parse_experience_blob


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


SEED_MARKER = "excel_candidates_v1"
SOURCE_TAG = "TALENT_POOL"
PIN_BASE = 1_000_000


def _norm_header(h: Any) -> str:
    s = str(h).strip().lower().replace("\n", " ")
    return re.sub(r"\s+", " ", s)


def _find_col(columns: List[str], candidates: Tuple[str, ...]) -> Optional[str]:
    nc = [(c, _norm_header(c)) for c in columns]
    for cand in candidates:
        lc = cand.lower()
        for orig, n in nc:
            if n == lc or lc in n:
                return orig
    return None


def _cell_scalar(val: Any) -> Optional[Any]:
    if val is None:
        return None
    try:
        import pandas as pd

        if pd.isna(val):
            return None
    except ImportError:
        pass
    return val


def _norm_email(email: Optional[str]) -> Optional[str]:
    return email.strip().lower() if isinstance(email, str) and email.strip() else None


def _norm_spaces(text: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _norm_full_name_lc(full_name: Optional[str]) -> str:
    return _norm_spaces(full_name or "").lower()


def _norm_phone_digits(phone: Optional[str]) -> Optional[str]:
    if not phone or not isinstance(phone, str):
        return None
    digits = re.sub(r"\D", "", phone.strip())
    if len(digits) >= 10:
        return digits[-10:]
    return digits or None


def _resume_hash(text: Optional[str]) -> Optional[str]:
    if not text or not isinstance(text, str):
        return None
    norm = re.sub(r"\s+", " ", text.strip().lower())
    if len(norm) < 40:
        return None
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def _split_skills(val: Any) -> List[str]:
    if _cell_scalar(val) is None:
        return []
    s = str(val).strip()
    if not s:
        return []
    for sep in ["\n", ";", "|"]:
        s = s.replace(sep, ",")
    return [x.strip() for x in s.split(",") if x.strip()]


def _skills_to_objects(names: List[str]) -> List[Dict[str, Any]]:
    return [{"skill_name": n, "proficiency": None} for n in names]


def _parse_float(val: Any) -> Optional[float]:
    x = _cell_scalar(val)
    if x is None:
        return None
    try:
        return float(str(x).strip())
    except (TypeError, ValueError):
        return None


def _experience_from_cell(val: Any) -> List[Dict[str, Any]]:
    x = _cell_scalar(val)
    if x is None:
        return []
    raw = str(x).strip()
    if not raw:
        return []
    try:
        if raw.startswith("[") or raw.startswith("{"):
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return normalize_experience_list([p for p in parsed if isinstance(p, dict)])
    except json.JSONDecodeError:
        pass
    return parse_experience_blob(raw[:50000])


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
        BACKEND_DIR.parent / "Candidates 1.xlsx",
        BACKEND_DIR.parent / "docs" / "Candidates 1.xlsx",
        BACKEND_DIR / "docs" / "Candidates 1.xlsx",
        BACKEND_DIR / "Candidates 1.xlsx",
        BACKEND_DIR / "scripts" / "Candidates 1.xlsx",
    ]
    for p in paths:
        if p.is_file():
            return p
    raise SystemExit(
        "Place 'Candidates 1.xlsx' in the project root or docs/, or set CANDIDATES_EXCEL_PATH.\n"
        f"Tried: {[str(x) for x in paths]}"
    )


def _read_rows(path: Path) -> List[Dict[str, Any]]:
    import pandas as pd

    df = pd.read_excel(path, sheet_name=0, engine="openpyxl")
    raw_cols = list(df.columns)
    norm_map = {_norm_header(c): c for c in raw_cols}

    def gc(*names: str) -> Optional[str]:
        for n in names:
            k = _norm_header(n)
            if k in norm_map:
                return norm_map[k]
        return None

    fn_c = gc("full_name") or _find_col(
        raw_cols,
        ("full name", "candidate name", "name", "employee name"),
    )
    if not fn_c:
        raise SystemExit(f"No name column. Headers: {raw_cols}")

    em_c = gc("email") or _find_col(raw_cols, ("e-mail", "email id", "mail"))
    ph_c = gc("phone") or _find_col(raw_cols, ("mobile", "phone number", "contact"))
    loc_c = gc("location") or _find_col(raw_cols, ("city", "address"))
    hl_c = gc("headline") or _find_col(raw_cols, ("title", "role", "designation", "current title"))
    tex_c = gc("total_experience_years") or _find_col(
        raw_cols, ("total experience", "years of experience", "experience years", "yoe")
    )
    sk_c = gc("skills") or _find_col(raw_cols, ("skill set", "technical skills", "competencies"))
    ex_c = gc("experience") or _find_col(raw_cols, ("work experience", "employment history"))
    ed_c = gc("education") or _find_col(raw_cols, ("qualification", "degrees"))
    res_c = gc("resume_text") or _find_col(raw_cols, ("summary", "bio", "profile"))
    src_c = gc("source") or _find_col(raw_cols, ("candidate source",))

    rows: List[Dict[str, Any]] = []
    for idx, row in df.iterrows():
        full_name = row.get(fn_c)
        if _cell_scalar(full_name) is None:
            continue
        name_s = _norm_spaces(str(full_name))
        if not name_s or name_s.lower() == "nan":
            continue

        email = row.get(em_c) if em_c else None
        if _cell_scalar(email) is None:
            email = None
        else:
            email = str(email).strip() or None

        phone = row.get(ph_c) if ph_c else None
        if _cell_scalar(phone) is None:
            phone = None
        else:
            phone = str(phone).strip() or None

        location = row.get(loc_c) if loc_c else None
        if _cell_scalar(location) is None:
            location = None
        else:
            location = str(location).strip() or None

        headline = row.get(hl_c) if hl_c else None
        if _cell_scalar(headline) is None:
            headline = None
        else:
            headline = str(headline).strip() or None

        tex = _parse_float(row.get(tex_c)) if tex_c else None

        skills_raw = row.get(sk_c) if sk_c else None
        snames = _split_skills(skills_raw)
        if not snames:
            snames = []

        experience = _experience_from_cell(row.get(ex_c)) if ex_c else []

        summary_text = row.get(res_c) if res_c else None
        if _cell_scalar(summary_text) is None:
            summary_text = None
        else:
            summary_text = str(summary_text).strip() or None

        education: List[Dict[str, Any]] = []
        education_cell: Optional[str] = None
        educ = row.get(ed_c) if ed_c else None
        if _cell_scalar(educ) is not None:
            education_cell = str(educ).strip() or None
            if education_cell:
                education = parse_education_cell(education_cell)

        resume_text = compose_resume_text(
            resume_text=summary_text,
            headline=headline,
            location=location,
            total_experience_years=tex,
            skills=_skills_to_objects(snames),
            experience=experience,
            education=education,
            education_cell=education_cell,
        )

        # Always tag spreadsheet imports as Talent Pool (ignore per-row source column).
        source = SOURCE_TAG

        rows.append(
            {
                "full_name": name_s,
                "email": email,
                "phone": phone,
                "location": location,
                "headline": headline,
                "total_experience_years": tex,
                "skills": _skills_to_objects(snames),
                "experience": experience,
                "education": education,
                "resume_text": resume_text,
                "source": source,
            }
        )
    return rows


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

    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:16]

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

            key_bits = f"{r.get('email') or ''}|{r['full_name']}"
            stable = str(
                uuid.uuid5(
                    uuid.NAMESPACE_DNS,
                    f"aai-hrms.excel-candidate::{path.name}::{digest}::{i}::{key_bits[:200]}",
                )
            )

            email_lc = _norm_email(r.get("email"))
            phone_lc = _norm_phone_digits(r.get("phone"))
            fn_lc = _norm_full_name_lc(r.get("full_name"))
            rh = _resume_hash(r.get("resume_text"))

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
