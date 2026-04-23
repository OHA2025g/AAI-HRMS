const BASE = '/employee-satisfaction-engagement';

/** List/workspace segments (API GET /records/{segment}); excludes dashboard, copilot, scenario, executive, strategic. */
export const ESE_LIST_SEGMENTS = [
  'pulse-surveys',
  'pulse-survey-templates',
  'pulse-survey-responses',
  'feedback',
  'sentiment',
  'experience-monitoring',
  'team-climate',
  'recognition-visibility',
  'manager-connect',
  'wellbeing-worklife',
  'communication-transparency',
  'inclusion-belonging',
  'grievance-concerns',
  'action-planning',
  'manager-interventions',
  'recognition-programs',
  'communication-campaigns',
  'culture-programs',
  'wellbeing-programs',
  'self-service-experience',
  'career-growth-experience',
  'workload-flexibility',
  'manager-effectiveness',
  'community-participation',
  'experience-recovery',
  'helpdesk-service-experience',
  'governance-approvals',
  'analytics',
  'driver-analysis',
  'burnout-risk',
  'engagement-decline',
  'attrition-linked-risk',
  'experience-gap-opportunities',
  'ai-recommendations',
  'ai-sentiment-intelligence',
  'forecasting',
  /* scenario-modeling: handled by dedicated route (what-if + list) */
];

/** @type {Array<{ path: string, kind: string, apiPath?: string, redirectTo?: string }>} */
export const ESE_ROUTES = [
  { path: `${BASE}/section-voice`, kind: 'redirect', redirectTo: `${BASE}/dashboard` },
  { path: `${BASE}/section-programs`, kind: 'redirect', redirectTo: `${BASE}/action-planning` },
  { path: `${BASE}/section-predictive`, kind: 'redirect', redirectTo: `${BASE}/analytics` },
  { path: `${BASE}/dashboard`, kind: 'dashboard' },
  { path: `${BASE}/experience-copilot`, kind: 'copilot' },
  { path: `${BASE}/strategic-experience-intelligence`, kind: 'strategic' },
  { path: `${BASE}/executive-decision-support`, kind: 'executive' },
  { path: `${BASE}/scenario-modeling`, kind: 'scenario' },
  ...ESE_LIST_SEGMENTS.map((apiPath) => ({ path: `${BASE}/${apiPath}`, kind: 'list', apiPath })),
];

export const getEseRouteConfig = (path) => ESE_ROUTES.find((r) => r.path === path);
