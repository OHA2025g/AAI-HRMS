import { test, expect } from '@playwright/test';

const API = process.env.E2E_API_URL || 'http://127.0.0.1:11001';

test.describe('Backend API health', () => {
  test('GET /api/health returns healthy', async ({ request }) => {
    const res = await request.get(`${API}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({ status: 'healthy' });
    expect(body.timestamp).toBeTruthy();
  });
});
