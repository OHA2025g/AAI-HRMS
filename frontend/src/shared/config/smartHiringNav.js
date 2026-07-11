/**
 * Sidebar IA from Frontend Revamp/smart_hiring_dashboard_all_6_tabs_internal_navigation.html
 * - overview: Overview tab mock (executive nav)
 * - operational: Pipeline+ tabs mock (recruiter nav)
 */

export const SMART_HIRING_OVERVIEW_SIDEBAR_NAV = [
  { path: '/dashboard', label: 'Overview', glyph: '✦', testLabel: 'Overview', matchTab: 'overview' },
  { path: '/jobs', label: 'Requisitions', glyph: '▣', testLabel: 'Requisitions' },
  { path: '/pipeline', label: 'Talent Pipeline', glyph: '☷', testLabel: 'Talent Pipeline' },
  { path: '/candidates', label: 'Candidates', glyph: '♙', testLabel: 'Candidates' },
  { path: '/interviews', label: 'Interviews', glyph: '▧', testLabel: 'Interviews' },
  {
    path: '/pipeline?stage=SALARY',
    label: 'Offers & Joining',
    glyph: '◈',
    testLabel: 'Offers Joining',
    matchPath: '/pipeline',
    matchSearch: 'stage=SALARY',
  },
  {
    path: '/dashboard?tab=analytics',
    label: 'Analytics',
    glyph: '▥',
    testLabel: 'Analytics',
    matchTab: 'analytics',
  },
  {
    path: '/ai-hiring/candidate-fit/career-trajectory',
    label: 'AI Insights',
    glyph: '✧',
    testLabel: 'AI Insights',
    matchPrefix: '/ai-hiring',
  },
  {
    path: '/dashboard?tab=analytics',
    label: 'Reports',
    glyph: '☰',
    testLabel: 'Reports',
    neverActive: true,
  },
  {
    path: '/admin/integrations',
    label: 'Settings',
    glyph: '⚙',
    testLabel: 'Settings',
    matchPrefix: '/admin',
    adminOnly: true,
  },
];

export const SMART_HIRING_OPERATIONAL_SIDEBAR_NAV = [
  { path: '/dashboard', label: 'Dashboard', glyph: '▦', testLabel: 'Dashboard' },
  { path: '/jobs', label: 'Jobs', glyph: '▣', testLabel: 'Jobs' },
  { path: '/candidates', label: 'Candidates', glyph: '♙', testLabel: 'Candidates' },
  {
    path: '/candidates/import',
    label: 'Bulk Upload',
    glyph: '⇧',
    testLabel: 'Bulk Upload',
    roles: ['admin', 'hr_admin', 'recruiter'],
  },
  { path: '/pipeline', label: 'Pipeline', glyph: '☷', testLabel: 'Pipeline' },
  { path: '/interviews', label: 'Interviews', glyph: '▧', testLabel: 'Interviews' },
  { path: '/referrals', label: 'Referrals', glyph: '♧', testLabel: 'Referrals' },
  { path: '/assessments', label: 'Assessments', glyph: '☑', testLabel: 'Assessments' },
  {
    label: 'AI Hiring Intelligence',
    glyph: '✧',
    testLabel: 'AI Hiring Intelligence',
    matchPrefix: '/ai-hiring',
    children: [
      {
        path: '/ai-hiring/candidate-fit/career-trajectory',
        label: 'Career Trajectory',
        glyph: '✣',
        testLabel: 'Career Trajectory',
        exact: true,
      },
      {
        path: '/ai-hiring/candidate-fit/career-trajectory/compare',
        label: 'Compare Trajectories',
        glyph: '✣',
        testLabel: 'Compare Trajectories',
        exact: true,
      },
      {
        path: '/ai-hiring/candidate-fit/phase2',
        label: 'Phase 2 Fit Simulation',
        glyph: '✣',
        testLabel: 'Phase 2 Fit Simulation',
        exact: true,
      },
    ],
  },
  {
    label: 'Admin',
    glyph: '▨',
    testLabel: 'Admin',
    matchPrefix: '/admin',
    adminOnly: true,
    children: [
      {
        path: '/admin/hiring-dashboard-config',
        label: 'Hiring Dashboard Config',
        glyph: '▣',
        testLabel: 'Hiring dashboard config',
        exact: true,
      },
      {
        path: '/admin/career-trajectory-config',
        label: 'Career Trajectory',
        glyph: '✣',
        testLabel: 'Career trajectory config',
        exact: true,
      },
      {
        path: '/admin/integrations',
        label: 'Settings & Connectors',
        glyph: '⚙',
        testLabel: 'Settings Connectors',
        exact: true,
      },
      {
        path: '/admin/roles',
        label: 'Role Management',
        glyph: '♙',
        testLabel: 'Role Management',
        exact: true,
      },
      {
        path: '/admin/database',
        label: 'Database Maintenance',
        glyph: '▤',
        testLabel: 'Database maintenance',
        exact: true,
      },
    ],
  },
];

/** @deprecated use getSmartHiringSidebarNav(user, variant) */
export const SMART_HIRING_SIDEBAR_NAV = SMART_HIRING_OPERATIONAL_SIDEBAR_NAV;

function parseSearch(search) {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

export function isSmartHiringNavItemActive(pathname, search, item) {
  if (item.neverActive) return false;
  const tab = parseSearch(search).get('tab') || 'overview';

  if (item.matchTab) {
    return pathname === '/dashboard' && tab === item.matchTab;
  }
  if (item.matchSearch && item.matchPath) {
    return pathname === item.matchPath && search.includes(item.matchSearch);
  }
  if (item.matchPrefix) {
    return pathname.startsWith(item.matchPrefix);
  }
  if (item.exact) {
    return pathname === item.path;
  }
  if (item.path === '/dashboard') {
    return pathname === '/dashboard';
  }
  if (item.path === '/candidates') {
    return (
      pathname === '/candidates' ||
      (pathname.startsWith('/candidates/') && !pathname.startsWith('/candidates/import'))
    );
  }
  if (item.path === '/candidates/import') {
    return pathname.startsWith('/candidates/import');
  }
  if (item.path.includes('?')) {
    const [base] = item.path.split('?');
    return pathname === base && isSmartHiringNavItemActive(pathname, search, { ...item, path: base, matchTab: item.matchTab });
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export function isSmartHiringNavGroupActive(pathname, search, item) {
  if (!item?.children?.length) return false;
  return item.children.some((child) => isSmartHiringNavItemActive(pathname, search, child));
}

export function getSmartHiringSidebarNav(user, variant = 'operational') {
  const role = user?.role;
  const isAdmin = role === 'admin';
  const source =
    variant === 'overview' ? SMART_HIRING_OVERVIEW_SIDEBAR_NAV : SMART_HIRING_OPERATIONAL_SIDEBAR_NAV;

  return source.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.roles && !item.roles.includes(String(role || ''))) return false;
    return true;
  });
}

/** Always use operational sidebar IA so Dashboard matches other Smart Hiring pages. */
export function resolveSmartHiringNavVariant(_pathname, _search) {
  return 'operational';
}

export function smartHiringNavTestId(label) {
  return `nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}
