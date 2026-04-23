# Disaster Recovery Drill — Execution Log (Template)

Copy this file per drill: `dr-drill-YYYY-MM-DD.md` and attach to the incident or compliance folder.

## Drill metadata
- **Date (UTC):**
- **Environment:** (staging / production)
- **Drill type:** (restore test / full failover / backup integrity)
- **Owner:**
- **Participants:**

## Objectives
- [ ] Verify latest backup exists and checksum matches catalog
- [ ] Restore database to isolated target or temporary cluster
- [ ] Validate application health and critical user journeys
- [ ] Measure RTO / RPO vs target

## Backup used
- **Archive path / object key:**
- **Created (UTC):**
- **SHA256:**
- **DB_NAME:**

## Steps executed
| Time (UTC) | Step | Result (pass/fail) | Notes |
|------------|------|--------------------|-------|
| | | | |

## Validation
- [ ] `/api/health` 200
- [ ] Auth login
- [ ] Sample read on: jobs, candidates, employees (as applicable)
- [ ] No unexpected errors in logs during validation window

## RTO / RPO
- **RPO achieved (max data loss window):**
- **RTO achieved (time to healthy API):**

## Issues found
-

## Follow-ups
| Action | Owner | Due date |
|--------|-------|----------|
| | | |

## Sign-off
- **Engineering:**
- **Operations / SRE:**
