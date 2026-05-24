#!/usr/bin/env bash
# Flush queued assessment invite emails and send incomplete reminders (cron / GitHub Actions).
#
#   export ASSESSMENT_EMAIL_CRON_TOKEN='your-admin-jwt-or-service-token'
#   export ASSESSMENT_EMAIL_BASE_URL='http://127.0.0.1:11001'
#   ./scripts/assessment_email_dispatch_cron.sh

set -euo pipefail

BASE="${ASSESSMENT_EMAIL_BASE_URL:-http://127.0.0.1:11001}"
TOKEN="${ASSESSMENT_EMAIL_CRON_TOKEN:-}"

if [[ -z "${TOKEN}" ]]; then
  echo "ASSESSMENT_EMAIL_CRON_TOKEN is required (admin JWT)" >&2
  exit 1
fi

AUTH="Authorization: Bearer ${TOKEN}"

echo "Dispatching queued assessment invite emails..."
curl -sS -X POST "${BASE}/api/assessments/admin/dispatch-invite-emails?limit=100" \
  -H "${AUTH}" \
  -H "Content-Type: application/json"

echo ""
echo "Dispatching assessment incomplete reminders (48h)..."
curl -sS -X POST "${BASE}/api/assessments/admin/dispatch-reminders?hours_since_invite=48" \
  -H "${AUTH}" \
  -H "Content-Type: application/json"

echo ""
