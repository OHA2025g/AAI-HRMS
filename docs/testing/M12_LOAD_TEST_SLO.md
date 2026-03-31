# Week 12 — load test report & SLO template

## Targets (edit per environment)

| Metric | Target | Measured (run) |
|--------|--------|----------------|
| Availability (health) | 99.9% over window | |
| p95 latency `/api/health` | < 3000 ms | |
| Error rate | < 1% | |

## How to run

- Local / CI smoke: `perf/load/k6-smoke.js` (see header comment).
- GitHub Actions: workflow `M10 Load smoke (k6)` — set repository secret **`K6_BASE_URL`** to staging (e.g. `https://staging.example.com`).

## Bottlenecks & fixes

Document top findings from the run (DB, API workers, cold starts, N+1 queries, etc.) and link PRs.

## Sign-off

- Engineering: ______________  Date: _______
- Product/Ops (if applicable): ______________  Date: _______
