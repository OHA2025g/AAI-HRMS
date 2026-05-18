# High-Skill Talent Retention (M13)

## Overview

The **High-Skill Talent Retention** module is an enterprise retention intelligence layer backed by MongoDB collections prefixed `hsr_*`. It exposes APIs under **`/api/high-skill-talent-retention`** and is surfaced in the UI under **`/high-skill-talent-retention/*`**.

It complements (and does not replace) the **legacy M8 retention** UI at **`/employee-retention`** and the M8 scoring APIs under **`/api/workforce/retention`**.

## Navigation structure

Sidebar is defined in `frontend/src/high-skill-talent-retention/navConfig.jsx` and contains:

- Talent Identification, Profiling & Engagement
- Retention Strategy, Growth & Intervention
- Intelligence, Risk Prediction & Strategic Planning

## Frontend routes

Base: **`/high-skill-talent-retention`**

Core pages:

- `/high-skill-talent-retention/dashboard`
- `/high-skill-talent-retention/talent-master`
- `/high-skill-talent-retention/talent-master/new`
- `/high-skill-talent-retention/talent-master/:id`
- `/high-skill-talent-retention/talent-master/:id/edit`

All other menu items map to a workspace renderer (`HsrWorkspacePage`) via `HSR_EXTRA_ROUTES` in `frontend/src/high-skill-talent-retention/routeTable.js`.

## Backend API

Base prefix: **`/api/high-skill-talent-retention`**

Core:

- `GET /dashboard/summary`
- `GET/POST /talent-profiles`
- `GET/PATCH/DELETE /talent-profiles/{profile_id}`
- `GET /talent-profiles/{profile_id}/detail`

Risk/engagement/cases:

- `GET/POST /risk-assessments`
- `GET/POST /attrition-predictions`
- `GET/POST /stay-interviews`
- `GET/POST /cases`
- `GET/POST /engagement-actions`

AI/forecast:

- `GET /ai-recommendations`
- `GET /ai-flight-risk`
- `GET /forecasting/summary`

NL search:

- `POST /natural-language-search`
- `GET /search/logs`

Seed-backed lists for additional modules:

- `GET /segmentation`
- `GET /sentiment-engagement`
- `GET /recognition-rewards`
- `GET /relationship-history`
- `GET /compensation-analysis`
- `GET /incentives`
- `GET /career-growth`
- `GET /internal-mobility`
- `GET /skill-utilization`
- `GET /criticality-mapping`
- `GET /successor-coverage`
- `GET /development-plans`
- `GET /learning-upskilling`
- `GET /workload-wellbeing`
- `GET /work-experience`
- `GET /counteroffer-handling`
- `GET /exit-risk-triggers`
- `GET /knowledge-risk`
- `GET /client-critical`
- `GET /project-critical`
- `GET /bench-risk`
- `GET /promotion-stagnation`
- `GET /strategic-intelligence`
- `GET /analytics`

## RBAC

M13 router uses the same Phase-1 access guards as other modules:

- **Read:** `kpi_read`
- **Write:** `skills_write`

Fine-grained permissions (`retention.view`, `retention.case.manage`, …) can be layered later using the same pattern.

## Demo data

Seed script: `backend/scripts/seed_high_skill_retention_demo.py`

Runs from `backend/docker-entrypoint.sh` (non-fatal). To force a reseed:

```bash
export HSR_SEED_FORCE=1
python backend/scripts/seed_high_skill_retention_demo.py
```

## Validations (examples)

- `talent_code` unique on create.
- `StayInterviewCreate`: `conducted_on` cannot be before `scheduled_on`.
- Risk scores are bounded \(0..1\) where applicable.

