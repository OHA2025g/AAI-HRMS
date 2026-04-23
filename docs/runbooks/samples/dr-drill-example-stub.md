# Disaster Recovery Drill — Example stub (NOT A REAL DRILL)

> **This file is a filled-in example only.** Replace with a real run using
> `docs/runbooks/dr-drill-log-template.md` and store under your compliance path.

## Drill metadata
- **Date (UTC):** 2026-01-15T14:00:00Z
- **Environment:** staging
- **Drill type:** Restore test from latest tarball
- **Owner:** Platform team
- **Participants:** Eng on-call, DBA (shadow)

## Objectives
- [x] Verify latest backup exists and checksum matches catalog
- [x] Restore database to isolated target or temporary cluster
- [x] Validate application health and critical user journeys
- [x] Measure RTO / RPO vs target

## Backup used
- **Archive path / object key:** `s3://example-backups/aai_hrms/2026-01-14T03-15Z.tar.gz` *(example)*
- **Created (UTC):** 2026-01-14T03:15:22Z
- **SHA256:** `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` *(placeholder)*
- **DB_NAME:** `aai_hrms`

## Steps executed
| Time (UTC) | Step | Result (pass/fail) | Notes |
|------------|------|--------------------|-------|
| 14:05 | Staging API scaled to 0 | pass | Maintenance window |
| 14:12 | Restore via `mongo_restore.sh` | pass | Used throwaway Mongo host |
| 14:28 | Staging API scaled up | pass | |
| 14:35 | Smoke tests | pass | Login, list jobs/candidates |

## Validation
- [x] `/api/health` 200
- [x] Auth login
- [x] Sample read on: jobs, candidates, employees
- [x] No unexpected errors in logs during validation window

## RTO / RPO
- **RPO achieved (max data loss window):** ~11h *(example — tie to last backup cadence)*
- **RTO achieved (time to healthy API):** 42m *(example)*

## Issues found
- None *(example)*

## Follow-ups
| Action | Owner | Due date |
|--------|-------|----------|
| Automate weekly restore test in staging | Platform | 2026-02-01 |

## Sign-off
- **Engineering:** _(example)_
- **Operations / SRE:** _(example)_
