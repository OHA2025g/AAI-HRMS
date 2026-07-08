# Smart Hiring Dashboard — User Guide

## Overview

The Smart Hiring Dashboard (`/dashboard`) gives recruiters and hiring managers a single view of open requisitions, pipeline health, AI match quality, and actionable alerts.

Toggle between v2 (default) and legacy v1 with `REACT_APP_HIRING_DASHBOARD_V2=0`, or open the classic view directly at **`/dashboard/legacy`**.

### Deprecation timeline (legacy v1)

| Date | Milestone |
|------|-----------|
| May 2026 | v2 is default; legacy available via env flag |
| Jul 2026 | Legacy dashboard shows deprecation banner |
| Sep 2026 | Legacy UI removed; `GET /api/dashboard/stats` retained for API consumers until further notice |

See [CHANGELOG.md](../CHANGELOG.md) for details.

### TA review (presentation mode)

Use the **TA review** toggle in the dashboard header for fullscreen-style reviews: larger health score, top alerts inline, filters hidden. Ideal for weekly hiring standups on a projector or shared screen.

## Getting started

1. Sign in and open **Dashboard** from the main navigation.
2. Use the **period toggle** (7d / 30d / 90d) to change the reporting window.
3. Use **filters** to narrow by org hierarchy (Pillar, Department, Sub-dept, Project ID) and recruiter scope (All / Mine / My department, job, owner).

## Org filters (revamp)

The dashboard header includes **Pillar**, **Department**, **Sub-dept**, and **Project ID** dropdowns populated from open jobs via `GET /api/dashboard/filter-options`. A secondary row supports scope, job, and owner filters.

New pack fields power the mock-aligned UI:

| Section | Pack field |
|---------|------------|
| Hero risk counts | `hero_risk_metrics` |
| AI recommendation | `ai_recommendation`, `ai_insights` |
| Overview KPIs | `headline.expected_hires`, `headline.offer_acceptance_pct` |
| Overview charts | `trends.points` → Hiring Velocity, Time to Fill Trend |
| Department heatmap | `department_risk` |
| Talent intelligence | `talent_intelligence` |
| Recruiter table | `recruiter_performance` |
| Smart actions | `smart_actions` |
| Tab KPI rows | `tab_kpis.pipeline/offers/interviews/analytics` |
| Signals | `signal_strength`, `signal_recommendations` |
| Analytics summary | `analytics_summary` |

## Reading the dashboard

The revamp uses **six tabs** — Overview, Pipeline, Offers, Interviews, Signals, and Analytics — below the hero health strip. Tab choice is reflected in the URL (`?tab=pipeline`, etc.).

### Hero health strip

The **AI Hiring Health Score** (0–100) appears in the hero banner above the tabs, with risk counts (reqs at risk, SLA misses, high-fit awaiting review) and a rule-based AI recommendation. Status colors: ok (green), watch (amber), critical (red).

### Overview tab

Top KPI cards cover **Open Positions**, **Expected Hires**, **Time to Fill**, **Offer Acceptance**, and **Hiring Health**. Sparklines appear on Open Positions, Expected Hires, Time to Fill, and Offer Acceptance when trend data includes the corresponding series (`open_jobs`, `hires`, `time_to_fill_days`, `offer_acceptance_pct`).

Below the KPI row:

- **Hiring Funnel** — stage volumes (visual funnel)
- **Hiring Velocity** — applications and hires over the last 12 trend periods (`hiring-velocity-chart`)
- **Time to Fill Trend** — median TTF vs 30-day target (`time-to-fill-trend-chart`)
- **Department risk**, **talent intelligence**, **recruiter performance**, and **Smart Action Center**

### Pipeline tab

Pipeline KPIs, horizontal funnel with stage drill-through, alerts panel, and smart actions.

### Analytics tab

