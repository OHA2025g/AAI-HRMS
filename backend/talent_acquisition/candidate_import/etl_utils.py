"""Extract / transform / validate helpers for candidate Excel import."""

from __future__ import annotations

import hashlib
import io
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple

from talent_acquisition.candidate_import.constants import (
    ALLOWED_CANDIDATE_SOURCES,
    COLUMN_SYNONYMS,
    SOURCE_EXCEL_UPLOAD,
)

try:
    from candidate_resume_compose import compose_resume_text, parse_education_cell
    from experience_parser import normalize_experience_list, parse_experience_blob
except ImportError:  # pragma: no cover
    compose_resume_text = None  # type: ignore
    parse_education_cell = None  # type: ignore
    normalize_experience_list = None  # type: ignore
    parse_experience_blob = None  # type: ignore


def norm_header(h: Any) -> str:
    s = str(h).strip().lower().replace("\n", " ")
    return re.sub(r"\s+", " ", s)


def cell_scalar(val: Any) -> Optional[Any]:
    if val is None:
        return None
    try:
        import pandas as pd

        if pd.isna(val):
            return None
    except ImportError:
        pass
    return val


def norm_spaces(text: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def norm_email(email: Optional[str]) -> Optional[str]:
    if not email or not isinstance(email, str):
        return None
    e = email.strip().lower()
    return e or None


def norm_full_name_lc(full_name: Optional[str]) -> str:
    return norm_spaces(full_name or "").lower()


def build_recruiter_name_lookup(
    users: List[Dict[str, Any]],
) -> Tuple[Dict[str, str], set[str]]:
    """Map normalized full_name -> user id; ambiguous names are excluded."""
    by_name: Dict[str, str] = {}
    ambiguous: set[str] = set()
    for user in users:
        name_lc = norm_full_name_lc(user.get("full_name"))
        uid = user.get("id")
        if not name_lc or not uid:
            continue
        if name_lc in by_name:
            ambiguous.add(name_lc)
        else:
            by_name[name_lc] = uid
    for name in ambiguous:
        by_name.pop(name, None)
    return by_name, ambiguous


def norm_phone_digits(phone: Optional[str]) -> Optional[str]:
    if not phone or not isinstance(phone, str):
        return None
    digits = re.sub(r"\D", "", phone.strip())
    if len(digits) >= 10:
        return digits[-10:]
    return digits or None


def norm_linkedin_url(url: Optional[str]) -> Optional[str]:
    if not url or not isinstance(url, str):
        return None
    s = url.strip().lower()
    if not s:
        return None
    s = re.sub(r"^https?://(www\.)?", "", s)
    s = s.rstrip("/")
    s = re.sub(r"\?.*$", "", s)
    if "linkedin.com/in/" in s:
        slug = s.split("linkedin.com/in/")[-1].split("/")[0]
        return f"linkedin.com/in/{slug}" if slug else None
    if s.startswith("linkedin.com/in/"):
        slug = s.replace("linkedin.com/in/", "").split("/")[0]
        return f"linkedin.com/in/{slug}" if slug else None
    return s or None


def composite_name_email_key(full_name: Optional[str], email: Optional[str]) -> Optional[str]:
    fn = norm_full_name_lc(full_name)
    em = norm_email(email)
    if fn and em:
        return f"{fn}|{em}"
    return None


def composite_name_phone_key(full_name: Optional[str], phone: Optional[str]) -> Optional[str]:
    fn = norm_full_name_lc(full_name)
    ph = norm_phone_digits(phone)
    if fn and ph:
        return f"{fn}|{ph}"
    return None


def suggest_correction(field: str, error: str, original_value: Any) -> Optional[str]:
    err = (error or "").lower()
    if field == "email" and "invalid email" in err:
        return "Use a valid email like name@company.com"
    if field == "phone" and "invalid phone" in err:
        return "Enter at least 10 digits, e.g. 9876543210"
    if field == "full_name" and "required" in err:
        return "Provide candidate full name"
    if field in ("job_id", "job_code") and "unknown" in err:
        return "Use an existing job ID, requisition code, or job title from Jobs list"
    if field == "recruiter_id" and "unknown" in err:
        return "Use a valid recruiter user ID or map Recruiter Email / Recruiter Name column"
    if field == "email" and "required" in err:
        return "Provide email or phone for the candidate"
    if original_value is not None and str(original_value).strip():
        return f"Review value: {original_value}"
    return None


def classify_error_type(field: str, error: str) -> str:
    err = (error or "").lower()
    if field == "full_name" and "required" in err:
        return "missing_mandatory"
    if field == "email" and "required" in err:
        return "missing_mandatory"
    if field == "email" and "invalid email" in err:
        return "invalid_email"
    if field == "phone" and "invalid phone" in err:
        return "invalid_phone"
    if field == "job_id" and "unknown" in err:
        return "unknown_job_id"
    if field == "job_code" and "unknown" in err:
        return "unknown_job_code"
    if field == "recruiter_id" and "unknown" in err:
        return "unknown_recruiter"
    return "validation_error"


def resume_hash(text: Optional[str]) -> Optional[str]:
    if not text or not isinstance(text, str):
        return None
    norm = re.sub(r"\s+", " ", text.strip().lower())
    if len(norm) < 40:
        return None
    return hashlib.sha256(norm.encode("utf-8")).hexdigest()


EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def split_skills(val: Any) -> List[str]:
    if cell_scalar(val) is None:
        return []
    s = str(val).strip()
    if not s:
        return []
    for sep in ["\n", ";", "|"]:
        s = s.replace(sep, ",")
    parts = [x.strip() for x in s.split(",") if x.strip()]
    seen: set[str] = set()
    out: List[str] = []
    for p in parts:
        key = p.lower()
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out


def skills_to_objects(names: List[str]) -> List[Dict[str, Any]]:
    return [{"skill_name": n, "proficiency": None} for n in names]


def parse_experience_years(val: Any) -> Optional[float]:
    x = cell_scalar(val)
    if x is None:
        return None
    s = str(x).strip().lower()
    if not s:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)", s.replace(",", ""))
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_ctc(val: Any) -> Optional[float]:
    x = cell_scalar(val)
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip().lower().replace(",", "")
    if not s:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)\s*lpa", s)
    if m:
        return float(m.group(1)) * 100_000
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def parse_notice_period(val: Any) -> Optional[int]:
    x = cell_scalar(val)
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return int(x)
    s = str(x).strip().lower()
    if not s:
        return None
    if "immediate" in s or s in {"0", "0 days"}:
        return 0
    if "serving" in s:
        return None
    m = re.search(r"(\d+)", s)
    if m:
        return int(m.group(1))
    return None


