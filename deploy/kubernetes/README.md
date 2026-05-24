# Kubernetes — Smart Hiring Dashboard

## Daily snapshot CronJob

Persists hiring-pack snapshots for trend charts (same as `backend/scripts/hiring_dashboard_snapshot_cron.sh`).

1. Create the token secret (must match API `HIRING_SNAPSHOT_TOKEN`):

   ```bash
   kubectl apply -f hiring-snapshot-token.secret.example.yaml
   # Or: kubectl create secret generic hiring-snapshot-token \
   #   --from-literal=HIRING_SNAPSHOT_TOKEN='your-long-secret'
   ```

2. Adjust `HIRING_SNAPSHOT_URL` in `hiring-dashboard-snapshot-cronjob.yaml` if your API service name/port differs from `http://aai-hrms-api:8000`.

3. Apply the CronJob:

   ```bash
   kubectl apply -f hiring-dashboard-snapshot-cronjob.yaml
   ```

Schedule: **02:00 UTC daily** (`0 2 * * *`).
