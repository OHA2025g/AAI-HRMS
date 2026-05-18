"""Mongo collection names and /records/{segment} mapping for M17 (Employee Satisfaction & Engagement)."""

# —— Core / shared
COL_DASHBOARD_SNAPSHOTS = "m17_ese_engagement_dashboard_snapshots"
COL_ACTIVITY_LOGS = "m17_ese_activity_logs"
COL_GRIEVANCE_VISIBILITY = "m17_ese_grievance_concern_visibility"

# —— Records referenced by service.py
COL_ACTION_PLANS = "m17_ese_action_plans"
COL_AI_SENTIMENT = "m17_ese_ai_sentiment_intelligence"
COL_EXECUTIVE_SUMMARY = "m17_ese_executive_experience_summary"
COL_FEEDBACK = "m17_ese_employee_feedback"
COL_GOVERNANCE = "m17_ese_governance_approvals"
COL_PULSE_CAMPAIGNS = "m17_ese_pulse_survey_campaigns"
COL_SCENARIOS = "m17_ese_experience_scenario_models"
COL_SENTIMENT = "m17_ese_sentiment_analysis"

# —— Seeded & list surfaces (align with frontend routeTable.js segment keys)
COL_AI_RECOMMENDATIONS = "m17_ese_ai_engagement_recommendations"
COL_ANALYTICS_SNAPSHOTS = "m17_ese_engagement_analytics_snapshots"
COL_ATTRITION_LINKED = "m17_ese_attrition_engagement_risk"
COL_BURNOUT_RISK = "m17_ese_burnout_risk"
COL_COMM_CAMPAIGNS = "m17_ese_communication_campaigns"
COL_COMMUNITY = "m17_ese_community_participation"
COL_CULTURE_PROGRAMS = "m17_ese_culture_programs"
COL_DECLINE_PRED = "m17_ese_engagement_decline_predictions"
COL_DRIVER_ANALYSIS = "m17_ese_engagement_driver_analysis"
COL_EXPERIENCE = "m17_ese_employee_experience_monitoring"
COL_EXP_GAP = "m17_ese_experience_gap_opportunities"
COL_FORECASTS = "m17_ese_experience_forecasts"
COL_INCLUSION = "m17_ese_inclusion_belonging"
COL_MANAGER_CONNECT = "m17_ese_manager_connect"
COL_MANAGER_EFFECTIVENESS = "m17_ese_manager_effectiveness"
COL_MANAGER_INTERVENTIONS = "m17_ese_manager_interventions"
COL_RECOGNITION_PROGRAMS = "m17_ese_recognition_programs"
COL_RECOGNITION_VISIBILITY = "m17_ese_recognition_visibility"
COL_SELF_SERVICE_EXP = "m17_ese_self_service_experience"
COL_STRATEGIC_INTEL = "m17_ese_strategic_experience_intelligence"
COL_TEAM_CLIMATE = "m17_ese_team_climate"
COL_WELLBEING = "m17_ese_wellbeing_worklife"
COL_WELLBEING_PROGRAMS = "m17_ese_wellbeing_programs"
COL_WORKLOAD_FLEX = "m17_ese_workload_flexibility"
COL_COMM_TRANSPARENCY = "m17_ese_communication_transparency"
COL_CAREER_GROWTH = "m17_ese_career_growth_experience"
COL_EXPERIENCE_RECOVERY = "m17_ese_experience_recovery"
COL_HELPDESK_SERVICE = "m17_ese_helpdesk_service_experience"

# Keystones used by tests
# - test_m17_ese_schemas: "pulse-surveys", "executive-decision-support"
LIST_SEGMENT_COLLECTION = {
    "pulse-surveys": COL_PULSE_CAMPAIGNS,
    "feedback": COL_FEEDBACK,
    "sentiment": COL_SENTIMENT,
    "experience-monitoring": COL_EXPERIENCE,
    "team-climate": COL_TEAM_CLIMATE,
    "recognition-visibility": COL_RECOGNITION_VISIBILITY,
    "manager-connect": COL_MANAGER_CONNECT,
    "wellbeing-worklife": COL_WELLBEING,
    "communication-transparency": COL_COMM_TRANSPARENCY,
    "inclusion-belonging": COL_INCLUSION,
    "action-planning": COL_ACTION_PLANS,
    "manager-interventions": COL_MANAGER_INTERVENTIONS,
    "recognition-programs": COL_RECOGNITION_PROGRAMS,
    "communication-campaigns": COL_COMM_CAMPAIGNS,
    "culture-programs": COL_CULTURE_PROGRAMS,
    "wellbeing-programs": COL_WELLBEING_PROGRAMS,
    "self-service-experience": COL_SELF_SERVICE_EXP,
    "career-growth-experience": COL_CAREER_GROWTH,
    "workload-flexibility": COL_WORKLOAD_FLEX,
    "manager-effectiveness": COL_MANAGER_EFFECTIVENESS,
    "community-participation": COL_COMMUNITY,
    "experience-recovery": COL_EXPERIENCE_RECOVERY,
    "helpdesk-service-experience": COL_HELPDESK_SERVICE,
    "governance-approvals": COL_GOVERNANCE,
    "analytics": COL_ANALYTICS_SNAPSHOTS,
    "driver-analysis": COL_DRIVER_ANALYSIS,
    "engagement-decline": COL_DECLINE_PRED,
    "experience-gap-opportunities": COL_EXP_GAP,
    "ai-sentiment-intelligence": COL_AI_SENTIMENT,
    "scenario-modeling": COL_SCENARIOS,
    "strategic-experience-intelligence": COL_STRATEGIC_INTEL,
    "executive-decision-support": COL_EXECUTIVE_SUMMARY,
}
