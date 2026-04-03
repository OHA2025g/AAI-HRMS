#!/usr/bin/env bash
# Trigger M8 attrition score batch without JWT (same as GitHub Actions cron).
#
# Usage:
#   export M8_SCORE_RUN_TOKEN='your-long-secret'   # must match API env
#   export M8_SCORE_RUN_URL='https://api.example.com/api/workforce/retention/v1/score-run-cron'
#   ./scripts/m8_score_run_cron.sh
#
# Optional: place M8_SCORE_RUN_TOKEN in backend/.env (this script sources ../.env if present).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
fi

URL="${M8_SCORE_RUN_URL:-http://127.0.0.1:11001/api/workforce/retention/v1/score-run-cron}"
TOKEN="${M8_SCORE_RUN_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "error: set M8_SCORE_RUN_TOKEN (and optionally M8_SCORE_RUN_URL)" >&2
  exit 1
fi

code="$(curl -sS -o /tmp/m8_score_body.txt -w "%{http_code}" \
  -X POST \
  -H "X-M8-Score-Token: ${TOKEN}" \
  -H "Content-Type: application/json" \
  "${URL}")"

echo "HTTP ${code}"
if [[ "${code}" != "200" ]]; then
  head -c 2000 /tmp/m8_score_body.txt >&2 || true
  exit 1
fi
cat /tmp/m8_score_body.txt
echo
