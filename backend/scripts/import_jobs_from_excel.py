#!/usr/bin/env python3
"""
Import job requisitions from Excel into MongoDB `jobs`, with high pin_rank so they
sort above other listings (see GET /jobs sort: pin_rank desc, created_at desc).

Expected workbook (default filename): `Job Descriptions 1.xlsx`
Place the file at repo root, `docs/`, or `backend/` — or set EXCEL_PATH.

Flexible headers (case-insensitive; extra spaces OK). First matching column wins:
  Title:        job title, title, role, position
  Description:  description, job description, jd, summary, details
  Location:     location, city, work location
  Pillar:       business pillar, pillar
  Department:   department, business department, dept
  Sub-dept:     sub department, business sub department, sub-department
  Project ID:   project id, project
  Seniority:    seniority, level, grade
  Work mode:    work mode, remote/hybrid/onsite
  Must-have:    must have skills, must-have, mandatory skills
  Good-to-have: good to have, nice to have, preferred skills, skills

Rows without a title are skipped.

Requires: MONGO_URL, DB_NAME (see other backend scripts). Optional: EXCEL_PATH

Run from backend/:
  pip install openpyxl pandas  # if needed
  python scripts/import_jobs_from_excel.py

Idempotent: same row gets stable `import_stable_id` (uuid5), upserts in place.
"""

from __future__ import annotations

import asyncio
import hashlib
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


SEED_MARKER = "excel_job_descriptions_v1"
PIN_BASE = 1_000_000


def _norm_header(h: Any) -> str:
    s = str(h).strip().lower().replace("\n", " ")
    s = re.sub(r"\s+", " ", s)
    return s


def _find_col(columns: List[str], candidates: Tuple[str, ...]) -> Optional[str]:
    nc = [(c, _norm_header(c)) for c in columns]
    for cand in candidates:
        lc = cand.lower()
        for orig, n in nc:
            if n == lc or n.startswith(lc + " ") or n.endswith(" " + lc):
                return orig
    for cand in candidates:
        lc = cand.lower()
        for orig, n in nc:
            if lc in n:
                return orig
    return None


def _split_skills(val: Any) -> List[str]:
    if val is None:
        return []
    try:
        import pandas as pd

        if pd.isna(val):
            return []
    except ImportError:
        pass
    s = str(val).strip()
    if not s:
        return []
    for sep in ["\n", ";", "|"]:
        s = s.replace(sep, ",")
    return [x.strip() for x in s.split(",") if x.strip()]


def _iso_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    s = dt.astimezone(timezone.utc).isoformat()
    return s.replace("+00:00", "Z")


def generate_default_jd_analysis(title: str, skills_needed: List[str], must_have_skills: List[str]) -> Dict[str, Any]:
    skills = []
    for skill in must_have_skills:
        skills.append({"skill_name": skill, "skill_type": "MUST_HAVE", "weight": 1.5})
    for skill in skills_needed:
        if skill not in must_have_skills:
            skills.append({"skill_name": skill, "skill_type": "GOOD_TO_HAVE", "weight": 1.0})
    return {
        "normalized_title": title.lower(),
        "seniority": None,
        "domain": None,
        "skills": skills,
        "activities": [],
        "scoring_rubric": {
            "min_skill_match_pct": 70,
            "min_activity_match_pct": 60,
            "weights": {"title": 0.2, "skill": 0.4, "activity": 0.3, "experience": 0.1},
        },
    }


def _resolve_excel_path() -> Path:
    env = os.environ.get("EXCEL_PATH")
    if env:
        p = Path(env).expanduser()
        if p.is_file():
            return p
        raise SystemExit(f"EXCEL_PATH file not found: {p}")
    candidates = [
        Path("/data/excel/Job Descriptions 1.xlsx"),
        Path("/data/excel/Job Description 1.xlsx"),
        BACKEND_DIR.parent / "data" / "excel" / "Job Descriptions 1.xlsx",
        BACKEND_DIR.parent / "Job Descriptions 1.xlsx",
        BACKEND_DIR.parent / "Job Description 1.xlsx",
        BACKEND_DIR.parent / "docs" / "Job Descriptions 1.xlsx",
        BACKEND_DIR / "Job Descriptions 1.xlsx",
        BACKEND_DIR / "scripts" / "Job Descriptions 1.xlsx",
    ]
    for p in candidates:
        if p.is_file():
            return p
    raise SystemExit(
        "Could not find 'Job Descriptions 1.xlsx'. Place it in data/excel/ (or project root), "
        "or set EXCEL_PATH to the full path.\n"
        f"Tried: {[str(x) for x in candidates]}"
    )


