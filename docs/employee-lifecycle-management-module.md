## Employee Lifecycle Management (M14)

This module adds an enterprise-grade **employee journey orchestration** area under the left sidebar: **Employee Lifecycle Management**.

### Frontend routes

- **Base**: `/employee-lifecycle-management/*`
- **Dashboard**: `/employee-lifecycle-management/dashboard`
- **Employee Master**:
  - `/employee-lifecycle-management/employee-master`
  - `/employee-lifecycle-management/employee-master/new`
  - `/employee-lifecycle-management/employee-master/:id`
  - `/employee-lifecycle-management/employee-master/:id/edit`
- **Workspaces** (seed-backed lists, extendable CRUD):
  - Entry/Admin: `pre-boarding`, `onboarding`, `probation-confirmation`, `documents-records`, `bgv-compliance`, `policy-consent`, `access-assets-provisioning`, `payroll-benefits-linkage`, `approvals-governance`
  - Experience/Growth: `learning-linkage`, `engagement-experience`, `rewards-recognition`, `internal-mobility`, `compensation-benefits`, `employee-relations`, `wellbeing-support`, `manager-interactions`, `communication-community`, `disciplinary-actions`, `lifecycle-notes-history`
  - Transition/Intelligence: `retention-signals`, `resignation-exit`, `notice-period`, `exit-interviews`, `knowledge-transfer`, `full-final-settlement`, `asset-return-access-revocation`, `offboarding-clearance`, `separation-closure`, `alumni-rehire`, `analytics`, `forecasting`, `ai-insights`, `strategic-intelligence`

### Backend API

All endpoints are under:

- `/api/employee-lifecycle-management/*`

Key endpoints:

- `GET /employee-lifecycle-management/dashboard/summary`
- `GET /employee-lifecycle-management/employees/{employee_id}/bundle`
- `POST /employee-lifecycle-management/pre-boarding`
- `POST /employee-lifecycle-management/onboarding`
- `POST /employee-lifecycle-management/probation-confirmation/probation`
- `POST /employee-lifecycle-management/resignation-exit`
- `POST /employee-lifecycle-management/notes`
- `GET /employee-lifecycle-management/<workspace>` for seed-backed list pages

### Collections (MongoDB)

Collections are prefixed with `elm_*` (see `backend/m14_employee_lifecycle_management/constants.py`).

### RBAC

This module reuses existing guards:

- **Read**: `kpi_read`
- **Write**: `skills_write`

(This matches the approach used by other enterprise modules in the repo; you can later map these to explicit `lifecycle.*` permissions.)

### Demo seed data

`backend/scripts/seed_employee_lifecycle_management_demo.py` seeds:

- Optional extra employees (default ~220)
- Preboarding, onboarding, probation, documents, BGV, policy consents, provisioning, payroll linkage
- Approvals + retention/attrition signals
- Resignation + notice + clearance samples
- Forecast mock rows + AI insight mock rows

It runs automatically in `backend/docker-entrypoint.sh`.

