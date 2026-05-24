// @ts-check
const { test, expect } = require('@playwright/test');

const email = process.env.PLAYWRIGHT_USER_EMAIL || 'admin@example.com';
const password = process.env.PLAYWRIGHT_USER_PASSWORD || 'secret123';

async function login(page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|jobs)/, { timeout: 30_000 });
}

test.describe('Smart Hiring Dashboard — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  });

  test('renders dashboard root on mobile viewport', async ({ page }) => {
    await expect(page.getByTestId('hiring-dashboard-root')).toBeVisible();
    await expect(page.getByText('Open jobs')).toBeVisible();
  });

  test('KPI grid stacks on narrow screens', async ({ page }) => {
    const root = page.getByTestId('hiring-dashboard-root');
    await expect(root).toBeVisible();
    const box = await root.boundingBox();
    expect(box?.width).toBeLessThan(500);
  });

  test('swipeable chart row visible on mobile', async ({ page }) => {
    await expect(page.getByTestId('source-quality-charts-mobile')).toBeVisible();
  });
});
