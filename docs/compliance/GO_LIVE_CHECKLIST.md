# Go-live checklist (engineering + product + ops)

Use for final Week 12 gate or any production cutover. Each line needs **owner initials + date**.

## Engineering

- [ ] Branch protection + required checks enabled (see `docs/runbooks/GITHUB_BRANCH_PROTECTION.md`)
- [ ] All migrations applied to prod (`mongo_migrate.py status`)
- [ ] Secrets from vault / cloud SM only (no prod `.env` on servers)
- [ ] Prometheus scraping `/metrics`; Alertmanager routes tested (Slack and/or PagerDuty)
- [ ] Backup CronJob (or equivalent) **applied** with **durable** object storage (S3-compatible)
- [ ] DR drill executed once; evidence under `docs/compliance/dr-drills/` (see README there)
- [ ] Load test report archived; SLO/latency targets documented (`docs/testing/M12_LOAD_TEST_SLO.md`)

## Product

- [ ] Executive KPIs accepted (incl. Week 4 talent metrics on Executive dashboard / `GET /executive/kpis`)
- [ ] Leadership pack ZIP smoke-tested (`POST /executive/m9/export-packs/full-leadership-pack`)

## Ops

- [ ] On-call rotation + PagerDuty/Slack destination verified
- [ ] Runbooks linked in incident channel topic
- [ ] Weekly demo slot + staging URL shared with stakeholders

**Sign-off**

| Role | Name | Signature / date |
|------|------|-------------------|
| Engineering lead | | |
| Product owner | | |
| Ops / SRE | | |
