import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the full stack (frontend + API + Mongo).
 *
 * Prereqs (local):
 *   1. MongoDB running; backend/.env with MONGO_URL, DB_NAME
 *   2. python scripts/mongo_migrate.py up && python scripts/seed_qa_baseline.py
 *   3. Backend: uvicorn server:app --host 127.0.0.1 --port 11001 (from backend/)
 *   4. Frontend: REACT_APP_BACKEND_URL=http://127.0.0.1:11001 yarn start (port 3000)
 *
 * Env:
 *   E2E_BASE_URL          — UI origin (default http://127.0.0.1:3000)
 *   E2E_API_URL           — API root (default http://127.0.0.1:11001)
 *   E2E_ADMIN_EMAIL       — QA admin (default qa_admin@aai-hrms.local)
 *   E2E_ADMIN_PASSWORD    — (default QA_Seed_ChangeMe!)
 */
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  timeout: 60_000,
  expect: { timeout: 15_000 },
});
