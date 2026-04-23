# Deployment helpers (M0)

## Data migrations, QA seed, restore checks (M0-4)

| Script | Purpose |
|--------|---------|
| `backend/scripts/mongo_migrate.py` | Apply/list Mongo migrations (`up`, `status`) |
| `backend/scripts/seed_qa_baseline.py` | Idempotent QA admin + sample records |
| `backend/scripts/validate_restore.py` | HTTP (+ optional Mongo) smoke after restore/deploy |

Docs: `backend/migrations/README.md`, `memory/runbooks/qa-seed-and-validate.md`, `memory/runbooks/migrations-and-rollback.md`.

## Observability (Prometheus / Grafana / alerts)

See **`deploy/observability/README.md`** — `GET /metrics`, Grafana dashboard JSON, Prometheus alert rules, `docker compose` stack.

## Application secrets (Vault / AWS)

Backend can load secrets from **HashiCorp Vault** (KV v2) or **AWS Secrets Manager** after `.env`. See **`memory/runbooks/secret-stores.md`** and `backend/.env.example` (`SECRET_STORE`).

## Scheduled MongoDB backup — GitHub Actions

Workflow: `.github/workflows/mongo-backup-scheduled.yml`

### Required repository secrets

| Secret | Description |
|--------|-------------|
| `MONGO_BACKUP_URL` | MongoDB URI (read access sufficient for `mongodump`) |
| `MONGO_BACKUP_DB_NAME` | Database name, e.g. `aai_hrms` |

### Behavior

- Runs **weekly** (cron in workflow) and on **manual** `workflow_dispatch`.
- Uses `backend/scripts/mongo_backup.sh` and uploads **`backups/mongo/`** as a workflow artifact.
- Artifact **retention** is set to **14 days** in the workflow (GitHub maximum for free tier may apply).

### Optional — copy backups to AWS S3

The workflow supports **two** upload jobs (only one runs):

#### A) OIDC (recommended)

Set **`AWS_ROLE_TO_ASSUME`** to the IAM role ARN trusted by GitHub OIDC. Also set **`S3_BACKUP_BUCKET`**.

| Secret | Required | Description |
|--------|----------|-------------|
| `S3_BACKUP_BUCKET` | Yes | Target bucket |
| `AWS_ROLE_TO_ASSUME` | Yes | Role ARN, e.g. `arn:aws:iam::123456789012:role/gha-aai-hrms-backup` |
| `AWS_REGION` | No | Defaults to `us-east-1` |
| `S3_BACKUP_PREFIX` | No | Key prefix; default `aai-hrms/mongo` |

**IAM trust policy (sketch):** allow `sts:AssumeRoleWithWebIdentity` for `token.actions.githubusercontent.com`, subject restricted to this repo and optionally the `mongo-backup-scheduled` workflow / environment. Attach a policy with `s3:PutObject` (and `s3:ListBucket` on the prefix if needed) on the backup bucket.

When **`AWS_ROLE_TO_ASSUME`** is set, the **static key** job is **skipped** even if access keys exist.

#### B) Static access keys (fallback)

| Secret | Required | Description |
|--------|----------|-------------|
| `S3_BACKUP_BUCKET` | Yes | Target bucket |
| `AWS_ACCESS_KEY_ID` | Yes | IAM user key with `s3:PutObject` on the prefix |
| `AWS_SECRET_ACCESS_KEY` | Yes | Matching secret |
| `AWS_REGION` | No | Defaults to `us-east-1` |
| `S3_BACKUP_PREFIX` | No | Key prefix; default `aai-hrms/mongo` |

Runs only if **`AWS_ROLE_TO_ASSUME` is not set**.

Objects are written under: `s3://<bucket>/<prefix or default>/<ref_name>/<run_id>-<run_attempt>/`.

### Production note

GitHub artifacts are convenient for smoke tests, not long-term retention. For production:

1. Enable **S3 upload** (above) or another durable store (`gcloud storage`, Azure Blob).
2. Restrict the MongoDB user used in `MONGO_BACKUP_URL` to backup/read-only roles.

## M8 retention — scheduled attrition score run

Workflow: `.github/workflows/m8-retention-score-run.yml`

| Secret | Description |
|--------|-------------|
| `M8_SCORE_RUN_URL` | Full URL to `POST .../api/workforce/retention/v1/score-run-cron` |
| `M8_SCORE_RUN_TOKEN` | Same value as backend env `M8_SCORE_RUN_TOKEN` (header `X-M8-Score-Token`) |

Set `M8_SCORE_RUN_TOKEN` in the API deployment environment. The cron endpoint does **not** use JWT.

Operator checklist: `memory/runbooks/m8-retention-operators.md`. Local trigger: `backend/scripts/m8_score_run_cron.sh`.

## M9 analytics — leadership snapshots & webhooks

- Migration **`backend/migrations/0008_m9_analytics_indexes.py`** (KPI overrides + snapshot store). See `memory/M9_IMPLEMENTATION_STATUS.md`.
- **Env:** `M9_LEADERSHIP_WEBHOOK_URL`, optional `M9_LEADERSHIP_WEBHOOK_SECRET` — invoked when a monthly snapshot is created (JWT or cron path).
- **Cron (no JWT):** set **`M9_SNAPSHOT_TOKEN`** in the API environment; call **`POST /api/executive/m9/export-packs/monthly-snapshot-cron`** with header **`X-M9-Snapshot-Token`**. Optional JSON body `{ "period": "YYYY-MM", "horizon_months", "window_days" }`; if `period` omitted, API uses **previous calendar month (UTC)**.
- **GitHub Actions:** workflow **`m9-leadership-snapshot.yml`** — secrets `M9_SNAPSHOT_URL` (full URL ending in `/api/executive/m9/export-packs/monthly-snapshot-cron`), `M9_SNAPSHOT_TOKEN` (must match API env).
- **Local script:** `backend/scripts/m9_snapshot_cron.sh`.
- **Runbook:** `memory/runbooks/m9-analytics-operators.md` (curl smoke test, env table, webhook behavior).

