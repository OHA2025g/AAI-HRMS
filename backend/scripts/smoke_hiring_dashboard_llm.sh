#!/usr/bin/env bash
# Optional smoke: verify LLM-enhanced hiring-pack when keys and admin token are configured.
#
# Usage:
#   export PHASE1_BASE_URL='http://127.0.0.1:11001'
#   export PHASE1_BEARER_TOKEN='...'   # admin JWT
#   export HIRING_DASHBOARD_LLM_INSIGHTS=1
#   # Smart Hiring Dashboard uses Mistral AI (MISTRAL_API_KEY); others optional for legacy paths
#   ./scripts/smoke_hiring_dashboard_llm.sh
#
# Skips gracefully when LLM is not configured (exit 0 with message).

set -euo pipefail

BASE="${PHASE1_BASE_URL:-http://127.0.0.1:11001}"
TOKEN="${PHASE1_BEARER_TOKEN:-}"
STRICT_LLM="${HIRING_DASHBOARD_LLM_STRICT:-0}"

if [[ -z "$TOKEN" ]]; then
  echo "skip: set PHASE1_BEARER_TOKEN (admin) to run LLM smoke" >&2
  exit 0
fi

has_key=false
for var in MISTRAL_API_KEY OPENAI_API_KEY HF_TOKEN EMERGENT_LLM_KEY; do
  if [[ -n "${!var:-}" ]]; then
    has_key=true
    break
  fi
done

if [[ "${HIRING_DASHBOARD_LLM_INSIGHTS:-}" != "1" ]] && [[ "${HIRING_DASHBOARD_LLM_INSIGHTS:-}" != "true" ]]; then
  echo "Enabling LLM via admin config PUT ..."
  curl -sf -X PUT "${BASE}/api/admin/hiring-dashboard/config" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"llm_insights_enabled": true}' \
    -o /tmp/hiring_llm_config.json
fi

if [[ "$has_key" != "true" ]]; then
  echo "skip: no LLM API key (MISTRAL_API_KEY, OPENAI_API_KEY, HF_TOKEN, or EMERGENT_LLM_KEY)" >&2
  exit 0
fi

echo "Fetching hiring-pack with LLM insights enabled ..."
pack_code="$(curl -s -o /tmp/hiring_pack_llm.json -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "${BASE}/api/dashboard/hiring-pack?window_days=30&scope=all")"

if [[ "$pack_code" != "200" ]]; then
  echo "error: hiring-pack returned ${pack_code}" >&2
  head -c 2000 /tmp/hiring_pack_llm.json >&2 || true
  exit 1
fi

python3 <<PY
import json, os, sys
strict = os.environ.get("HIRING_DASHBOARD_LLM_STRICT", "0").strip().lower() in ("1", "true", "yes")
with open("/tmp/hiring_pack_llm.json") as f:
    d = json.load(f)
source = d.get("ai_insights_source")
rec = d.get("ai_recommendation") or {}
if source not in ("llm", "rule_based"):
    print("error: unexpected ai_insights_source:", source, file=sys.stderr)
    sys.exit(1)
print("ok: hiring-pack LLM smoke passed")
print("  ai_insights_source:", source)
print("  recommendation:", rec.get("title"))
if source != "llm":
    msg = "LLM path did not succeed — rule_based fallback (provider error or rate limit)"
    if strict:
        print("error:", msg, file=sys.stderr)
        sys.exit(1)
    print("note:", msg)
PY
