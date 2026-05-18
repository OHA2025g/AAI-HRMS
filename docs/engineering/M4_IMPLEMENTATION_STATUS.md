# M4 Resource vs Project Optimization — implementation status

## M4-1 Capacity and allocation data model
- **Project–skill demand schema:** `project_skill_demands` extended with `demand_min`, `demand_max`, `constraint_type` (`HARD` | `SOFT`). Exposed on `ProjectSkillDemandRow` / bulk CSV import and `ProjectSkillDemandResponse`.
- **Allocation constraint schema (global):** Mongo `allocation_optimization_settings` singleton `_id: "default"` — `max_projects_per_employee`, `max_seats_per_employee_per_project`, `shortage_penalty_hard`, `shortage_penalty_soft`, `utilization_weight`, `target_utilization_pct`. Defaults in `m4_resource_optimization/constants.py`.
- **Migration / backfill:** `backend/migrations/0003_m4_allocation_schema.py` — sets `demand_min`/`demand_max`/`constraint_type` on existing demands; ensures settings doc (`python scripts/mongo_migrate.py up`).

## M4-2 Constraint-based allocation engine
- **Solver:** `m4_resource_optimization/solver.py` — deterministic greedy seat filling; **hard** caps (skill match, max distinct projects per employee, max seats per employee–project); **hard vs soft** seats from min/max expansion; weighted **objective** (shortage penalties + utilization gap).
- **Scoring:** `score_breakdown` in solve output (`shortage_component`, `utilization_gap_pct`, `objective_score`).
- **API:** `POST /api/workforce/resource-optimization/solve` (live DB, no persist). **Explainability:** `explain_steps` (`ASSIGN` / `UNFILLED` with `reason`).
- **Settings API:** `GET`/`PUT /api/workforce/resource-optimization/settings` (`kpi_read` / `skills_write`).

## M4-3 What-if simulation and approvals
- **Scenario API:** `POST /simulate` with `demand_overrides` + `constraint_overrides`. `POST /scenarios` saves snapshot (re-runs simulate if `result` omitted). `GET /scenarios`, `GET /scenarios/{id}`, `GET /scenarios/compare?scenario_a_id=&scenario_b_id=`.
- **UI:** `WorkforceResourceOptimizationPage.jsx` — **Scenario lab** tab: run solve, save scenario, compare two scenarios, submit/approve/reject/apply (role-gated).
- **Approval workflow:** `POST .../scenarios/{id}/submit` → `PENDING_APPROVAL` (skills_write); **notifications** to `admin`/`hr_admin` via `create_notification` (`ALLOCATION_SCENARIO_PENDING_APPROVAL`). `approve` / `reject` — **admin** or **hr_admin** (`_require_allocation_approver`). `POST .../apply` writes aggregated counts to `project_skill_allocations` (requires `APPROVED`; supports `dry_run`).

## Client
- `frontend/src/lib/api.js` — `resourceOptimizationApi` extended with settings, solve, simulate, scenarios, compare, submit, approve, reject, apply.

## Tests
- `backend/tests/test_m4_solver.py` — deterministic ordering, capacity caps, soft seats, compare helper.

## Ops notes
- Solver needs **`project_skill_demands`** rows and employees with **`skills`**; otherwise metrics show zero seats / skip explain step.
- After **apply**, refresh **Resource optimization** dashboard (`refresh=true`) to see updated allocation aggregates.
