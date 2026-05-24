# Smart Hiring Dashboard — KPI Catalog

The v2 dashboard at `/dashboard` is powered by `GET /api/dashboard/hiring-pack`. Legacy stats remain at `GET /api/dashboard/stats`.

## Headline KPIs

| KPI | Field | Definition |
|-----|-------|------------|
| Open jobs | `headline.open_jobs` | Count of jobs with `status=OPEN` in scope |
| Active pipeline | `headline.active_pipeline` | Applications not in terminal stages (`REJECTED`, `WITHDRAWN`, `JOINED`) |
| New applications | `headline.new_applications` | Applications created in the selected window |
| Hires | `headline.hires` | Applications moved to `JOINED` in the window |
| Avg fit score | `headline.avg_fit_score` | Mean `fit_scores.final_score` for applications in window |
| Good fit (≥70%) | `headline.good_fit_pct` | Share of scored applications with fit ≥ 70 |
| High fit (≥90%) | `headline.high_fit_pct` | Share of scored applications with fit ≥ 90 |
| Median fit | `headline.median_fit_score` | Median fit score in window |
| Interview yield | `headline.interview_yield_pct` | `INTERVIEW_1` / prior funnel stage |
| Assessment pass | `headline.assessment_pass_pct` | `ASSESSMENT_CLEARED` / `ASSESSMENT_SENT` |
| Time to fill | `headline.time_to_fill_days` | Median days from job `created_at` to application `JOINED` for hires in window |
| Time to hire | `headline.time_to_hire_days` | Median days from first pipeline entry (stage history or `created_at`) to `JOINED` |
| Pending offers | `headline.pending_offers` | Count of applications currently in `OFFER` stage; drills to Pipeline Salary tab |

Each delta metric includes `value`, `prior_value`, and `delta_pct` where applicable.

## Offer & interview analytics (hiring-pack)

- `offer_aging` — per-application rows in OFFER with days pending and SLA breach flag
- `offer_aging_buckets` — aggregate offer pending buckets (0-7d, 8-14d, …)
- `offer_status_counts` — breakdown by `offer_status` (SENT, NEGOTIATION, ACCEPTED, DECLINED)
- `offer_funnel` — virtual offer lifecycle funnel (`OFFER_SENT`, `OFFER_NEGOTIATION`, …) from `offer_status`
- `interview_round_metrics` — active count, avg days, conversion to next round per interview stage
- `conversion_bottleneck` — median dwell time per stage for hires in the selected window (from `application_stage_history`)
- `bottleneck_slow_hires` — hires where stage dwell exceeded SLA; used by bottleneck chart drill-down

## Application APIs

- `GET /api/applications/{id}/stage-history` — ordered stage transitions with `days_in_stage`
- `PATCH /api/applications/{id}/offer-status` — update `offer_status` while in OFFER stage

## Scope filters

Query parameters:

- `window` — 7, 30, or 90 (days)
- `scope` — `all`, `mine`, `my_department`
- `department` — optional department name
- `job_id` — single job filter
- `owner_id` — filter jobs by `created_by`

## Pipeline & quality

- `pipeline_by_stage` — current snapshot counts by stage
- `pipeline_by_stage_window` — stage counts for applications created in window
- `funnel` — ordered stages with conversion percentages
- `fit_distribution` — histogram buckets for drill-through to `/candidates?fit_min=&fit_max=`
- `quality_by_source` — avg fit by candidate source channel
- `stage_aging` — heatmap of days-in-stage buckets from `application_stage_history`

## Alerts

Alerts are rule-based (see `hiring_alerts.py`) with stable `id` fields for UI dismiss. Dismissals persist per user in `hiring_dashboard_alert_dismissals` via:

- `GET /api/dashboard/hiring-alerts/dismissals`
- `POST /api/dashboard/hiring-alerts/dismissals` — body `{ "alert_id": "..." }`

