// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const defaultPort = '3099';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${defaultPort}`;
const frontendPort =
  process.env.PLAYWRIGHT_FRONTEND_PORT ||
  (() => {
    try {
      const port = new URL(baseURL).port;
      return port || defaultPort;
    } catch {
      return defaultPort;
    }
  })();
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:11001';
const apiOrigin = apiURL.replace(/\/$/, '');
const useDevServer = process.env.PLAYWRIGHT_DEV_SERVER === '1';

const backendEnv = {
  MONGO_URL: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017',
  DB_NAME: process.env.DB_NAME || 'test_database',
  JWT_SECRET: process.env.JWT_SECRET || 'ci-jwt-secret-change-me',
  HIRING_SNAPSHOT_TOKEN: process.env.HIRING_SNAPSHOT_TOKEN || 'ci-hiring-snapshot-token',
};

const frontendEnv = {
  REACT_APP_BACKEND_URL: apiOrigin,
  DISABLE_ESLINT_PLUGIN: 'true',
  BROWSER: 'none',
  FAST_REFRESH: 'false',
};

const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === '1';

module.exports = defineConfig({
  testDir: './tests',
  timeout: Number(process.env.PLAYWRIGHT_TEST_TIMEOUT || 120_000),
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
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
          command: `cd ../backend && python -m uvicorn server:app --host 127.0.0.1 --port 11001`,
          url: `${apiURL}/api/health`,
          reuseExistingServer,
          timeout: 120_000,
          env: backendEnv,
        },
        useDevServer
          ? {
              command: `cd ../frontend && PORT=${frontendPort} npm start`,
              url: baseURL,
              reuseExistingServer,
              timeout: 180_000,
              env: { ...frontendEnv, PORT: String(frontendPort) },
            }
          : {
              command: `cd ../frontend && npm run build && npx --yes serve -s build -l ${frontendPort}`,
              url: baseURL,
              reuseExistingServer,
              timeout: 300_000,
              env: frontendEnv,
            },
      ],
});