## M10 architecture & event backbone

- Migration **`backend/migrations/0009_m10_event_backbone.py`** — outbox + idempotency indexes. See **`memory/M10_IMPLEMENTATION_STATUS.md`** and **`memory/M10_ARCHITECTURE_BLUEPRINT.md`**.
- **Env:** **`M10_EVENT_CONSUMER_ENABLED`** — default on; set **`0`** on API replicas if a dedicated consumer worker is introduced.
- **Ops:** `GET /api/admin/m10-events/stats`, `POST /api/admin/m10-events/replay` (admin JWT).
- **Perf smoke:** `python backend/scripts/perf_smoke_m10.py` (optional `PERF_BASE_URL`).
- **Runbooks:** `memory/runbooks/m10-dr-failover-drill.md`, `memory/runbooks/m10-oncall-handoff.md`.

## M7 workflow automation — scheduled rules

Rules with `trigger_type=ON_SCHEDULE` advance `schedule_next_run_at` only after a successful run. The app evaluates due schedules when **`POST /api/admin/workflow-automation/dispatch-triggered`** is called (same admin endpoint as lifecycle threshold rules). For production, invoke that endpoint on a cron (e.g. every 1–5 minutes) with an admin JWT, or wire your own scheduler.

**Inbound triggers:** external systems call `POST /api/webhooks/workflow/inbound/{rule_id}` with the shared secret (header or query). Outbound **`HTTP_WEBHOOK`** URLs must be `https://` unless `WORKFLOW_WEBHOOK_ALLOW_PRIVATE_IPS=1` for dev (see `backend/.env.example`).

## API uptime probe — GitHub Actions

Workflow: `.github/workflows/uptime-probe.yml`

| Secret | Required | Description |
|--------|----------|-------------|
| `UPTIME_PROBE_URL` | Yes (enables job) | e.g. `https://your-api.example.com/api/health` |
| `UPTIME_PROBE_BEARER_TOKEN` | No | Bearer token if you must probe an authenticated URL |

Runs on a schedule (every 2h) and on `workflow_dispatch`. Fails the job if the response is not HTTP **200** — use as a minimal alert signal (email/notification from GitHub Actions or branch rules).

## M3 Workforce Intel — optional ETL cron (GitHub Actions)

Workflow: `.github/workflows/m3-workforce-intel-etl.yml` — weekly `POST` to `.../api/admin/workforce-intel/etl/snapshot`.

| Secret | Description |
|--------|-------------|
| `M3_ETL_API_URL` | Full URL to the snapshot endpoint |
| `M3_ETL_ADMIN_JWT` | Admin JWT (`Authorization: Bearer …`) |

**Monitoring thresholds (API env):** `WORKFORCE_INTEL_DRIFT_ALERT_ABS_PCT`, `WORKFORCE_INTEL_MAPE_RETRAIN_THRESHOLD_PCT`, `WORKFORCE_INTEL_MIN_SKILLS_FOR_EVAL`. See `memory/M3_IMPLEMENTATION_STATUS.md`.

## M4 Resource optimization — schema migration

Apply **`backend/migrations/0003_m4_allocation_schema.py`** via `python scripts/mongo_migrate.py up` (adds demand min/max / constraint type defaults + optimization settings doc). See `memory/M4_IMPLEMENTATION_STATUS.md`.

## M5 Training — optional path template seed

Migration **`backend/migrations/0004_m5_training_seed.py`** (optional Python learning-path template). See `memory/M5_IMPLEMENTATION_STATUS.md`. Optional env **`M5_LMS_STUB_JSON`**: JSON array of course objects for stub LMS sync.

## M6 Employee engagement — indexes & privacy

- Migration **`backend/migrations/0005_m6_engagement_indexes.py`** — templates, schedules, privacy audit indexes (idempotent). See `memory/M6_IMPLEMENTATION_STATUS.md`.
- **Env:** **`ENGAGEMENT_ANONYMITY_MIN_RESPONSES`** (default `5`) — minimum responses before per-**survey** dashboard aggregates are shown (anonymity threshold). Set in API deployment env / `backend/.env`.

## M7 Workflow automation & HR copilot — indexes

- Migration **`backend/migrations/0006_m7_automation_indexes.py`** — workflow rules/runs, copilot audit, manual baselines. See `memory/M7_IMPLEMENTATION_STATUS.md`.
- Optional ops: schedule `POST /api/admin/workflow-automation/dispatch-triggered` with admin JWT (cron/GitHub Actions) to evaluate threshold-triggered rules.

## Kubernetes — example CronJob

See `k8s/mongo-backup-cronjob.yaml`.

1. Create a secret with keys `MONGO_URL` and `DB_NAME` (see comments in the manifest).
2. Adjust schedule, resource limits, and **add** a PVC or sidecar upload to object storage so backups are not left only in ephemeral storage.

## Log shipping sample

See `memory/runbooks/samples/fluent-bit-aai-hrms.conf` (Fluent Bit) and runbook `memory/runbooks/logging-and-alerting.md`.
