#!/usr/bin/env bash
# Persist Smart Hiring Dashboard snapshot for trend charts (no JWT).
#
# Usage:
#   export HIRING_SNAPSHOT_TOKEN='your-long-secret'   # must match API env
#   export HIRING_SNAPSHOT_URL='https://api.example.com/api/admin/hiring-dashboard/snapshot-cron'
#   ./scripts/hiring_dashboard_snapshot_cron.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi

URL="${HIRING_SNAPSHOT_URL:-http://127.0.0.1:11001/api/admin/hiring-dashboard/snapshot-cron}"
TOKEN="${HIRING_SNAPSHOT_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "error: set HIRING_SNAPSHOT_TOKEN (and optionally HIRING_SNAPSHOT_URL)" >&2
  exit 1
fi

code="$(curl -sS -o /tmp/hiring_snap_body.txt -w "%{http_code}" \
  -X POST \
  -H "X-Hiring-Snapshot-Token: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${URL}")"

echo "HTTP ${code}"
if [[ "${code}" != "200" ]]; then
  head -c 2000 /tmp/hiring_snap_body.txt >&2 || true
  exit 1
fi
cat /tmp/hiring_snap_body.txt
echo
