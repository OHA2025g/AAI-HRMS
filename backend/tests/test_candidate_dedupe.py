from talent_acquisition.candidate_dedupe import (
    dedupe_candidate_dicts,
    dedupe_candidates_for_select,
)


def test_dedupe_prefers_real_name_over_numeric_import_row():
    rows = [
        {"id": "1", "email": "a@example.com", "full_name": "1"},
        {"id": "uuid-a", "email": "a@example.com", "full_name": "Alice Example"},
    ]
    out = dedupe_candidate_dicts(rows)
    assert len(out) == 1
    assert out[0]["full_name"] == "Alice Example"
    assert out[0]["id"] == "uuid-a"


def test_dedupe_drops_junk_rows_without_email():
    rows = [
        {"id": "99", "full_name": "99"},
        {"id": "real-1", "full_name": "Bob", "email": "bob@example.com"},
    ]
    out = dedupe_candidate_dicts(rows)
    assert len(out) == 1
    assert out[0]["id"] == "real-1"


def test_dedupe_for_select_drops_fitseed_and_collapses_same_name():
    rows = [
        {
            "id": "seed-1",
            "full_name": "Aarav Sharma",
            "email": "fitseed.abc.0@aai-hrms.local",
            "seed_marker": "job_posting_fit_candidates_v1",
            "source": "LINKEDIN",
        },
        {
            "id": "seed-2",
            "full_name": "Aarav Sharma",
            "email": "fitseed.def.0@aai-hrms.local",
            "seed_marker": "job_posting_fit_candidates_v1",
            "source": "LINKEDIN",
        },
        {
            "id": "real-1",
            "full_name": "Aarav Sharma",
            "email": "aarav.sharma@example.com",
            "skills": ["Python"],
        },
        {
            "id": "real-2",
            "full_name": "Aarav Sharma",
            "email": "aarav.sharma+dup@example.com",
        },
    ]
    out = dedupe_candidates_for_select(rows)
    assert len(out) == 1
    assert out[0]["id"] == "real-1"
    assert out[0]["email"] == "aarav.sharma@example.com"


def test_dedupe_for_select_drops_bulk_seed_demo_rows():
    rows = [
        {
            "id": "bulk-1",
            "full_name": "Bulk Seed Candidate 000000",
            "email": "b1781760917c000000@bulkseed.example",
            "source": "TALENT_POOL",
            "headline": "Software Engineer — bulk seed",
        },
        {
            "id": "real-1",
            "full_name": "1",
            "email": "vrushbhdoshi@gmail.com",
            "seed_marker": "excel_candidates_v1",
            "source": "TALENT_POOL",
        },
    ]
    out = dedupe_candidates_for_select(rows)
    assert len(out) == 1
    assert out[0]["id"] == "real-1"
