#!/usr/bin/env bash
# Verify Smart Hiring phase implementation locally (migrations, seed, core pytest suites).
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

export MONGO_URL="${MONGO_URL:-mongodb://localhost:27017}"
export DB_NAME="${DB_NAME:-test_database}"
export JWT_SECRET="${JWT_SECRET:-local-verify-jwt-secret-32chars!!}"
export HIRING_SNAPSHOT_TOKEN="${HIRING_SNAPSHOT_TOKEN:-local-hiring-snapshot-token}"

echo "== Smart Hiring phase verification =="
echo "Mongo: ${MONGO_URL}  DB: ${DB_NAME}"

echo ">> Migrations"
python scripts/mongo_migrate.py up
python scripts/mongo_migrate.py status | tail -5

echo ">> QA baseline seed (v2)"
python scripts/seed_qa_baseline.py

echo ">> Unit / integration pytest (no live server required for these)"
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}${BACKEND_DIR}"
pytest -q \
  tests/test_hiring_rbac.py \
  tests/test_hiring_rbac_api.py \
  tests/test_hiring_dashboard.py \
  tests/test_hiring_alerts_rule_flags.py \
  tests/test_hiring_dashboard_llm_insights.py \
  tests/test_hiring_dashboard_admin_config_api.py \
  tests/test_hiring_dashboard_llm_pack_api.py \
  tests/test_hiring_dashboard_config.py \
  tests/test_hiring_pack_analytics_schema.py \
  tests/test_candidate_import_etl.py \
  tests/test_candidate_import_api_integration.py \
  tests/test_assessment_question_count.py

echo ">> Phase verification passed"
echo "Next: run full CI script or E2E:"
echo "  bash scripts/run_phase1_tests_ci.sh"
echo "  bash ../scripts/run_hiring_dashboard_regression.sh"
echo "  bash ../scripts/run_hiring_dashboard_e2e.sh"
echo "  bash ../scripts/run_hiring_dashboard_full_validation.sh"
echo "  RUN_E2E=1 bash ../scripts/run_hiring_dashboard_full_validation.sh"
