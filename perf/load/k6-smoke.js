/**
 * M10 / Week 12 — lightweight load smoke (k6).
 *
 *   BASE_URL=http://localhost:8001 k6 run scripts/load/k6-smoke.js
 *
 * For authenticated routes, add K6_SCRIPT_BEARER in CI secrets and extend this script.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '60s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:8001';

export default function () {
  const r = http.get(`${BASE}/api/health`);
  check(r, { 'health 2xx': (res) => res.status >= 200 && res.status < 300 });
  sleep(0.3);
}
