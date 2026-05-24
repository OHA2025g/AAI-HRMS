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
3. Use **filters** to narrow by scope (All / Mine / My department), department, job, or owner.

## Reading the dashboard

### Health strip

The hiring health score (0–100) combines funnel conversion, average fit, requisition aging, and stuck-candidate volume. Status colors: ok (green), watch (amber), critical (red).

### KPI tiles

Click any tile to drill through to Jobs, Pipeline, or Candidates with filters pre-applied.

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
- **Threshold config UI**: `/admin/hiring-dashboard-config` (admin role) — SLAs, low-fit threshold, hire target, stale-req zero-interview days
- Snapshot cron script: `backend/scripts/hiring_dashboard_snapshot_cron.sh`
- **Kubernetes CronJob** (production): `deploy/kubernetes/hiring-dashboard-snapshot-cronjob.yaml` — daily at 02:00 UTC; requires secret `hiring-snapshot-token` (see `hiring-snapshot-token.secret.example.yaml`)
- Smoke test: `backend/scripts/smoke_hiring_dashboard.sh`
- **Lighthouse accessibility gate**: `.github/workflows/lighthouse-hiring-dashboard.yml` (score ≥ 90 on `/dashboard`)
