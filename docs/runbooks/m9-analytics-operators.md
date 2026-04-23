# M9 analytics — operator checklist (snapshots & webhooks)

## 1. API environment variables

Set these on the **backend API** deployment (Kubernetes env, systemd, Docker, etc.). Local dev: `backend/.env`.

| Variable | Required? | Purpose |
|----------|------------|---------|
| **`M9_SNAPSHOT_TOKEN`** | **Yes** for cron/Actions | Shared secret. Caller must send header **`X-M9-Snapshot-Token`** with the **same** value on `POST .../monthly-snapshot-cron`. |
| **`M9_LEADERSHIP_WEBHOOK_URL`** | No | HTTPS URL of your integration (Slack adapter, internal bus, etc.). After each snapshot is **created** (JWT or cron), the API **POST**s a small JSON payload (see §4). |
| **`M9_LEADERSHIP_WEBHOOK_SECRET`** | No | If set, sent as header **`X-M9-Signature`** on outbound webhook POSTs so the receiver can verify the caller. |

**Generate a token (example):**

```bash
openssl rand -hex 32
```

Put the output in **`M9_SNAPSHOT_TOKEN`** on the API. Put the **same** string in GitHub secret **`M9_SNAPSHOT_TOKEN`** (or in your cron host env).

---

## 2. Cron / GitHub Actions URL

Callers must use a **full URL** including path (no trailing slash required):

```text
https://<your-api-host>/api/executive/m9/export-packs/monthly-snapshot-cron
```

**Local default** (see `backend/scripts/m9_snapshot_cron.sh`):

```text
http://127.0.0.1:11001/api/executive/m9/export-packs/monthly-snapshot-cron
```

**Method:** `POST`  
**Headers:**

- `X-M9-Snapshot-Token: <same as M9_SNAPSHOT_TOKEN on API>`
- `Content-Type: application/json`

**Body:** `{}` for “previous calendar month (UTC)”, or e.g.:

```json
{ "period": "2025-02", "horizon_months": 3, "window_days": 30 }
```

**Smoke test (replace host and token):**

```bash
curl -sS -o /tmp/m9_out.json -w "%{http_code}\n" \
  -X POST \
  -H "X-M9-Snapshot-Token: YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "https://your-api.example.com/api/executive/m9/export-packs/monthly-snapshot-cron"
```

Expect HTTP **200** and JSON with `id`, `period`, `delivery_hook`.

---

## 3. GitHub Actions

Workflow: **`.github/workflows/m9-leadership-snapshot.yml`**

| Repository secret | Value |
|-------------------|--------|
| **`M9_SNAPSHOT_URL`** | Full URL from §2 (production API). |
| **`M9_SNAPSHOT_TOKEN`** | **Exact copy** of API env **`M9_SNAPSHOT_TOKEN`**. |

The job is skipped unless **both** secrets are non-empty. Schedule: 1st of month **07:00 UTC** (edit `cron` in the workflow if needed). Use **Run workflow** for a manual test.

---

## 4. Outbound webhook (optional)

When a snapshot is persisted, the API posts to **`M9_LEADERSHIP_WEBHOOK_URL`** (if set):

- **Body (example shape):** `event`, `period`, `generated_at`, `summary` (headline KPIs).
- **Header:** `X-M9-Signature: <M9_LEADERSHIP_WEBHOOK_SECRET>` when secret is configured.

If the URL is unset, `delivery_hook` in the API response will indicate `no_webhook_configured` — snapshots are still stored and downloadable via JWT (`GET .../export-packs/.../download`).

---

## 5. Manual / host cron

```bash
export M9_SNAPSHOT_TOKEN='...'           # same as API
export M9_SNAPSHOT_URL='https://<host>/api/executive/m9/export-packs/monthly-snapshot-cron'
./backend/scripts/m9_snapshot_cron.sh
```

---

## 6. Interactive (JWT) path

Users with **`kpi_read`** can still create snapshots from the UI or:

`POST /api/executive/m9/export-packs/monthly-snapshot` with body `{ "period": "YYYY-MM", ... }`.

That path does **not** use `M9_SNAPSHOT_TOKEN`; cron uses **`monthly-snapshot-cron`** only.
