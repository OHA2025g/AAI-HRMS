# QA seed data and restore validation (M0-4)

## QA baseline seed

Idempotent baseline for dev/QA MongoDB (admin user, employee, skill, sample job).

```bash
cd backend
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="aai_hrms"
python scripts/seed_qa_baseline.py
```

Environment:

| Variable | Default |
|----------|---------|
| `QA_SEED_ADMIN_EMAIL` | `qa_admin@aai-hrms.local` |
| `QA_SEED_ADMIN_PASSWORD` | `QA_Seed_ChangeMe!` |
| `QA_SEED_FORCE` | unset — set to `1` to re-apply |

State recorded in **`_qa_seed`** collection.

## Post-restore validation

After `mongo_restore.sh` or a deployment:

```bash
cd backend
export VALIDATE_RESTORE_BASE_URL="http://127.0.0.1:8001"
python scripts/validate_restore.py
```

Optional Mongo checks (same shell as `.env`):

```bash
export VALIDATE_MIN_USERS=1
python scripts/validate_restore.py --base-url http://127.0.0.1:8001
```

CI runs **`validate_restore.py`** at the end of **`backend/scripts/run_phase1_tests_ci.sh`**.

## Migrations before API

In CI and recommended for prod deploy:

```bash
python scripts/mongo_migrate.py up
```

Then start the API.
