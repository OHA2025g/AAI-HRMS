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

echo "Starting uvicorn..."
exec uvicorn server:app --host 0.0.0.0 --port 8000
