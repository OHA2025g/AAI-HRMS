#!/usr/bin/env bash
# Local regression for Smart Hiring Dashboard v1/v2 (unit + optional E2E).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="${ROOT}/backend"
FRONTEND="${ROOT}/frontend"
E2E="${ROOT}/e2e"

export MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
export DB_NAME="${DB_NAME:-test_database}"
export JWT_SECRET="${JWT_SECRET:-local-regression-jwt-secret-32chars!!}"
export HIRING_SNAPSHOT_TOKEN="${HIRING_SNAPSHOT_TOKEN:-local-hiring-snapshot-token}"

RUN_E2E="${RUN_E2E:-0}"

echo "== Smart Hiring Dashboard regression =="

echo ">> Backend hiring dashboard tests"
cd "$BACKEND"
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}${BACKEND}"
pytest -q \
  tests/test_hiring_dashboard.py \
  tests/test_hiring_dashboard_access.py \
  tests/test_hiring_dashboard_config.py \
  tests/test_hiring_alerts_rule_flags.py \
  tests/test_hiring_dashboard_llm_insights.py \
  tests/test_hiring_dashboard_admin_config_api.py \
  tests/test_hiring_dashboard_llm_pack_api.py \
  tests/test_hiring_alert_dismissals.py \
  tests/test_hiring_snapshots.py \
  tests/test_hiring_pack_cache.py \
  tests/test_hiring_pack_analytics_schema.py \
  tests/test_application_response_normalization.py \
  tests/test_hiring_dashboard_llm_cached_pack.py

echo ">> Frontend hiring dashboard unit tests"
cd "$FRONTEND"
npm test -- --run

if [[ "$RUN_E2E" == "1" ]]; then
  bash "${ROOT}/scripts/run_hiring_dashboard_e2e.sh"
else
  echo ">> Skipping E2E (set RUN_E2E=1 or run scripts/run_hiring_dashboard_e2e.sh)"
fi

echo "== Regression passed =="