Full **TrendsChart** (six-month view), source mix, fit histogram, stage aging, req aging, top jobs, and recent activity. The trends badge shows the data source (see [Trends](#trends) below).

### KPI tiles (legacy sections)

Some drill-through patterns from the pre-revamp dashboard still apply on Analytics and drill links:

Click any linked tile to drill through to Jobs, Pipeline, or Candidates with filters pre-applied.

- **Good fit (70%+)** — share of candidates scoring at least 70 on AI fit
- **High fit (90%+)** — share scoring at least 90 on AI fit

### Pipeline funnel

Shows volume and stage-to-stage conversion. Click a stage to open Pipeline filtered to that stage.

### Alerts

Up to eight alerts surface stale reqs, stuck candidates, jobs without applications, missing AI matches, and low-fit jobs. Dismiss an alert with the × control; dismissals sync to your account (server-side) and fall back to browser storage if offline.

### Suggested action

When alerts exist, a quick-action card links to the highest-priority remediation path.

### AI match adoption

Shows what share of open jobs have fit scores generated. Jobs without matches link to the jobs list with `without_matches=1`.

### Fit histogram

Click a bar to open Candidates filtered by fit score range.

## Drill-through URLs

| Destination | Example |
|-------------|---------|
| Pipeline by stage | `/pipeline?stage=SCREENING` |
| Candidates by fit | `/candidates?fit_min=70&fit_max=100` |
| Open jobs without matches | `/jobs?status=OPEN&without_matches=1` |

## Trends

When snapshots are enabled (`HIRING_SNAPSHOT_TOKEN` + cron or `HIRING_SNAPSHOT_ON_BOOT=1`), trend charts use persisted snapshot rows. The badge on the trends chart shows the data source:

| `data_source` | Meaning |
|---------------|---------|
| `snapshots` | Live daily snapshots from cron or admin POST |
| `seeded` | Backfilled weekly estimates (first boot / sparse history) |
| `mixed` | Some live daily snapshots plus backfilled history |
| `synthetic` | Computed on the fly from live application data (no snapshot rows) |

Docker Compose includes a `hiring-snapshot-cron` sidecar (daily POST). Without any snapshots, the API falls back to **weekly synthetic buckets** — useful for demos but not for executive reporting.

## For administrators

- KPI definitions: [HIRING_DASHBOARD_KPIS.md](../engineering/HIRING_DASHBOARD_KPIS.md)
- **Threshold config UI**: `/admin/hiring-dashboard-config` (admin role) — SLAs, low-fit threshold, hire target, stale-req zero-interview days, **rule toggles**, **LLM insights toggle**, and **audit trail**
- Snapshot cron script: `backend/scripts/hiring_dashboard_snapshot_cron.sh`
- **Kubernetes CronJob** (production): `deploy/kubernetes/hiring-dashboard-snapshot-cronjob.yaml` — daily at 02:00 UTC; requires secret `hiring-snapshot-token` (see `hiring-snapshot-token.secret.example.yaml`)
- Smoke test: `backend/scripts/smoke_hiring_dashboard.sh`
- Optional LLM smoke: `backend/scripts/smoke_hiring_dashboard_llm.sh` (requires admin token + LLM API key; set `HIRING_DASHBOARD_LLM_STRICT=1` to fail on rule-based fallback)
- Local regression: `scripts/run_hiring_dashboard_regression.sh` (set `RUN_E2E=1` to include Playwright)
- E2E only: `scripts/run_hiring_dashboard_e2e.sh` (port **3099** by default; serves a production build via Playwright webServer; set `PLAYWRIGHT_DEV_SERVER=1` to use `npm start` instead)
- Full validation: `scripts/run_hiring_dashboard_full_validation.sh` (unit + live integration + smoke; `RUN_E2E=1` for Playwright)
- Playwright uses `REACT_APP_BACKEND_URL=http://127.0.0.1:11001` so the UI talks to the test API (not port 8001)
- **Unit tests**: `test_hiring_alerts_rule_flags.py`, `test_hiring_dashboard_llm_insights.py`, `test_hiring_dashboard_admin_config_api.py`, `test_hiring_dashboard_llm_pack_api.py`, `AdminHiringDashboardConfigPage.test.jsx`
- **Storybook**: `AdminHiringDashboardConfig.stories.jsx` (admin config + rule matrix)
- **E2E**: `e2e/tests/hiring-dashboard-admin-legacy.spec.js` covers rule toggles, LLM toggle, and audit trail
- **Lighthouse accessibility gate**: `.github/workflows/lighthouse-hiring-dashboard.yml` (score ≥ 90 on `/dashboard`)

## Rule governance and LLM insights (v2)

Admins can enable or disable individual alert rules without changing numeric thresholds:

| Rule flag | Effect when disabled |
|-----------|----------------------|
| `low_fit` | Suppresses low-fit job alerts |
| `stuck_stage` | Suppresses stuck-candidate SLA alerts |
| `stale_req` | Suppresses stale requisition alerts |
| `trend_target` | Hides monthly hire target line on trend charts |
| `no_pipeline` | Suppresses empty-pipeline job alerts |
| `no_ai_matches` | Suppresses jobs-without-AI-matches alerts |
| `high_fit_recent` | Suppresses new high-fit candidate alerts |

**LLM-enhanced insights (Mistral AI)** — When enabled (admin toggle or `HIRING_DASHBOARD_LLM_INSIGHTS=1`), the hiring-pack API enriches the hero recommendation and insight cards using **Mistral AI** (`MISTRAL_API_KEY`, optional `MISTRAL_MODEL`, default `mistral-small-latest`). Metrics are served from the hiring-pack cache (60s TTL); LLM insights are applied on top of cached packs and cached separately (300s TTL, `HIRING_LLM_INSIGHTS_CACHE_TTL_SEC`). The pack exposes `ai_insights_source` (`rule_based` or `llm`); the dashboard shows an **LLM insights** badge when the Mistral path succeeds. On LLM failure, copy falls back to rule-based insights automatically.

**Mock design reference:** `Frontend Revamp/smart_hiring_dashboard_all_6_tabs_internal_navigation.html` — UI tokens and layout classes live in `frontend/src/styles/hiring-dashboard.css` (`hd-kpi-grid`, `hd-insights-grid`, etc.).

Configuration changes are recorded in `hiring_dashboard_config_audit` and returned as `audit_trail` on `GET /api/admin/hiring-dashboard/config`.
