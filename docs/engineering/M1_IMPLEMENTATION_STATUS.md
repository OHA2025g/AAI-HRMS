# M1 Talent Acquisition — implementation status

## M1-1 LinkedIn connector productionization
- **OAuth / token refresh:** `talent_acquisition/connector_oauth.py` — `ensure_access_token()` supports `refresh_token` grant, falls back to `client_credentials`, optional `oauth_token_url` on connector config. Tokens persisted on `connector_configs` (`access_token`, `refresh_token`, `token_expires_at`, `token_refreshed_at`).
- **Paging + retries + throttling:** `talent_acquisition/connector_fetch.py` — cursor/page-token style paging, exponential backoff retries, `min_interval_ms` between pages, optional alternate `search_path` list.
- **Health:** `GET /api/admin/connectors/health` — per-connector `health_ok`, `health_checked_at`, `health_detail`, `request_count_total`.
- **Admin UI:** `AdminIntegrationsPage.jsx` — OAuth token URL, refresh token, page size, retries, throttle fields + health card.

## M1-2 Naukri + Monster + unified queue
- **Normalization:** `talent_acquisition/normalize.py` — `normalize_board_candidate()` for NAUKRI / MONSTER / generic (LinkedIn-style).
- **Monster:** `monster_search_candidates` + enabled sources in `ingest_candidates_for_job`.
- **Unified ingestion + errors:** `talent_acquisition/ingestion_queue.py` — `ingestion_jobs` collection via `run_unified_ingestion()`; per-source counts and errors.
- **Monitoring / throttling:** health fields + `request_count_total` increments on HTTP attempts; `min_interval_ms`, `max_retries`, `page_size` on config.

## M1-3 Dedup / canonicalization
- **Matching keys:** email → normalized phone (`phone_lc`) → resume SHA-256 (`resume_content_hash`, min 40 chars normalized text) → name (existing).
- **Merge policy:** `_merge_candidate_docs` extended with `phone_lc` / `resume_content_hash`; scalar conflict policy unchanged (prefer filled / longer resume).
- **Audit:** `candidate_dedup_audit` collection + `_append_dedup_audit()` on create/merge; **admin merge** `POST /api/admin/candidates/merge` (`keep_candidate_id`, `merge_candidate_id`).

## M1-4 Multi-source AI ranking explainability
- **API:** `POST /api/match/{job_id}` enriches each `fit_score` with `ranking_explainability` (deterministic `compute_match_score`, weights, `score_factors`, narrative `explanation`). LLM path adds `score_factors` + `score_source`; basic path aligns `final_score` with rubric weights and must-have penalty.
- **UI:** `FitScore.jsx` — “Multi-source ranking” panel when `ranking_explainability` is present.
- **Tests:** `tests/test_ranking_regression.py`.

## M1-5 Interview automation & calendar
- **Proposal approval:** reject past slots; invalid ISO rejected.
- **Calendar:** optional `CALENDAR_WEBHOOK_URL` POST JSON payload; `calendar_provider`, `calendar_sync_status`, `calendar_sync_detail`, `calendar_last_sync` on interview; background sync after approve.
- **Notifications:** `_interview_notification_copy()` templates for scheduled + reminder; `notify_interview_reminder()`; `POST /api/admin/interviews/dispatch-reminders` for cron (24h window, `reminder_sent_at`).

## Env reference
| Variable | Purpose |
|----------|---------|
| `CALENDAR_WEBHOOK_URL` | Outbound calendar bridge (optional) |
| `CALENDAR_PROVIDER` | Label stored on interview (default `WEBHOOK`) |