- Requisition aging (60d / 90d)
- **Stale requisitions with zero interviews** (`stale-req-zero-interviews`) — open jobs older than `stale_req_zero_interviews_days` (default 90) with no interview-stage applications; severity **critical**
- Stuck candidates per stage (SLA from stage SLA config)
- Jobs without pipeline activity
- Jobs without AI matches
- Low average fit on open jobs (`HIRING_LOW_FIT_THRESHOLD`)

## Configuration

Runtime thresholds are stored in MongoDB collection **`hiring_dashboard_config`** (singleton `_id: "default"`), seeded by migration `0019`. Env vars remain as fallbacks when the document is missing.

Admin API (requires admin role):

- `GET /api/admin/hiring-dashboard/config`
- `PUT /api/admin/hiring-dashboard/config` — partial update of thresholds below

| Field / env var | Purpose |
|-----------------|---------|
| `stage_sla_days` / `HIRING_STAGE_SLA_DAYS_JSON` | JSON map of stage → max days before “stuck” |
| `low_fit_threshold` / `HIRING_LOW_FIT_THRESHOLD` | Avg fit threshold for low-fit job alert (default 50) |
| `stuck_critical_count` / `HIRING_STUCK_CRITICAL_COUNT` | Candidate count for critical stuck severity (default 25) |
| `monthly_hire_target` / `HIRING_MONTHLY_HIRE_TARGET` | Monthly hire target line on trends chart (default 10) |
| `stale_req_zero_interviews_days` | Age threshold for zero-interview stale req alert (default 90) |
| `HIRING_SNAPSHOT_TOKEN` | Cron auth for trend snapshots |
| `HIRING_SNAPSHOT_ON_BOOT=1` | Optional snapshot after API boot (see `docker-entrypoint.sh`) |
| `REACT_APP_HIRING_DASHBOARD_V2` | Set to `0` to use legacy v1 dashboard |
| `HIRING_PACK_PERF_BUDGET_SEC` | CI perf test budget for pack build (default 0.8s) |
| `HIRING_PACK_SLOW_QUERY_SEC` | Log warning when aggregation exceeds threshold (default 1s) |

`GET /dashboard/hiring-pack` accepts `include_trends=true` (default) and `trends_months=6` to embed the trends payload in the pack response.

Optional **`hiring_analytics_events`** collection records Find Matches runs (`type=find_matches`) for adoption analytics.

Trend API returns `data_source`: `snapshots` (live daily cron), `seeded` (backfilled weekly history), `mixed` (both), or `synthetic` (on-the-fly weekly estimate).

Trend points include `hire_target` (from `HIRING_MONTHLY_HIRE_TARGET`, default 10) for the hires-vs-target line on the trends chart.

Additional trend series (from daily snapshots when available):

- `pending_offers` — count in OFFER stage
- `median_offer_dwell_days` — avg days in OFFER from stage ageing
- `median_interview_dwell_days` — avg days in INTERVIEW_1 from stage ageing
- `time_to_fill_days` — req open → joined median
- `time_to_hire_days` — application journey → joined median

## Health score

Computed in `compute_health_score()` (`hiring_alerts.py`). Starts at **72** and adjusts:

| Signal | Rule | Points |
|--------|------|--------|
| Funnel → interview conversion | ≥ 15% | +10 |
| Funnel → interview conversion | < 5% | −12 |
| Average fit | ≥ 70% | +8 |
| Average fit | < 45% | −10 |
| Requisition aging | `req_aging_over_60 / open_jobs` | up to −20 |
| Stuck candidates | `stuck_total // 5` | up to −15 |

Final score is clamped to 0–100. Status bands: **ok** (≥ 75), **watch** (55–74), **critical** (< 55).

## Observability

Prometheus metrics on the hiring-pack route:

- `hiring_pack_requests_total{cache_hit}`
- `hiring_pack_duration_seconds`

## Related endpoints

- `GET /api/dashboard/stats` — legacy v1 aggregates
- `POST /api/admin/hiring-dashboard/snapshot-cron` — persist snapshot for trends (token auth)
