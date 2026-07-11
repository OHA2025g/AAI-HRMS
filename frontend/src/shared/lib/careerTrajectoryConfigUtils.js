import { OVERALL_WEIGHT_LABELS, SUB_WEIGHT_GROUPS } from './careerTrajectoryConfig';

export const CHART_SHORT_LABELS = {
  career_progression: 'Progression',
  scope_expansion: 'Scope',
  project_complexity: 'Complexity',
  business_impact: 'Impact',
  skill_evolution: 'Skills',
  leadership_maturity: 'Leadership',
  adaptability: 'Adaptability',
  tenure_stability: 'Tenure',
  future_role_readiness: 'Future',
};

export const DIMENSION_PREVIEW = [
  {
    key: 'career_progression',
    title: 'Career progression',
    description: 'Promotion velocity, role expansion, growth continuity',
    tag: '3 signals',
    tagClass: 'purple',
  },
  {
    key: 'leadership_maturity',
    title: 'Leadership maturity',
    description: 'Team size, stakeholder depth, decision ownership',
    tag: '4 signals',
    tagClass: 'blue',
  },
  {
    key: 'business_impact',
    title: 'Business impact',
    description: 'Quantified results, revenue/cost impact, scale',
    tag: '3 signals',
    tagClass: 'green',
  },
];

export function weightToPercent(weight) {
  return Math.round((Number(weight) || 0) * 100);
}

export function percentToWeight(percent) {
  return (Number(percent) || 0) / 100;
}

export function weightBarWidth(weight, maxPercent = 20) {
  const pct = weightToPercent(weight);
  return `${Math.min(100, Math.round((pct / maxPercent) * 100))}%`;
}

export function chartBarHeight(weight, maxWeight = 0.15) {
  const value = Number(weight) || 0;
  return `${Math.max(18, Math.round((value / maxWeight) * 70))}%`;
}

export function chartBarLeft(index, total = 9) {
  const slot = 100 / (total + 1);
  return `${Math.round(slot * (index + 1) - 3)}%`;
}

export function sumWeights(weights) {
  return Object.values(weights || {}).reduce((acc, value) => acc + (Number(value) || 0), 0);
}

export function getBalancingRecommendations(weights) {
  const tenurePct = weightToPercent(weights?.tenure_stability);
  const impactPct = weightToPercent(weights?.business_impact);
  const futurePct = weightToPercent(weights?.future_role_readiness);
  return [
    {
      title: 'Reduce bias risk',
      description: 'Keep tenure stability below 12%.',
      value: tenurePct < 12 ? 'OK' : 'Review',
    },
    {
      title: 'Business impact weight',
      description: 'Strong indicator for leadership roles.',
      value: `${impactPct}%`,
    },
    {
      title: 'Future readiness',
      description: 'Could be increased for succession hiring.',
      value: futurePct < 10 ? '+2%' : `${futurePct}%`,
    },
  ];
}

export function getDimensionPreviewRows(weights) {
  return DIMENSION_PREVIEW.map((row) => {
    const group = SUB_WEIGHT_GROUPS.find((g) => g.dimension === row.key);
    const signalCount = group?.fields?.length || row.tag.split(' ')[0];
    return {
      ...row,
      tag: `${signalCount} signals`,
      percent: weightToPercent(weights?.[row.key]),
    };
  });
}

export function getModelReadiness({ weightSum, fairness, dimensionCount = OVERALL_WEIGHT_LABELS.length }) {
  const sumPct = Math.round(weightSum * 100);
  const guardrails = fairness?.review_required ?? 0;
  return {
    weightSum: sumPct,
    weightSumOk: Math.abs(weightSum - 1) <= 0.02,
    guardrails,
    guardrailsReview: guardrails > 0,
    dimensions: dimensionCount,
    scoringPack: 'v2',
  };
}
