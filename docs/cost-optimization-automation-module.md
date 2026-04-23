## Cost Optimization & Automation (M16)

This module provides **strategic cost intelligence**, **efficiency monitoring**, **automation orchestration**, and **savings optimization** across HR and workforce spend.

### Frontend routes

- **Base**: `/cost-optimization-automation/*`
- **Dashboard**: `/cost-optimization-automation/dashboard`
- **Copilot (mock contract)**: `/cost-optimization-automation/ai-copilot`
- **Strategic / executive / scenario views**:
  - `/cost-optimization-automation/strategic-cost-intelligence`
  - `/cost-optimization-automation/executive-decision-support`
  - `/cost-optimization-automation/scenario-modeling`
- **Drill-down pages (tables)**: all other leaf paths under the base (workforce cost, budget, automation areas, forecasting, AI recommendations, risks, continuous improvement, etc.). See `frontend/src/cost-optimization-automation/routeTable.js` (`LIST_SEGMENTS`).
- **Section landing redirects** (sidebar grouping): `section-visibility`, `section-automation`, `section-predictive` → first real page in each section.

### Backend API

All endpoints are under:

- `/api/cost-optimization-automation/*`

Key endpoints:

- `GET /cost-optimization-automation/dashboard/summary`
- `GET /cost-optimization-automation/executive/summary`
- `GET /cost-optimization-automation/strategic/summary`
- `GET /cost-optimization-automation/summaries/bundle`
- `GET /cost-optimization-automation/records/{segment}` (segment mapped in `LIST_SEGMENT_COLLECTION`)
- `POST /cost-optimization-automation/copilot/query`
- `GET /cost-optimization-automation/copilot/queries`
- `POST /cost-optimization-automation/scenario/what-if`

### Collections (MongoDB)

Collections are prefixed with `coa_*` (see `backend/m16_cost_optimization_automation/constants.py`).

### RBAC

Reuses the same Phase-1 guards as other analytics modules:

- **Read**: `kpi_read`
- **Write**: `skills_write` (reserved for future mutating endpoints)

Suggested future granular permissions (not yet wired to roles): `costopt.view`, `costopt.ai.view`, `costopt.executive.view`, etc.

### Demo seed data

`backend/scripts/seed_cost_optimization_automation_demo.py` seeds dashboard snapshots, cost visibility rows, automation/ROI/forecast/risk/AI mock rows, scenarios, and executive/strategic snapshots. It runs automatically via `backend/docker-entrypoint.sh`.
Environment: `COA_SEED_FORCE=1` to wipe and re-seed demo markers.

### Training & Development cross-link

Under **Training & Skill Development → Intelligence, Analytics & Strategic Planning**, a shortcut to **Training Cost & Automation (COA)** points to `/cost-optimization-automation/training-automation`.
