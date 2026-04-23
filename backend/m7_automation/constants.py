"""M7 Cost Optimization & Automation — collection names."""

COL_WORKFLOW_RULES = "workflow_automation_rules"
COL_WORKFLOW_RUNS = "workflow_automation_runs"
COL_HR_COPILOT_AUDIT = "hr_copilot_conversation_audit"
COL_MANUAL_WORKFLOW_BASELINES = "manual_workflow_baselines"

# Version tags for audit / compatibility
WORKFLOW_ENGINE_VERSION = "m7-v3-flow-webhook"
COPILOT_ENGINE_VERSION = "m7-v2-hf"

# HR Copilot — Hugging Face Inference API (zero-shot NLI); override via env HR_COPILOT_HF_MODEL
HR_COPILOT_HF_DEFAULT_MODEL = "typeform/distilbert-base-uncased-mnli"