def experience_from_cell(val: Any) -> List[Dict[str, Any]]:
    x = cell_scalar(val)
    if x is None:
        return []
    raw = str(x).strip()
    if not raw or parse_experience_blob is None:
        return []
    try:
        if raw.startswith("[") or raw.startswith("{"):
            parsed = json.loads(raw)
            if isinstance(parsed, list) and normalize_experience_list:
                return normalize_experience_list([p for p in parsed if isinstance(p, dict)])
    except json.JSONDecodeError:
        pass
    return parse_experience_blob(raw[:50000])


def split_full_name(full_name: str) -> Tuple[str, str]:
    parts = norm_spaces(full_name).split(" ", 1)
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


def fuzzy_ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def auto_map_columns(excel_columns: List[str]) -> Dict[str, Optional[str]]:
    """Map excel column name -> db field (or None if unmapped)."""
    mapping: Dict[str, Optional[str]] = {}
    db_fields = list(COLUMN_SYNONYMS.keys())
    used_db: set[str] = set()

    for col in excel_columns:
        nc = norm_header(col)
        best_field: Optional[str] = None
        best_score = 0.0
        for field, synonyms in COLUMN_SYNONYMS.items():
            if field in used_db:
                continue
            for syn in synonyms:
                score = fuzzy_ratio(nc, syn)
                if nc == syn:
                    score = 1.0
                elif syn in nc or nc in syn:
                    score = max(score, 0.88)
                if score > best_score:
                    best_score = score
                    best_field = field
        if best_field and best_score >= 0.78:
            mapping[col] = best_field
            used_db.add(best_field)
        else:
            mapping[col] = None
    return mapping


