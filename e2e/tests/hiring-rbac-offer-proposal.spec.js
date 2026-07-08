// @ts-check
const { test, expect } = require('@playwright/test');

const QA_PASSWORD = process.env.QA_PASSWORD || 'QA_Seed_ChangeMe!';
const QA_SEED_JOB_TITLE = 'QA Seed — Software Engineer';
const QA_SEED_APP_ID = 'qa-seed-app-interview';

async function login(page, email) {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(QA_PASSWORD);
  await page.getByTestId('login-submit-btn').click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function selectQaSeedJob(page) {
  await page.getByTestId('job-select').click();
  await page.getByRole('option', { name: QA_SEED_JOB_TITLE }).click();
}

test.describe('Offer stage proposal (TM → HM)', () => {
  test('technical manager requests offer approval on seed job', async ({ page }) => {
    await login(page, 'qa_tm@aai-hrms.local');
    await page.goto('/pipeline?stage=INTERVIEW&job=qa-seed-job-0001');
    await expect(page.getByTestId('pipeline-heading')).toBeVisible();
    await selectQaSeedJob(page);

    const requestBtn = page.locator(`[data-testid="request-offer-${QA_SEED_APP_ID}"]`);
    await expect(requestBtn).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => {
      window.prompt = () => 'E2E offer recommendation';
    });
    await requestBtn.click();
    await expect(requestBtn).toContainText(/offer approval pending/i, { timeout: 10000 });
  });

  test('hiring manager approves pending offer proposal', async ({ page }) => {
    await login(page, 'qa_hm@aai-hrms.local');
    await page.goto('/pipeline?job=qa-seed-job-0001');
    await expect(page.getByTestId('pipeline-heading')).toBeVisible();
    await selectQaSeedJob(page);

    const panel = page.getByTestId('offer-stage-proposals-panel');
    await expect(panel).toBeVisible({ timeout: 15000 });
    const approveBtn = panel.locator('[data-testid^="approve-offer-proposal-"]').first();
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();
    await expect(panel).not.toBeVisible({ timeout: 10000 });
  });
});
