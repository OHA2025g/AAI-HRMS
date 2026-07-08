"""Unit tests for candidate Excel import ETL helpers."""

import io

import pandas as pd
import pytest

from talent_acquisition.candidate_import.etl_utils import (
    auto_map_columns,
    composite_name_email_key,
    compute_import_stable_id,
    compute_pin_rank,
    norm_header,
    norm_linkedin_url,
    norm_phone_digits,
    parse_ctc,
    parse_experience_years,
    parse_notice_period,
    read_excel_bytes,
    split_full_name,
    split_skills,
    transform_row,
    validate_candidate_row,
)
from talent_acquisition.candidate_import.etl_service import _register_job_alias


def test_norm_header_strips_and_lowercases():
    assert norm_header("  Email ID\n") == "email id"


def test_split_full_name():
    assert split_full_name("Rahul Sharma") == ("Rahul", "Sharma")
    assert split_full_name("Madonna") == ("Madonna", "")


def test_split_skills_deduplicates():
    assert split_skills("Python, SQL, python") == ["Python", "SQL"]


def test_parse_experience_years():
    assert parse_experience_years("5 years") == 5.0
    assert parse_experience_years("5.5 Yr") == 5.5
    assert parse_experience_years(7) == 7.0


def test_parse_ctc_lpa_and_numeric():
    assert parse_ctc("12 LPA") == 1_200_000.0
    assert parse_ctc("1200000") == 1200000.0
    assert parse_ctc(15) == 15.0


def test_parse_notice_period():
    assert parse_notice_period("30 days") == 30
    assert parse_notice_period("Immediate") == 0
    assert parse_notice_period(45) == 45


def test_norm_phone_digits():
    assert norm_phone_digits("+91 98765-43210") == "9876543210"


def test_auto_map_columns_fuzzy():
    mapping = auto_map_columns(["Candidate Name", "Email ID", "Mobile", "Skill Set"])
    assert mapping["Candidate Name"] == "full_name"
    assert mapping["Email ID"] == "email"
    assert mapping["Mobile"] == "phone"
    assert mapping["Skill Set"] == "skills"


def test_transform_row_sample():
    row = {
        "Candidate Name": "Rahul Sharma",
        "Email ID": "rahul@gmail.com",
        "Mobile": "9876543210",
        "Skill Set": "Python, SQL, FastAPI",
        "Total Exp": "5",
        "Current CTC": "12 LPA",
        "Expected CTC": "16 LPA",
        "Notice Period": "30 days",
        "Current Company": "TCS",
        "Location": "Mumbai",
    }
    mapping = {
        "Candidate Name": "full_name",
        "Email ID": "email",
        "Mobile": "phone",
        "Skill Set": "skills",
        "Total Exp": "total_experience_years",
        "Current CTC": "current_ctc",
        "Expected CTC": "expected_ctc",
        "Notice Period": "notice_period_days",
        "Current Company": "current_company",
        "Location": "location",
    }
    out = transform_row(row, mapping, row_number=2)
    assert out["full_name"] == "Rahul Sharma"
    assert out["first_name"] == "Rahul"
    assert out["last_name"] == "Sharma"
    assert out["email"] == "rahul@gmail.com"
    assert out["phone"] == "9876543210"
    assert [s["skill_name"] for s in out["skills"]] == ["Python", "SQL", "FastAPI"]
    assert out["total_experience_years"] == 5.0
    assert out["current_ctc"] == 1_200_000.0
    assert out["expected_ctc"] == 1_600_000.0
    assert out["notice_period_days"] == 30
    assert out["location"] == "Mumbai"


def test_validate_candidate_valid():
    candidate = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "9876543210",
        "total_experience_years": 3.0,
    }
    status, errors, _warnings = validate_candidate_row(
        candidate,
        known_job_ids=set(),
        known_job_codes={},
        known_recruiter_ids=set(),
        known_recruiter_emails={},
        duplicate_by_email={},
        duplicate_by_phone={},
    )
    assert status == "VALID"
    assert errors == []


