# Incident Response Runbook

## Purpose
Provide a standard incident handling flow for production-impacting issues.

## Severity Levels
- SEV-1: Full outage or critical security/data incident
- SEV-2: Major feature degradation with business impact
- SEV-3: Partial degradation or non-critical failures

## Initial Triage (First 15 Minutes)
1. Acknowledge incident and assign incident commander.
2. Capture:
   - Start time
   - Symptoms
   - Affected endpoints/modules
   - Estimated user impact
3. Validate key checks:
   - `/api/health`
   - `/api/metrics` (admin token required)
4. Classify severity and open incident channel.

## Containment Steps
1. Stop blast radius:
   - Disable unstable feature flag, connector, or job.
2. Preserve evidence:
   - Application logs
   - Error traces
   - Request/latency metrics snapshot
3. Communicate status update every 30 minutes for SEV-1/2.

## Recovery Steps
1. Apply fix or rollback to last stable deployment.
2. Re-run smoke checks:
   - Auth login
   - Core list endpoints (`jobs`, `candidates`, `employees`)
   - Dashboard endpoint
3. Confirm error rate and latency return to baseline.

## Exit Criteria
- Health checks stable for 30+ minutes
- No active customer-facing errors in critical flows
- Incident commander confirms recovery

## Post-Incident (Within 48 Hours)
1. Publish RCA with timeline and root cause.
2. Define corrective actions with owners and due dates.
3. Add regression test or monitor to prevent recurrence.
