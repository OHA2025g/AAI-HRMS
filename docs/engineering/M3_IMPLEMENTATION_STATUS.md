# M3 Workforce Intelligence (Demand–Supply) — implementation status

## M3-1 Historical data pipeline for forecasting
- **Feature extraction:** `m3_workforce_intel/features.py` — `extract_workforce_intel_feature_rows()` mirrors `/workforce/intelligence` demand/supply sources (`projects` vs `workforce_skills`, `allocations` vs `employees`).
- **Feature store:** Mongo `workforce_intel_hist_features` — one document per `(snapshot_at, skill_name_lc, demand_source)` with demand, supply, gap, priority, ETL run id; optional `synthetic: true` for demo backfill rows.
- **ETL + DQ:** `m3_workforce_intel/pipeline.py` — `etl_snapshot()` runs DQ (`run_data_quality_checks`: row count, skill keys, non-negative counts, uniqueness) then inserts; failed DQ → `workforce_intel_etl_runs` with `status=failed_dq`, no inserts.
- **Scheduling / backfill:**
  - **On-demand:** `POST /api/admin/workforce-intel/etl/snapshot` (admin JWT).
  - **Demo backfill:** `POST /api/admin/workforce-intel/etl/backfill` body `{ "days": 30, "seed": 42 }` for deterministic synthetic history when no real cadence exists yet.
  - **Last run:** `GET /api/admin/workforce-intel/etl/last-run`.
  - **Automation:** `.github/workflows/m3-workforce-intel-etl.yml` — optional weekly `workflow_dispatch` / cron calling the snapshot route (set repo secrets `ETL_API_URL`, `ETL_ADMIN_JWT`).

## M3-2 Forecast model v1 rollout
- **Algorithm:** `m3_workforce_intel/baseline_model.py` — per-skill OLS line on snapshot index (numpy only); `predict_demand(..., steps_ahead=)` with clamp to reduce runaway slopes.
- **Train + evaluate:** `POST /api/admin/workforce-intel/models/train` — loads aligned series via `m3_workforce_intel/hist_store.py` (`load_demand_series_by_skill`), fits all skills, stores holdout **MAPE/MAE** in `train_metrics`. Requires **≥ 2** distinct snapshots.
- **Registry:** Mongo `workforce_intel_models` (`version_id` unique). **Active pointer:** `workforce_intel_model_state` document `_id: "default"` → `active_version_id`.
- **Serve API:** `GET /api/workforce/intelligence/model-forecast?horizon_months=1` (Phase-1 `kpi_read`) — returns top gaps from **active** model; `horizon_months` = discrete snapshot-step lookahead (same cadence as ETL).
- **Versioning / rollback:** `POST /api/admin/workforce-intel/models/{version_id}/activate` — repoint active version (rollback). New trains get new `version_id`; optional `activate: true` on train body to promote immediately.

## M3-3 Forecast accuracy and drift monitoring
- **MAPE/MAE tracking:** `POST /api/admin/workforce-intel/monitoring/evaluate` — compares active model 1-step prediction to **current** live feature extraction per skill; appends `workforce_intel_evaluation_runs` with `mape_pct`, `mae`, `n_skills`, `retrain_recommended`.
- **Drift / quality alerts:** Large per-skill percentage error → documents in `workforce_intel_drift_events` (`alert=drift_high_abs_pct`). Thresholds: `WORKFORCE_INTEL_DRIFT_ALERT_ABS_PCT` (default 35), `WORKFORCE_INTEL_MAPE_RETRAIN_THRESHOLD_PCT` (default 40), `WORKFORCE_INTEL_MIN_SKILLS_FOR_EVAL` (default 3).
- **Retraining policy:** `GET /api/admin/workforce-intel/monitoring/retrain-policy` and `monitoring/summary` expose `retrain_recommended` from `workforce_intel_monitoring_state` (updated by evaluate). Operational policy: scheduled ETL → periodic `monitoring/evaluate` → if flagged, run `models/train` and `activate` after review.

## Client / tests
- **Frontend (optional):** extend `workforceIntelligenceApi` in `frontend/src/lib/api.js` with `getModelForecast` and admin helpers if UI is added later.
- **Tests:** `backend/tests/test_m3_workforce_intel.py` — DQ + baseline fit/predict + evaluation smoke.

## Rollback runbook (summary)
1. List models: `GET /api/admin/workforce-intel/models`.
2. Activate known-good version: `POST /api/admin/workforce-intel/models/{version_id}/activate`.
3. Confirm forecast: `GET /api/workforce/intelligence/model-forecast`.