def test_validate_candidate_invalid_email():
    candidate = {
        "full_name": "Jane Doe",
        "email": "not-an-email",
        "phone": "9876543210",
    }
    status, errors, _ = validate_candidate_row(
        candidate,
        known_job_ids=set(),
        known_job_codes={},
        known_recruiter_ids=set(),
        known_recruiter_emails={},
        duplicate_by_email={},
        duplicate_by_phone={},
    )
    assert status == "INVALID"
    assert any(e["field"] == "email" for e in errors)


def test_validate_candidate_duplicate_by_email():
    candidate = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "9876543210",
    }
    status, errors, _ = validate_candidate_row(
        candidate,
        known_job_ids=set(),
        known_job_codes={},
        known_recruiter_ids=set(),
        known_recruiter_emails={},
        duplicate_by_email={"jane@example.com": "cand-123"},
        duplicate_by_phone={},
    )
    assert status == "DUPLICATE"
    assert candidate["duplicate_candidate_id"] == "cand-123"
    assert errors == []


def test_validate_candidate_unknown_job():
    candidate = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "job_id": "missing-job",
    }
    status, errors, _ = validate_candidate_row(
        candidate,
        known_job_ids={"job-1"},
        known_job_codes={},
        known_recruiter_ids=set(),
        known_recruiter_emails={},
        duplicate_by_email={},
        duplicate_by_phone={},
    )
    assert status == "INVALID"
    assert any(e["field"] == "job_id" for e in errors)


def test_read_excel_bytes_extracts_rows():
    df = pd.DataFrame(
        [
            {
                "Name": "Alice",
                "Email": "alice@test.com",
                "Phone": "9999999999",
            }
        ]
    )
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    sheets, columns, rows = read_excel_bytes(buf.getvalue(), "test.xlsx")
    assert "Sheet1" in sheets or len(sheets) >= 1
    assert "Name" in columns
    assert len(rows) == 1
    assert rows[0]["Name"] == "Alice"


def test_norm_linkedin_url():
    assert norm_linkedin_url("https://www.linkedin.com/in/jane-doe/") == "linkedin.com/in/jane-doe"


def test_register_job_alias_compact():
    codes: dict = {}
    _register_job_alias(codes, "JOB-001", "job-uuid-1")
    assert codes["job-001"] == "job-uuid-1"
    assert codes["job001"] == "job-uuid-1"


def test_validate_duplicate_by_name_email():
    candidate = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "9876543210",
    }
    key = composite_name_email_key("Jane Doe", "jane@example.com")
    status, _, _ = validate_candidate_row(
        candidate,
        known_job_ids=set(),
        known_job_codes={},
        known_recruiter_ids=set(),
        known_recruiter_emails={},
        duplicate_by_email={},
        duplicate_by_phone={},
        duplicate_by_name_email={key: "cand-456"},
    )
    assert status == "DUPLICATE"
    assert candidate["duplicate_match_reason"] == "full_name+email"


def test_validate_duplicate_by_linkedin():
    candidate = {
        "full_name": "Jane Doe",
        "email": "new@example.com",
        "phone": "9876543210",
        "linkedin_url": "https://linkedin.com/in/jane-doe",
    }
    status, _, _ = validate_candidate_row(
        candidate,
        known_job_ids=set(),
        known_job_codes={},
        known_recruiter_ids=set(),
        known_recruiter_emails={},
        duplicate_by_email={},
        duplicate_by_phone={},
        duplicate_by_linkedin={"linkedin.com/in/jane-doe": "cand-789"},
    )
    assert status == "DUPLICATE"
    assert candidate["duplicate_match_reason"] == "linkedin_url"


def test_compute_pin_rank_and_stable_id():
    stable = compute_import_stable_id(
        file_name="candidates.xlsx",
        file_digest="abc123",
        row_number=2,
        email="alice@test.com",
        full_name="Alice",
    )
    assert len(stable) == 36
    assert compute_pin_rank(2) == 1_000_000
    assert compute_pin_rank(3) == 999_999
    stable2 = compute_import_stable_id(
        file_name="candidates.xlsx",
        file_digest="abc123",
        row_number=2,
        email="alice@test.com",
        full_name="Alice",
    )
    assert stable == stable2


