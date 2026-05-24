// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:11001';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: process.env.PLAYWRIGHT_BEARER_TOKEN
      ? { Authorization: `Bearer ${process.env.PLAYWRIGHT_BEARER_TOKEN}` }
      : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/hiring-dashboard-mobile.spec.js',
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/hiring-dashboard-mobile.spec.js',
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'cd ../backend && HIRING_SNAPSHOT_TOKEN=ci-hiring-snapshot-token python -m uvicorn server:app --host 127.0.0.1 --port 11001',
          url: `${apiURL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: 'cd ../frontend && npm start',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      ],
});
