# AAI-HRMS — Playwright E2E

Automated **browser + API** checks for the full product. See **`memory/E2E_TEST_CASES.md`** for the full test-case catalog (manual + automated IDs).

## Prerequisites

1. **MongoDB** running locally or in Docker.
2. **Backend** `.env`: `MONGO_URL`, `DB_NAME`.
3. Apply DB baseline:
   ```bash
   cd backend && python scripts/mongo_migrate.py up && python scripts/seed_qa_baseline.py
   ```
4. **API** (terminal 1):
   ```bash
   cd backend && uvicorn server:app --host 127.0.0.1 --port 11001
   ```
5. **Frontend** (terminal 2):
   ```bash
   cd frontend && REACT_APP_BACKEND_URL=http://127.0.0.1:11001 yarn start
   ```
   Default UI: `http://127.0.0.1:3000`.

## Run

```bash
cd e2e
npm install
npx playwright install chromium   # once per machine
npm test
```

Optional env:

| Variable | Default |
|----------|---------|
| `E2E_BASE_URL` | `http://127.0.0.1:3000` |
| `E2E_API_URL` | `http://127.0.0.1:11001` |
| `E2E_ADMIN_EMAIL` | `qa_admin@aai-hrms.local` |
| `E2E_ADMIN_PASSWORD` | `QA_Seed_ChangeMe!` |

```bash
E2E_ADMIN_PASSWORD='your-secret' npm test
```

## Reports

```bash
npm run report
```

## CI

Workflow: `.github/workflows/e2e-playwright.yml` (Mongo service + migrate + seed + API + static frontend + Playwright).
