# Migrations, Indexes, and Rollback (MongoDB)

## Purpose
Define how schema-like changes (collections, indexes, data shape) are managed for AAI-HRMS and how to roll back when deployments go wrong.

## Current model in this codebase
- **MongoDB** is the system of record.
- **Versioned migrations (M0-4):** `backend/migrations/` + `python scripts/mongo_migrate.py up|status` (state in `_schema_migrations`). See **`backend/migrations/README.md`** and **`mongo_migrations_runner.py`**.
- **Indexes** are also created at API startup in `backend/server.py` (`ensure_phase1_indexes`). Prefer **new** indexes in migrations for traceability; long-term you may consolidate here only.
- **Application code** defines document shapes (Pydantic models + ad-hoc dicts).

## Policy: when you change data or indexes

### 1. Index changes
- **Before deploy:** Document the new/changed index in the PR (name, keys, unique flag).
- **Compatibility:** Prefer **additive** indexes first; avoid dropping indexes in use until traffic is verified.
- **Deploy order:** Deploy backend that creates indexes **before** relying on queries that require them (or ship a no-op deploy that only creates indexes, then feature deploy).

### 2. Breaking document shape changes
- Prefer **expand → migrate → contract**:
  1. Write code that reads **both** old and new fields.
  2. Backfill data (script or admin job) with a recorded batch id and dry-run mode.
  3. Switch writes to the new shape.
  4. Remove old fields only after verification window.

### 3. Data backfills
- Run against **staging** first with production-like volume sampling.
- Log: operator, time, script version, rows affected, errors.
- Never run destructive backfills without a **fresh backup** (see `backup-restore.md` and `backend/scripts/mongo_backup.sh`).

## Rollback options

### A. Application rollback (preferred for logic-only bugs)
- Redeploy the previous container/image or git tag.
- Indexes left behind are usually safe; remove only if they cause measurable harm.

### B. Data rollback (corruption or bad migration)
1. **Stop writes** to the affected environment (maintenance mode or scale API to zero).
2. Restore MongoDB from backup using `backend/scripts/mongo_restore.sh` (see `backup-restore.md`).
3. Redeploy the **known-good** application version that matches that data shape.
4. Re-run smoke tests: **`python scripts/validate_restore.py`** (see `docs/runbooks/qa-seed-and-validate.md`) and `/api/health`.

### C. Index-only rollback
- If a new index causes issues: drop that index in MongoDB by name (document the exact command in the incident ticket).
- Redeploy code that no longer creates the bad index if needed.

## Verification after any migration
- `/api/health` returns 200.
- Critical flows: auth, jobs list, candidates list, employees list (as applicable).
- Check application logs for index or duplicate-key errors.

## Ownership
- Engineering: index creation in code, backfill scripts, deployment notes.
- Operations: backup before change, restore execution, incident comms.
