import { test, expect } from '@playwright/test';

const email = process.env.E2E_ADMIN_EMAIL || 'qa_admin@aai-hrms.local';
const password = process.env.E2E_ADMIN_PASSWORD || 'QA_Seed_ChangeMe!';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByTestId('dashboard-heading')).toBeVisible({ timeout: 20_000 });
}

test.describe('Module navigation (admin)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  const cases: { path: string; title: string }[] = [
    { path: '/jobs', title: 'Jobs' },
    { path: '/candidates', title: 'Candidates' },
    { path: '/employees', title: 'Employee Master' },
    { path: '/workforce-inventory', title: 'Workforce Skill Inventory' },
    { path: '/executive-kpis', title: 'Executive KPI Dashboard' },
    { path: '/hr-copilot', title: 'HR Copilot' },
    { path: '/employee-lifecycle', title: 'Employee Lifecycle' },
    { path: '/workforce-intelligence', title: 'Workforce Intelligence' },
    { path: '/admin/workflow-automation', title: 'Workflow automation' },
  ];

  for (const { path, title } of cases) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 25_000 });
      await expect(page.locator('h1').first()).toHaveText(title);
    });
  }
});
