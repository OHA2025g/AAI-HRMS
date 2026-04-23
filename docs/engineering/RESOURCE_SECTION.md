# Resource Section (M11 workforce intelligence)

Module under **Resource vs Project Optimization → Resource Section**. It treats each `employees.id` as `resource_id`, stores extended workforce overlays in dedicated Mongo collections, and composes list/detail views from the employee master plus allocations, bench, readiness, skills, and related artifacts.

## Routes (frontend)

Base path: `/resource-project-optimization/resource/`

| Path | Page |
|------|------|
| `dashboard` | KPI dashboard + quick search |
| `master` | Resource master (enriched employee list) |
| `master/new` | Guided link to Employees for net-new hire |
| `master/:id` | Detail with tabs (overview, skills, utilization, bench, …) |
| `master/:id/edit` | PATCH overlay (profile fields in `resource_section_profiles`) |
| `classification` | Classification tags + add |
| `skills` | Skill inventory + create record |
| `availability-utilization` | Availability rows + utilization snapshots |
| `bench` | Bench list |
| `deployment-readiness` | Readiness scorecards |
| `demand-matching` | Demand match rows |
| `mobility-career` | Mobility events + career preferences |
| `learning-certifications` | Learning programs + certifications |
| `cost-commercial` | Cost / billing profile list |
| `attendance-leave-impact` | Attendance / leave impact rows |
| `documents-compliance` | Document metadata + compliance checklist |
| `notes-communication` | Notes timeline + create |
| `analytics` | Aggregate analytics summary |
| `forecasting` | Forecast document (mock / seeded) |
| `approvals-governance` | Approval queue + actions |
| `ai-insights` | Mock / future AI insight cards |

## API (backend)

Prefix: **`/api/resource-project-optimization/resource/`** (see `m11_resource_section/routes.py`).

- `GET /dashboard/summary`
- `GET /master` (pagination + `q`, `department`, `status`)
- `GET /master/{resource_id}`
- `PATCH /master/{resource_id}/profile`
- `GET|POST /classification`
- `GET|POST /skills`
- `GET /availability-utilization`
- `GET /bench`
- `GET /deployment-readiness`
- `GET /demand-matching`
- `GET /mobility-career`
- `GET /learning-certifications`
- `GET /cost-commercial`
- `GET /attendance-leave-impact`
- `GET /documents-compliance`
- `GET|POST /notes-communication`
- `GET /analytics/summary`
- `GET /forecasting`
- `GET /approvals-governance` + `POST /approvals-governance/{approval_id}/action`
- `GET /ai-insights?resource_id=`

## RBAC

- **Read** (`kpi_read`): all GET routes above.
- **Write** (`skills_write`): profile patch, classification add, skill create, note create.
- **Approve** (`admin` / `hr_admin`): resource approval action endpoint (same guard as allocation scenarios).

Sidebar uses the same `canSeeResourceProjectNav` gate as Project / Allocation sections.

## Seed

`backend/scripts/seed_resource_section_demo.py` runs from `docker-entrypoint.sh` after the allocation seed. Idempotent marker collection: `_resource_section_seed`. Force re-run: `RESOURCE_SECTION_SEED_FORCE=1`.

## Key files

- `backend/m11_resource_section/` — constants, Pydantic models, service, router factory
- `backend/server.py` — Mongo indexes + `create_resource_section_router(...)`
- `backend/scripts/seed_resource_section_demo.py`
- `backend/docker-entrypoint.sh`
- `frontend/src/lib/api.js` — `resourceSectionApi`
- `frontend/src/components/Layout.jsx` — nested nav
- `frontend/src/App.jsx` — routes
- `frontend/src/pages/resource-section/*` — pages

## Assumptions

- Employee CRUD remains on `/employees`; Resource Master “add” directs there, while overlays and intelligence tables live under M11.
- Forecasting and AI responses may be mock or seeded until external engines are integrated; contracts stay stable for the UI.
