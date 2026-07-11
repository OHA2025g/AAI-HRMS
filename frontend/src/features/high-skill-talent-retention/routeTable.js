export const HSR_EXTRA_ROUTES = [
  { path: 'segmentation', title: 'Talent Segmentation & Prioritization', kind: 'segments' },
  { path: 'sentiment-engagement', title: 'Sentiment & Engagement Intelligence', kind: 'sentiment' },
  { path: 'stay-interviews', title: 'Stay Interview Management', kind: 'stays' },
  { path: 'recognition-rewards', title: 'Recognition & Rewards Tracking', kind: 'simple', api: 'recognitionRewards' },
  { path: 'relationship-history', title: 'Talent Relationship History', kind: 'simple', api: 'relationshipHistory' },

  { path: 'risk-assessment', title: 'Retention Risk Assessment', kind: 'risk' },
  { path: 'attrition-prediction', title: 'Attrition Prediction & Early Warning', kind: 'pred' },
  { path: 'compensation-analysis', title: 'Compensation Competitiveness Analysis', kind: 'simple', api: 'compensationAnalysis' },
  { path: 'incentives', title: 'Retention Incentive Management', kind: 'simple', api: 'incentives' },
  { path: 'career-growth', title: 'Career Growth & Advancement', kind: 'simple', api: 'careerGrowth' },
  { path: 'internal-mobility', title: 'Internal Mobility & Opportunity', kind: 'simple', api: 'internalMobility' },
  { path: 'skill-utilization', title: 'Critical Skill Utilization', kind: 'simple', api: 'skillUtilization' },
  { path: 'criticality-mapping', title: 'Role / Project Criticality', kind: 'simple', api: 'criticalityMapping' },
  { path: 'successor-coverage', title: 'Successor Coverage & Backup', kind: 'simple', api: 'successorCoverage' },
  { path: 'development-plans', title: 'Personalized Development Plans', kind: 'simple', api: 'developmentPlans' },
  { path: 'learning-upskilling', title: 'Learning & Upskilling', kind: 'simple', api: 'learningUpskilling' },
  { path: 'workload-wellbeing', title: 'Workload, Burnout & Wellbeing', kind: 'simple', api: 'workloadWellbeing' },
  { path: 'work-experience', title: 'Work Experience Preferences', kind: 'simple', api: 'workExperience' },
  { path: 'engagement-actions', title: 'Engagement Action Planning', kind: 'actions' },
  { path: 'cases', title: 'Retention Case Management', kind: 'cases' },
  { path: 'counteroffer-handling', title: 'Offer / Counteroffer Handling', kind: 'simple', api: 'counteroffers' },

  { path: 'analytics', title: 'Retention Analytics & Dashboards', kind: 'analytics' },
  { path: 'exit-risk-triggers', title: 'Exit Risk Trigger Monitoring', kind: 'simple', api: 'exitRiskTriggers' },
  { path: 'knowledge-risk', title: 'Knowledge Risk & Dependency', kind: 'simple', api: 'knowledgeRisk' },
  { path: 'client-critical', title: 'Client-Critical Talent Retention', kind: 'simple', api: 'clientCritical' },
  { path: 'project-critical', title: 'Project-Critical Talent Retention', kind: 'simple', api: 'projectCritical' },
  { path: 'bench-risk', title: 'Bench Risk for High-Skill Talent', kind: 'simple', api: 'benchRisk' },
  { path: 'promotion-stagnation', title: 'Promotion & Stagnation Monitoring', kind: 'simple', api: 'promotionStagnation' },
  { path: 'forecasting', title: 'Forecasting & Talent Stability', kind: 'forecast' },
  { path: 'ai-recommendations', title: 'AI-Powered Retention Recommendations', kind: 'ai-recs' },
  { path: 'ai-flight-risk', title: 'AI-Based Flight Risk Prediction', kind: 'ai-risk' },
  { path: 'natural-language-search', title: 'Natural Language Retention Search', kind: 'nl-search' },
  { path: 'strategic-intelligence', title: 'Strategic Workforce Retention Intelligence', kind: 'simple', api: 'strategicIntelligence' },
];

export function getHsrRouteConfig(pathname) {
  const p = (pathname || '').replace(/\/$/, '') || '/';
  const prefix = '/high-skill-talent-retention/';
  if (!p.startsWith(prefix)) return null;
  const suffix = p.slice(prefix.length);
  return HSR_EXTRA_ROUTES.find((r) => r.path === suffix) || null;
}

