#!/usr/bin/env bash
# Full Smart Hiring Dashboard validation: unit tests + live API integration + smoke (+ optional E2E).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="${ROOT}/backend"

export MONGO_URL="${MONGO_URL:-mongodb://127.0.0.1:27017}"
export DB_NAME="${DB_NAME:-test_database}"
export JWT_SECRET="${JWT_SECRET:-local-full-val-jwt-secret-32chars!!}"
export HIRING_SNAPSHOT_TOKEN="${HIRING_SNAPSHOT_TOKEN:-local-hiring-snapshot-token}"
export PHASE1_HOST="${PHASE1_HOST:-127.0.0.1}"
export PHASE1_PORT="${PHASE1_PORT:-11001}"
export PHASE1_BASE_URL="${PHASE1_BASE_URL:-http://${PHASE1_HOST}:${PHASE1_PORT}}"

RUN_E2E="${RUN_E2E:-0}"

echo "== Smart Hiring Dashboard full validation =="

bash "${ROOT}/scripts/run_hiring_dashboard_regression.sh"

echo ">> Live API integration (mirrors CI run_phase1_tests_ci.sh tail)"
cd "$BACKEND"
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}${BACKEND}"

python scripts/mongo_migrate.py up
python scripts/seed_qa_baseline.py
python scripts/seed_hiring_dashboard_e2e.py

python -m uvicorn server:app --host "$PHASE1_HOST" --port "$PHASE1_PORT" --log-level warning &
UVICORN_PID=$!
cleanup() {
  kill "$UVICORN_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${PHASE1_BASE_URL}/api/health" || true)
  if [[ "$code" == "200" ]]; then break; fi
  sleep 0.5
done

ADMIN_EMAIL="full_val_admin_$(date +%s)@example.com"
ADMIN_JSON="$(curl -s -X POST "${PHASE1_BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"secret123\",\"full_name\":\"Full Val Admin\",\"role\":\"admin\"}")"
export PHASE1_BEARER_TOKEN="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["access_token"])' "$ADMIN_JSON")"
export PHASE1_BASE_URL

pytest -q tests/test_hiring_dashboard_integration.py

bash scripts/smoke_hiring_dashboard.sh
bash scripts/smoke_hiring_dashboard_llm.sh || true

if [[ "$RUN_E2E" == "1" ]]; then
  trap - EXIT
  kill "$UVICORN_PID" >/dev/null 2>&1 || true
  bash "${ROOT}/scripts/run_hiring_dashboard_e2e.sh"
fi

echo "== Full validation passed =="
