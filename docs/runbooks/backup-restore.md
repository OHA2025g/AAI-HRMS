# Backup and Restore Runbook

## Purpose
Define a minimum operational procedure for MongoDB backup and restore for the AAI-HRMS platform.

## Scope
- Database: MongoDB used by backend (`MONGO_URL`, `DB_NAME`)
- Frequency: Daily backup, on-demand backup before major releases
- Retention: 14 days (minimum)

## Preconditions
- Access to target MongoDB instance
- `mongodump` and `mongorestore` available
- Secure storage location for backup artifacts

## Automation scripts (repo)
From repo root, after `chmod +x backend/scripts/mongo_backup.sh backend/scripts/mongo_restore.sh`:

- **Backup:** `backend/scripts/mongo_backup.sh`  
  - Requires `MONGO_URL`, `DB_NAME`  
  - Optional `BACKUP_ROOT` (defaults to `backups/mongo` under the repo root)  
  - Produces `*.tar.gz` plus a `.meta.txt` with `sha256` and size

- **Restore:** `backend/scripts/mongo_restore.sh <archive.tar.gz>`  
  - Requires `MONGO_URL`, `DB_NAME`  
  - Uses `mongorestore --drop` — use only with approval

## Backup Procedure
1. Export required environment values:
   - `MONGO_URL`
   - `DB_NAME`
   - `BACKUP_DIR` (example: `./backups`)
2. Create timestamped backup directory.
3. Run:
   - `mongodump --uri "$MONGO_URL" --db "$DB_NAME" --out "$BACKUP_DIR/$TS"`
4. Compress backup:
   - `tar -czf "$BACKUP_DIR/$TS.tar.gz" -C "$BACKUP_DIR" "$TS"`
5. Upload archive to secure remote storage.
6. Record backup metadata (timestamp, db, size, checksum).

## Restore Procedure
1. Confirm restore approval and target environment.
2. Retrieve backup archive and verify checksum.
3. Extract backup archive.
4. Run restore:
   - `mongorestore --uri "$MONGO_URL" --drop --db "$DB_NAME" "$EXTRACTED_PATH/$DB_NAME"`
5. Validate:
   - API health check (`/api/health`)
   - Spot-check critical collections (`users`, `jobs`, `candidates`)
6. Record restore completion and verification evidence.

## Verification Checklist
- Backup archive created and uploaded
- Checksum validated
- Restore completed without errors
- Health endpoint returned 200
- Critical data spot checks passed

## Rollback Notes
- If restore fails, preserve logs and stop further writes.
- Re-run restore from latest known-good backup.
- Escalate to on-call owner if second restore attempt fails.
