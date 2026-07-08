"""Unit tests for ApplicationResponse payload normalization."""

from __future__ import annotations

from server import normalize_application_for_response


def test_normalize_application_defaults_status_and_timestamps():
    out = normalize_application_for_response(
        {
            "id": "app-1",
            "job_id": "job-1",
            "candidate_id": "cand-1",
            "stage": "SCREENING",
        }
    )
    assert out["status"] == "ACTIVE"
    assert out["created_at"]
    assert out["updated_at"]


def test_normalize_application_preserves_existing_status():
    out = normalize_application_for_response(
        {
            "id": "app-2",
            "job_id": "job-1",
            "candidate_id": "cand-1",
            "stage": "REJECTED",
            "status": "REJECTED",
            "created_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-02T00:00:00+00:00",
        }
    )
    assert out["status"] == "REJECTED"
    assert out["created_at"] == "2026-01-01T00:00:00+00:00"
