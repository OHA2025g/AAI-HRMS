/**
 * Maps URL segments (under /training-development/) to workspace mode or extended record types.
 * `kind`: dashboard | master | catalog | extended | ai-gap | ai-learn | forecast | section
 */
export const TRAINING_DEV_EXTRA_ROUTES = [
  { path: 'catalog', title: 'Learning Catalog', kind: 'catalog' },
  { path: 'nominations', title: 'Training Nomination & Enrollment', kind: 'extended', recordType: 'nomination' },
  { path: 'calendar', title: 'Training Calendar & Scheduling', kind: 'extended', recordType: 'calendar_event' },
  { path: 'batches', title: 'Batch / Cohort Management', kind: 'batches' },
  { path: 'delivery', title: 'Learning Delivery', kind: 'extended', recordType: 'delivery_session' },
  { path: 'attendance', title: 'Attendance & Participation', kind: 'attendance' },
  { path: 'assessments', title: 'Assessments & Evaluation', kind: 'extended', recordType: 'assessment' },
  { path: 'pre-post-assessment', title: 'Pre / Post Assessment', kind: 'extended', recordType: 'pre_post_assessment' },
  { path: 'certifications', title: 'Certification Management', kind: 'extended', recordType: 'certification_record' },
  { path: 'compliance', title: 'Compliance Training', kind: 'extended', recordType: 'compliance_assignment' },
  { path: 'trainers', title: 'Instructors / Trainers', kind: 'extended', recordType: 'trainer_profile' },
  { path: 'vendors', title: 'External Training & Vendors', kind: 'extended', recordType: 'vendor_profile' },
  { path: 'budget', title: 'Budget & Cost', kind: 'extended', recordType: 'budget_line' },
  { path: 'documents', title: 'Documents & Records', kind: 'extended', recordType: 'document_meta' },
  { path: 'approvals', title: 'Workflow & Approvals', kind: 'approvals' },
  { path: 'governance', title: 'Governance, Policies & Controls', kind: 'extended', recordType: 'governance_control' },
  { path: 'needs-identification', title: 'Training Needs Identification', kind: 'extended', recordType: 'training_need' },
  { path: 'competency-gap', title: 'Competency Gap Mapping', kind: 'extended', recordType: 'competency_gap' },
  { path: 'idp', title: 'Individual Development Plans', kind: 'extended', recordType: 'idp' },
  { path: 'role-learning-paths', title: 'Role-Based Learning Paths', kind: 'extended', recordType: 'role_learning_path' },
  { path: 'skill-learning-paths', title: 'Skill-Based Learning Paths', kind: 'extended', recordType: 'skill_learning_path' },
  { path: 'leadership-development', title: 'Leadership Development', kind: 'extended', recordType: 'leadership_program' },
  { path: 'upskilling-reskilling', title: 'Technical Upskilling & Reskilling', kind: 'extended', recordType: 'upskilling_program' },
  { path: 'behavioral-skills', title: 'Behavioral & Soft Skills', kind: 'extended', recordType: 'behavioral' },
  { path: 'onboarding-training', title: 'Onboarding Training', kind: 'extended', recordType: 'onboarding' },
  { path: 'ojt', title: 'OJT / On-the-Job Training', kind: 'extended', recordType: 'ojt' },
  { path: 'knowledge-transfer', title: 'Knowledge Transfer', kind: 'extended', recordType: 'knowledge_transfer' },
  { path: 'career-linked-training', title: 'Career Progression-linked Training', kind: 'extended', recordType: 'career_linked' },
  { path: 'performance-linked-learning', title: 'Performance-linked Learning', kind: 'extended', recordType: 'performance_linked' },
  { path: 'project-demand-linked-planning', title: 'Project / Demand-linked Planning', kind: 'extended', recordType: 'project_demand_linked' },
  { path: 'succession-development', title: 'Succession-linked Development', kind: 'extended', recordType: 'succession' },
  { path: 'analytics', title: 'Training Analytics & Dashboards', kind: 'extended', recordType: 'effectiveness' },
  { path: 'effectiveness', title: 'Training Effectiveness', kind: 'extended', recordType: 'effectiveness' },
  { path: 'feedback', title: 'Feedback & Satisfaction', kind: 'extended', recordType: 'feedback' },
  { path: 'post-training-impact', title: 'Post-Training Impact', kind: 'extended', recordType: 'post_training_impact' },
  { path: 'compliance-audit', title: 'Learning Compliance & Audit', kind: 'extended', recordType: 'compliance_audit' },
  { path: 'forecasting', title: 'Forecasting & Workforce Capability', kind: 'forecast' },
  { path: 'ai-learning-recommendations', title: 'AI Learning Recommendations', kind: 'ai-learn' },
  { path: 'ai-skill-gap-prediction', title: 'AI Skill Gap Prediction', kind: 'ai-gap' },
  { path: 'learning-search', title: 'Learning Search & NL Query', kind: 'extended', recordType: 'learning_search' },
  { path: 'strategic-capability-intelligence', title: 'Strategic Workforce Capability Intelligence', kind: 'extended', recordType: 'strategic_capability_intelligence' },
];

/** Resolve workspace config from full pathname (e.g. /training-development/catalog). */
export function getTrainingDevRouteConfig(pathname) {
  const p = (pathname || '').replace(/\/$/, '') || '/';
  const prefix = '/training-development/';
  if (!p.startsWith(prefix)) return null;
  const suffix = p.slice(prefix.length);
  return TRAINING_DEV_EXTRA_ROUTES.find((r) => r.path === suffix) || null;
}
