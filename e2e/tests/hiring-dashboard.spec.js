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

async function openDashboard(page) {
  await page.goto('/dashboard');
  await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  await expect(page.getByTestId('dashboard-hero-health')).toBeVisible({ timeout: 15_000 });
}

async function selectTab(page, tabLabel) {
  await page.getByTestId('dashboard-tabs').getByRole('tab', { name: tabLabel }).click();
}

test.describe('Smart Hiring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openDashboard(page);
  });

  test('loads hero health and overview section', async ({ page }) => {
    await expect(page.getByTestId('dash-overview')).toBeVisible();
    await expect(page.getByText('Open Positions')).toBeVisible();
    await expect(page.getByText('Expected Hires')).toBeVisible();
    await expect(page.getByText('AI Hiring Health Score')).toBeVisible();
  });

  test('shows six-tab navigation', async ({ page }) => {
    const tabs = page.getByTestId('dashboard-tabs');
    for (const name of ['Overview', 'Pipeline', 'Offers', 'Interviews', 'Signals', 'Analytics']) {
      await expect(tabs.getByRole('tab', { name })).toBeVisible();
    }
  });

  test('tab navigation updates URL', async ({ page }) => {
    await selectTab(page, 'Pipeline');
    await expect(page).toHaveURL(/tab=pipeline/);
    await expect(page.getByTestId('dash-funnel')).toBeVisible();
    await selectTab(page, 'Analytics');
    await expect(page).toHaveURL(/tab=analytics/);
    await expect(page.getByTestId('dash-charts')).toBeVisible();
  });

  test('overview shows hiring velocity and time-to-fill charts', async ({ page }) => {
    await expect(page.getByTestId('hiring-velocity-chart')).toBeVisible();
    await expect(page.getByTestId('time-to-fill-trend-chart')).toBeVisible();
  });

  test('period toggle updates URL window param', async ({ page }) => {
    await page.getByRole('button', { name: '7d' }).click();
    await expect(page).toHaveURL(/window=7/);
    await page.getByRole('button', { name: '90d' }).click();
    await expect(page).toHaveURL(/window=90/);
  });

  test('scope filter updates URL', async ({ page }) => {
    await selectTab(page, 'Pipeline');
    await page.getByTestId('hiring-scope-filter').click();
    await page.getByRole('option', { name: /my jobs/i }).click();
    await expect(page).toHaveURL(/scope=mine/);
  });

  test('open positions KPI drills to jobs', async ({ page }) => {
    await page.getByRole('link', { name: /open positions/i }).click();
    await expect(page).toHaveURL(/\/jobs\?status=OPEN/);
  });

  test('pipeline funnel stage drill navigates to pipeline', async ({ page }) => {
    await selectTab(page, 'Pipeline');
    const stageLink = page.getByRole('link', { name: /applications|sourced|screened/i }).first();
    await expect(stageLink).toBeVisible();
    await stageLink.click();
    await expect(page).toHaveURL(/\/pipeline/);
  });

  test('source drill navigates to candidates on analytics tab', async ({ page }) => {
    await selectTab(page, 'Analytics');
    const drill = page
      .getByTestId('source-quality-charts')
      .locator('[data-testid^="source-drill-"]')
      .first();
    if (await drill.count()) {
      await drill.scrollIntoViewIfNeeded();
      await drill.click();
      await expect(page).toHaveURL(/\/candidates/);
    }
  });

  test('trends chart shows data source badge on analytics tab', async ({ page }) => {
    await selectTab(page, 'Analytics');
    await expect(page.getByTestId('trends-data-source')).toBeVisible();
  });

  test('presentation mode hides filters and keeps hero health', async ({ page }) => {
    await expect(page.getByTestId('hiring-pillar-filter')).toBeVisible();
    await page.getByTestId('hiring-presentation-toggle').click();
    await expect(page.getByTestId('hiring-pillar-filter')).toHaveCount(0);
    await expect(page.getByTestId('dashboard-hero-health')).toBeVisible();
  });

  test('alert link navigates when alerts exist on pipeline tab', async ({ page }) => {
    await selectTab(page, 'Pipeline');
    const alertLink = page.locator('[data-testid="hiring-alert-link"]').first();
    if (await alertLink.count()) {
      await alertLink.click();
      await expect(page).not.toHaveURL(/\/dashboard(\?|$)/);
    }
  });

  test('smart action drills to candidates when present', async ({ page }) => {
    const action = page.getByRole('link', { name: /review high-fit|high-fit/i }).first();
    if (await action.count()) {
      await action.click();
      await expect(page).toHaveURL(/fit_min=90/);
    }
  });

  test('pipeline funnel drill works via keyboard Enter', async ({ page }) => {
    await selectTab(page, 'Pipeline');
    const drill = page.getByRole('link', { name: /applications|sourced|screened/i }).first();
    await expect(drill).toBeVisible();
    await drill.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/pipeline/);
  });
});
