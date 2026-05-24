#!/usr/bin/env bash
# Smoke test for GET /api/dashboard/hiring-pack (requires running API + auth).
#
# Usage:
#   export PHASE1_BASE_URL='http://127.0.0.1:8000'
#   export PHASE1_BEARER_TOKEN='...'
#   export HIRING_SNAPSHOT_TOKEN='...'   # optional: also exercises snapshot-cron
#   ./scripts/smoke_hiring_dashboard.sh

set -euo pipefail

BASE="${PHASE1_BASE_URL:-http://127.0.0.1:8000}"
TOKEN="${PHASE1_BEARER_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "error: set PHASE1_BEARER_TOKEN" >&2
  exit 1
fi

echo "Health check ..."
health_code="$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/health")"
if [[ "$health_code" != "200" ]]; then
  echo "error: /api/health returned ${health_code}" >&2
  exit 1
fi

echo "Hiring pack (scoped) ..."
pack_code="$(curl -s -o /tmp/hiring_pack.json -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "${BASE}/api/dashboard/hiring-pack?window=30&scope=all")"
if [[ "$pack_code" != "200" ]]; then
  echo "error: hiring-pack returned ${pack_code}" >&2
  head -c 2000 /tmp/hiring_pack.json >&2 || true
  exit 1
fi

python3 <<'PY'
import json, sys
with open("/tmp/hiring_pack.json") as f:
    d = json.load(f)
headline = d.get("headline") or {}
required = ["open_jobs", "active_pipeline", "avg_fit_score", "good_fit_pct", "high_fit_pct", "pending_offers"]
missing = [k for k in required if k not in headline]
if missing:
    print("error: headline missing keys:", missing, file=sys.stderr)
    sys.exit(1)
if "pipeline_by_stage_window" not in d:
    print("error: pipeline_by_stage_window missing", file=sys.stderr)
    sys.exit(1)
analytics_keys = [
    "offer_aging",
    "offer_funnel",
    "offer_status_counts",
    "conversion_bottleneck",
    "bottleneck_slow_hires",
    "hire_journeys",
    "interview_round_metrics",
]
missing_analytics = [k for k in analytics_keys if k not in d]
if missing_analytics:
    print("error: hiring-pack missing analytics keys:", missing_analytics, file=sys.stderr)
    sys.exit(1)
alerts = d.get("alerts") or []
for a in alerts:
    if a.get("id") and not a.get("action_path"):
        print("error: alert missing action_path:", a, file=sys.stderr)
        sys.exit(1)
print("ok: hiring-pack smoke passed")
print("  open_jobs:", headline["open_jobs"].get("value"))
print("  pending_offers:", headline.get("pending_offers", {}).get("value"))
print("  good_fit_pct:", headline["good_fit_pct"].get("value"))
print("  alerts:", len(alerts))
print("  offer_funnel stages:", len(d.get("offer_funnel") or []))
PY

echo "Hiring trends ..."
trends_code="$(curl -s -o /tmp/hiring_trends.json -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "${BASE}/api/dashboard/trends?months=6")"
if [[ "$trends_code" != "200" ]]; then
  echo "error: trends returned ${trends_code}" >&2
  head -c 2000 /tmp/hiring_trends.json >&2 || true
  exit 1
fi

python3 <<'PY'
import json, sys
with open("/tmp/hiring_trends.json") as f:
    t = json.load(f)
if t.get("data_source") not in ("snapshots", "seeded", "mixed", "synthetic"):
    print("error: unexpected trends data_source:", t.get("data_source"), file=sys.stderr)
    sys.exit(1)
for key in ("points", "snapshot_count", "live_snapshot_count"):
    if key not in t:
        print("error: trends missing key:", key, file=sys.stderr)
        sys.exit(1)
print("ok: trends smoke passed")
print("  data_source:", t.get("data_source"))
print("  points:", len(t.get("points") or []))
print("  live_snapshot_count:", t.get("live_snapshot_count"))
PY

echo "Hiring trends health ..."
health_code="$(curl -s -o /tmp/hiring_trends_health.json -w "%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "${BASE}/api/dashboard/trends/health")"
if [[ "$health_code" != "200" ]]; then
  echo "error: trends/health returned ${health_code}" >&2
  head -c 2000 /tmp/hiring_trends_health.json >&2 || true
  exit 1
fi

python3 <<'PY'
import json, sys
with open("/tmp/hiring_trends_health.json") as f:
    h = json.load(f)
if h.get("status") not in ("ok", "no_snapshots", "seeded_only", "stale"):
    print("error: unexpected health status:", h.get("status"), file=sys.stderr)
    sys.exit(1)
for key in ("snapshot_count", "live_snapshot_count", "seeded_snapshot_count", "cron_token_configured"):
    if key not in h:
        print("error: trends/health missing key:", key, file=sys.stderr)
        sys.exit(1)
print("ok: trends/health smoke passed")
print("  status:", h.get("status"))
print("  live_snapshot_count:", h.get("live_snapshot_count"))
PY

SNAPSHOT_TOKEN="${HIRING_SNAPSHOT_TOKEN:-}"
if [[ -n "$SNAPSHOT_TOKEN" ]]; then
  echo "Snapshot cron (optional) ..."
  snap_code="$(curl -s -o /tmp/hiring_snapshot.json -w "%{http_code}" -X POST \
    -H "X-Hiring-Snapshot-Token: ${SNAPSHOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "${BASE}/api/admin/hiring-dashboard/snapshot-cron")"
  if [[ "$snap_code" != "200" ]]; then
    echo "error: snapshot-cron returned ${snap_code}" >&2
    head -c 2000 /tmp/hiring_snapshot.json >&2 || true
    exit 1
  fi
  python3 -c "import json; d=json.load(open('/tmp/hiring_snapshot.json')); assert d.get('ok') is True; print('ok: snapshot-cron', d.get('snapshot', {}).get('period'))"
fi

echo "Hiring pack (job_id filter) ..."
# Empty job_id should still 200 with zeroed scope when job missing
curl -sf -H "Authorization: Bearer ${TOKEN}" \
  "${BASE}/api/dashboard/hiring-pack?window=30&scope=all&job_id=__nonexistent__" \
  -o /tmp/hiring_pack_job.json
echo "ok: job_id param accepted"

echo "All hiring dashboard smoke checks passed."
