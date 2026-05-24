#!/usr/bin/env bash
# One-command Smart Hiring analytics verification (unit tests + optional live smoke).
#
# Usage:
#   ./scripts/verify_hiring_analytics.sh
#   PHASE1_BASE_URL=http://127.0.0.1:8010 PHASE1_BEARER_TOKEN=... ./scripts/verify_hiring_analytics.sh

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

export MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
export DB_NAME="${DB_NAME:-test_database}"
export PYTHONPATH="${PYTHONPATH:-.}"

echo "=== Smart Hiring analytics unit tests ==="
pytest -q \
  tests/test_hiring_dashboard.py \
  tests/test_hiring_snapshots.py \
  tests/test_hiring_pack_analytics_schema.py

if [[ -n "${PHASE1_BEARER_TOKEN:-}" ]]; then
  echo ""
  echo "=== Live API smoke (hiring-pack + trends + health) ==="
  export PHASE1_BASE_URL="${PHASE1_BASE_URL:-http://127.0.0.1:8010}"
  bash scripts/smoke_hiring_dashboard.sh
else
  echo ""
  echo "Skip live smoke: set PHASE1_BEARER_TOKEN to exercise running API."
fi

echo ""
echo "All Smart Hiring analytics verification passed."
