#!/usr/bin/env bash
# Run Smart Hiring Dashboard Playwright E2E (Mongo + seeds + admin user + Playwright webServers).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="${ROOT}/backend"
E2E="${ROOT}/e2e"
MONGO_CONTAINER="${MONGO_CONTAINER:-aai-hrms-e2e-mongo}"
STARTED_MONGO=0

export MONGO_URL="${MONGO_URL:-mongodb://127.0.0.1:27017}"
export DB_NAME="${DB_NAME:-test_database}"
export JWT_SECRET="${JWT_SECRET:-local-e2e-jwt-secret-32chars!!!!}"
export HIRING_SNAPSHOT_TOKEN="${HIRING_SNAPSHOT_TOKEN:-local-hiring-snapshot-token}"
export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:3099}"
export PLAYWRIGHT_FRONTEND_PORT="${PLAYWRIGHT_FRONTEND_PORT:-3099}"
export PLAYWRIGHT_API_URL="${PLAYWRIGHT_API_URL:-http://127.0.0.1:11001}"
export PLAYWRIGHT_USER_EMAIL="${PLAYWRIGHT_USER_EMAIL:-ci_e2e@example.com}"
export PLAYWRIGHT_USER_PASSWORD="${PLAYWRIGHT_USER_PASSWORD:-secret123}"
# Keep CI unset locally so Playwright skips retries; GitHub Actions sets CI=true.
export PLAYWRIGHT_TEST_TIMEOUT="${PLAYWRIGHT_TEST_TIMEOUT:-120000}"

cleanup() {
  if [[ "$STARTED_MONGO" == "1" ]]; then
    docker rm -f "$MONGO_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

wait_for_mongo() {
  for i in $(seq 1 60); do
    if mongo_ping; then
      return 0
    fi
    sleep 1
  done
  return 1
}

mongo_ping() {
  python3 - <<'PY'
import os, sys
from pymongo import MongoClient
try:
    c = MongoClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=800)
    c.admin.command("ping")
    sys.exit(0)
except Exception:
    sys.exit(1)
PY
}

ensure_mongo() {
  if mongo_ping; then
    echo ">> MongoDB reachable at ${MONGO_URL}"
    return 0
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "error: MongoDB not running and Docker unavailable" >&2
    exit 1
  fi
  echo ">> Starting ephemeral MongoDB container (${MONGO_CONTAINER}) ..."
  docker rm -f "$MONGO_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$MONGO_CONTAINER" -p 27017:27017 mongo:7 >/dev/null
  STARTED_MONGO=1
  if ! wait_for_mongo; then
    echo "error: MongoDB container failed to become ready" >&2
    exit 1
  fi
}

echo "== Smart Hiring Dashboard E2E =="
ensure_mongo

free_port() {
  local port="$1"
  lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
}
FRONTEND_PORT="${PLAYWRIGHT_FRONTEND_PORT:-3099}"
API_PORT="${PLAYWRIGHT_API_URL##*:}"
API_PORT="${API_PORT%%/*}"
free_port "$FRONTEND_PORT"
free_port "$API_PORT"

echo ">> Migrations + seeds"
cd "$BACKEND"
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}${BACKEND}"
python scripts/mongo_migrate.py up
python scripts/seed_qa_baseline.py
python scripts/seed_hiring_dashboard_e2e.py

echo ">> Registering E2E admin (${PLAYWRIGHT_USER_EMAIL}) ..."
python scripts/register_playwright_e2e_user.py

echo ">> Playwright (API + frontend started by playwright.config.js)"
cd "$E2E"
if [[ ! -d node_modules ]]; then
  npm install
fi
npx playwright install chromium 2>/dev/null || true
npm run test:hiring-dashboard

echo "== E2E passed =="
