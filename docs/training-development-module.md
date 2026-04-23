# Training & Skill Development (M12)

## Overview

The **Training & Skill Development** area is a modular workforce capability layer backed by MongoDB collections under the `td_*` prefix, exposed at **`/api/training-development`** and surfaced in the UI under **`/training-development/*`**. It complements the legacy Phase-3 M5 page at **`/training-recommendations`**.

## Sections & navigation

| Section | UI path | Notes |
|--------|---------|--------|
| Learning Operations & Administration | `/training-development/learning-ops` | Landing cards → child modules |
| Capability Development & Employee Growth | `/training-development/capability` | Landing cards |
| Intelligence, Analytics & Strategic Planning | `/training-development/intelligence` | Landing cards |

Child routes are defined in `frontend/src/training-development/navConfig.jsx` and workspace mapping in `frontend/src/training-development/routeTable.js`.

## Main routes (frontend)

| Path | Page |
|------|------|
| `/training-development/dashboard` | KPI dashboard + charts |
| `/training-development/training-master` | Program list |
| `/training-development/training-master/new` | Create program |
| `/training-development/training-master/:id` | Program detail (tabs) |
| `/training-development/training-master/:id/edit` | Edit program |
| `/training-development/{module}` | Workspace pages (catalog, extended records, batches, attendance snapshot, approvals, AI, forecast) — see `TRAINING_DEV_EXTRA_ROUTES` |

## API summary (backend)

Base prefix: **`/api/training-development`**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/dashboard/summary` | Aggregated KPIs |
| GET/POST | `/training-programs` | List / create |
| GET/PATCH/DELETE | `/training-programs/{id}` | Read / update / archive |
| GET | `/training-programs/{id}/detail` | Bundle: sessions, batches, enrollments, attendance, assessments, results, feedback |
| POST | `/training-programs/{id}/clone` | Clone program |
| GET/POST | `/batches`, `/sessions`, `/enrollments` | Operations data |
| GET/POST | `/catalog-items` | Learning catalog |
| GET/POST | `/extended-records`, `/extended-records/{record_type}` | Typed capability / analytics rows |
| GET | `/approvals` | Workflow approval queue |
| GET | `/ai/skill-gap-predictions`, `/ai/learning-recommendations` | AI-ready (seed-backed) |
| GET | `/forecasts/summary` | Forecast payloads |

## RBAC

Routers use the same Phase-1 gates as other modular sections:

- **Read:** `kpi_read`
- **Write:** `skills_write`

## Demo data

`backend/scripts/seed_training_development_demo.py` is invoked from `backend/docker-entrypoint.sh` (non-fatal on failure). Set **`TD_SEED_FORCE=1`** to re-seed.

## Validation rules (examples)

- Training **code** unique on create; immutable on update (UI disables in edit).
- Session **end_datetime** ≥ **start_datetime** (`TrainingSessionCreate` model validator).
- **Archive** blocked for mandatory compliance programs with active compliance enrollments (service guard).

## Assumptions

- Extended **`record_type`** values must belong to `RECORD_TYPES` in `backend/m12_training_development/constants.py`.
- Full LMS content delivery, finance integration, and fine-grained permission keys (`training.view`, …) can be layered on the same router and UI patterns without changing collection names.
