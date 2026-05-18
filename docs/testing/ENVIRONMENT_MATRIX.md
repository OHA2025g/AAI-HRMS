# Environment matrix (Week 1)

Single reference for **where** each concern lives. Adjust names to your org; keep **one** source of truth (no prod manual edits outside IaC / secret store).

| Concern | Local dev | QA / staging | Production |
|--------|-----------|--------------|------------|
| App API | `uvicorn` on laptop | K8s / VM + CI deploy | K8s / VM + approved release |
| MongoDB | Docker / Atlas dev | Atlas staging / dedicated cluster | Atlas prod / HA replica set |
| Secrets | `.env` (never commit) | Secret manager + CI OIDC | Secret manager only |
| Observability | `deploy/observability/docker-compose.yml` | Shared Prometheus/Grafana or SaaS | Same + Alertmanager → Slack/PD |
| Migrations | `python scripts/mongo_migrate.py up` | CI + deploy hook | CI + controlled job |
| Backups | Optional | Required (S3 + retention) | Required + tested restore |
| Load / perf | k6 local | k6 vs staging (`K6_BASE_URL`) | Formal report (see `docs/testing/M12_LOAD_TEST_SLO.md`) |

**Definition of Done (process):** QA/staging deploy succeeds, weekly demo done, acceptance sign-off filed (`docs/product/WEEKLY_ACCEPTANCE_SIGNOFF.md`).
