# Centralized Logging and Alerting (M0)

## Purpose
Operational guide to ship logs to a central system and define alert thresholds for AAI-HRMS until a vendor-specific integration is wired.

## Application logging

### JSON logs (log shipping friendly)
The backend supports one-line JSON logs for easier parsing by agents (CloudWatch, Datadog, Loki, ELK, etc.).

- Set environment variable: **`LOG_FORMAT=json`** (also accepts `structured`).
- Default remains human-readable text if unset or `LOG_FORMAT=text`.

Example (local):

```bash
export LOG_FORMAT=json
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Structured log fields (standard)
See **`structured-logging-standard.md`**. JSON logs include **`service`**, **`request_id`**, **`ts`**, **`level`**, **`logger`**, **`msg`** (and **`exc`** when present). Every response echoes **`X-Request-ID`** (or **`REQUEST_ID_HEADER`**).

### Recommended log fields to monitor
- `level` = ERROR for application faults
- `request_id` for trace correlation across services
- `service` to split environments / clusters
- `msg` / `logger` for triage

## Centralized log shipping (choose one pattern)

**Sample configs (Fluent Bit):** see `docs/runbooks/samples/fluent-bit-aai-hrms.conf` and `parsers-aai-hrms.conf` (pair with `LOG_FORMAT=json` on the API).

### Pattern A: Container / platform native
- **AWS:** CloudWatch Logs driver for ECS/EKS; log group per service.
- **GCP:** Cloud Logging agent or default GKE logging.
- **Azure:** Container Insights / Log Analytics.

### Pattern B: Agent on VM
- Install **Fluent Bit**, **Vector**, or **Filebeat** to tail stdout and forward to your sink.
- Filter: service name, environment (`dev` / `staging` / `prod`).

### Pattern C: PaaS
- Heroku/Railway/Render: use built-in log drains to your provider.

**Acceptance:** All API instances emit logs to one queryable store with retention ≥ 30 days in production.

## Metrics and dashboards

### Prometheus (M0-3)
- **`GET /metrics`** — Prometheus text exposition (`aai_http_requests_total`, `aai_http_request_duration_seconds`).
- Optional protection: set **`PROMETHEUS_SCRAPE_TOKEN`** and scrape with `Authorization: Bearer <token>`.

### Grafana dashboard (as code)
- Import / provision: **`deploy/observability/grafana/dashboards/aai-hrms-api.json`**
- Local stack: **`deploy/observability/docker-compose.yml`** + **`deploy/observability/README.md`**

### Built-in API metrics (admin JSON)
- `GET /api/metrics` (Bearer token, **admin** role) exposes:
  - total requests / errors
  - per-path counts, errors, average latency (ms)

Use JSON endpoint for **deep dives**; use **Prometheus + Grafana** for **SRE dashboards**.

### Suggested extra panels
- MongoDB availability (ping / connection errors in logs)
- Saturation: CPU/memory per pod (from kube-state-metrics / cAdvisor)

## Alert rules (as code, M0-3)

Prometheus rule file: **`deploy/observability/rules/aai-hrms-alerts.yml`**

| Alert (file) | Intent |
|----------------|--------|
| `AaiHrmsTargetDown` | Scrape / instance down |
| `AaiHrmsHigh5xxRate` | Absolute 5xx req/s spike |
| `AaiHrmsHigh5xxRatio` | 5xx share of traffic |
| `AaiHrmsHighLatencyP95` | p95 latency over 5s |

Wire **Alertmanager** for notifications (email/Slack/PagerDuty). Complement with **`.github/workflows/uptime-probe.yml`** for external synthetic checks.

## Alerting policies (starter set — runbook)

| Alert | Condition | Severity |
|-------|-----------|----------|
| API down | `/api/health` non-200 for 2+ minutes | P1 |
| Error spike | 5xx rate > 2% of traffic for 5 minutes | P2 |
| Latency | p95 > agreed SLO for 10 minutes | P3 |
| Disk / memory | Node thresholds per host/K8s | P2 |

**Acceptance:** On-call receives alerts with runbook link (`incident-response.md`) and environment label.

## Uptime checks
- Synthetic probe: `GET /api/health` every 60s from two regions if possible.
- Repo workflow: **uptime-probe.yml** (optional `UPTIME_PROBE_URL` secret).

## Next hardening (optional)
- OpenTelemetry traces for FastAPI + MongoDB.
- WAF / rate-limit metrics.
