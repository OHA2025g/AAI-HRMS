# Talent acquisition connectors

| Connector | Status | Implementation |
|-----------|--------|----------------|
| **COMPANY_DB_CANDIDATES** | Supported | Internal Mongo / talent pool |
| **LINKEDIN (Apify)** | Supported | `talent_acquisition/apify_linkedin_connector.py` when `api_mode=apify` — PowerAI people search + Dev Fusion profile enrich |
| **LINKEDIN (RSC)** | Supported | `talent_acquisition/linkedin_connector.py` — webhooks, export queue when `api_mode=talent_rsc` |
| **NAUKRI** | **Not implemented** | Config stub only; uses generic `fetch_connector_candidates` when enabled |
| **MONSTER** | **Not implemented** | Config stub only; same as NAUKRI |

## Apify LinkedIn (default)

Set `APIFY_API_TOKEN` in environment. Configure in **Admin → Integrations** (Apify mode):

- Search actor: `powerai/linkedin-peoples-search-scraper`
- Enrich actor: `dev_fusion/linkedin-profile-scraper`
- Optional email fallback actor: `khadinakbar/linkedin-profile-email-scraper`

**Find Matches** on a job starts the pipeline when fewer than 10 LinkedIn profiles exist. The `apify-linkedin-process-cron` sidecar polls pending runs every 60s.

API routes:

- `GET /api/admin/apify-linkedin/status`
- `POST /api/admin/apify-linkedin/test`
- `POST /api/admin/apify-linkedin/process-cron`
- `GET /api/jobs/{job_id}/apify-linkedin/run`
- `POST /api/jobs/{job_id}/apify-linkedin/search`

NAUKRI/MONSTER require a future phase: board-specific API credentials, normalize mappings in `talent_acquisition/normalize.py`, and ingestion tests.
