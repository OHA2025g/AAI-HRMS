const BASE = '/cost-optimization-automation';

export const LIST_SEGMENTS = [
  'workforce-cost',
  'hr-operations-cost',
  'budget-spend-control',
  'vendor-cost',
  'process-cost-mapping',
  'manual-effort-overhead',
  'productivity-efficiency',
  'compliance-penalty-cost',
  'tool-cost-visibility',
  'policy-exception-leakage',
  'cost-benchmarking',
  'process-automation',
  'hr-workflow-automation',
  'self-service-optimization',
  'recruitment-automation',
  'onboarding-lifecycle-automation',
  'payroll-benefits-automation',
  'training-automation',
  'helpdesk-query-automation',
  'document-compliance-automation',
  'resource-allocation-automation',
  'performance-engagement-automation',
  'process-reengineering',
  'automation-roi-savings',
  'automation-governance',
  'cost-forecasting',
  'cost-driver-analysis',
  'savings-opportunities',
  'ai-cost-recommendations',
  'ai-productivity-recommendations',
  'cost-overrun-risk',
  'efficiency-risk',
  'continuous-improvement',
];

/** @type {Array<{ path: string, kind: string, apiPath?: string, redirectTo?: string }>} */
export const COA_ROUTES = [
  { path: `${BASE}/section-visibility`, kind: 'redirect', redirectTo: `${BASE}/dashboard` },
  { path: `${BASE}/section-automation`, kind: 'redirect', redirectTo: `${BASE}/process-automation` },
  { path: `${BASE}/section-predictive`, kind: 'redirect', redirectTo: `${BASE}/cost-forecasting` },
  { path: `${BASE}/dashboard`, kind: 'dashboard' },
  { path: `${BASE}/ai-copilot`, kind: 'copilot' },
  { path: `${BASE}/strategic-cost-intelligence`, kind: 'strategic' },
  { path: `${BASE}/executive-decision-support`, kind: 'executive' },
  { path: `${BASE}/scenario-modeling`, kind: 'scenario' },
  ...LIST_SEGMENTS.map((apiPath) => ({
    path: `${BASE}/${apiPath}`,
    kind: 'list',
    apiPath,
  })),
];

export const getCoaRouteConfig = (path) => COA_ROUTES.find((r) => r.path === path);
