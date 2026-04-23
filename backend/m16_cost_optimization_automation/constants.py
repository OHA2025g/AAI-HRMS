"""Mongo collection names for Cost Optimization & Automation."""

# Section 1 — visibility
COL_COST_DASHBOARD_SNAPSHOTS = "coa_cost_dashboard_snapshots"
COL_WORKFORCE_COST_RECORDS = "coa_workforce_cost_records"
COL_HR_OPERATIONS_COST_RECORDS = "coa_hr_operations_cost_records"
COL_BUDGET_SPEND_RECORDS = "coa_budget_spend_records"
COL_VENDOR_COST_RECORDS = "coa_vendor_cost_records"
COL_PROCESS_COST_RECORDS = "coa_process_cost_records"
COL_MANUAL_EFFORT_RECORDS = "coa_manual_effort_records"
COL_PRODUCTIVITY_EFFICIENCY_RECORDS = "coa_productivity_efficiency_records"
COL_COMPLIANCE_PENALTY_COST_RECORDS = "coa_compliance_penalty_cost_records"
COL_TOOL_COST_VISIBILITY_RECORDS = "coa_tool_cost_visibility_records"
COL_POLICY_EXCEPTION_LEAKAGE_RECORDS = "coa_policy_exception_leakage_records"
COL_COST_BENCHMARK_RECORDS = "coa_cost_benchmark_records"

# Section 2 — automation
COL_AUTOMATION_OPPORTUNITY_RECORDS = "coa_automation_opportunity_records"
COL_AUTOMATION_WORKFLOW_CONFIGS = "coa_automation_workflow_configs"
COL_AUTOMATION_RULE_CONFIGS = "coa_automation_rule_configs"
COL_AUTOMATION_EXECUTION_LOGS = "coa_automation_execution_logs"
COL_SELF_SERVICE_OPTIMIZATION_RECORDS = "coa_self_service_optimization_records"
COL_RECRUITMENT_AUTOMATION_RECORDS = "coa_recruitment_automation_records"
COL_LIFECYCLE_AUTOMATION_RECORDS = "coa_lifecycle_automation_records"
COL_PAYROLL_AUTOMATION_RECORDS = "coa_payroll_automation_records"
COL_TRAINING_AUTOMATION_RECORDS = "coa_training_automation_records"
COL_SUPPORT_AUTOMATION_RECORDS = "coa_support_automation_records"
COL_COMPLIANCE_AUTOMATION_RECORDS = "coa_compliance_automation_records"
COL_ALLOCATION_AUTOMATION_RECORDS = "coa_allocation_automation_records"
COL_PERFORMANCE_ENGAGEMENT_AUTOMATION_RECORDS = "coa_performance_engagement_automation_records"
COL_PROCESS_REENGINEERING_RECORDS = "coa_process_reengineering_records"
COL_AUTOMATION_ROI_RECORDS = "coa_automation_roi_records"
COL_AUTOMATION_GOVERNANCE_RECORDS = "coa_automation_governance_records"

# Section 3 — predictive / AI
COL_COST_FORECAST_RECORDS = "coa_cost_forecast_records"
COL_COST_DRIVER_ANALYSIS_RECORDS = "coa_cost_driver_analysis_records"
COL_SAVINGS_OPPORTUNITY_RECORDS = "coa_savings_opportunity_records"
COL_AI_COST_RECOMMENDATION_RECORDS = "coa_ai_cost_recommendation_records"
COL_AI_PRODUCTIVITY_RECOMMENDATION_RECORDS = "coa_ai_productivity_recommendation_records"
COL_COST_OVERRUN_PREDICTION_RECORDS = "coa_cost_overrun_prediction_records"
COL_EFFICIENCY_RISK_PREDICTION_RECORDS = "coa_efficiency_risk_prediction_records"
COL_COPILOT_QUERY_LOGS = "coa_copilot_query_logs"
COL_COST_SCENARIO_MODELS = "coa_cost_scenario_models"
COL_STRATEGIC_COST_INTELLIGENCE_SNAPSHOTS = "coa_strategic_cost_intelligence_snapshots"
COL_EXECUTIVE_COST_SUMMARY_SNAPSHOTS = "coa_executive_cost_summary_snapshots"
COL_CONTINUOUS_IMPROVEMENT_RECORDS = "coa_continuous_improvement_records"

