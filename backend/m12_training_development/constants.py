"""Mongo collection names for Training & Development (M12)."""

COL_TRAINING_PROGRAMS = "td_training_programs"
COL_TRAINING_BATCHES = "td_training_batches"
COL_TRAINING_SESSIONS = "td_training_sessions"
COL_TRAINING_ENROLLMENTS = "td_training_enrollments"
COL_TRAINING_ATTENDANCE = "td_training_attendance"
COL_CATALOG_ITEMS = "td_catalog_items"
COL_EXTENDED_RECORDS = "td_extended_records"
COL_APPROVAL_REQUESTS = "td_training_approval_requests"
COL_ASSESSMENTS = "td_training_assessments"
COL_ASSESSMENT_RESULTS = "td_training_assessment_results"

RECORD_TYPES = frozenset(
    {
        "training_need",
        "competency_gap",
        "idp",
        "role_learning_path",
        "skill_learning_path",
        "leadership_program",
        "upskilling",
        "upskilling_program",
        "behavioral",
        "onboarding",
        "ojt",
        "knowledge_transfer",
        "career_linked",
        "performance_linked",
        "project_demand_linked",
        "succession",
        "effectiveness",
        "feedback",
        "post_training_impact",
        "compliance_audit",
        "forecast",
        "ai_learning_recommendation",
        "ai_skill_gap_prediction",
        "learning_search_log",
        "strategic_capability",
        "trainer_profile",
        "vendor_profile",
        "budget_line",
        "document_meta",
        "policy_rule",
        "learning_search",
        "strategic_capability_intelligence",
        "governance_control",
        "nomination",
        "calendar_event",
        "delivery_session",
        "assessment",
        "pre_post_assessment",
        "certification_record",
        "compliance_assignment",
    }
)
