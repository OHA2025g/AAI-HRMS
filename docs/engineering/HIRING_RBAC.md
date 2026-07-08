# Smart Hiring — Role & job team RBAC

## Login roles

| Role | Scope |
|------|--------|
| `admin`, `hr_admin`, `recruiter` | All jobs (TA / HR operators) |
| `hr_viewer` | Read dashboards (department-scoped where configured) |
| `hiring_manager` | Jobs where assigned on `hiring_team` |
| `technical_manager` | Jobs where assigned on `hiring_team` |
| `project_manager` | Jobs on `hiring_team` **or** jobs under projects where `project_manager_id` matches |

## Job document

```json
"hiring_team": {
  "hiring_manager_id": "user-uuid",
  "technical_manager_id": "user-uuid",
  "project_manager_id": "user-uuid",
  "recruiter_id": "user-uuid"
}
```

Legacy jobs without `hiring_team` fall back to `created_by` as recruiter on access checks.

## API enforcement (Phases 1–5)

| Area | Enforced |
|------|----------|
| Jobs CRUD / list / match | Yes |
| Applications list / stage / offer-status / create | Yes |
| Pipeline by job | Yes |
| Candidates list / profile / get (scoped via applications) | Yes |
| Candidate create / upload / update | TA only (`assert_can_create_global_candidate`) |
| Referrals create / list-all | Job access |
| Interviews CRUD / feedback / list | Job access |
| Interview proposals list / approve / reject | `PERM_INTERVIEW_APPROVE` on job |
| Offer stage proposals (TM request → HM approve) | `POST /applications/{id}/offer-stage-proposal`, `GET /jobs/{id}/offer-stage-proposals`, approve/reject |
| Assessments generate / publish / invite / grade / archive / duplicate / regenerate | Yes |
| Assessment submissions get / cancel / resend / grade (scoped by job) | Yes |
| Dashboard “Mine” scope | Team membership |
| Stage-change notifications | `hiring_team` recipients (+ creator) |

## Module

`backend/talent_acquisition/hiring_rbac.py`

## Frontend

- `frontend/src/hooks/useHiringPermissions.js`
- `frontend/src/lib/hiringPipelinePermissions.js`
- Gated pages: **Create job**, **Job detail**, **Pipeline** (incl. offer proposals), **Assessments** (grade hidden for PM), **Candidates**, **Interviews**, **Referrals**

## QA demo users (after seed)

| Email | Password | Role |
|-------|----------|------|
| qa_hm@aai-hrms.local | QA_Seed_ChangeMe! | hiring_manager |
| qa_tm@aai-hrms.local | QA_Seed_ChangeMe! | technical_manager |
| qa_pm@aai-hrms.local | QA_Seed_ChangeMe! | project_manager |

Assign roles in **Admin → Roles** (`/admin/roles`).

## Tests

- Unit: `backend/tests/test_hiring_rbac.py`
- API: `backend/tests/test_hiring_rbac_api.py`
- E2E: `e2e/tests/hiring-rbac.spec.js`

## Migration

`0021_hiring_team_backfill.py` — runs via `docker-entrypoint.sh` → `mongo_migrate.py up`.

## QA seed (offer-proposal E2E)

`seed_qa_baseline.py` v2 upserts:

- Job `qa-seed-job-0001` — “QA Seed — Software Engineer”
- Application `qa-seed-app-interview` in `INTERVIEW_1` for TM “Request offer approval” / HM approve flows

Re-apply seed after upgrade: `QA_SEED_FORCE=1 python scripts/seed_qa_baseline.py`
