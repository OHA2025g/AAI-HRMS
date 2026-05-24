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

test.describe('Smart Hiring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-heading')).toBeVisible();
  });

  test('loads KPI tiles and health strip', async ({ page }) => {
    await expect(page.getByText('Open jobs')).toBeVisible();
    await expect(page.getByText('Active pipeline')).toBeVisible();
    await expect(page.getByText('Hiring health')).toBeVisible();
  });

  test('period toggle updates URL window param', async ({ page }) => {
    await page.getByRole('button', { name: '7d' }).click();
    await expect(page).toHaveURL(/window=7/);
    await page.getByRole('button', { name: '90d' }).click();
    await expect(page).toHaveURL(/window=90/);
  });

  test('scope filter updates URL', async ({ page }) => {
    await page.getByTestId('hiring-scope-filter').click();
    await page.getByRole('option', { name: /my jobs/i }).click();
    await expect(page).toHaveURL(/scope=mine/);
  });

  test('funnel drill navigates to pipeline', async ({ page }) => {
    const drill = page.locator('[data-testid^="funnel-drill-"]').first();
    await expect(drill).toBeVisible();
    await drill.click();
    await expect(page).toHaveURL(/\/pipeline/);
  });

  test('source drill navigates to candidates', async ({ page }) => {
    const drill = page.locator('[data-testid^="source-drill-"]').first();
    await expect(drill).toBeVisible();
    await drill.click();
    await expect(page).toHaveURL(/\/candidates/);
  });

  test('mini KPI AI adoption drills to jobs when present', async ({ page }) => {
    const aiTile = page.getByTestId('mini-kpi-ai-adoption');
    if (await aiTile.count()) {
      await aiTile.click();
      await expect(page).toHaveURL(/\/jobs/);
    }
  });

  test('funnel section is visible', async ({ page }) => {
    await expect(page.getByText(/pipeline funnel/i)).toBeVisible();
  });

  test('alert link navigates when alerts exist', async ({ page }) => {
    const alertLink = page.locator('[data-testid="hiring-alert-link"]').first();
    await expect(alertLink).toBeVisible({ timeout: 15_000 });
    await alertLink.click();
    await expect(page).not.toHaveURL(/\/dashboard(\?|$)/);
  });

  test('trends chart shows data source badge', async ({ page }) => {
    await expect(page.getByTestId('trends-data-source')).toBeVisible();
  });

  test('presentation mode hides filters and enlarges health strip', async ({ page }) => {
    await expect(page.getByTestId('hiring-scope-filter')).toBeVisible();
    await page.getByTestId('hiring-presentation-toggle').click();
    await expect(page.getByTestId('hiring-scope-filter')).toHaveCount(0);
    await expect(page.getByTestId('hiring-health-strip')).toBeVisible();
  });

  test('health strip shows top alerts when present', async ({ page }) => {
    const stripAlerts = page.getByTestId('health-strip-alerts');
    if (await stripAlerts.count()) {
      await expect(page.getByTestId('health-strip-alert-link').first()).toBeVisible();
    }
  });

  test('mini KPI row visible when metrics present', async ({ page }) => {
    const miniRow = page.getByTestId('hiring-mini-kpi-row');
    if (await miniRow.count()) {
      await expect(miniRow).toBeVisible();
      const aiTile = page.getByTestId('mini-kpi-ai-adoption');
      if (await aiTile.count()) {
        await expect(aiTile).toBeVisible();
      }
    }
  });

  test('funnel drill works via keyboard Enter', async ({ page }) => {
    const drill = page.locator('[data-testid^="funnel-drill-"]').first();
    await expect(drill).toBeVisible();
    await drill.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/pipeline/);
  });

  test('high fit KPI tile is keyboard focusable', async ({ page }) => {
    const highFitLink = page.getByRole('link', { name: /high fit/i });
    await expect(highFitLink).toBeVisible();
    await highFitLink.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/fit_min=90/);
  });
});