def sanitize_cell_value(val: Any) -> Any:
    """Neutralize spreadsheet formula injection in string cells."""
    if val is None:
        return val
    if isinstance(val, str):
        s = val.strip()
        if s.startswith(("=", "+", "-", "@")):
            return f"'{s}"
        return s
    return val


def read_excel_bytes(
    content: bytes,
    filename: str,
    sheet_name: Optional[str] = None,
) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
    """Return sheet_names, columns, raw row dicts (original keys)."""
    import pandas as pd

    ext = (filename or "").lower().rsplit(".", 1)[-1] if "." in (filename or "") else ""
    buf = io.BytesIO(content)
    if ext == "csv":
        df = pd.read_csv(buf)
        sheet_names = ["Sheet1"]
    else:
        xl = pd.ExcelFile(buf, engine="openpyxl")
        sheet_names = xl.sheet_names
        target = sheet_name or sheet_names[0]
        df = xl.parse(target)

    df = df.dropna(how="all")
    columns = [str(c).strip() for c in df.columns if str(c).strip()]
    rows: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        d = {
            str(k): sanitize_cell_value(cell_scalar(row.get(k)))
            for k in df.columns
        }
        if all(v is None for v in d.values()):
            continue
        rows.append(d)
    return sheet_names, columns, rows


def transform_row(
    original_row: Dict[str, Any],
    mapping: Dict[str, str],
    row_number: int,
) -> Dict[str, Any]:
    """Map excel row -> candidate-shaped dict (pre-validation)."""
    mapped: Dict[str, Any] = {}
    for excel_col, db_field in mapping.items():
        if not db_field:
            continue
        mapped[db_field] = original_row.get(excel_col)

    full_name_raw = mapped.get("full_name")
    full_name = norm_spaces(str(full_name_raw)) if cell_scalar(full_name_raw) is not None else ""
    first_name, last_name = split_full_name(full_name) if full_name else ("", "")

    email = mapped.get("email")
    email_s = (
        str(sanitize_cell_value(email)).strip()
        if cell_scalar(email) is not None
        else None
    )

    phone = mapped.get("phone")
    phone_s = (
        str(sanitize_cell_value(phone)).strip()
        if cell_scalar(phone) is not None
        else None
    )

    location = mapped.get("location")
    location_s = str(location).strip() if cell_scalar(location) is not None else None

    headline = mapped.get("headline") or mapped.get("current_company")
    headline_s = str(headline).strip() if cell_scalar(headline) is not None else None
    if mapped.get("current_company") and not mapped.get("headline"):
        cc = str(mapped.get("current_company")).strip()
        if cc and headline_s == cc:
            pass  # use as headline

    tex = parse_experience_years(mapped.get("total_experience_years"))
    snames = split_skills(mapped.get("skills"))
    experience = experience_from_cell(mapped.get("experience"))

    education: List[Dict[str, Any]] = []
    educ = mapped.get("education")
    if cell_scalar(educ) is not None and parse_education_cell:
        education_cell = str(educ).strip() or None
        if education_cell:
            education = parse_education_cell(education_cell)

    summary = mapped.get("resume_text") or mapped.get("remarks")
    summary_s = str(summary).strip() if cell_scalar(summary) is not None else None

    resume_text = summary_s
    if compose_resume_text:
        resume_text = compose_resume_text(
            resume_text=summary_s,
            headline=headline_s,
            location=location_s,
            total_experience_years=tex,
            skills=skills_to_objects(snames),
            experience=experience,
            education=education,
            education_cell=str(educ).strip() if cell_scalar(educ) is not None else None,
        )

    source_val = mapped.get("source")
    source_display = str(source_val).strip() if cell_scalar(source_val) is not None else None

    out: Dict[str, Any] = {
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "email": email_s,
        "phone": phone_s,
        "location": location_s,
        "preferred_location": (
            str(mapped.get("preferred_location")).strip()
            if cell_scalar(mapped.get("preferred_location")) is not None
            else None
        ),
        "headline": headline_s,
        "total_experience_years": tex,
        "current_ctc": parse_ctc(mapped.get("current_ctc")),
        "expected_ctc": parse_ctc(mapped.get("expected_ctc")),
        "notice_period_days": parse_notice_period(mapped.get("notice_period_days")),
        "skills": skills_to_objects(snames),
        "experience": experience,
        "education": education,
        "resume_text": resume_text,
        "source": normalize_import_source(source_display),
        "_source_raw": source_display,
        "job_id": str(mapped.get("job_id")).strip() if cell_scalar(mapped.get("job_id")) is not None else None,
        "job_code": str(mapped.get("job_code")).strip() if cell_scalar(mapped.get("job_code")) is not None else None,
        "recruiter_id": (
            str(mapped.get("recruiter_id")).strip()
            if cell_scalar(mapped.get("recruiter_id")) is not None
            else None
        ),
        "recruiter_email": (
            str(mapped.get("recruiter_email")).strip()
            if cell_scalar(mapped.get("recruiter_email")) is not None
            else None
        ),
        "recruiter_name": (
            str(mapped.get("recruiter_name")).strip()
            if cell_scalar(mapped.get("recruiter_name")) is not None
            else None
        ),
        "linkedin_url": (
            str(mapped.get("linkedin_url")).strip()
            if cell_scalar(mapped.get("linkedin_url")) is not None
            else None
        ),
        "import_row_index": row_number,
    }
    return out


