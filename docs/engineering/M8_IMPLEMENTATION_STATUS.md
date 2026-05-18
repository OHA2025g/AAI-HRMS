# M8 High-Skill Talent Retention — implementation status

## M8-1 Attrition risk model v1
- **Feature pipeline** (`m8_retention/features.py`): `market_exposure`, `tenure_insecurity`, `engagement_gap`, `compensation_pressure` (band + promotion stagnation + **HRIS `comp_market_percentile` 0–100**), `growth_gap` (training assignments). Optional **interaction** features: `tenure_engagement_interaction`, `market_growth_interaction` when `interaction_features_enabled` on model state.
- **Linear model** (`m8_retention/model_v1.py`): logit + sigmoid; dynamic `feature_keys`; **reference_features** (means from training) for attributions.
- **SHAP-style linear attributions** (`m8_retention/explainability.py`): `shap_linear` on each score = \(w_i (x_i - \bar{x}_i)\) vs reference; stored on `m8_attrition_scores_latest`.
- **Non-linear (optional)** (`m8_retention/sklearn_model.py`, **scikit-learn** `HistGradientBoostingClassifier`): train with `POST .../train` body `use_gradient_boosting: true` (≥10 labeled rows, both classes, sklearn installed). Serialized in `classifier_blob_b64`. **Ensemble**: `ensemble_mode` `linear` | `gb` | `avg` — `gb` uses finite-difference local explanations in `gb_explanation_top`.
- **Training** (`m8_retention/training.py`): logistic on full feature key set; persists **reference_features** (batch means).
- **Scoring**: `POST /api/workforce/retention/v1/score-run` (JWT `kpi_read`). **`POST /api/workforce/retention/v1/score-run-cron`** — header `X-M8-Score-Token` = env `M8_SCORE_RUN_TOKEN` (for GitHub Actions / cron).
- **Train API**: `POST .../train` with `labels`, optional `use_gradient_boosting`, `interaction_features`.

## M8-2 Segmentation
- Same as before + employee **HRIS** fields below feed comp feature and confidence.

## M8-3 Interventions & metrics
- Unchanged (playbooks, interventions, metrics).

## Employee UI & HRIS fields
- **Employee Master** (`EmployeesPage.jsx`): section **Retention / HRIS (M8)** on create/edit — comp band, last promotion, high performer / critical role switches, comp market percentile, HRIS sync timestamp, comp source label.
- **CSV import / template**: optional columns `join_date`, `compensation_band`, `last_promotion_at`, `high_performer`, `critical_role`, `comp_market_percentile`, `hris_last_sync_at`, `hris_comp_source`.
- **API models** (`EmployeeCreate` / `Update` / `Response`): above fields + existing M8 flags.

## Scheduled score-run
- **GitHub Actions**: `.github/workflows/m8-retention-score-run.yml` — secrets `M8_SCORE_RUN_URL`, `M8_SCORE_RUN_TOKEN`.
- **Docs**: `deploy/README.md`, `backend/.env.example` (`M8_SCORE_RUN_TOKEN`).

## Data / ops
- **Dependency**: `scikit-learn` in `backend/requirements.txt` (optional GB path; linear path works without it).
- **Tests**: `backend/tests/test_m8_retention.py`.
- **Operator runbook**: `docs/runbooks/m8-retention-operators.md`.
- **Local/cron script**: `backend/scripts/m8_score_run_cron.sh` (env `M8_SCORE_RUN_TOKEN`, optional `M8_SCORE_RUN_URL`).

## HR validation (1 SP)
- Process / workshop — not automated.
