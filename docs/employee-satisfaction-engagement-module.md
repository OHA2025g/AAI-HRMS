# Employee Satisfaction & Engagement (M17)

Strategic employee voice, experience, and engagement intelligence: continuous listening, monitoring, interventions, and predictive insights. Builds on the legacy pulse MVP (`/api/employee-engagement/*`, `m6_engagement` helpers) and integrates **Workforce Intelligence** (burnout, attrition, forecasts, AI recommendations) and **ELM grievances**.

## UI routes

Base path: `/employee-satisfaction-engagement`

- Dashboard: `/employee-satisfaction-engagement/dashboard`
- Copilot: `/employee-satisfaction-engagement/copilot`
- Section 1–3 workspace pages: see `frontend/src/employee-satisfaction-engagement/routeTable.js` and `navConfig.jsx`.

Legacy pulse UI: `/employee-engagement/legacy` (redirect from `/employee-engagement` goes to the new dashboard).

## API (FastAPI)

Prefix: `/api/employee-satisfaction-engagement`

| Area | Method | Path |
|------|--------|------|
| Summary | GET | `/dashboard/summary` |
| Bundle | GET | `/summaries/bundle` |
| Executive | GET | `/executive/summary` |
| Lists | GET | `/records/{segment}` — `segment` keys match `LIST_SEGMENT_COLLECTION` in `m17_employee_satisfaction_engagement/constants.py` |
| ELM grievances | GET | `/integrations/elm/grievances` |
| WFI burnout | GET | `/integrations/wfi/burnout-risk` |
| WFI attrition | GET | `/integrations/wfi/attrition-risk` |
| WFI engagement visibility | GET | `/integrations/wfi/engagement-visibility` |
| WFI forecasts | GET | `/integrations/wfi/forecasts` |
| WFI AI recommendations | GET | `/integrations/wfi/ai-recommendations` |
| WFI executive | GET | `/integrations/wfi/executive-summary` |
| Feedback | POST | `/feedback` |
| Action plans | POST | `/action-plans` |
| Governance | POST | `/governance/records` |
| Scenario | POST | `/scenario/what-if` |
| Copilot | POST | `/copilot/query` |

## Permissions (Phase-1)

| Permission | Typical roles |
|------------|----------------|
| `engagement_read` | admin, hr_admin, hr_viewer, recruiter |
| `engagement_write` | admin, hr_admin |
| `engagement_analytics` | admin, hr_admin, hr_viewer |
| `engagement_executive` | admin, hr_admin |
| `engagement_ai` | admin, hr_admin |
| `engagement_privacy_raw` | admin, hr_admin (reserved; raw pulse PII still uses existing `_require_engagement_raw_privileged` on legacy routes) |

Router defaults: read/write gates use `engagement_read` / `engagement_write`; executive and AI integration endpoints use `engagement_executive` and `engagement_ai`.

## MongoDB collections

All `ese_*` collections are declared in `backend/m17_employee_satisfaction_engagement/constants.py`. Indexes are ensured via `ensure_m17_indexes` on application startup.

## Seed data

Script: `backend/scripts/seed_employee_satisfaction_engagement_demo.py`  
Marker: `ESE_M17_DEMO`  
Force re-seed: `ESE_SEED_FORCE=1`

Invoked from `backend/docker-entrypoint.sh` after other module seeds.

## Validation rules (selected)

- **FeedbackCreate**: `feedback_text` required; severity defaults to `low`.
- **ActionPlanCreate**: `scope_id`, `action_title`, `owner_id`, `due_date` required.
- **ScenarioWhatIfCreate**: optional body; `scenario_type` defaults to `custom`.

## Tests

- `backend/tests/test_m17_ese_schemas.py` — schema defaults and segment map sanity.
