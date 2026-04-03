# Observability stack (M0-3)

## API metrics

The FastAPI app exposes:

| Endpoint | Auth | Format |
|----------|------|--------|
| `GET /metrics` | Optional `PROMETHEUS_SCRAPE_TOKEN` → `Authorization: Bearer …` | Prometheus text |
| `GET /api/metrics` | Bearer JWT + **admin** role | JSON (in-memory detail) |

Prometheus metrics (low cardinality):

- `aai_http_requests_total{method,status_class}` — `status_class`: `2xx`, `3xx`, `4xx`, `5xx`
- `aai_http_request_duration_seconds_bucket` (+ `_sum`, `_count`) — histogram by `method`

Environment (see `backend/.env.example`):

- `LOG_FORMAT=json`, `SERVICE_NAME`, `REQUEST_ID_HEADER`, `PROMETHEUS_SCRAPE_TOKEN`

## Structured logging

See **`memory/runbooks/structured-logging-standard.md`**.

## Alert rules (as code)

- **`rules/aai-hrms-alerts.yml`** — target down, high 5xx rate/ratio, high p95 latency  
- Mount into Prometheus `rule_files` (already referenced in `prometheus.yml`).

## Alertmanager

- **`docker-compose.yml`** includes **Alertmanager** on **:9093** with **`alertmanager.yml`** (default `noop` receiver).
- Copy patterns from **`alertmanager.example-overrides.yml`** into `alertmanager.yml` (or mount a secret) for **Slack** + **PagerDuty**.
- Prometheus is configured with `alerting.alertmanagers` → `alertmanager:9093`.

## Grafana dashboards

- **`grafana/dashboards/aai-hrms-api.json`** — request rate by status, 5xx rate, p95 latency, `up`
- **`grafana/dashboards/m3-workforce-intel-accuracy.json`** — M3 model vs heuristic MAE / MAPE (populate via `POST /api/admin/workforce-intel/monitoring/evaluate`)
- Provisioned via **`grafana/provisioning/`** when using `docker-compose.yml`.

## Local run

1. Start API on **:8001** (or edit `prometheus.yml` `targets`).
2. `docker compose up -d` in this directory.
3. Open Grafana **http://localhost:3001** (default `admin` / `admin`).

## GitHub Actions

Existing **`.github/workflows/uptime-probe.yml`** complements Prometheus alerts for **synthetic** uptime from outside your cluster.
