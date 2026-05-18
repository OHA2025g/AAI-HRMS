#!/usr/bin/env python3
"""
Rewrite bulk-seeded employees/candidates to realistic-looking names and emails.

Targets documents created by bulk_seed_candidates_employees.py:
  - employees:   email ends with @bulkseed.example
  - candidates:  source == "BULK_SEED" AND email ends with @bulkseed.example

Keeps id, employee_code, phone patterns, and all fields non-null (recomputes
email_lc, full_name_lc, resume_content_hash where applicable).

Usage (Compose):
  docker compose cp backend/scripts/bulk_update_seed_realistic_names.py api:/app/scripts/
  docker compose exec -T api python scripts/bulk_update_seed_realistic_names.py
"""

from __future__ import annotations

import hashlib
import os
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from pymongo import MongoClient, UpdateOne

BULK_EMAIL_DOMAIN = "bulkseed.example"
NEW_EMAIL_DOMAIN_EMP = "people.aai-hrms.io"
NEW_EMAIL_DOMAIN_CAND = "talent.aai-hrms.io"

FIRST_NAMES = [
    "Aarav", "Aditya", "Ananya", "Arjun", "Deepa", "Devika", "Esha", "Gaurav", "Harsh", "Isha",
    "Jai", "Karan", "Kavya", "Lakshmi", "Manish", "Meera", "Neha", "Nikhil", "Pooja", "Priya",
    "Rahul", "Rajesh", "Riya", "Rohan", "Sanjay", "Sneha", "Suresh", "Tanvi", "Varun", "Vikram",
    "Amit", "Anil", "Anita", "Ashok", "Bhavya", "Chitra", "Divya", "Geeta", "Harini", "Indira",
    "Jay", "Kiran", "Krishna", "Lalita", "Madhuri", "Naveen", "Nisha", "Omkar", "Pallavi", "Parth",
    "Ramesh", "Rekha", "Ritu", "Rohit", "Sachin", "Sarita", "Shilpa", "Siddharth", "Sunita", "Swati",
    "Tarun", "Uma", "Utkarsh", "Vandana", "Venkat", "Vidya", "Yash", "Zara", "Aisha", "Omar",
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth",
    "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
    "Christopher", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra",
    "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Carol", "Kevin", "Amanda", "Brian", "Dorothy", "George", "Melissa", "Timothy", "Deborah",
    "Ronald", "Stephanie", "Jason", "Rebecca", "Edward", "Sharon", "Jeffrey", "Laura", "Ryan", "Cynthia",
    "Jacob", "Kathleen", "Gary", "Amy", "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna",
    "Stephen", "Brenda", "Larry", "Pamela", "Justin", "Nicole", "Scott", "Emma", "Brandon", "Helen",
    "Benjamin", "Samantha", "Samuel", "Olivia", "Frank", "Martha", "Gregory", "Catherine", "Raymond", "Debra",
]

LAST_NAMES = [
    "Sharma", "Verma", "Patel", "Reddy", "Iyer", "Menon", "Nair", "Kapoor", "Malhotra", "Chopra",
    "Kumar", "Singh", "Gupta", "Mehta", "Joshi", "Desai", "Shah", "Agarwal", "Bansal", "Kaur",
    "Rao", "Pillai", "Ghosh", "Mukherjee", "Banerjee", "Das", "Sen", "Chatterjee", "Bose", "Dutta",
    "Krishnan", "Subramanian", "Narayanan", "Balakrishnan", "Sundaram", "Ranganathan", "Lakshmanan", "Srinivasan", "Venkatesh", "Murthy",
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green", "Baker",
    "Nelson", "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell", "Parker", "Evans",
    "Edwards", "Collins", "Stewart", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy",
    "Bailey", "Rivera", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray",
    "Ramirez", "James", "Watson", "Brooks", "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes",
    "Ross", "Henderson", "Coleman", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores",
    "Washington", "Butler", "Simmons", "Foster", "Gonzales", "Bryant", "Alexander", "Russell", "Griffin", "Diaz",
    "Hayes", "Myers", "Ford", "Hamilton", "Graham", "Sullivan", "Wallace", "Woods", "Cole", "West",
    "Jordan", "Owens", "Reynolds", "Fisher", "Ellis", "Harrison", "Gibson", "McDonald", "Cruz", "Marshall",
]


def _slug_part(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = s.encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"[^a-zA-Z0-9]+", "", s)
    return s.lower()[:40] or "x"


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


