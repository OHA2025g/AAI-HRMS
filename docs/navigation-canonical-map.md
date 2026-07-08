# Navigation canonical map

**Product mode:** When `REACT_APP_SMART_HIRING_ONLY=1` (default in Docker), only Smart Hiring routes and admin pages listed below are exposed. Set `REACT_APP_SMART_HIRING_ONLY=0` for the full HRMS sidebar.

**Source of truth in code:** `frontend/src/components/Layout.jsx`, `frontend/src/config/appModules.js`, `frontend/src/App.jsx`.

---

## Smart Hiring (group `m1`)

| Path | Label | Roles / notes |
|------|-------|----------------|
| `/dashboard` | Dashboard | All authenticated; HM/TM/PM scoped data |
| `/jobs` | Jobs | Create: HM, PM, TA |
| `/candidates` | Candidates | Scoped list; TA bulk import |
| `/candidates/import` | Bulk Import | TA / admin only (`canBulkImport`) |
| `/pipeline` | Pipeline | PM read-only; TM offer via proposal |
| `/interviews` | Interviews | PM read-only |
| `/referrals` | Referrals | Stakeholders on team |
| `/assessments` | Assessments | PM read-only; grade/publish HM/TM |
| `/ai-hiring/candidate-fit/career-trajectory` | Career Trajectory | AI hiring |
| `/ai-hiring/candidate-fit/career-trajectory/compare` | Compare Trajectories | AI hiring |
| `/ai-hiring/candidate-fit/phase2` | Phase 2 Fit Simulation | AI hiring |

## Smart Hiring admin (group `m10`, Smart Hiring–only label)

| Path | Label |
|------|-------|
| `/admin/hiring-dashboard-config` | Hiring dashboard config |
| `/admin/career-trajectory-config` | Career trajectory config |
| `/admin/integrations` | Integrations (LinkedIn, connectors) |
| `/admin/roles` | Roles |

## Full HRMS (when Smart Hiring–only is off)

Additional sidebar groups implemented in `Layout.jsx`:

| Group id | Label |
|----------|--------|
| `m0` | Executive (optional) |
| `m2` | Employee Lifecycle Management |
| `m3` | Workforce Intelligence |
| `m4-planning` | Resource & demand planning |
| `m4` | Resource vs Project Optimization |
| `m5`–`m9` | Training, engagement, retention, etc. |

See `Layout.jsx` for the complete tree and role-gated children.

## Public (no auth)

| Path | Purpose |
|------|---------|
| `/login` | Login |
| `/assessment/take/:token` | Candidate assessment take |
