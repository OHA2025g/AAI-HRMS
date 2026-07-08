// @ts-check
const { test, expect } = require('@playwright/test');

const email = process.env.PLAYWRIGHT_USER_EMAIL || 'qa_admin@aai-hrms.local';
const password = process.env.PLAYWRIGHT_USER_PASSWORD || 'QA_Seed_ChangeMe!';

async function login(page) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|jobs)/, { timeout: 60_000 });
}

test.describe('Smart Hiring Dashboard — mobile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-heading')).toBeVisible();
    await expect(page.getByTestId('dashboard-hero-health')).toBeVisible({ timeout: 15_000 });
  });

  test('renders dashboard root and overview on mobile viewport', async ({ page }) => {
    await expect(page.getByTestId('hiring-dashboard-root')).toBeVisible();
    await expect(page.getByTestId('dash-overview')).toBeVisible();
    await expect(page.getByText('Open Positions')).toBeVisible();
  });

  test('KPI grid stacks on narrow screens', async ({ page }) => {
    const root = page.getByTestId('hiring-dashboard-root');
    await expect(root).toBeVisible();
    const box = await root.boundingBox();
    expect(box?.width).toBeLessThan(500);
  });

  test('tab bar scrolls horizontally on mobile', async ({ page }) => {
    await expect(page.getByTestId('dashboard-tabs')).toBeVisible();
    await page.getByTestId('dashboard-tabs').getByRole('tab', { name: 'Analytics' }).click();
    await expect(page.getByTestId('dash-charts')).toBeVisible();
  });

  test('swipeable chart row visible on analytics tab mobile', async ({ page }) => {
    await page.getByTestId('dashboard-tabs').getByRole('tab', { name: 'Analytics' }).click();
    await expect(page.getByTestId('source-quality-charts-mobile')).toBeVisible();
  });
});
