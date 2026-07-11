/**
 * Module visibility for the Smart Hiring product slice.
 * Set REACT_APP_SMART_HIRING_ONLY=0 to restore the full HRMS surface.
 */
export const SMART_HIRING_ONLY = process.env.REACT_APP_SMART_HIRING_ONLY !== '0';

/** Sidebar group ids shown when SMART_HIRING_ONLY is enabled. */
export const SMART_HIRING_NAV_GROUP_IDS = new Set(['m1']);

/** Admin pages still available in Smart Hiring-only deployments. */
export const SMART_HIRING_ADMIN_PATHS = new Set([
  '/admin/hiring-dashboard-config',
  '/admin/career-trajectory-config',
  '/admin/integrations',
  '/admin/roles',
  '/admin/database',
]);

const SMART_HIRING_ROUTE_PREFIXES = [
  '/dashboard',
  '/jobs',
  '/candidates',
  '/pipeline',
  '/referrals',
  '/assessments',
  '/interviews',
  '/ai-hiring',
];

const SMART_HIRING_PUBLIC_PREFIXES = ['/assessment/take/', '/take/'];

export function isRouteAllowedInSmartHiringOnly(pathname) {
  if (!pathname) return true;
  if (pathname === '/' || pathname === '/login') return true;

  if (SMART_HIRING_PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true;
  }

  if (SMART_HIRING_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  if (SMART_HIRING_ADMIN_PATHS.has(pathname)) return true;

  return false;
}

export function filterNavGroupsForProductMode(groups) {
  if (!SMART_HIRING_ONLY) return groups;
  return groups.filter((group) => SMART_HIRING_NAV_GROUP_IDS.has(group.id) || group.id === 'm10');
}
