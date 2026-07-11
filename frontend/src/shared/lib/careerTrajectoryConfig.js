/** Default overall weights (mirror backend career_trajectory/config.py). */
export const OVERALL_WEIGHT_LABELS = [
  { key: 'career_progression', label: 'Career progression', defaultWeight: 0.15 },
  { key: 'scope_expansion', label: 'Scope expansion', defaultWeight: 0.15 },
  { key: 'project_complexity', label: 'Project complexity', defaultWeight: 0.12 },
  { key: 'business_impact', label: 'Business impact', defaultWeight: 0.12 },
  { key: 'skill_evolution', label: 'Skill evolution', defaultWeight: 0.1 },
  { key: 'leadership_maturity', label: 'Leadership maturity', defaultWeight: 0.12 },
  { key: 'adaptability', label: 'Adaptability', defaultWeight: 0.08 },
  { key: 'tenure_stability', label: 'Tenure stability', defaultWeight: 0.08 },
  { key: 'future_role_readiness', label: 'Future role readiness', defaultWeight: 0.08 },
];

export const SUB_WEIGHT_GROUPS = [
  {
    dimension: 'career_progression',
    label: 'Career progression (sub-weights)',
    fields: [
      { key: 'title_progression', label: 'Title progression', defaultWeight: 0.35 },
      { key: 'seniority_increase', label: 'Seniority increase', defaultWeight: 0.25 },
      { key: 'responsibility_expansion', label: 'Responsibility expansion', defaultWeight: 0.2 },
      { key: 'promotion_velocity', label: 'Promotion velocity', defaultWeight: 0.1 },
      { key: 'stakeholder_expansion', label: 'Stakeholder expansion', defaultWeight: 0.1 },
    ],
  },
  {
    dimension: 'tenure_stability',
    label: 'Tenure stability (sub-weights)',
    fields: [
      { key: 'average_tenure', label: 'Average tenure', defaultWeight: 0.35 },
      { key: 'short_tenure_penalty', label: 'Short tenure penalty', defaultWeight: 0.3 },
      { key: 'long_tenure_growth_bonus', label: 'Long tenure growth bonus', defaultWeight: 0.2 },
      { key: 'career_gap_handling', label: 'Career gap handling', defaultWeight: 0.15 },
    ],
  },
  {
    dimension: 'project_complexity',
    label: 'Project complexity (sub-weights)',
    fields: [
      { key: 'enterprise', label: 'Enterprise', defaultWeight: 0.2 },
      { key: 'ai_ml_data', label: 'AI/ML & data', defaultWeight: 0.2 },
      { key: 'cross_functional', label: 'Cross-functional', defaultWeight: 0.2 },
      { key: 'transformation', label: 'Transformation', defaultWeight: 0.2 },
      { key: 'measurable_impact', label: 'Measurable impact', defaultWeight: 0.2 },
    ],
  },
  {
    dimension: 'business_impact',
    label: 'Business impact (sub-weights)',
    fields: [
      { key: 'measurable_metrics', label: 'Measurable metrics', defaultWeight: 0.4 },
      { key: 'cost_revenue_productivity', label: 'Cost / revenue / productivity', defaultWeight: 0.3 },
      { key: 'strategic_language', label: 'Strategic language', defaultWeight: 0.2 },
      { key: 'evidence_clarity', label: 'Evidence clarity', defaultWeight: 0.1 },
    ],
  },
  {
    dimension: 'leadership_maturity',
    label: 'Leadership maturity (sub-weights)',
    fields: [
      { key: 'people_management', label: 'People management', defaultWeight: 0.25 },
      { key: 'project_ownership', label: 'Project ownership', defaultWeight: 0.25 },
      { key: 'stakeholder_management', label: 'Stakeholder management', defaultWeight: 0.2 },
      { key: 'strategy_ownership', label: 'Strategy ownership', defaultWeight: 0.15 },
      { key: 'mentoring', label: 'Mentoring', defaultWeight: 0.15 },
    ],
  },
];
