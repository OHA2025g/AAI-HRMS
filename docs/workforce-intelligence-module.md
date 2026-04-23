## Workforce Intelligence (M15)

This module upgrades Workforce Intelligence into a **strategic workforce visibility + optimization + predictive decision-support system**.

### Frontend routes

- **Base**: `/workforce-intelligence/*`
- **Dashboard**: `/workforce-intelligence/dashboard`
- **Copilot**: `/workforce-intelligence/ai-copilot`
- **Drill-down pages (tables)**: `headcount`, `demographics`, `skills-capability`, `availability-utilization`, `performance-productivity`, `engagement-experience`, `compliance-documents-policy`, `cost-compensation`, `workforce-planning`, `demand-supply`, `scenario-modeling`, `forecasting`, `attrition-flight-risk`, `burnout-wellbeing-risk`, `skill-risk-capability-gap`, `cost-risk-budget`, `compliance-audit-risk`, `ai-recommendations`, `strategic-risk-intelligence`, `strategic-opportunity-intelligence`, `executive-intelligence`
- **Legacy demand/supply forecast page** remains available at: `/workforce-intelligence/legacy-demand-supply`

### Backend API

All endpoints are under:

- `/api/workforce-intelligence/*`

Key endpoints:

- `GET /workforce-intelligence/dashboard/summary`
- `GET /workforce-intelligence/executive/summary`
- `GET /workforce-intelligence/headcount` (and other drill-down list endpoints)
- `POST /workforce-intelligence/copilot/query`
- `GET /workforce-intelligence/copilot/queries`

### Collections (MongoDB)

Collections are prefixed with `wfi_*` (see `backend/m15_workforce_intelligence/constants.py`).

### RBAC

This module reuses existing guards:

- **Read**: `kpi_read`
- **Write**: `skills_write` (reserved for future editable endpoints; current drill-downs are list-based)

### Demo seed data

`backend/scripts/seed_workforce_intelligence_demo.py` seeds:

- Multi-month workforce snapshots
- Headcount + demographics + skill visibility + utilization
- Engagement/performance/compliance/cost snapshots
- Workforce plans + demand/supply + scenario models + manager effectiveness
- Forecasts + attrition/burnout/skill/cost/compliance risk predictions
- AI recommendations + strategic risk/opportunity snapshots + executive summaries

It runs automatically via `backend/docker-entrypoint.sh`.

