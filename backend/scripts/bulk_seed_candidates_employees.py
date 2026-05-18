#!/usr/bin/env python3
"""
Insert many fully-populated `employees` and `candidates` documents (no BSON null values).

Usage (from repo root, with stack up):
  docker compose exec api python scripts/bulk_seed_candidates_employees.py

Env:
  MONGO_URL (default mongodb://mongo:27017 in Compose)
  DB_NAME (default aai_hrms)
  BULK_SEED_EMPLOYEES (default 1000)
  BULK_SEED_CANDIDATES (default 10000)
"""

from __future__ import annotations

import hashlib
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from pymongo import MongoClient


def _norm_ws_lower(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _resume_content_hash(text: str) -> str:
    norm = re.sub(r"\s+", " ", text.strip().lower())
    if len(norm) < 40:
        raise ValueError("resume_text too short for hash")
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


def _norm_phone_digits(phone: str) -> str:
    digits = re.sub(r"\D", "", phone.strip())
    if len(digits) >= 10:
        return digits[-10:]
    if not digits:
        return "0000000000"
    return digits.zfill(10)[-10:]


def _assert_no_null(obj: Any, path: str = "root") -> None:
    if obj is None:
        raise ValueError(f"BSON null forbidden at {path}")
    if isinstance(obj, dict):
        for k, v in obj.items():
            _assert_no_null(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            _assert_no_null(v, f"{path}[{i}]")


def build_employee(run_id: int, idx: int, root_manager_id: str) -> Dict[str, Any]:
    eid = str(uuid.uuid4())
    code = f"B{run_id}E{idx:06d}"
    full_name = f"Bulk Seed Employee {idx:06d}"
    email = f"b{run_id}e{idx:06d}@bulkseed.example"
    now = datetime.now(timezone.utc).isoformat()
    manager_id = root_manager_id if idx > 0 else eid

    doc: Dict[str, Any] = {
        "id": eid,
        "employee_code": code,
        "full_name": full_name,
        "email": email,
        "email_lc": email.strip().lower(),
        "department": "Engineering",
        "role_title": "Senior Engineer",
        "manager_id": manager_id,
        "location": "Bengaluru",
        "status": "ACTIVE",
        "skills": ["Python", "SQL", "Communication"],
        "join_date": "2019-04-01",
        "compensation_band": "MID",
        "last_promotion_at": "2023-06-15",
        "high_performer": True,
        "critical_role": False,
        "comp_market_percentile": 72.5,
        "hris_last_sync_at": now,
        "hris_comp_source": "BULK_SEED_SCRIPT",
        "created_at": now,
        "updated_at": now,
    }
    return doc


def build_candidate(run_id: int, idx: int) -> Dict[str, Any]:
    cid = str(uuid.uuid4())
    full_name = f"Bulk Seed Candidate {idx:06d}"
    email = f"b{run_id}c{idx:06d}@bulkseed.example"
    # Unique E.164-style numbers for 0..9_999_999 candidates
    phone = f"+1555{idx:07d}"
    now = datetime.now(timezone.utc).isoformat()
    resume_text = (
        f"Synthetic resume body for candidate index {idx} run {run_id}. "
        "Experienced software engineer with backend and data skills. " * 6
    )
    rhash = _resume_content_hash(resume_text)
    email_lc = email.strip().lower()
    full_name_lc = _norm_ws_lower(full_name)
    phone_lc = _norm_phone_digits(phone)

    doc: Dict[str, Any] = {
        "id": cid,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "location": "Hyderabad",
        "headline": "Software Engineer — bulk seed",
        "total_experience_years": float(idx % 12) + 1.0,
        "skills": [
            {"skill_name": "Python", "proficiency": "STRONG"},
            {"skill_name": "MongoDB", "proficiency": "STRONG"},
            {"skill_name": "REST APIs", "proficiency": "ADEQUATE"},
        ],
        "experience": [
            {
                "company": f"Company {(idx % 5) + 1} Ltd",
                "title": "Engineer",
                "start_date": "2018-03-01",
                "end_date": "2024-08-31",
                "description": "Delivery, design reviews, and on-call rotations.",
            }
        ],
        "education": [
            {
                "degree": "B.Tech",
                "field": "Computer Science",
                "school": "State Institute of Technology",
                "year": "2016",
            }
        ],
        "resume_text": resume_text,
        "resume_filename": "synthetic_resume.txt",
        "resume_url": f"https://bulkseed.example/resumes/{cid}.pdf",
        "source": "BULK_SEED",
        "sources": ["BULK_SEED"],
        "created_at": now,
        "updated_at": now,
        "email_lc": email_lc,
        "full_name_lc": full_name_lc,
        "phone_lc": phone_lc,
        "resume_content_hash": rhash,
    }
    return doc


def main() -> None:
    mongo_url = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
    db_name = os.environ.get("DB_NAME", "aai_hrms")
    n_emp = int(os.environ.get("BULK_SEED_EMPLOYEES", "1000"))
    n_cand = int(os.environ.get("BULK_SEED_CANDIDATES", "10000"))
    run_id = int(time.time())

    client = MongoClient(mongo_url)
    db = client[db_name]
    employees = db.employees
    candidates = db.candidates

    # First employee becomes org root for manager_id chain
    root_doc = build_employee(run_id, 0, root_manager_id="")
    root_id = root_doc["id"]
    root_doc["manager_id"] = root_id  # replace placeholder after we know id
    emps: List[Dict[str, Any]] = [root_doc]
    for i in range(1, n_emp):
        emps.append(build_employee(run_id, i, root_manager_id=root_id))

    for e in emps:
        _assert_no_null(e)

    batch = 500
    for i in range(0, len(emps), batch):
        chunk = emps[i : i + batch]
        employees.insert_many(chunk, ordered=False)

    print(f"Inserted {n_emp} employees (run_id={run_id}).")

    cand_buffer: List[Dict[str, Any]] = []
    inserted = 0
    for j in range(n_cand):
        c = build_candidate(run_id, j)
        _assert_no_null(c)
        cand_buffer.append(c)
        if len(cand_buffer) >= batch:
            candidates.insert_many(cand_buffer, ordered=False)
            inserted += len(cand_buffer)
            cand_buffer = []
    if cand_buffer:
        candidates.insert_many(cand_buffer, ordered=False)
        inserted += len(cand_buffer)

    print(f"Inserted {inserted} candidates (run_id={run_id}).")
    client.close()


if __name__ == "__main__":
    main()
