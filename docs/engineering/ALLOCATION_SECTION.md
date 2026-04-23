# Allocation Section (M10 staffing bridge)

Operational module under **Resource vs Project Optimization → Allocation Section**. It extends the existing `allocations` collection and adds dedicated Mongo collections for requests, conflicts, roll-on/roll-off, workflow approvals, bench matching, notes, documents, alerts, activity logs, forecasts, and AI insight stubs.

## Routes (frontend)

Base path: `/resource-project-optimization/allocation/`

| Path | Page |
|------|------|
| `dashboard` | KPI dashboard |
| `master` | Allocation master list |
| `master/new` | Create allocation |
| `master/:id` | Detail + tabs |
| `master/:id/edit` | Edit allocation |
| `requests` | Staffing requests + convert |
| `assignment` | Best-fit suggestions (project + skill) |
| `scheduling` | Schedule rows |
| `capacity-conflicts` | Conflicts + capacity |
| `billability-commercials` | Commercial estimates |
| `rollon-rolloff` | Movement records |
| `demand-supply` | Demand vs supply snapshot |
| `fulfillment-bench` | Bench + matches |
| `replacement-backup` | Shadow / backup allocations |
| `changes-release` | Change + release lists |
| `calendar-heatmap` | Heatmap cells |
| `approvals` | Workflow approval queue |
| `documents-notes` | Notes + document metadata |
| `alerts-communication` | Alerts + acknowledge |
| `analytics` | Type / billable distribution |
| `forecasting` | Mock forecast payload |
| `ai-insights` | Mock AI insight cards |

## API (backend)

All under `GET/POST/PUT/DELETE` prefix: **`/api/resource-project-optimization/allocation/`** (see `m10_allocation_section/routes.py`).

Notable endpoints:

- `GET .../dashboard/summary`
- `GET|POST|PUT|DELETE .../master` (+ clone, soft delete)
- `GET|POST|PUT .../requests` + `POST .../requests/{id}/convert-to-allocation`
- `GET .../assignment/suggestions?project_id=&skill=`
- `GET .../capacity-conflicts` + `POST .../capacity-conflicts/{id}/resolve`
- `POST .../approvals/{id}/action` (admin / hr_admin via `_require_allocation_approver`)

## RBAC

- **Read** (`kpi_read`): dashboard, lists, GET modules.
- **Write** (`skills_write`): create/update allocations, requests, notes, conflict resolve, alert ack.
- **Approve** (`admin` / `hr_admin`): workflow approval actions on `/approvals/.../action`.

Sidebar visibility follows existing `canSeeResourceProjectNav` (admin, hr_admin, recruiter, hr_viewer).

## Seed

`backend/scripts/seed_allocation_section_demo.py` runs from `docker-entrypoint.sh` after LCD50. Idempotent marker: `_allocation_section_seed`. Force re-run: `ALLOCATION_SECTION_SEED_FORCE=1`.

## Files added / changed

- `backend/m10_allocation_section/` — package (constants, models, service, routes factory)
- `backend/server.py` — indexes, `api_router.include_router(...)`
- `backend/scripts/seed_allocation_section_demo.py`
- `backend/docker-entrypoint.sh`
- `frontend/src/lib/api.js` — `allocationSectionApi`
- `frontend/src/components/Layout.jsx` — nav subtree
- `frontend/src/App.jsx` — routes
- `frontend/src/pages/allocation-section/*` — pages
