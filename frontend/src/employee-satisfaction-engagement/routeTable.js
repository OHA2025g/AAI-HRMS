/** Route metadata for Employee Satisfaction & Engagement (matches backend LIST_SEGMENT_COLLECTION keys). */

export const ESE_ROUTES = [
  { path: '/employee-satisfaction-engagement/dashboard', kind: 'dashboard' },
  { path: '/employee-satisfaction-engagement/copilot', kind: 'copilot' },

  { path: '/employee-satisfaction-engagement/pulse-surveys', kind: 'list', segment: 'pulse-surveys' },
  { path: '/employee-satisfaction-engagement/feedback', kind: 'list', segment: 'feedback' },
  { path: '/employee-satisfaction-engagement/sentiment', kind: 'list', segment: 'sentiment' },
  { path: '/employee-satisfaction-engagement/experience-monitoring', kind: 'list', segment: 'experience-monitoring' },
  { path: '/employee-satisfaction-engagement/team-climate', kind: 'list', segment: 'team-climate' },
  { path: '/employee-satisfaction-engagement/recognition-visibility', kind: 'list', segment: 'recognition-visibility' },
  { path: '/employee-satisfaction-engagement/manager-connect', kind: 'list', segment: 'manager-connect' },
  { path: '/employee-satisfaction-engagement/wellbeing-worklife', kind: 'list', segment: 'wellbeing-worklife' },
  { path: '/employee-satisfaction-engagement/communication-transparency', kind: 'list', segment: 'communication-transparency' },
  { path: '/employee-satisfaction-engagement/inclusion-belonging', kind: 'list', segment: 'inclusion-belonging' },
  { path: '/employee-satisfaction-engagement/grievance-concerns', kind: 'elm_grievances' },

  { path: '/employee-satisfaction-engagement/action-planning', kind: 'list', segment: 'action-planning' },
  { path: '/employee-satisfaction-engagement/manager-interventions', kind: 'list', segment: 'manager-interventions' },
  { path: '/employee-satisfaction-engagement/recognition-programs', kind: 'list', segment: 'recognition-programs' },
  { path: '/employee-satisfaction-engagement/communication-campaigns', kind: 'list', segment: 'communication-campaigns' },
  { path: '/employee-satisfaction-engagement/culture-programs', kind: 'list', segment: 'culture-programs' },
  { path: '/employee-satisfaction-engagement/wellbeing-programs', kind: 'list', segment: 'wellbeing-programs' },
  { path: '/employee-satisfaction-engagement/self-service-experience', kind: 'list', segment: 'self-service-experience' },
  { path: '/employee-satisfaction-engagement/career-growth-experience', kind: 'list', segment: 'career-growth-experience' },
  { path: '/employee-satisfaction-engagement/workload-flexibility', kind: 'list', segment: 'workload-flexibility' },
  { path: '/employee-satisfaction-engagement/manager-effectiveness', kind: 'list', segment: 'manager-effectiveness' },
  { path: '/employee-satisfaction-engagement/community-participation', kind: 'list', segment: 'community-participation' },
  { path: '/employee-satisfaction-engagement/experience-recovery', kind: 'list', segment: 'experience-recovery' },
  { path: '/employee-satisfaction-engagement/helpdesk-service-experience', kind: 'list', segment: 'helpdesk-service-experience' },
  { path: '/employee-satisfaction-engagement/governance-approvals', kind: 'list', segment: 'governance-approvals' },

  { path: '/employee-satisfaction-engagement/analytics', kind: 'list', segment: 'analytics' },
  { path: '/employee-satisfaction-engagement/driver-analysis', kind: 'list', segment: 'driver-analysis' },
  { path: '/employee-satisfaction-engagement/burnout-risk', kind: 'wfi_burnout' },
  { path: '/employee-satisfaction-engagement/engagement-decline', kind: 'list', segment: 'engagement-decline' },
  { path: '/employee-satisfaction-engagement/attrition-linked-risk', kind: 'wfi_attrition' },
  { path: '/employee-satisfaction-engagement/experience-gap-opportunities', kind: 'list', segment: 'experience-gap-opportunities' },
  { path: '/employee-satisfaction-engagement/ai-recommendations', kind: 'wfi_ai_recommendations' },
  { path: '/employee-satisfaction-engagement/ai-sentiment-intelligence', kind: 'list', segment: 'ai-sentiment-intelligence' },
  { path: '/employee-satisfaction-engagement/forecasting', kind: 'wfi_forecasts' },
  { path: '/employee-satisfaction-engagement/scenario-modeling', kind: 'list', segment: 'scenario-modeling' },
  { path: '/employee-satisfaction-engagement/strategic-experience-intelligence', kind: 'list', segment: 'strategic-experience-intelligence' },
  { path: '/employee-satisfaction-engagement/executive-decision-support', kind: 'executive' },
];

export const getEseRouteConfig = (pathname) => ESE_ROUTES.find((r) => r.path === pathname);
