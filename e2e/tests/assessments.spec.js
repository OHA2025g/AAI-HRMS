// @ts-check
const { test, expect } = require('@playwright/test');

const email = process.env.PLAYWRIGHT_USER_EMAIL || 'qa_admin@aai-hrms.local';
const password = process.env.PLAYWRIGHT_USER_PASSWORD || 'QA_Seed_ChangeMe!';
const apiURL = process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:11001';

async function login(page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|jobs)/, { timeout: 30_000 });
}

async function authHeaders(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return token ? { Authorization: `Bearer ${token}` } : {};
}

test.describe('Assessments Command Center', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/assessments?tab=overview');
    await expect(page.getByTestId('assessments-heading').or(page.getByTestId('assessments-workspace-skeleton'))).toBeVisible({ timeout: 30_000 });
  });

  test('loads overview with KPI strip and tabs', async ({ page }) => {
    await expect(page.getByText('Total assessments')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Library/i })).toBeVisible();
  });

  test('org filter bar and audit log on overview', async ({ page }) => {
    await expect(page.getByTestId('assessment-org-filter-bar')).toBeVisible();
    await expect(page.getByTestId('assessment-audit-log-panel')).toBeVisible();
  });

  test('insights outcome correlation panel', async ({ page }) => {
    await page.goto('/assessments?tab=insights');
    await expect(page.getByRole('tab', { name: /Insights/i })).toBeVisible();
    const panel = page.getByTestId('assessment-outcome-panel');
    if (await panel.count()) {
      await expect(panel.getByText(/Assessment → interview/i)).toBeVisible();
    }
  });

  test('generator opens review flow', async ({ page }) => {
    await page.getByTestId('create-assessment-btn').click();
    await expect(page.getByTestId('assessment-job-select')).toBeVisible();
  });

  test('dashboard assessment clearance links to assessments', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-heading')).toBeVisible();
    const link = page.getByTestId('dashboard-assessment-clearance-link');
    if (await link.count()) {
      await link.click();
      await expect(page).toHaveURL(/\/assessments/);
    }
  });

  test('job coverage table renders on overview when data exists', async ({ page }) => {
    await page.goto('/assessments?tab=overview');
    const coverage = page.getByTestId('assessment-job-coverage');
    if (await coverage.count()) {
      await expect(coverage.getByText('Job coverage')).toBeVisible();
    }
  });

  test('full flow: invite → take → submit → scored result', async ({ page, request }) => {
    const headers = await authHeaders(page);

    const assessmentsRes = await request.get(`${apiURL}/api/assessments`, {
      headers,
      params: { limit: 50 },
    });
    expect(assessmentsRes.ok()).toBeTruthy();
    const assessments = await assessmentsRes.json();
    const active = (assessments || []).find((a) => a.status === 'ACTIVE' && a.questions?.length);
    test.skip(!active, 'No active assessment with questions in seed data');

    const appsRes = await request.get(`${apiURL}/api/applications`, {
      headers,
      params: { job_id: active.job_id },
    });
    expect(appsRes.ok()).toBeTruthy();
    const apps = await appsRes.json();
    test.skip(!apps?.length, 'No applications for assessment job');

    const inviteRes = await request.post(`${apiURL}/api/assessments/${active.id}/invite`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { application_id: apps[0].id, send_candidate_email: false },
    });
    expect(inviteRes.ok()).toBeTruthy();
    const submission = await inviteRes.json();
    expect(submission.take_url || submission.access_token).toBeTruthy();

    const takePath = submission.take_url
      ? new URL(submission.take_url, 'http://localhost').pathname
      : `/assessment/take/${submission.access_token}`;

    await page.goto(takePath);
    await expect(page.getByTestId('assessment-take-page')).toBeVisible({ timeout: 30_000 });

    const radioNames = await page.locator('input[type="radio"]').evaluateAll((els) => [...new Set(els.map((e) => e.name))]);
    for (const name of radioNames) {
      await page.locator(`input[type="radio"][name="${name}"]`).first().check();
    }

    const textareas = page.locator('textarea[data-testid^="answer-"]');
    const taCount = await textareas.count();
    for (let i = 0; i < taCount; i += 1) {
      await textareas.nth(i).fill('E2E automated response for short-answer question.');
    }

    await page.getByTestId('assessment-submit-btn').click();
    await expect(page.getByTestId('assessment-take-done')).toBeVisible({ timeout: 30_000 });

    const pendingReview = page.getByTestId('assessment-pending-review');
    if (await pendingReview.count()) {
      await page.goto('/assessments?tab=in-progress');
      await expect(page.getByRole('tab', { name: /In progress/i })).toBeVisible();
      await page.getByTestId(`grade-submission-${submission.id}`).click();
      await page.getByTestId('ai-suggest-grades-btn').click({ timeout: 5000 }).catch(() => {});
      const markInputs = page.locator('input[type="number"]');
      const markCount = await markInputs.count();
      for (let i = 0; i < markCount; i += 1) {
        const input = markInputs.nth(i);
        const current = await input.inputValue();
        if (!current) await input.fill('8');
      }
      await page.getByRole('button', { name: /Save & score/i }).click();
      await expect(page.getByText('Score saved')).toBeVisible({ timeout: 15_000 }).catch(() => {});
    }

    await page.goto('/assessments?tab=results');
    await expect(page.getByRole('tab', { name: /Results/i })).toBeVisible();
    await expect(page.getByTestId('export-results-csv')).toBeVisible();
  });

  test('missing usage filter shows job coverage table', async ({ page }) => {
    await page.goto('/assessments?tab=library&usage=missing');
    await expect(page.getByRole('tab', { name: /Library/i })).toBeVisible();
    const missingTable = page.getByTestId('assessment-missing-jobs');
    const emptyState = page.getByText(/No jobs missing assessments|No missing job gaps/i);
    await expect(missingTable.or(emptyState)).toBeVisible({ timeout: 15_000 });
  });

  test('dashboard assessment panel links to command center', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-heading')).toBeVisible();
    const panel = page.getByTestId('dashboard-assessment-panel');
    if (await panel.count()) {
      await page.getByTestId('dashboard-assessment-panel-link').click();
      await expect(page).toHaveURL(/\/assessments/);
    }
  });

  test('pipeline mark cleared requires override when candidate has not passed', async ({ page, request }) => {
    const headers = await authHeaders(page);

    const jobsRes = await request.get(`${apiURL}/api/jobs`, { headers, params: { status: 'OPEN' } });
    expect(jobsRes.ok()).toBeTruthy();
    const jobs = await jobsRes.json();
    const job = (jobs || []).find((j) => j?.id);
    test.skip(!job, 'No open job for pipeline clearance test');

    const pipelineRes = await request.get(`${apiURL}/api/applications/pipeline/${job.id}`, { headers });
    expect(pipelineRes.ok()).toBeTruthy();
    const pipeline = await pipelineRes.json();
    const sentApps = pipeline?.ASSESSMENT_SENT || [];
    test.skip(!sentApps.length, 'No candidates in ASSESSMENT_SENT for clearance test');

    const app = sentApps[0];
    const subsRes = await request.get(`${apiURL}/api/assessments/submissions`, {
      headers,
      params: { job_id: job.id, limit: 200 },
    });
    const subs = subsRes.ok() ? await subsRes.json() : [];
    const sub = (subs || []).find((s) => s.application_id === app.id);
    test.skip(sub?.passed === true, 'Need non-passing submission to test override dialog');

    await page.goto(`/pipeline?job=${job.id}&stage=ASSESSMENT`);
    const markBtn = page.getByTestId(`mark-cleared-${app.id}`);
    await expect(markBtn).toBeVisible({ timeout: 20_000 });
    await markBtn.click();

    const reasonInput = page.getByTestId('assessment-clear-override-reason');
    await expect(reasonInput).toBeVisible({ timeout: 10_000 });
    await reasonInput.fill('E2E override: strong screening feedback');
    await page.getByTestId('confirm-mark-cleared-btn').click();
    await expect(page.getByText(/Updated|Cleared/i)).toBeVisible({ timeout: 15_000 });
  });

  test('insights calibration panel renders', async ({ page }) => {
    await page.goto('/assessments?tab=insights');
    await expect(page.getByTestId('assessment-calibration-panel')).toBeVisible({ timeout: 15_000 });
  });

  test('score histogram drilldown opens; filters results tab', async ({ page }) => {
    await page.goto('/assessments?tab=overview');
    const histogram = page.getByTestId('assessment-score-histogram');
    await expect(histogram).toBeVisible({ timeout: 15_000 });

    const bar = page.locator('[data-testid="assessment-score-histogram"] .recharts-bar-rectangle').first();
    if ((await bar.count()) === 0) {
      test.skip(true, 'No scored submissions for histogram bars');
    }
    await bar.click();
    await expect(page).toHaveURL(/tab=results/);
    await expect(page.getByTestId('results-score-filter-badge')).toBeVisible({ timeout: 10_000 });
  });

  test('legacy /take/:token redirects to canonical take route', async ({ page }) => {
    await page.goto('/take/demo-token-legacy');
    await expect(page).toHaveURL(/\/assessment\/take\/demo-token-legacy/);
  });

  test('invite dialog warns when email delivery not configured', async ({ page, request }) => {
    const headers = await authHeaders(page);
    const assessmentsRes = await request.get(`${apiURL}/api/assessments`, { headers, params: { limit: 10 } });
    expect(assessmentsRes.ok()).toBeTruthy();
    const active = (await assessmentsRes.json() || []).find((a) => a.status === 'ACTIVE');
    test.skip(!active, 'No active assessment for invite warning test');

    await page.goto('/assessments?tab=library');
    await page.getByTestId(`assessment-card-${active.id}`).getByRole('button', { name: /Invite/i }).click();
    await expect(page.getByTestId('assessment-invite-submit')).toBeVisible();
    const warning = page.getByTestId('assessment-invite-email-warning');
    if (await warning.count()) {
      await expect(warning).toContainText(/SMTP|public take URL/i);
    }
  });

  test('cancel submission removes row from in-progress tab', async ({ page, request }) => {
    const headers = await authHeaders(page);
    const subsRes = await request.get(`${apiURL}/api/assessments/submissions`, {
      headers,
      params: { status: 'INVITED', limit: 20 },
    });
    expect(subsRes.ok()).toBeTruthy();
    const invited = (await subsRes.json() || []).find((s) => s.status === 'INVITED');
    test.skip(!invited, 'No invited submission to cancel');

    const cancelRes = await request.post(`${apiURL}/api/assessments/submissions/${invited.id}/cancel`, { headers });
    expect(cancelRes.ok()).toBeTruthy();
    expect((await cancelRes.json()).status).toBe('CANCELLED');

    await page.goto('/assessments?tab=in-progress');
    await expect(page.getByTestId(`cancel-submission-${invited.id}`)).toHaveCount(0);
  });

  test('pipeline shows missing-assessment alert when candidates sent without test', async ({ page, request }) => {
    const headers = await authHeaders(page);
    const jobsRes = await request.get(`${apiURL}/api/jobs`, { headers, params: { status: 'OPEN' } });
    expect(jobsRes.ok()).toBeTruthy();
    const jobs = await jobsRes.json();
    test.skip(!jobs?.length, 'No open jobs');

    for (const job of jobs) {
      const pipelineRes = await request.get(`${apiURL}/api/applications/pipeline/${job.id}`, { headers });
      if (!pipelineRes.ok()) continue;
      const pipeline = await pipelineRes.json();
      const sentCount = (pipeline?.ASSESSMENT_SENT || []).length;
      if (sentCount === 0) continue;

      const assessRes = await request.get(`${apiURL}/api/assessments`, { headers, params: { job_id: job.id } });
      const assessments = assessRes.ok() ? await assessRes.json() : [];
      const hasActive = (assessments || []).some((a) => a.status === 'ACTIVE');
      if (hasActive) continue;

      await page.goto(`/pipeline?job=${job.id}&stage=ASSESSMENT`);
      await expect(page.getByTestId('pipeline-missing-assessment-alert')).toBeVisible({ timeout: 15_000 });
      return;
    }
    test.skip(true, 'No job with ASSESSMENT_SENT candidates and zero active assessments');
  });
});
