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

test.describe('Smart Hiring Dashboard — legacy & admin', () => {
  test('legacy dashboard route shows deprecation banner', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/legacy');
    await expect(page.getByTestId('legacy-dashboard-banner')).toBeVisible();
    await expect(page.getByText(/classic hiring dashboard/i)).toBeVisible();
  });

  test('admin can load and save hiring dashboard config', async ({ page }) => {
    await login(page);
    await page.goto('/admin/hiring-dashboard-config');
    await expect(page.getByTestId('hiring-dashboard-config-save')).toBeVisible({ timeout: 15_000 });
    const stuckInput = page.locator('#stuck-critical');
    await stuckInput.fill('26');
    await page.getByTestId('hiring-dashboard-config-save').click();
    await expect(page.getByText(/thresholds saved/i)).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(stuckInput).toHaveValue('26');
  });
});
