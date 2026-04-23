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

# LCD50-*: 50 employees + lifecycle/compliance + M4/M5/M6/M8 cross-module demo data.
# - First boot: inserts employees + lifecycle + cross-module.
# - Later boots: if LCD50 employees exist, still re-syncs cross-module (training/M6/M4/M8/skills).
# - LCD50_SEED_REPLACE=1: wipe LCD50 employees + related rows, then full re-seed.
echo "LCD50 end-to-end demo data (50 employees + training, engagement, project, retention, skills)..."
python scripts/seed_employees_lifecycle_demo.py || echo "LCD50 seed warning (see logs; non-fatal)"

echo "Allocation Section demo (staffing bridge collections + allocations)..."
python scripts/seed_allocation_section_demo.py || echo "Allocation Section seed warning (non-fatal)"

echo "Resource Section demo (workforce intelligence overlays + analytics collections)..."
python scripts/seed_resource_section_demo.py || echo "Resource Section seed warning (non-fatal)"

echo "Training & Development (M12) demo data..."
python scripts/seed_training_development_demo.py || echo "Training Development seed warning (non-fatal)"

echo "High-Skill Talent Retention (M13) demo data..."
python scripts/seed_high_skill_retention_demo.py || echo "High-Skill retention seed warning (non-fatal)"

echo "Employee Lifecycle Management (M14) demo data..."
python scripts/seed_employee_lifecycle_management_demo.py || echo "Employee Lifecycle Management seed warning (non-fatal)"

echo "Workforce Intelligence (M15) demo data..."
python scripts/seed_workforce_intelligence_demo.py || echo "Workforce Intelligence seed warning (non-fatal)"

echo "Cost Optimization & Automation (M16) demo data..."
python scripts/seed_cost_optimization_automation_demo.py || echo "Cost Optimization seed warning (non-fatal)"

python scripts/seed_employee_satisfaction_engagement_demo.py || echo "Employee Satisfaction & Engagement seed warning (non-fatal)"

echo "Starting uvicorn..."
exec uvicorn server:app --host 0.0.0.0 --port 8000
