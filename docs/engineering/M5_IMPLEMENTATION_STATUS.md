# M5 Training & Skill Development — implementation status

## M5-1 Skill gap → learning path mapping
- **Rules & priority logic:** `m5_training/recommendation_rules.py` — sort gaps by workforce **priority** (HIGH→LOW) then **gap size**; skip skills already on the employee profile; richer **reason** string from demand/supply/gap.
- **Path templates:** Mongo `training_learning_path_templates` (`skill_name_lc` unique). `GET`/`PUT /api/workforce/training/learning-path-templates`. Recommendations merge template steps or **default** 3-step path.
- **Recommendations API:** `GET /api/workforce/training-recommendations` (refactored to use rules + templates).
- **Assignments:** `POST /api/workforce/training/assignments` (`skills_write`) — persists `path_snapshot`, `ASSIGNED`, `progress_pct`. `GET` list with optional `employee_code`, `status`. `PATCH /api/workforce/training/assignments/{id}` (`employees_write`) — progress + `COMPLETED` sets `completed_at`.
- **QA scenarios:** `backend/tests/test_m5_training.py` — sorting, max skills, templates, normalization.

## M5-2 LMS / catalog integration
- **Provider adapter:** `m5_training/lms_adapter.py` — `LmsCourseProvider` protocol + **`StubLmsProvider`** (no HTTP). Optional `M5_LMS_STUB_JSON` env for custom JSON array.
- **Normalization:** `m5_training/catalog_normalize.py` — stable `title_norm`, `skill_tags_lc`, `duration_hours`, `source_url`.
- **Sync job:** `m5_training/lms_sync.py` — **`run_lms_catalog_sync`** with **retries** (3) + backoff; upserts `training_lms_courses` by `(provider, external_id)`; writes **`training_lms_sync_runs`** (`status`, `attempts`, `courses_upserted`, `error_message`).
- **APIs:** `POST /api/admin/training/lms/sync` (body optional `{ "provider": "stub" }`, admin), `GET /api/admin/training/lms/sync/last`. **Catalog:** `GET /api/workforce/training/catalog?skill=python`.

## M5-3 Progress & certification tracking
- **Completion tracking:** Assignment `PATCH` with `status` / `progress_pct` (see M5-1).
- **Certifications:** `POST`/`GET /api/workforce/training/certifications` (`employees_write` / `kpi_read`). Fields: `title`, `issued_at`, `expires_at`, `expiry_reminder_sent_at`.
- **Expiry reminders:** `POST /api/admin/training/certifications/scan-expiry?days_ahead=30` — notifies HR admins (`TRAINING_CERT_EXPIRING`), sets `expiry_reminder_sent_at`.
- **Manager dashboard cards:** `GET /api/workforce/training/manager-summary?manager_employee_id=<employee UUID>` — counts for **direct reports**: in-progress assignments, completed, certs expiring within **60d**.

## Data / ops
- **Indexes:** created at API startup for M5 collections (see `server.py` `ensure_phase1_indexes`).
- **Seed (optional):** `backend/migrations/0004_m5_training_seed.py` — default Python path template.
- **Frontend:** `trainingRecommendationsApi` in `api.js`; `WorkforceTrainingRecommendationsPage.jsx` — manager summary cards + catalog strip (when loaded).

## Client-only admin calls
LMS sync / cert scan are **admin** JWT; wire GitHub Actions or cron similarly to other admin endpoints if needed.
