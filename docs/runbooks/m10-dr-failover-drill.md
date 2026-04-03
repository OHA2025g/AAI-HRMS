# M10 — failover & backup / restore drill (M10-3)

Run **quarterly** or after major infra changes. Goal: prove **RPO/RTO** assumptions for MongoDB + API.

## Preconditions

- Staging or isolated environment that mirrors prod topology (single replica set minimum).
- Recent **mongodump** procedure documented for prod (path, credentials, encryption).
- API **health** URL and **`GET /api/admin/m10-events/stats`** (admin JWT) for post-checks.

## Drill A — API instance failure

1. Run load or `backend/scripts/perf_smoke_m10.py` against the LB URL.
2. Terminate one API pod/VM (or stop one uvicorn worker if single host).
3. **Pass:** remaining instances serve `GET /api/health` 200; no sustained 5xx on retry.
4. **Note:** M10 consumer runs **per process**; with multiple API replicas each runs a consumer loop — **safe** because Mongo `find_one_and_update` claims a single document per event. For **single** replica, set `M10_EVENT_CONSUMER_ENABLED=0` on extra replicas if you ever observe duplicate side-effects (future: dedicated worker deployment).

## Drill B — MongoDB primary failover

1. In a **non-prod** cluster, trigger replica set step-down / kill primary.
2. **Pass:** application reconnects (Motor) and writes succeed within agreed **RTO** (measure).
3. Record **RPO** from oplog lag / backup schedule.

## Drill C — Restore from backup

1. Restore dump into a **fresh** database name (e.g. `aai_hrms_drill_YYYYMMDD`).
2. Point a **throwaway** API instance at restored DB.
3. Verify counts: employees, `m10_events` sample, `GET /api/admin/m10-events/stats`.
4. **Pass:** app starts; critical read paths work; document any manual fixes required.

## Evidence to archive

- Timestamps, RTO/RPO numbers, screenshots or CLI logs.
- Tickets for gaps (e.g. missing automation for restore).
