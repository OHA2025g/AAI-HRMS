/** Puppeteer script for Lighthouse CI — logs in before auditing /dashboard. */
module.exports = async (browser) => {
  const email = process.env.PLAYWRIGHT_USER_EMAIL || 'ci_e2e@example.com';
  const password = process.env.PLAYWRIGHT_USER_PASSWORD || 'secret123';
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="login-email-input"]', { timeout: 30_000 });
  await page.type('[data-testid="login-email-input"]', email);
  await page.type('[data-testid="login-password-input"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => /\/(dashboard|jobs)/.test(window.location.pathname),
    { timeout: 30_000 }
  );
  await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="dashboard-heading"]', { timeout: 30_000 });
  await page.close();
};
