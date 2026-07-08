"""Smart Hiring — assessment collections and enums."""

COL_ASSESSMENTS = "assessments"
COL_ASSESSMENT_SUBMISSIONS = "assessment_submissions"

ASSESSMENT_TYPES = frozenset({"SCREENING", "CORE_SKILL", "WORK_SIMULATION", "BEHAVIORAL"})

HIRING_LOGIN_ROLES = frozenset(
    {
        "admin",
        "recruiter",
        "hr_admin",
        "hr_viewer",
        "hiring_manager",
        "technical_manager",
        "project_manager",
    }
)
ASSESSMENT_STATUSES = frozenset({"DRAFT", "ACTIVE", "ARCHIVED"})

SUBMISSION_STATUSES = frozenset(
    {"INVITED", "IN_PROGRESS", "SUBMITTED", "SCORED", "EXPIRED", "CANCELLED"}
)

DEFAULT_PASS_THRESHOLD = 70

# Questions generated per assessment type (SCREENING, CORE_SKILL, etc.)
ASSESSMENT_QUESTIONS_PER_TYPE = 25