def _name_for_index(i: int) -> Tuple[str, str]:
    fn = FIRST_NAMES[i % len(FIRST_NAMES)]
    ln = LAST_NAMES[(i // len(FIRST_NAMES)) % len(LAST_NAMES)]
    return fn, ln


def _assert_no_null(obj: Any, path: str = "root") -> None:
    if obj is None:
        raise ValueError(f"BSON null forbidden at {path}")
    if isinstance(obj, dict):
        for k, v in obj.items():
            _assert_no_null(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for j, v in enumerate(obj):
            _assert_no_null(v, f"{path}[{j}]")


def main() -> None:
    mongo_url = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
    db_name = os.environ.get("DB_NAME", "aai_hrms")
    dry = os.environ.get("DRY_RUN", "").lower() in ("1", "true", "yes")

    client = MongoClient(mongo_url)
    db = client[db_name]

    emp_query = {"email": {"$regex": f"@{re.escape(BULK_EMAIL_DOMAIN)}$", "$options": "i"}}
    cand_query = {"source": "BULK_SEED", "email": {"$regex": f"@{re.escape(BULK_EMAIL_DOMAIN)}$", "$options": "i"}}

    emps: List[Dict[str, Any]] = list(db.employees.find(emp_query, {"_id": 1}).sort("employee_code", 1))
    cands: List[Dict[str, Any]] = list(db.candidates.find(cand_query, {"_id": 1}).sort("id", 1))

    now = datetime.now(timezone.utc).isoformat()
    emp_ops: List[UpdateOne] = []
    for i, row in enumerate(emps):
        doc = db.employees.find_one({"_id": row["_id"]})
        if not doc:
            continue
        fn, ln = _name_for_index(i)
        full_name = f"{fn} {ln}"
        code = str(doc.get("employee_code") or "").strip()
        local = f"{_slug_part(fn)}.{_slug_part(ln)}.{code.lower()}"
        email = f"{local}@{NEW_EMAIL_DOMAIN_EMP}"
        resume_text = (
            f"Professional profile for {full_name} ({code}). "
            f"Engineering delivery, stakeholder communication, and mentoring. " * 5
        )
        patch = {
            "full_name": full_name,
            "email": email,
            "email_lc": email.strip().lower(),
            "updated_at": now,
        }
        _assert_no_null(patch)
        emp_ops.append(UpdateOne({"_id": row["_id"]}, {"$set": patch}))

    cand_ops: List[UpdateOne] = []
    for i, row in enumerate(cands):
        doc = db.candidates.find_one({"_id": row["_id"]})
        if not doc:
            continue
        cid = str(doc.get("id") or "")
        fn, ln = _name_for_index(i)
        full_name = f"{fn} {ln}"
        short_id = cid.replace("-", "")[:10]
        local = f"{_slug_part(fn)}.{_slug_part(ln)}.{short_id}"
        email = f"{local}@{NEW_EMAIL_DOMAIN_CAND}"
        phone = doc.get("phone") or f"+1555{i % 10000000:07d}"
        resume_text = (
            f"Resume for {full_name}. Experienced professional with software delivery, "
            f"cloud platforms, and collaborative leadership. Key strengths: reliability, clarity, ownership. " * 6
        )
        headline = f"{fn} {ln} | Engineering & delivery"
        patch = {
            "full_name": full_name,
            "email": email,
            "email_lc": email.strip().lower(),
            "full_name_lc": _norm_ws_lower(full_name),
            "headline": headline,
            "resume_text": resume_text,
            "resume_content_hash": _resume_content_hash(resume_text),
            "phone": phone,
            "phone_lc": _norm_phone_digits(phone),
            "updated_at": now,
        }
        _assert_no_null(patch)
        cand_ops.append(UpdateOne({"_id": row["_id"]}, {"$set": patch}))

    print(
        f"Prepared updates: employees={len(emp_ops)}, candidates={len(cand_ops)} "
        f"(dry_run={dry})"
    )
    if dry:
        client.close()
        return

    batch = 500
    for j in range(0, len(emp_ops), batch):
        db.employees.bulk_write(emp_ops[j : j + batch], ordered=False)
    for j in range(0, len(cand_ops), batch):
        db.candidates.bulk_write(cand_ops[j : j + batch], ordered=False)

    print("Done.")
    client.close()


if __name__ == "__main__":
    main()
