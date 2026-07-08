/**
 * k6 load + stress test — ramp to 10,000 virtual users (VUs).
 * Target: Docker stack @ http://localhost:3001
 *
 * Run:
 *   k6 run scripts/k6-10k-load-stress.js
 *   k6 run --vus 10000 --duration 5m scripts/k6-10k-load-stress.js  # flat 10k (stress)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:3001';
const API = `${BASE}/api`;
const EMAIL = __ENV.LOAD_TEST_EMAIL || 'aghoreshwar@hotmail.com';
const PASSWORD = __ENV.LOAD_TEST_PASSWORD || 'Prince@1804';

const errorRate = new Rate('errors');
const jobsDuration = new Trend('jobs_duration', true);
const healthDuration = new Trend('health_duration', true);

export const options = {
  scenarios: {
    ramp_to_10k: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 500 },
        { duration: '2m', target: 2000 },
        { duration: '3m', target: 5000 },
        { duration: '4m', target: 10000 },
        { duration: '3m', target: 10000 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    errors: ['rate<0.10'],
    health_duration: ['p(95)<3000'],
    jobs_duration: ['p(95)<10000'],
  },
};

export function setup() {
  const res = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '30s' }
  );
  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status} ${res.body}`);
  }
  return { token: res.json('access_token') };
}

export default function (data) {
  const authHeaders = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  const roll = Math.random();

  if (roll < 0.4) {
    const res = http.get(`${API}/health`, { timeout: '30s', tags: { name: 'health' } });
    healthDuration.add(res.timings.duration);
    const ok = check(res, { 'health 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  } else if (roll < 0.55) {
    const res = http.get(`${BASE}/dashboard`, { timeout: '30s', tags: { name: 'spa_dashboard' } });
    const ok = check(res, { 'dashboard 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  } else if (roll < 0.75) {
    const res = http.get(`${API}/jobs`, { headers: authHeaders, timeout: '60s', tags: { name: 'jobs' } });
    jobsDuration.add(res.timings.duration);
    const ok = check(res, { 'jobs 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  } else if (roll < 0.9) {
    const res = http.get(`${API}/candidates`, { headers: authHeaders, timeout: '60s', tags: { name: 'candidates' } });
    const ok = check(res, { 'candidates 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  } else {
    const res = http.get(`${API}/dashboard/hiring-pack`, { headers: authHeaders, timeout: '60s', tags: { name: 'hiring_pack' } });
    const ok = check(res, { 'hiring_pack 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  sleep(Math.random() * 2 + 0.5);
}

export function handleSummary(data) {
  const lines = [
    '',
    '='.repeat(72),
    '  10,000 VU LOAD & STRESS TEST — SUMMARY',
    '='.repeat(72),
    `  Total requests: ${data.metrics.http_reqs?.values?.count ?? 'n/a'}`,
    `  Failed requests: ${((data.metrics.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    `  p95 latency: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? 'n/a'} ms`,
    `  Max VUs reached: ${data.metrics.vus_max?.values?.max ?? 'n/a'}`,
    '='.repeat(72),
  ];
  return {
    stdout: lines.join('\n') + '\n',
    'scripts/k6-10k-results.json': JSON.stringify(data, null, 2),
  };
}
