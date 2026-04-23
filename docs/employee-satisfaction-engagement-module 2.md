## Employee Satisfaction & Engagement (M17)

Strategic **employee voice**, **sentiment & experience monitoring**, **programs & interventions**, and **predictive engagement intelligence**.

### Frontend routes

- **Base**: `/employee-satisfaction-engagement/*`
- **Dashboard**: `/employee-satisfaction-engagement/dashboard`
- **Experience copilot (mock)**: `/employee-satisfaction-engagement/experience-copilot`
- **Strategic / executive / scenario**:
  - `/employee-satisfaction-engagement/strategic-experience-intelligence`
  - `/employee-satisfaction-engagement/executive-decision-support`
  - `/employee-satisfaction-engagement/scenario-modeling`
- **Drill-down tables**: see `frontend/src/employee-satisfaction-engagement/routeTable.js` (`ESE_LIST_SEGMENTS`).
- **Legacy** employee engagement UI remains at `/employee-engagement` (linked from the module nav).

### Backend API

Under `/api/employee-satisfaction-engagement/*`:

- `GET /dashboard/summary`
- `GET /executive/summary`
- `GET /strategic/summary`
- `GET /summaries/bundle`
- `GET /records/{segment}` — segment → collection map in `LIST_SEGMENT_COLLECTION`
- `POST /copilot/query`
- `GET /copilot/queries`
- `POST /scenario/what-if`

### Collections (MongoDB)

Prefixed with `ese_*` — see `backend/m17_employee_satisfaction_engagement/constants.py`.

### RBAC

Same Phase-1 guards as other analytics modules: **read** `kpi_read`, **write** `skills_write` (reserved for future mutating APIs).

Suggested future granular permissions: `engagement.view`, `engagement.ai.view`, `engagement.executive.view`, etc.

### Demo seed

`backend/scripts/seed_employee_satisfaction_engagement_demo.py` — run via `backend/docker-entrypoint.sh`.  
`ESE_SEED_FORCE=1` forces re-seed.

### Validations

Server-side validations for write endpoints can be extended (campaign dates, score ranges); current release is read-heavy with mock AI/predictions aligned to schema fields in seed data.