COL_ACTIVITY_LOGS = "coa_cost_optimization_activity_logs"
COL_POLICY_RULES = "coa_cost_optimization_policy_rules"

# URL segment -> collection for list endpoints
LIST_SEGMENT_COLLECTION = {
    "workforce-cost": COL_WORKFORCE_COST_RECORDS,
    "hr-operations-cost": COL_HR_OPERATIONS_COST_RECORDS,
    "budget-spend-control": COL_BUDGET_SPEND_RECORDS,
    "vendor-cost": COL_VENDOR_COST_RECORDS,
    "process-cost-mapping": COL_PROCESS_COST_RECORDS,
    "manual-effort-overhead": COL_MANUAL_EFFORT_RECORDS,
    "productivity-efficiency": COL_PRODUCTIVITY_EFFICIENCY_RECORDS,
    "compliance-penalty-cost": COL_COMPLIANCE_PENALTY_COST_RECORDS,
    "tool-cost-visibility": COL_TOOL_COST_VISIBILITY_RECORDS,
    "policy-exception-leakage": COL_POLICY_EXCEPTION_LEAKAGE_RECORDS,
    "cost-benchmarking": COL_COST_BENCHMARK_RECORDS,
    "process-automation": COL_AUTOMATION_OPPORTUNITY_RECORDS,
    "hr-workflow-automation": COL_AUTOMATION_RULE_CONFIGS,
    "self-service-optimization": COL_SELF_SERVICE_OPTIMIZATION_RECORDS,
    "recruitment-automation": COL_RECRUITMENT_AUTOMATION_RECORDS,
    "onboarding-lifecycle-automation": COL_LIFECYCLE_AUTOMATION_RECORDS,
    "payroll-benefits-automation": COL_PAYROLL_AUTOMATION_RECORDS,
    "training-automation": COL_TRAINING_AUTOMATION_RECORDS,
    "helpdesk-query-automation": COL_SUPPORT_AUTOMATION_RECORDS,
    "document-compliance-automation": COL_COMPLIANCE_AUTOMATION_RECORDS,
    "resource-allocation-automation": COL_ALLOCATION_AUTOMATION_RECORDS,
    "performance-engagement-automation": COL_PERFORMANCE_ENGAGEMENT_AUTOMATION_RECORDS,
    "process-reengineering": COL_PROCESS_REENGINEERING_RECORDS,
    "automation-roi-savings": COL_AUTOMATION_ROI_RECORDS,
    "automation-governance": COL_AUTOMATION_GOVERNANCE_RECORDS,
    "cost-forecasting": COL_COST_FORECAST_RECORDS,
    "cost-driver-analysis": COL_COST_DRIVER_ANALYSIS_RECORDS,
    "savings-opportunities": COL_SAVINGS_OPPORTUNITY_RECORDS,
    "ai-cost-recommendations": COL_AI_COST_RECOMMENDATION_RECORDS,
    "ai-productivity-recommendations": COL_AI_PRODUCTIVITY_RECOMMENDATION_RECORDS,
    "cost-overrun-risk": COL_COST_OVERRUN_PREDICTION_RECORDS,
    "efficiency-risk": COL_EFFICIENCY_RISK_PREDICTION_RECORDS,
    "scenario-modeling": COL_COST_SCENARIO_MODELS,
    "strategic-cost-intelligence": COL_STRATEGIC_COST_INTELLIGENCE_SNAPSHOTS,
    "executive-decision-support": COL_EXECUTIVE_COST_SUMMARY_SNAPSHOTS,
    "continuous-improvement": COL_CONTINUOUS_IMPROVEMENT_RECORDS,
}

ALL_INDEXED_COLLECTIONS = sorted(
    set(LIST_SEGMENT_COLLECTION.values())
    | {
        COL_COST_DASHBOARD_SNAPSHOTS,
        COL_COPILOT_QUERY_LOGS,
        COL_ACTIVITY_LOGS,
        COL_POLICY_RULES,
    }
)
