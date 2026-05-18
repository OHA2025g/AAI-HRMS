"""M7 Cost Optimization & Automation."""

from m7_automation.constants import COL_HR_COPILOT_AUDIT, COL_MANUAL_WORKFLOW_BASELINES, COL_WORKFLOW_RULES, COL_WORKFLOW_RUNS
from m7_automation.copilot_hf import resolve_copilot_intent_async
from m7_automation.copilot_intent import detect_intent, extract_employee_code_hint, help_text, permission_for_intent
from m7_automation.retry import run_with_retries
from m7_automation.savings import baseline_map, compute_savings_totals
from m7_automation.workflow_triggers import should_execute_trigger

__all__ = [
    "COL_WORKFLOW_RULES",
    "COL_WORKFLOW_RUNS",
    "COL_HR_COPILOT_AUDIT",
    "COL_MANUAL_WORKFLOW_BASELINES",
    "run_with_retries",
    "should_execute_trigger",
    "resolve_copilot_intent_async",
    "detect_intent",
    "extract_employee_code_hint",
    "permission_for_intent",
    "help_text",
    "baseline_map",
    "compute_savings_totals",
]
