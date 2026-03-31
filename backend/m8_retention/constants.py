"""M8 Mongo collection names and model version tag."""

ATTRITION_MODEL_VERSION = "m8-attrition-v1-linear"

COL_ATTRITION_MODEL_STATE = "m8_attrition_model_state"
COL_ATTRITION_SCORES_LATEST = "m8_attrition_scores_latest"
COL_RETENTION_SEGMENT_SETTINGS = "m8_retention_segment_settings"
COL_RETENTION_PLAYBOOKS = "m8_retention_playbooks"
COL_RETENTION_INTERVENTIONS = "m8_retention_interventions"

RETENTION_SETTINGS_DOC_ID = "default"

# Base feature keys (order matters for weight vector + optional sklearn GB)
FEATURE_KEYS = [
    "market_exposure",  # critical skill shortage exposure
    "tenure_insecurity",  # inverse tenure (new joiners higher)
    "engagement_gap",  # 1 - normalized avg rating
    "compensation_pressure",  # proxy from band / stagnation / HRIS percentile
    "growth_gap",  # inverse training activity
]

# Optional non-linear extensions (products — still scored with extra linear weights)
INTERACTION_FEATURE_KEYS = [
    "tenure_engagement_interaction",
    "market_growth_interaction",
]
