// @ts-check
const { test, expect } = require('@playwright/test');

const QA_PASSWORD = process.env.QA_PASSWORD || 'QA_Seed_ChangeMe!';

async function login(page, email) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(QA_PASSWORD);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe('Hiring RBAC UI', () => {
  test('project manager sees read-only pipeline banner', async ({ page }) => {
    await login(page, 'qa_pm@aai-hrms.local');
    await page.goto('/pipeline');
    await expect(page.getByTestId('pipeline-heading')).toBeVisible();
    await expect(page.getByText(/read-only pipeline access/i)).toBeVisible();
  });

  test('technical manager cannot see offer status control on salary tab', async ({ page }) => {
    await login(page, 'qa_tm@aai-hrms.local');
    await page.goto('/pipeline?stage=SALARY');
    await expect(page.getByTestId('pipeline-heading')).toBeVisible();
    const offerSelect = page.locator('[aria-label^="Offer status for"]');
    await expect(offerSelect).toHaveCount(0);
  });

  test('project manager cannot schedule interviews', async ({ page }) => {
    await login(page, 'qa_pm@aai-hrms.local');
    await page.goto('/interviews');
    await expect(page.getByText(/read-only access/i)).toBeVisible();
    await expect(page.getByTestId('schedule-interview-btn')).toHaveCount(0);
  });

  test('technical manager can open referrals submit', async ({ page }) => {
    await login(page, 'qa_tm@aai-hrms.local');
    await page.goto('/referrals');
    await expect(page.getByTestId('submit-referral-btn')).toBeVisible();
  });

  test('project manager does not see assessment resend or cancel actions', async ({ page }) => {
    await login(page, 'qa_pm@aai-hrms.local');
    await page.goto('/assessments?tab=in_progress');
    await expect(page.locator('[data-testid^="resend-email-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="cancel-submission-"]')).toHaveCount(0);
  });

  test('technical manager sees request offer approval on seed interview candidate', async ({ page }) => {
    await login(page, 'qa_tm@aai-hrms.local');
    await page.goto('/pipeline?stage=INTERVIEW&job=qa-seed-job-0001');
    await expect(page.getByTestId('pipeline-heading')).toBeVisible();
    const requestBtn = page.locator('[data-testid="request-offer-qa-seed-app-interview"]');
    await expect(requestBtn).toBeVisible({ timeout: 15000 });
    await expect(requestBtn).toContainText(/request offer approval/i);
  });
});
