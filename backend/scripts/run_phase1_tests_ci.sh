#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

export MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
export DB_NAME="${DB_NAME:-test_database}"

PHASE1_PORT="${PHASE1_PORT:-11001}"
PHASE1_HOST="${PHASE1_HOST:-127.0.0.1}"
PHASE1_BASE_URL="${PHASE1_BASE_URL:-http://${PHASE1_HOST}:${PHASE1_PORT}}"

echo "Applying MongoDB migrations (M0-4) ..."
python scripts/mongo_migrate.py up
python scripts/mongo_migrate.py status

echo "Starting backend on ${PHASE1_BASE_URL}"

# Start FastAPI in background. Store PID so we can cleanly stop.
python -m uvicorn server:app --host "$PHASE1_HOST" --port "$PHASE1_PORT" --log-level warning &
UVICORN_PID=$!

cleanup() {
  kill "$UVICORN_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Waiting for /api/health ..."
code=""
for i in {1..40}; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${PHASE1_BASE_URL}/api/health" || true)"
  if [[ "$code" == "200" ]]; then
    break
  fi
  sleep 0.5
done

if [[ "$code" != "200" ]]; then
  echo "Backend did not become healthy. Last status: $code"
  exit 1
fi

echo "Registering CI admin user for integration tests ..."
ADMIN_EMAIL="ci_admin_$(date +%s)@example.com"
ADMIN_JSON="$(curl -s -X POST "${PHASE1_BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"secret123\",\"full_name\":\"CI Admin\",\"role\":\"admin\"}" )"

ADMIN_TOKEN="$(python -c 'import json,sys; d=json.loads(sys.argv[1]); print(d["access_token"])' "$ADMIN_JSON")"

echo "Running Phase-1 unit tests ..."
pytest -q tests/test_phase1_unit.py tests/test_migrations_manifest.py

echo "Running Phase-1 integration tests ..."
export RUN_PHASE1_INTEGRATION=1
export PHASE1_BEARER_TOKEN="$ADMIN_TOKEN"
export PHASE1_BASE_URL="$PHASE1_BASE_URL"

pytest -q tests/test_phase1_integration.py

echo "Post-deploy / restore validation (M0-4) ..."
export VALIDATE_RESTORE_BASE_URL="${PHASE1_BASE_URL}"
python scripts/validate_restore.py --skip-root

echo "Phase-1 tests completed successfully"

