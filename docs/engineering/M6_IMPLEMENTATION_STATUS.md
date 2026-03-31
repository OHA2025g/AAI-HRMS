# M6 Employee Satisfaction & Engagement — implementation status

## M6-1 Survey templates and scheduling
- **Template CRUD + targeting:** Mongo `employee_engagement_survey_templates`. `GET`/`POST /api/employee-engagement/survey-templates`, `PUT`/`DELETE /api/employee-engagement/survey-templates/{template_id}` (`employees_read` / `employees_write`). Fields include `default_title`, `default_question`, `rating_min`/`max`, `target_all`, `target_departments`.
- **From template:** `POST /api/employee-engagement/surveys/from-template` — creates an active pulse survey from a template.
- **Cadence scheduler:** Mongo `employee_engagement_survey_schedules`. `POST`/`GET /api/employee-engagement/survey-schedules`. `POST /api/admin/employee-engagement/schedules/dispatch-due` — creates surveys from due schedules and advances `next_run_at` via `m6_engagement.schedules.next_run_after`.
- **Participation reminders:** `POST /api/admin/employee-engagement/surveys/{survey_id}/remind-participation` — notifies employees who have not responded (best-effort).

## M6-2 Sentiment / topic analytics v1
- **Sentiment pipeline:** `m6_engagement/sentiment.py` — deterministic keyword + rating blend; `sentiment_pipeline_version` stored on each response (`m6-v1`). `submit_pulse_response` uses this pipeline.
- **Topics & trends:** `m6_engagement/topics.py` — `classify_topic`, `aggregate_topic_counts`, `weekly_rating_trends`, `confidence_tier` (LOW/MEDIUM/HIGH by sample size).
- **Dashboard:** `GET /api/employee-engagement/dashboard?survey_id=` — optional per-survey slice; returns `topic_counts`, `weekly_trend`, `display_confidence`, `confidence_rationale`, `anonymity_note` (when redacted).

## M6-3 Privacy and RBAC
- **Anonymity threshold:** `ENGAGEMENT_ANONYMITY_MIN_RESPONSES` (default **5**). When `survey_id` is set and response count is below threshold, aggregates are redacted (`m6_engagement/privacy.py`).
- **Raw responses:** `GET /api/employee-engagement/responses` — **admin** or **hr_admin** only (`_require_engagement_raw_privileged`); audited as `LIST_RAW_RESPONSES`.
- **Privacy audit:** `employee_engagement_privacy_audit` — `log_engagement_privacy_event`; `GET /api/employee-engagement/privacy-audit` (admin) for compliance review.

## Data / ops
- **Indexes:** API startup + migration `backend/migrations/0005_m6_engagement_indexes.py` for templates, schedules, privacy audit.
- **Frontend:** `engagementApi` in `frontend/src/lib/api.js`; `EmployeeEngagementPage.jsx` — dashboard scoped to selected survey where applicable; confidence / topics / anonymity; raw response table only for admin/hr_admin.

## Env
- `ENGAGEMENT_ANONYMITY_MIN_RESPONSES` — documented in `backend/.env.example` and `deploy/README.md`.
