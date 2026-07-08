# Navigation rollout checklist

Use when enabling **full HRMS** (`REACT_APP_SMART_HIRING_ONLY=0`) or validating Smart Hiring–only deployments.

## Smart Hiring–only (default)

- [ ] `SMART_HIRING_ONLY=1` and `REACT_APP_SMART_HIRING_ONLY=1` in env / Docker
- [ ] Sidebar shows **Smart Hiring (Talent Acquisition)** + **Smart Hiring Admin** only
- [ ] Deep links outside allowed routes redirect or 404 per `App.jsx` (`isRouteAllowedInSmartHiringOnly`)
- [ ] QA users: `qa_admin@`, `qa_hm@`, `qa_tm@`, `qa_pm@` after `seed_qa_baseline.py` v2

## Full HRMS

- [ ] Set `REACT_APP_SMART_HIRING_ONLY=0`, rebuild frontend
- [ ] Verify groups m2–m9 appear for appropriate roles (admin / hr_admin)
- [ ] Resource & staffing hub: `/resource-staffing-hub`
- [ ] Legacy engagement: `/employee-engagement/legacy` shows migration banner to ESE
- [ ] `/employee-retention` redirects to High-Skill Talent Retention dashboard

## Cross-module links (phases 7–9)

- [ ] WFI cost drill-downs link to Cost Optimization where configured
- [ ] ESE segments show “Open in WFI” where mirrored
- [ ] Executive KPIs cross-link from main dashboard

## Regression

- [ ] `cd e2e && npm test` (includes `hiring-rbac.spec.js`, `hiring-rbac-offer-proposal.spec.js`)
- [ ] `cd backend && pytest tests/test_hiring_rbac.py tests/test_hiring_rbac_api.py -q`

Reference map: [navigation-canonical-map.md](./navigation-canonical-map.md).
