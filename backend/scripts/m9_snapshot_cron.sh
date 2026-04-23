#!/usr/bin/env bash
# Trigger M9 leadership monthly snapshot without JWT (same pattern as GitHub Actions).
#
# Usage:
#   export M9_SNAPSHOT_TOKEN='your-long-secret'   # must match API env
#   export M9_SNAPSHOT_URL='https://api.example.com/api/executive/m9/export-packs/monthly-snapshot-cron'
#   ./scripts/m9_snapshot_cron.sh
#
# Optional JSON body (fixed period):
#   echo '{"period":"2025-02","horizon_months":3,"window_days":30}' > /tmp/m9_body.json
#   curl ... -d @/tmp/m9_body.json
#
# Default (empty body): API uses previous calendar month (UTC).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi

URL="${M9_SNAPSHOT_URL:-http://127.0.0.1:11001/api/executive/m9/export-packs/monthly-snapshot-cron}"
TOKEN="${M9_SNAPSHOT_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "error: set M9_SNAPSHOT_TOKEN (and optionally M9_SNAPSHOT_URL)" >&2
  exit 1
fi

code="$(curl -sS -o /tmp/m9_snap_body.txt -w "%{http_code}" \
  -X POST \
  -H "X-M9-Snapshot-Token: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${URL}")"

echo "HTTP ${code}"
if [[ "${code}" != "200" ]]; then
  head -c 2000 /tmp/m9_snap_body.txt >&2 || true
  exit 1
fi
cat /tmp/m9_snap_body.txt
echo
