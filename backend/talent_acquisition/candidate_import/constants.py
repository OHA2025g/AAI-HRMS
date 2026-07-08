"""Constants for candidate Excel import ETL."""

from __future__ import annotations

BATCHES_COLLECTION = "candidate_import_batches"
STAGING_COLLECTION = "candidate_import_staging"
AUDIT_COLLECTION = "candidate_import_audit"
GLOBAL_AUDIT_COLLECTION = "import_audit_logs"
IMPORT_AUDIT_MODULE = "candidate_excel_import"

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_ROWS = 5000
PREVIEW_LIMIT = 50

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}
SOURCE_EXCEL_UPLOAD = "EXCEL_IMPORT"
SEED_MARKER = "excel_import_api_v1"
PIN_BASE = 1_000_000

BATCH_STATUSES = frozenset(
    {"UPLOADED", "MAPPED", "VALIDATED", "COMPLETED", "FAILED", "PARTIAL"}
)
DUPLICATE_STRATEGIES = frozenset({"skip", "update", "merge", "create_new"})

# Purge uploaded workbook from MongoDB after commit (keeps metadata + staging for reports).
PURGE_FILE_CONTENT_AFTER_COMMIT = True

# Retention: drop staging rows for committed batches older than this many days.
STAGING_RETENTION_DAYS = 90
# Purge abandoned upload binaries (never committed) after this many days.
ABANDONED_BATCH_FILE_RETENTION_DAYS = 7

# Batch size for indexed duplicate lookups during validate-preview.
DUP_LOOKUP_IN_CHUNK = 500
DUP_LOOKUP_OR_CHUNK = 100

# Default pipeline stage when a job-linked application is created on import.
DEFAULT_APPLICATION_STAGE = "SOURCED"
DEFAULT_CANDIDATE_IMPORT_STAGE = "IMPORTED"

# Allowed values for template reference sheet
ALLOWED_CANDIDATE_SOURCES = (
    "EXCEL_IMPORT",
    "DIRECT_UPLOAD",
    "LINKEDIN",
    "NAUKRI",
    "INDEED",
    "REFERRAL",
    "TALENT_POOL",
    "OTHER",
)

ALLOWED_PIPELINE_STAGES = (
    "SOURCED",
    "SCREENING",
    "ASSESSMENT_SENT",
    "ASSESSMENT_CLEARED",
    "INTERVIEW_1",
    "INTERVIEW_2",
    "INTERVIEW_3",
    "HR_ROUND",
    "OFFER",
    "JOINED",
)

# DB fields exposed for mapping / template (aligned with CandidateCreate + import script extras)
CANDIDATE_IMPORT_FIELDS = [
    {"field": "full_name", "label": "Full Name", "required": True, "type": "string"},
    {"field": "email", "label": "Email", "required": False, "type": "string"},
    {"field": "phone", "label": "Phone", "required": False, "type": "string"},
    {"field": "location", "label": "Location", "required": False, "type": "string"},
    {"field": "headline", "label": "Headline / Designation", "required": False, "type": "string"},
    {"field": "total_experience_years", "label": "Total Experience (years)", "required": False, "type": "number"},
    {"field": "skills", "label": "Skills", "required": False, "type": "array"},
    {"field": "experience", "label": "Experience (text/JSON)", "required": False, "type": "array"},
    {"field": "education", "label": "Education", "required": False, "type": "array"},
    {"field": "resume_text", "label": "Summary / Resume Text", "required": False, "type": "string"},
    {"field": "source", "label": "Source", "required": False, "type": "string"},
    {"field": "job_id", "label": "Job ID", "required": False, "type": "string"},
    {"field": "job_code", "label": "Job Code / Requisition ID", "required": False, "type": "string"},
    {"field": "recruiter_id", "label": "Recruiter User ID", "required": False, "type": "string"},
    {"field": "recruiter_email", "label": "Recruiter Email", "required": False, "type": "string"},
    {"field": "recruiter_name", "label": "Recruiter Name", "required": False, "type": "string"},
    {"field": "current_company", "label": "Current Company", "required": False, "type": "string"},
    {"field": "current_ctc", "label": "Current CTC", "required": False, "type": "number"},
    {"field": "expected_ctc", "label": "Expected CTC", "required": False, "type": "number"},
    {"field": "notice_period_days", "label": "Notice Period (days)", "required": False, "type": "number"},
    {"field": "preferred_location", "label": "Preferred Location", "required": False, "type": "string"},
    {"field": "remarks", "label": "Remarks", "required": False, "type": "string"},
    {"field": "linkedin_url", "label": "LinkedIn URL", "required": False, "type": "string"},
]

REQUIRED_ANY_OF = [("full_name",)]  # full_name mandatory; email OR phone recommended

# Synonyms for auto-mapping (normalized lowercase keys)
COLUMN_SYNONYMS: dict[str, tuple[str, ...]] = {
    "full_name": ("name", "candidate name", "full name", "applicant name", "employee name"),
    "email": ("email", "email id", "mail", "e-mail", "email address"),
    "phone": ("mobile", "phone", "contact", "contact number", "mobile number", "phone number"),
    "skills": ("skills", "skill set", "primary skills", "technical skills", "competencies"),
    "headline": ("designation", "current role", "job title", "position", "title", "current title"),
    "total_experience_years": (
        "experience",
        "total experience",
        "exp",
        "years of experience",
        "yoe",
        "total exp",
    ),
    "location": ("location", "current location", "city", "address"),
    "preferred_location": ("preferred location", "preferred city", "relocation"),
    "current_company": ("company", "current company", "organization", "employer"),
    "current_ctc": ("current ctc", "ctc", "current salary", "present ctc"),
    "expected_ctc": ("expected ctc", "expected salary", "salary expectation", "ectc"),
    "notice_period_days": ("notice", "notice period", "np", "notice period days"),
    "source": ("source", "candidate source", "channel"),
    "job_id": ("job id", "requirement id", "position id"),
    "job_code": ("job code", "requisition id", "req id", "job ref"),
    "recruiter_id": ("recruiter id", "assigned recruiter id"),
    "recruiter_email": ("recruiter email", "assigned recruiter email"),
    "recruiter_name": ("recruiter", "recruiter name", "assigned recruiter", "hiring manager"),
    "experience": ("work experience", "employment history", "experience details"),
    "education": ("education", "qualification", "degrees"),
    "resume_text": ("summary", "bio", "profile", "resume text"),
    "remarks": ("remarks", "notes", "comments"),
    "linkedin_url": ("linkedin", "linkedin url", "linkedin profile", "profile url"),
}

# Error types for validation summary aggregation
ERROR_TYPES = frozenset(
    {
        "missing_mandatory",
        "invalid_email",
        "invalid_phone",
        "unknown_job_id",
        "unknown_job_code",
        "unknown_recruiter",
    }
)

IMPORT_ALLOWED_ROLES = frozenset({"admin", "hr_admin", "recruiter"})
