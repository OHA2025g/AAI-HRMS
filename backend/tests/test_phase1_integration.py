"""
Optional integration tests for Phase-1 endpoints.

Enable by setting:
  RUN_PHASE1_INTEGRATION=1
  PHASE1_BASE_URL=http://127.0.0.1:11001
  PHASE1_BEARER_TOKEN=<token>
"""

import os
import uuid

import pytest
import requests


RUN_IT = os.getenv("RUN_PHASE1_INTEGRATION") == "1"
BASE = os.getenv("PHASE1_BASE_URL", "http://127.0.0.1:11001")
TOKEN = os.getenv("PHASE1_BEARER_TOKEN", "")


pytestmark = pytest.mark.skipif(not RUN_IT, reason="Set RUN_PHASE1_INTEGRATION=1 to run")


def _headers():
    if not TOKEN:
        pytest.skip("PHASE1_BEARER_TOKEN not set")
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def test_employees_bulk_import_dry_run_and_commit():
    code = f"E{uuid.uuid4().hex[:8]}"
    payload = {
        "mode": "upsert",
        "dry_run": True,
        "rows": [
            {
                "employee_code": code,
                "full_name": "Integration User",
                "department": "Data",
                "role_title": "Analyst",
                "status": "ACTIVE",
                "skills": ["Python", "SQL"],
            }
        ],
    }
    r = requests.post(f"{BASE}/api/employees/bulk-import", json=payload, headers=_headers(), timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["summary"]["created"] == 1
    assert data["summary"]["failed"] == 0

    payload["dry_run"] = False
    r2 = requests.post(f"{BASE}/api/employees/bulk-import", json=payload, headers=_headers(), timeout=30)
    assert r2.status_code == 200, r2.text


def test_skills_paged_endpoint():
    r = requests.get(f"{BASE}/api/workforce/skills/paged?page=1&page_size=5&sort_by=gap&sort_dir=desc", headers=_headers(), timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "items" in body
    assert "total" in body
