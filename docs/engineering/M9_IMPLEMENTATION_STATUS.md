# M9 Analytics & Executive Dashboard — implementation status

## M9-1 Unified KPI semantic layer
- **Catalog** (`m9_analytics/kpi_catalog.py`): built-in KPI definitions with **owner_role**, **steward_team**, **source_system**, **formula**, **sla_max_age_hours**. **Week 4 / talent acquisition:** `talent_acq_dedup_audit_count_window`, `talent_acq_primary_source_concentration_pct`, `talent_acq_top_match_precision_proxy_pct` (`m9_analytics/talent_kpis.py`).
- **Overrides**: Mongo `m9_kpi_definitions` keyed by `kpi_id` (unique index); merged in `load_merged_kpi_definitions`.
- **APIs**
  - `GET /api/executive/m9/kpi-definitions` — definitions + ownership matrix.
  - `GET /api/executive/m9/kpi-pack` — catalog + computed **values** + **freshness** + **`talent_acquisition`** detail object (single contract for KPI retrieval).
  - `GET /api/executive/kpis` — includes **`talent_acquisition`** (same window as M9 pack default slice: **30d** for talent metrics).
  - `GET /api/executive/m9/freshness` — SLA checks only (`m9_analytics/freshness.py`).
- **Strategic aggregation** (`m9_analytics/strategic_aggregate.py`): shared builder for org-wide and scoped drill; drives refactored `GET /api/executive/strategic-dashboard` (+ optional `window_days`, `analytics_window_days` on response).

## M9-2 Drill-down dashboards
- **Scope** (`m9_analytics/drill_scope.py`): **department** (exact, case-insensitive), **manager_root_id** (full subtree per M2 org model), **role_title_contains** (substring).
- **API**: `GET /api/executive/m9/strategic-drill` — `{ filters, scope_employee_count, dashboard, cache }`; **in-process cache** ~45s (`DRILL_DASHBOARD_CACHE_TTL_SEC`).
- **Options**: `GET /api/executive/m9/drill-options` — distinct departments + manager roots (≤200).
- **UI**: `ExecutiveKpiPage.jsx` — linked horizon, analytics window, department / team / role filters, freshness badges, export section.

## M9-3 Leadership export packs
- **Snapshot**: `POST /api/executive/m9/export-packs/monthly-snapshot` body `{ period: "YYYY-MM", horizon_months?, window_days? }` — persists full payload in `m9_leadership_snapshots`, returns `delivery_hook` result (JWT `kpi_read`).
- **Cron snapshot (no JWT)**: `POST /api/executive/m9/export-packs/monthly-snapshot-cron` — header `X-M9-Snapshot-Token` = env **`M9_SNAPSHOT_TOKEN`**. Optional JSON body; if **`period` omitted**, defaults to **previous calendar month (UTC)**.
- **Download**: `GET /api/executive/m9/export-packs/{id}/download?format=csv|pdf|json` (CSV via stdlib; PDF via **fpdf2**).
- **Week 11 one-click ZIP**: `POST /api/executive/m9/export-packs/full-leadership-pack` — same body as monthly snapshot; returns **application/zip** (JSON + CSV + PDF, persists snapshot). UI: Executive KPI page **Download full leadership pack (ZIP)**.
- **List**: `GET /api/executive/m9/export-packs`.
- **Hooks**: optional env `M9_LEADERSHIP_WEBHOOK_URL` (+ `M9_LEADERSHIP_WEBHOOK_SECRET` header); `POST /api/executive/m9/export-packs/{id}/deliver` to re-send.
- **Scheduled delivery**: `.github/workflows/m9-leadership-snapshot.yml` (secrets `M9_SNAPSHOT_URL`, `M9_SNAPSHOT_TOKEN`); local `backend/scripts/m9_snapshot_cron.sh`.

## Data / ops
- **Indexes**: startup + migration `0008_m9_analytics_indexes.py`.
- **Dependency**: `fpdf2` in `backend/requirements.txt`.
- **Tests**: `backend/tests/test_m9_analytics.py`.
- **Env / ops**: `backend/.env.example` (`M9_SNAPSHOT_TOKEN`, `M9_LEADERSHIP_WEBHOOK_*`); runbook `docs/runbooks/m9-analytics-operators.md`.

### Local setup (deps + migrations)
1. **Python deps** (from repo root; includes **fpdf2** for PDF exports):
   ```bash
   pip install -r backend/requirements.txt
   ```
   Or with `python3 -m pip` if that is your default toolchain.
2. **Mongo migrations** (requires `MONGO_URL` / `DB_NAME` in `backend/.env` or env; **MongoDB must be running**):
   ```bash
   cd backend && python scripts/mongo_migrate.py up
   ```
   From repo root you can also run: `python backend/scripts/mongo_migrate.py up`.
   This records applied migrations in `_schema_migrations` and creates M9 indexes (idempotent with startup; migration keeps environments that don’t rely on API boot in sync).
3. **Verify `fpdf2`** (optional):
   ```bash
   python3 -c "from fpdf import FPDF; print('fpdf2 OK')"
   ```

### Configuration: scheduled snapshots & webhook (complete)

1. **On the API** set **`M9_SNAPSHOT_TOKEN`** to a long random secret (e.g. `openssl rand -hex 32`). Redeploy/restart the API so the env is loaded.
2. **Point schedulers** at **`POST /api/executive/m9/export-packs/monthly-snapshot-cron`** with header **`X-M9-Snapshot-Token: <same value>`** and JSON body `{}` (defaults to **previous month UTC**) or `{ "period": "YYYY-MM", ... }`.
   - **GitHub Actions:** add repo secrets **`M9_SNAPSHOT_URL`** (full URL including `/api/.../monthly-snapshot-cron`) and **`M9_SNAPSHOT_TOKEN`** (same as API). Workflow: `.github/workflows/m9-leadership-snapshot.yml`.
   - **Cron / VM:** run `backend/scripts/m9_snapshot_cron.sh` with `M9_SNAPSHOT_URL` + `M9_SNAPSHOT_TOKEN` exported.
3. **Optional outbound delivery:** set **`M9_LEADERSHIP_WEBHOOK_URL`** and, if needed, **`M9_LEADERSHIP_WEBHOOK_SECRET`** on the API. Each successful snapshot creation triggers a POST to that URL (summary payload + optional `X-M9-Signature`).

**Step-by-step runbook:** `docs/runbooks/m9-analytics-operators.md`.
