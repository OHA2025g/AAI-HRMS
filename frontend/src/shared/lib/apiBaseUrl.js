/**
 * API base path for axios (always ends with `/api`, no trailing slash after that).
 *
 * - CRA inlines `process.env.REACT_APP_BACKEND_URL` at build time.
 * - Empty string => same-origin `/api` (Docker nginx proxies to the API container).
 * - Falls back to `import.meta.env.VITE_BACKEND_URL` (Vite) then local dev default.
 *
 * Prefer REACT_APP_* over VITE_* so `.env` matches `yarn start` / craco builds.
 */
const DEFAULT_DEV_BACKEND = 'http://127.0.0.1:8001';

// eslint-disable-next-line no-undef -- CRA DefinePlugin
const reactBackend = process.env.REACT_APP_BACKEND_URL;

const viteBackend =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL;

let backendRoot = '';

if (reactBackend !== undefined && reactBackend !== null && String(reactBackend).trim() !== '') {
  backendRoot = String(reactBackend).trim().replace(/\/$/, '');
} else if (
  reactBackend !== undefined &&
  reactBackend !== null &&
  String(reactBackend).trim() === ''
) {
  // Explicit empty: use relative /api (Docker nginx proxy)
  backendRoot = '';
} else if (viteBackend != null && String(viteBackend).trim() !== '') {
  backendRoot = String(viteBackend).trim().replace(/\/$/, '');
} else {
  backendRoot = DEFAULT_DEV_BACKEND.replace(/\/$/, '');
}

/** e.g. `http://127.0.0.1:8001/api` or `/api` */
export const API_BASE_URL = backendRoot === '' ? '/api' : `${backendRoot}/api`;

export default API_BASE_URL;