def test_read_excel_bytes_second_sheet():
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        pd.DataFrame([{"Name": "Sheet1"}]).to_excel(writer, sheet_name="First", index=False)
        pd.DataFrame([{"Name": "Bob", "Email": "bob@test.com"}]).to_excel(writer, sheet_name="Second", index=False)
    sheets, columns, rows = read_excel_bytes(buf.getvalue(), "multi.xlsx", sheet_name="Second")
    assert "Second" in sheets
    assert rows[0]["Name"] == "Bob"


def test_template_includes_allowed_values_sheet():
    from talent_acquisition.candidate_import.etl_service import CandidateImportService

    content = CandidateImportService(db=None).template_bytes()
    xl = pd.ExcelFile(io.BytesIO(content))
    assert "Allowed Values" in xl.sheet_names
    allowed = pd.read_excel(xl, sheet_name="Allowed Values")
    assert "Category" in allowed.columns
    assert (allowed["Category"] == "Pipeline Stage (with Job)").any()
    assert (allowed["Allowed Value"] == "SOURCED").any()


def test_normalize_import_source():
    from talent_acquisition.candidate_import.etl_utils import normalize_import_source

    assert normalize_import_source("LinkedIn") == "LINKEDIN"
    assert normalize_import_source("Excel Upload") == "EXCEL_IMPORT"
    assert normalize_import_source(None) == "EXCEL_IMPORT"


def test_in_file_duplicate_tracker():
    from talent_acquisition.candidate_import.etl_utils import InFileDuplicateTracker

    tracker = InFileDuplicateTracker()
    first = {"full_name": "A", "email": "a@test.com", "phone": "9111111111"}
    tracker.register(2, first)
    reason, row = tracker.check({"full_name": "B", "email": "a@test.com", "phone": "9222222222"})
    assert reason == "in_file_email"
    assert row == 2


def test_build_recruiter_name_lookup():
    from talent_acquisition.candidate_import.etl_utils import build_recruiter_name_lookup

    by_name, ambiguous = build_recruiter_name_lookup(
        [
            {"id": "u1", "full_name": "Alice Recruiter"},
            {"id": "u2", "full_name": "Bob Smith"},
            {"id": "u3", "full_name": "Alice Recruiter"},
        ]
    )
    assert "alice recruiter" in ambiguous
    assert "alice recruiter" not in by_name
    assert by_name.get("bob smith") == "u2"


def test_validate_recruiter_name_resolves_id():
    candidate = {
        "full_name": "Test User",
        "email": "test@example.com",
        "recruiter_name": "Jane Doe",
    }
    status, _errors, warnings = validate_candidate_row(
        candidate,
        known_job_ids=set(),
        known_job_codes={},
        known_recruiter_ids={"rec-99"},
        known_recruiter_emails={},
        known_recruiter_names={"jane doe": "rec-99"},
        duplicate_by_email={},
        duplicate_by_phone={},
    )
    assert status == "VALID"
    assert warnings == []
    assert candidate.get("recruiter_id") == "rec-99"


def test_source_import_warning():
    from talent_acquisition.candidate_import.etl_utils import source_import_warning

    assert source_import_warning("MySpace") is not None
    assert source_import_warning("LinkedIn") is None
    assert source_import_warning(None) is None


def test_sanitize_cell_value_formula():
    from talent_acquisition.candidate_import.etl_utils import sanitize_cell_value

    assert sanitize_cell_value("=SUM(A1:A2)") == "'=SUM(A1:A2)"
    assert sanitize_cell_value("+919876543210") == "'+919876543210"
    assert sanitize_cell_value("normal@example.com") == "normal@example.com"


def test_format_sequential_batch_id():
    from talent_acquisition.candidate_import.etl_utils import format_sequential_batch_id

    assert format_sequential_batch_id("20260525", 1) == "IMP-20260525-0001"
    assert format_sequential_batch_id("20260525", 42) == "IMP-20260525-0042"


def test_suggest_required_field_for_column():
    from talent_acquisition.candidate_import.etl_utils import suggest_required_field_for_column

    assert suggest_required_field_for_column("Candidate Name") == "full_name"
    assert suggest_required_field_for_column("Email Address") == "email"
    assert suggest_required_field_for_column("Random Column") is None
