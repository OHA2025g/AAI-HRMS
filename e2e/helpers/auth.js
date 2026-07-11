// @ts-check

/**
 * Shared login helper using stable data-testid selectors.
 * Login and register fields can both exist in the DOM (tabbed UI), so avoid getByLabel.
 */
async function loginAs(page, email, password, waitForUrl = /\/(dashboard|jobs|candidates)/) {
  await page.goto('/login');
  await page.getByTestId('login-tab').click().catch(() => {});
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await page.waitForURL(waitForUrl, { timeout: 30_000 });
}

module.exports = { loginAs };
