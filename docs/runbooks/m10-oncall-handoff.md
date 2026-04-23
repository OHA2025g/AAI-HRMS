# M10 — on-call handoff & scalability (M10-3)

## System context

- **Monolith API** (FastAPI) + **MongoDB**.
- **M10 outbox** collection `m10_events`: async integration backbone; background consumer enabled by default (`M10_EVENT_CONSUMER_ENABLED=1`).

## What to watch

| Signal | Where | Action |
|--------|--------|--------|
| API errors / latency | APM, LB logs | Scale replicas; check Mongo CPU |
| `m10_events` backlog | `GET /api/admin/m10-events/stats` | If **PENDING** grows: check consumer logs, FAILED count, Mongo locks |
| Disk / RAM Mongo | DB monitoring | Expand volume / RAM before 80% sustained |
| Failed workflow runs | M7 admin runs | Often business logic; separate from M10 unless publish storm |

## Escalation

1. **P1** — auth down, data loss suspected, payment-impacting: page platform + DBA.
2. **P2** — analytics/snapshots delayed, elevated `PENDING` events: owner **platform**; use replay after root-cause.
3. **P3** — doc / runbook gaps: PR to `docs/runbooks/`.

## Useful admin APIs (JWT admin)

- `GET /api/admin/m10-events/stats` — outbox depth.
- `POST /api/admin/m10-events/replay` — body `{"event_ids":["..."]}` or `{"topic":"hrms.workflow.run.completed.v1","since_iso":"..."}`; query `clear_idempotency=true` only when handlers were fixed and you need true reprocessing.

## References

- Architecture: `docs/engineering/M10_ARCHITECTURE_BLUEPRINT.md`
- Implementation: `docs/engineering/M10_IMPLEMENTATION_STATUS.md`
- DR drill: `docs/runbooks/m10-dr-failover-drill.md`
