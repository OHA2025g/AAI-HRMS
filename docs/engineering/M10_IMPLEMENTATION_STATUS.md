# M10 Architecture & scalability — implementation status

## M10-1 Domain decomposition blueprint (5 SP)
- **`docs/engineering/M10_ARCHITECTURE_BLUEPRINT.md`**
  - **Service boundary proposal:** bounded contexts (TA, Employee, Workforce, Engagement, Automation, Retention, Analytics, IAM) vs current monolith modules.
  - **API gateway route plan:** path prefixes, auth, webhooks, health/metrics.
  - **Migration sequencing:** phases 0–5 (events → gateway → read scale → extract service → HA/DR).

## M10-2 Event-driven backbone rollout (13 SP)
- **Event schema:** `m10_events/schemas.py` — `M10EventEnvelope` (event_id, topic, occurred_at, producer, correlation/causation, idempotency_key, payload, schema_version).
- **Topics (versioned):** `m10_events/topics.py` — e.g. `hrms.employee.lifecycle_event.created.v1`, `hrms.workflow.run.completed.v1`, `hrms.workflow.run.failed.v1`.
- **Producer:** `m10_events/producer.py` — Mongo outbox `m10_events`; producer idempotency on `(topic, idempotency_key)`.
- **Consumers:** `m10_events/consumer.py` — asyncio loop; **atomic claim** (`PENDING` → `PROCESSING`); handlers in `handlers.py` (logging + audit today; extend for side-effects).
- **Key flows wired:** employee lifecycle **create** → topic `...lifecycle_event.created.v1`; M7 workflow **SUCCESS/FAILED** → `...completed` / `...failed`.
- **Idempotency & replay:** `m10_events/idempotency.py` — per-consumer row after successful handler; `replay.py` + `POST /api/admin/m10-events/replay` (optional `clear_idempotency`); delivery attempts capped (`MAX_DELIVERY_ATTEMPTS`).
- **Admin:** `GET /api/admin/m10-events/stats`.
- **Indexes / migration:** `backend/migrations/0009_m10_event_backbone.py` (+ startup mirrors indexes).
- **Env:** `M10_EVENT_CONSUMER_ENABLED` — set `0` to disable in-process consumer (e.g. dedicated worker later). See `backend/.env.example`.

## M10-3 Performance, HA, and DR readiness (8 SP)
- **Load / perf smoke:** `backend/scripts/perf_smoke_m10.py` — threaded `GET /api/health` (`PERF_BASE_URL`, `PERF_REQUESTS`, `PERF_CONCURRENCY`). Extend with authenticated routes behind env flag as needed.
- **Failover / backup drill:** `docs/runbooks/m10-dr-failover-drill.md`.
- **On-call handoff:** `docs/runbooks/m10-oncall-handoff.md`.
- **Tests:** `backend/tests/test_m10_events.py` (+ manifest includes `0009_m10_event_backbone`).

## Local setup
```bash
cd backend && python scripts/mongo_migrate.py up   # applies 0009 among others
```
Consumer starts with API unless `M10_EVENT_CONSUMER_ENABLED=0`.

## Next steps (not in v1)
- External broker (Kafka/Redis) behind same envelope contract.
- Dedicated consumer deployment + disable consumer on API replicas if side-effects become non-idempotent.
- Locust/k6 suite in CI with seeded auth (optional).
