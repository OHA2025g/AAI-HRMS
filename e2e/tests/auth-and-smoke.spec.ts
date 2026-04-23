import { test, expect } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL || 'qa_admin@aai-hrms.local';
const password = process.env.E2E_ADMIN_PASSWORD || 'QA_Seed_ChangeMe!';

test.describe('Authentication & dashboard smoke', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-tab')).toBeVisible();
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('login-password-input')).toBeVisible();
    await expect(page.getByTestId('login-submit-btn')).toBeVisible();
  });

  test('admin can sign in and reach dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email-input').fill(email);
    await page.getByTestId('login-password-input').fill(password);
    await page.getByTestId('login-submit-btn').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByTestId('dashboard-heading')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
