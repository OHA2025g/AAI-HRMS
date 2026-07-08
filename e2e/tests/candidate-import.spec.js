// @ts-check
const path = require('path');
const { test, expect } = require('@playwright/test');

const email = process.env.PLAYWRIGHT_USER_EMAIL || 'qa_admin@aai-hrms.local';
const password = process.env.PLAYWRIGHT_USER_PASSWORD || 'QA_Seed_ChangeMe!';
const fixturePath = path.join(__dirname, '../fixtures/candidate-import-sample.csv');

async function login(page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|jobs|candidates)/, { timeout: 30_000 });
}

test.describe('Candidate bulk import', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('wizard uploads, validates, and commits a CSV import', async ({ page }) => {
    await page.goto('/candidates/import');
    await expect(page.getByText('Candidate Bulk Import')).toBeVisible({ timeout: 20_000 });

    await page.locator('input[type="file"]').setInputFiles(fixturePath);
    await page.getByRole('button', { name: /Upload & continue/i }).click();

    await expect(page.getByText('Column mapping')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/1 rows/)).toBeVisible();

    await page.getByRole('button', { name: /Validate & preview/i }).click();
    await expect(page.getByText('Total rows')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Valid', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Import valid records/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /Confirm import/i }).click();

    await expect(page.getByText('Import complete')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/inserted/i)).toBeVisible();
  });

  test('schema and template endpoints are reachable when authenticated', async ({ page, request }) => {
    await page.goto('/candidates');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:11001';
    const headers = { Authorization: `Bearer ${token}` };

    const schema = await request.get(`${apiURL}/api/ats/candidates/import/schema`, { headers });
    expect(schema.ok()).toBeTruthy();
    const body = await schema.json();
    expect(body.fields?.some((f) => f.field === 'full_name')).toBeTruthy();

    const template = await request.get(`${apiURL}/api/ats/candidates/import/template`, { headers });
    expect(template.ok()).toBeTruthy();
    expect(template.headers()['content-type'] || '').toContain('spreadsheet');
  });
});