_SOURCE_LABEL_ALIASES: Dict[str, str] = {
    "excel upload": "EXCEL_IMPORT",
    "excel": "EXCEL_IMPORT",
    "excel_import": "EXCEL_IMPORT",
    "direct upload": "DIRECT_UPLOAD",
    "linkedin": "LINKEDIN",
    "naukri": "NAUKRI",
    "indeed": "INDEED",
    "referral": "REFERRAL",
    "talent pool": "TALENT_POOL",
    "other": "OTHER",
}


def normalize_import_source(raw: Optional[str]) -> str:
    """Map Excel source labels to canonical candidate source codes."""
    if not raw or not str(raw).strip():
        return SOURCE_EXCEL_UPLOAD
    text = str(raw).strip()
    canonical = text.upper().replace(" ", "_").replace("-", "_")
    allowed = set(ALLOWED_CANDIDATE_SOURCES) if ALLOWED_CANDIDATE_SOURCES else set()
    if canonical in allowed:
        return canonical
    alias = _SOURCE_LABEL_ALIASES.get(text.lower())
    if alias:
        return alias
    return SOURCE_EXCEL_UPLOAD


def source_import_warning(raw: Optional[str]) -> Optional[str]:
    """Return a warning message when Excel source is not a recognized allowed value."""
    if not raw or not str(raw).strip():
        return None
    text = str(raw).strip()
    canonical = text.upper().replace(" ", "_").replace("-", "_")
    allowed = set(ALLOWED_CANDIDATE_SOURCES) if ALLOWED_CANDIDATE_SOURCES else set()
    if canonical in allowed or text.lower() in _SOURCE_LABEL_ALIASES:
        return None
    return f"Unknown source '{text}'; stored as EXCEL_IMPORT"


class InFileDuplicateTracker:
    """Detect duplicate identity keys within a single upload file."""

    def __init__(self) -> None:
        self._email: Dict[str, int] = {}
        self._phone: Dict[str, int] = {}
        self._linkedin: Dict[str, int] = {}
        self._name_email: Dict[str, int] = {}
        self._name_phone: Dict[str, int] = {}

    def check(self, candidate: Dict[str, Any]) -> Tuple[Optional[str], Optional[int]]:
        email_lc = norm_email(candidate.get("email"))
        if email_lc and email_lc in self._email:
            return "in_file_email", self._email[email_lc]
        phone_lc = norm_phone_digits(candidate.get("phone"))
        if phone_lc and phone_lc in self._phone:
            return "in_file_phone", self._phone[phone_lc]
        linkedin_lc = norm_linkedin_url(candidate.get("linkedin_url"))
        if linkedin_lc and linkedin_lc in self._linkedin:
            return "in_file_linkedin", self._linkedin[linkedin_lc]
        name_email_key = composite_name_email_key(candidate.get("full_name"), candidate.get("email"))
        if name_email_key and name_email_key in self._name_email:
            return "in_file_full_name+email", self._name_email[name_email_key]
        name_phone_key = composite_name_phone_key(candidate.get("full_name"), candidate.get("phone"))
        if name_phone_key and name_phone_key in self._name_phone:
            return "in_file_full_name+phone", self._name_phone[name_phone_key]
        return None, None

    def register(self, row_number: int, candidate: Dict[str, Any]) -> None:
        email_lc = norm_email(candidate.get("email"))
        if email_lc:
            self._email[email_lc] = row_number
        phone_lc = norm_phone_digits(candidate.get("phone"))
        if phone_lc:
            self._phone[phone_lc] = row_number
        linkedin_lc = norm_linkedin_url(candidate.get("linkedin_url"))
        if linkedin_lc:
            self._linkedin[linkedin_lc] = row_number
        name_email_key = composite_name_email_key(candidate.get("full_name"), candidate.get("email"))
        if name_email_key:
            self._name_email[name_email_key] = row_number
        name_phone_key = composite_name_phone_key(candidate.get("full_name"), candidate.get("phone"))
        if name_phone_key:
            self._name_phone[name_phone_key] = row_number