def _read_rows(path: Path) -> Tuple[List[str], List[Dict[str, Any]]]:
    import pandas as pd

    df = pd.read_excel(path, sheet_name=0, engine="openpyxl")
    df.columns = [_norm_header(c) for c in df.columns]
    cols = list(df.columns)
    title_c = _find_col(
        cols,
        (
            "position name",
            "job title",
            "title",
            "role",
            "position",
            "job role",
            "designation",
        ),
    )
    if not title_c:
        raise SystemExit(
            f"No title column found. Headers were: {cols}. "
            "Add a column named Job Title, Title, Role, or similar."
        )
    desc_c = _find_col(
        cols,
        (
            "position description (summary)",
            "position description",
            "description",
            "job description",
            "jd",
            "summary",
            "details",
            "job details",
        ),
    )
    loc_c = _find_col(cols, ("location", "city", "work location", "job location"))
    pillar_c = _find_col(cols, ("business pillar", "pillar"))
    dept_c = _find_col(cols, ("business department", "department", "dept"))
    sub_c = _find_col(
        cols,
        ("business sub department", "sub department", "sub-department", "subdepartment"),
    )
    proj_c = _find_col(cols, ("job id", "project id", "project code", "project"))
    sen_c = _find_col(
        cols,
        ("year of experience", "seniority", "level", "grade", "career level"),
    )
    wm_c = _find_col(cols, ("work mode", "workmode", "remote / hybrid"))
    must_c = _find_col(
        cols,
        ("must have skills", "must-have skills", "mandatory skills", "must have", "required skills"),
    )
    good_c = _find_col(
        cols,
        (
            "good to have skills",
            "good-to-have",
            "preferred skills",
            "nice to have",
            "skills",
            "technical skills",
        ),
    )
    # If "skills" matched preferred too early, prefer columns that are not title
    rows_out: List[Dict[str, Any]] = []
    for idx, row in df.iterrows():
        title = row.get(title_c)
        if title is None or (isinstance(title, float) and str(title) == "nan"):
            continue
        title_s = str(title).strip()
        if not title_s or title_s.lower() == "nan":
            continue
        out = {
            "title": title_s,
            "description": "",
            "location": None,
            "business_pillar": None,
            "business_department": None,
            "business_sub_department": None,
            "project_id": None,
            "seniority": None,
            "work_mode": "hybrid",
            "must_have_skills": [],
            "skills_needed": [],
        }
        if desc_c:
            d = row.get(desc_c)
            if d is not None and str(d).strip() and str(d).lower() != "nan":
                out["description"] = str(d).strip()
        if not out["description"]:
            out["description"] = f"Job requisition: {title_s}. (Import from Excel — add full JD in the spreadsheet.)"
        if loc_c:
            v = row.get(loc_c)
            if v is not None and str(v).strip() and str(v).lower() != "nan":
                out["location"] = str(v).strip()
        if pillar_c:
            v = row.get(pillar_c)
            if v is not None and str(v).strip() and str(v).lower() != "nan":
                out["business_pillar"] = str(v).strip()
        if dept_c:
            v = row.get(dept_c)
            if v is not None and str(v).strip() and str(v).lower() != "nan":
                out["business_department"] = str(v).strip()
        if sub_c:
            v = row.get(sub_c)
            if v is not None and str(v).strip() and str(v).lower() != "nan":
                out["business_sub_department"] = str(v).strip()
        if proj_c:
            v = row.get(proj_c)
            if v is not None and str(v).strip() and str(v).lower() != "nan":
                out["project_id"] = str(v).strip()[:64]
        if sen_c:
            v = row.get(sen_c)
            if v is not None and str(v).strip() and str(v).lower() != "nan":
                out["seniority"] = str(v).strip()
        if wm_c:
            v = row.get(wm_c)
            if v is not None and str(v).strip() and str(v).lower() != "nan":
                wm = str(v).strip().lower()
                if wm in ("remote", "hybrid", "onsite", "on-site", "on site"):
                    out["work_mode"] = "remote" if "remote" in wm else ("hybrid" if "hybrid" in wm else "onsite")
        tech_c = _find_col(cols, ("technical skills", "tech skills"))
        must = _split_skills(row.get(must_c)) if must_c else []
        good = _split_skills(row.get(good_c)) if good_c else []
        if tech_c and tech_c not in (must_c, good_c):
            tech_skills = _split_skills(row.get(tech_c))
            if tech_skills:
                must = must or tech_skills[: max(1, len(tech_skills) // 2)]
                good = good or [s for s in tech_skills if s not in must]
        # Avoid duplicating title column if "skills" pointed at wrong col
        if good_c == title_c:
            good = []
        if must_c == good_c and must_c is not None:
            must = _split_skills(row.get(must_c))
            good = []
        out["must_have_skills"] = must
        out["skills_needed"] = [s for s in good if s not in must]
        if not must and not good:
            out["must_have_skills"] = ["Communication"]
            out["skills_needed"] = ["Problem Solving"]
        rows_out.append(out)
    return cols, rows_out


async def main() -> int:
    _load_env()
    mongo_url = os.environ.get("MONGO_URL")
    db_name = (os.environ.get("DB_NAME") or "aai_hrms").strip() or "aai_hrms"
    if not mongo_url:
        raise SystemExit("MONGO_URL is required")

    path = _resolve_excel_path()
    _, rows = _read_rows(path)
    if not rows:
        raise SystemExit("No data rows with a title were found in the Excel file.")

    file_digest = hashlib.sha256(path.read_bytes()).hexdigest()[:16]

    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(mongo_url)
    try:
        db = client[db_name]
        now = datetime.now(timezone.utc).isoformat()

        admin = await db.users.find_one({"role": "admin"}, {"_id": 0})
        created_by = (admin or {}).get("id")
        if not created_by:
            created_by = str(uuid.uuid4())
            await db.users.insert_one(
                {
                    "id": created_by,
                    "email": "excel.import.admin@aai-hrms.local",
                    "password": "unused",
                    "full_name": "Excel Import",
                    "role": "admin",
                    "created_at": now,
                }
            )

        latest = await db.jobs.find({}, {"created_at": 1}).sort("created_at", -1).limit(1).to_list(1)
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
        inserted = 0
        updated = 0

        for i, r in enumerate(rows):
            analysis = generate_default_jd_analysis(
                r["title"],
                r["skills_needed"],
                r["must_have_skills"],
            )
            stable = str(
                uuid.uuid5(
                    uuid.NAMESPACE_DNS,
                    f"aai-hrms.excel-job::{path.name}::{file_digest}::{i}::{r['title'][:120]}",
                )
            )
            pin_rank = PIN_BASE - i
            created_ts = base_ts + timedelta(seconds=float(n - i))

            job_doc: Dict[str, Any] = {
                "id": stable,
                "title": r["title"],
                "normalized_title": analysis.get("normalized_title", r["title"].lower()),
                "description": r["description"],
                "seniority": r.get("seniority") or analysis.get("seniority"),
                "domain": analysis.get("domain"),
                "business_pillar": r.get("business_pillar"),
                "business_department": r.get("business_department"),
                "business_sub_department": r.get("business_sub_department"),
                "project_id": r.get("project_id"),
                "location": r.get("location"),
                "work_mode": r.get("work_mode") or "hybrid",
                "status": "OPEN",
                "skills": analysis.get("skills", []),
                "activities": analysis.get("activities", []),
                "scoring_rubric": analysis.get("scoring_rubric"),
                "created_by": created_by,
                "created_at": _iso_utc(created_ts),
                "pin_rank": pin_rank,
                "seed_marker": SEED_MARKER,
                "import_source_file": path.name,
                "import_row_index": i,
                "import_stable_id": stable,
                "updated_at": now,
            }
            from talent_acquisition.job_org_fields import effective_job_org

            inferred = effective_job_org(job_doc)
            for key in ("business_pillar", "business_department", "business_sub_department"):
                if not job_doc.get(key) and inferred.get(key):
                    job_doc[key] = inferred[key]

            res = await db.jobs.update_one(
                {"import_stable_id": stable},
                {"$set": job_doc},
                upsert=True,
            )
            if res.upserted_id is not None:
                inserted += 1
            else:
                updated += 1

        print(
            f"Excel job import complete. file={path.name} rows={n} upserted_new={inserted} "
            f"updated={updated} db={db_name}. Jobs sort first by pin_rank (first spreadsheet row highest).",
            flush=True,
        )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
