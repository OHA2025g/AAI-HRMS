# MongoDB migrations (M0-4)

## Naming

- Files: **`NNNN_short_description.py`** where `NNNN` is a zero-padded sequence (`0001`, `0002`, …).
- Skipped by the runner: `__init__.py`, names starting with `_`, `*.example` files.

## Contract

Each migration module **must** define:

```python
async def up(db) -> None:
    """Apply changes (indexes, backfills, etc.)."""
    ...
```

Optionally define `async def down(db)` for documentation or future rollback tooling (not run automatically today).

## Commands

From `backend/` (with `MONGO_URL` and `DB_NAME` set):

```bash
python scripts/mongo_migrate.py status
python scripts/mongo_migrate.py up
python scripts/mongo_migrate.py up --dry-run
```

## New migration

1. Copy `TEMPLATE_0000_description.py.example` to the next number, e.g. `0003_add_field.py`.
2. Implement `up(db)` using Motor (`db` is `AsyncIOMotorDatabase`).
3. Run `status` then `up` in dev/staging before production.

## CI

Pull requests run **`mongo_migrate.py up`** twice (idempotency check) against MongoDB 7 in `.github/workflows/quality-gates.yml` (`backend-mongo-migrations`). Full API + integration + `validate_restore.py` run in `.github/workflows/phase1-tests.yml`.

## State

Applied migrations are stored in **`_schema_migrations`** with fields: `id`, `applied_at`, `checksum`, `path`.

**Note:** The API still creates some indexes at startup in `server.py`. Prefer **new** index changes here for versioned rollout; long-term you can move startup indexes into migrations only.