def validate_candidate_row(
    candidate: Dict[str, Any],
    *,
    known_job_ids: set[str],
    known_job_codes: Dict[str, str],
    known_recruiter_ids: set[str],
    known_recruiter_emails: Dict[str, str],
    known_recruiter_names: Optional[Dict[str, str]] = None,
    ambiguous_recruiter_names: Optional[set[str]] = None,
    duplicate_by_email: Dict[str, str],
    duplicate_by_phone: Dict[str, str],
    duplicate_by_linkedin: Optional[Dict[str, str]] = None,
    duplicate_by_name_email: Optional[Dict[str, str]] = None,
    duplicate_by_name_phone: Optional[Dict[str, str]] = None,
    duplicate_by_stable_id: Optional[Dict[str, str]] = None,
) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Returns (status, errors, warnings).
    status: VALID | INVALID | DUPLICATE
    """
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []

    def _append_error(field: str, error: str, original_value: Any) -> None:
        errors.append(
            {
                "field": field,
                "error": error,
                "error_type": classify_error_type(field, error),
                "original_value": original_value,
                "suggested_correction": suggest_correction(field, error, original_value),
            }
        )

    full_name = candidate.get("full_name") or ""
    if not norm_spaces(full_name):
        _append_error("full_name", "Candidate name is required", full_name)

    email = candidate.get("email")
    phone = candidate.get("phone")
    if not email and not phone:
        _append_error("email", "Email or phone is required", None)

    if email and not EMAIL_RE.match(str(email).strip()):
        _append_error("email", "Invalid email format", email)

    if phone:
        digits = norm_phone_digits(str(phone))
        if not digits or len(digits) < 10:
            _append_error("phone", "Invalid phone number (need at least 10 digits)", phone)

    tex = candidate.get("total_experience_years")
    if tex is not None and not isinstance(tex, (int, float)):
        _append_error("total_experience_years", "Experience must be numeric", tex)

    job_id = candidate.get("job_id")
    job_code = candidate.get("job_code")
    resolved_job_id: Optional[str] = None
    if job_id:
        if job_id not in known_job_ids:
            _append_error("job_id", "Unknown job ID", job_id)
        else:
            resolved_job_id = job_id
    elif job_code:
        resolved_job_id = known_job_codes.get(job_code.lower())
        if not resolved_job_id:
            _append_error("job_code", "Unknown job code", job_code)
        else:
            candidate["job_id"] = resolved_job_id

    rec_id = candidate.get("recruiter_id")
    rec_email = norm_email(candidate.get("recruiter_email"))
    rec_name_lc = norm_full_name_lc(candidate.get("recruiter_name"))
    if rec_id and rec_id not in known_recruiter_ids:
        _append_error("recruiter_id", "Unknown recruiter user ID", rec_id)
    elif rec_email:
        rid = known_recruiter_emails.get(rec_email)
        if not rid:
            warnings.append(
                {
                    "field": "recruiter_email",
                    "warning": "Recruiter email not found; import will proceed without recruiter",
                    "original_value": rec_email,
                }
            )
        else:
            candidate["recruiter_id"] = rid
    elif rec_name_lc:
        if ambiguous_recruiter_names and rec_name_lc in ambiguous_recruiter_names:
            warnings.append(
                {
                    "field": "recruiter_name",
                    "warning": "Multiple users match this recruiter name; use Recruiter Email or User ID",
                    "original_value": candidate.get("recruiter_name"),
                }
            )
        else:
            rid = (known_recruiter_names or {}).get(rec_name_lc)
            if not rid:
                warnings.append(
                    {
                        "field": "recruiter_name",
                        "warning": "Recruiter name not found; import will proceed without recruiter",
                        "original_value": candidate.get("recruiter_name"),
                    }
                )
            else:
                candidate["recruiter_id"] = rid

    dup_id: Optional[str] = None
    dup_reason: Optional[str] = None
    email_lc = norm_email(email)
    phone_lc = norm_phone_digits(phone)
    linkedin_lc = norm_linkedin_url(candidate.get("linkedin_url"))
    name_email_key = composite_name_email_key(full_name, email)
    name_phone_key = composite_name_phone_key(full_name, phone)
    stable_id = candidate.get("import_stable_id")

    if stable_id and duplicate_by_stable_id and stable_id in duplicate_by_stable_id:
        dup_id = duplicate_by_stable_id[stable_id]
        dup_reason = "import_stable_id"
    elif email_lc and email_lc in duplicate_by_email:
        dup_id = duplicate_by_email[email_lc]
        dup_reason = "email"
    elif phone_lc and phone_lc in duplicate_by_phone:
        dup_id = duplicate_by_phone[phone_lc]
        dup_reason = "phone"
    elif linkedin_lc and duplicate_by_linkedin and linkedin_lc in duplicate_by_linkedin:
        dup_id = duplicate_by_linkedin[linkedin_lc]
        dup_reason = "linkedin_url"
    elif name_email_key and duplicate_by_name_email and name_email_key in duplicate_by_name_email:
        dup_id = duplicate_by_name_email[name_email_key]
        dup_reason = "full_name+email"
    elif name_phone_key and duplicate_by_name_phone and name_phone_key in duplicate_by_name_phone:
        dup_id = duplicate_by_name_phone[name_phone_key]
        dup_reason = "full_name+phone"

    if dup_id:
        candidate["duplicate_candidate_id"] = dup_id
        candidate["duplicate_match_reason"] = dup_reason
        if errors:
            return "INVALID", errors, warnings
        return "DUPLICATE", errors, warnings

    if errors:
        return "INVALID", errors, warnings
    return "VALID", errors, warnings


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_batch_id() -> str:
    """Fallback batch id when DB sequence is unavailable (tests)."""
    day = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:4].upper()
    return f"IMP-{day}-{suffix}"


def format_sequential_batch_id(day: str, sequence: int) -> str:
    return f"IMP-{day}-{max(1, int(sequence)):04d}"


def suggest_required_field_for_column(excel_column: str) -> Optional[str]:
    """Return a required DB field if the Excel header looks like a known synonym."""
    header = norm_header(excel_column)
    if not header:
        return None
    priority = ("full_name", "email", "phone")
    for field in priority:
        synonyms = COLUMN_SYNONYMS.get(field, ())
        if header == field.replace("_", " ") or header in synonyms:
            return field
        for syn in synonyms:
            if syn in header or header in syn:
                return field
    return None


def compute_import_stable_id(
    *,
    file_name: str,
    file_digest: str,
    row_number: int,
    email: Optional[str],
    full_name: Optional[str],
) -> str:
    """Stable row id for idempotent re-import (aligned with CLI excel import script)."""
    row_index = max(0, int(row_number) - 2)
    key_bits = f"{norm_email(email) or ''}|{norm_spaces(full_name or '')}"
    return str(
        uuid.uuid5(
            uuid.NAMESPACE_DNS,
            f"aai-hrms.excel-import-api::{file_name}::{file_digest}::{row_index}::{key_bits[:200]}",
        )
    )


def compute_pin_rank(row_number: int) -> int:
    """Higher pin_rank sorts first in candidate list (spreadsheet row 2 = highest)."""
    from talent_acquisition.candidate_import.constants import PIN_BASE

    return PIN_BASE - max(0, int(row_number) - 2)
