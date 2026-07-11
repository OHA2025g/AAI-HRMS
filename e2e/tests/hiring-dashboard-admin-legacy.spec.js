// @ts-check
const { test, expect } = require('@playwright/test');

const email = process.env.PLAYWRIGHT_USER_EMAIL || 'qa_admin@aai-hrms.local';
const password = process.env.PLAYWRIGHT_USER_PASSWORD || 'QA_Seed_ChangeMe!';

async function login(page) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await page.waitForURL(/\/(dashboard|jobs)/, { timeout: 60_000 });
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

  test('admin can toggle rule flags and LLM insights', async ({ page }) => {
    await login(page);
    await page.goto('/admin/hiring-dashboard-config');
    await expect(page.getByTestId('admin-hiring-config-page')).toBeVisible({ timeout: 15_000 });

    const lowFitToggle = page.getByTestId('hiring-rule-toggle-low-fit');
    const llmToggle = page.getByTestId('hiring-dashboard-llm-insights-toggle');

    if ((await lowFitToggle.getAttribute('data-state')) === 'checked') {
      await lowFitToggle.click();
    }
    if ((await llmToggle.getAttribute('data-state')) !== 'checked') {
      await llmToggle.click();
    }

    await page.getByTestId('hiring-dashboard-config-save').click();
    await expect(page.getByText(/thresholds saved/i)).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(lowFitToggle).toHaveAttribute('data-state', 'unchecked');
    await expect(llmToggle).toHaveAttribute('data-state', 'checked');
  });

  test('admin config save shows audit trail entry', async ({ page }) => {
    await login(page);
    await page.goto('/admin/hiring-dashboard-config');
    await expect(page.getByTestId('admin-hiring-config-page')).toBeVisible({ timeout: 15_000 });

    const hireTarget = page.locator('#hire-target');
    const current = await hireTarget.inputValue();
    const next = String(Number(current || 10) + 1);
    await hireTarget.fill(next);
    await page.getByTestId('hiring-dashboard-config-save').click();
    await expect(page.getByText(/thresholds saved/i)).toBeVisible({ timeout: 10_000 });

    const auditTrail = page.getByTestId('hiring-config-audit-trail');
    await expect(auditTrail).toBeVisible();
    await expect(auditTrail.getByTestId('hiring-config-audit-entry').first()).toBeVisible({ timeout: 10_000 });
  });

  test('admin can toggle extended rule flags', async ({ page }) => {
    await login(page);
    await page.goto('/admin/hiring-dashboard-config');
    await expect(page.getByTestId('admin-hiring-config-page')).toBeVisible({ timeout: 15_000 });

    const noPipelineToggle = page.getByTestId('hiring-rule-toggle-no-pipeline');
    await expect(noPipelineToggle).toBeVisible();

    if ((await noPipelineToggle.getAttribute('data-state')) === 'checked') {
      await noPipelineToggle.click();
    }

    await page.getByTestId('hiring-dashboard-config-save').click();
    await expect(page.getByText(/thresholds saved/i)).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(noPipelineToggle).toHaveAttribute('data-state', 'unchecked');
  });
});
