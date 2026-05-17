#!/bin/sh
set -e

echo "Waiting for MongoDB..."
python <<'PY'
import os, sys, time
from pymongo import MongoClient

url = os.environ.get("MONGO_URL", "mongodb://mongo:27017")
for i in range(90):
    try:
        MongoClient(url, serverSelectionTimeoutMS=2500).admin.command("ping")
        print("MongoDB is up.")
        sys.exit(0)
    except Exception:
        print(f"  attempt {i + 1}/90...")
        time.sleep(1)
print("MongoDB not reachable")
sys.exit(1)
PY

echo "Running migrations..."
python scripts/mongo_migrate.py up || echo "migrate warning (non-fatal if already applied)"

echo "QA seed (idempotent)..."
python scripts/seed_qa_baseline.py || echo "seed warning"

_import_excel_data() {
  cand="${CANDIDATES_EXCEL_PATH:-/data/excel/Candidates 1.xlsx}"
  jobs="${EXCEL_PATH:-/data/excel/Job Descriptions 1.xlsx}"
  if [ -f "$cand" ]; then
    echo "Importing candidates from $cand ..."
    python scripts/import_candidates_from_excel.py || echo "Excel candidates import warning (non-fatal)"
  else
    echo "No candidates workbook at $cand (place 'Candidates 1.xlsx' in repo root for Docker mount)."
  fi
  if [ -f "$jobs" ]; then
    echo "Importing jobs from $jobs ..."
    python scripts/import_jobs_from_excel.py || echo "Excel jobs import warning (non-fatal)"
  else
    echo "No jobs workbook at $jobs (place 'Job Descriptions 1.xlsx' in repo root for Docker mount)."
  fi
}

if [ "${AUTO_IMPORT_EXCEL:-1}" = "1" ]; then
  _import_excel_data
else
  echo "AUTO_IMPORT_EXCEL=0 — skipping Excel import (run import_*_from_excel.py manually)."
fi

echo "Candidate display sources (Talent Pool + LinkedIn tags)..."
python scripts/patch_candidate_display_sources.py || echo "Candidate source patch warning (non-fatal)"

echo "Candidate resume_text (compose from experience/skills/education)..."
python scripts/patch_candidate_resume_text.py || echo "Candidate resume patch warning (non-fatal)"

_run_demo_seeds() {
  echo "LCD50 end-to-end demo data (50 employees + cross-module)..."
  python scripts/seed_employees_lifecycle_demo.py || echo "LCD50 seed warning (see logs; non-fatal)"

  echo "Allocation Section demo..."
  python scripts/seed_allocation_section_demo.py || echo "Allocation Section seed warning (non-fatal)"

  echo "Resource Section demo..."
  python scripts/seed_resource_section_demo.py || echo "Resource Section seed warning (non-fatal)"

  echo "Training & Development (M12) demo..."
  python scripts/seed_training_development_demo.py || echo "Training Development seed warning (non-fatal)"

  echo "High-Skill Talent Retention (M13) demo..."
  python scripts/seed_high_skill_retention_demo.py || echo "High-Skill retention seed warning (non-fatal)"

  echo "Employee Lifecycle Management (M14) demo..."
  python scripts/seed_employee_lifecycle_management_demo.py || echo "Employee Lifecycle Management seed warning (non-fatal)"

  echo "Workforce Intelligence (M15) demo..."
  python scripts/seed_workforce_intelligence_demo.py || echo "Workforce Intelligence seed warning (non-fatal)"

  echo "Cost Optimization & Automation (M16) demo..."
  python scripts/seed_cost_optimization_automation_demo.py || echo "Cost Optimization seed warning (non-fatal)"

  python scripts/seed_employee_satisfaction_engagement_demo.py || echo "Employee Satisfaction & Engagement seed warning (non-fatal)"
}

if [ "${SKIP_DEMO_SEEDS:-0}" = "1" ]; then
  echo "SKIP_DEMO_SEEDS=1 — skipping module demo seeds (QA baseline still applied)."
elif [ "${DEMO_SEEDS_FORCE:-0}" = "1" ]; then
  echo "DEMO_SEEDS_FORCE=1 — re-running all demo seeds..."
  python scripts/docker_bootstrap.py clear || true
  _run_demo_seeds
  python scripts/docker_bootstrap.py mark
elif python scripts/docker_bootstrap.py check; then
  echo "Demo seeds already applied for this Mongo volume (set DEMO_SEEDS_FORCE=1 to re-run all)."
else
  echo "First-time demo bootstrap for this Mongo volume..."
  _run_demo_seeds
  python scripts/docker_bootstrap.py mark
fi

echo "Starting uvicorn..."
exec uvicorn server:app --host 0.0.0.0 --port 8000
