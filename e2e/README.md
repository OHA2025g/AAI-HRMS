# Playwright E2E

## Prerequisites

- MongoDB running with migrations applied
- Backend on `:11001`, frontend on `:3000` (or set env vars below)

## Quick start

```bash
cd e2e
npm install
npx playwright install chromium
PLAYWRIGHT_USER_EMAIL=you@example.com PLAYWRIGHT_USER_PASSWORD=secret123 npm test
```

## Environment

| Variable | Default |
|----------|---------|
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3000` |
| `PLAYWRIGHT_API_URL` | `http://127.0.0.1:11001` |
| `PLAYWRIGHT_USER_EMAIL` | `admin@example.com` |
| `PLAYWRIGHT_USER_PASSWORD` | `secret123` |
| `PLAYWRIGHT_SKIP_WEBSERVER` | set to `1` when servers already running |

## Hiring dashboard scenarios

See `tests/hiring-dashboard.spec.js` for KPI load, period toggle, scope filter, funnel visibility, and alert drill-through.
