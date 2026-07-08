export const METRIC_KEYS = [
  ['career_progression', 'Career Progression'],
  ['tenure_stability', 'Tenure Stability'],
  ['scope_expansion', 'Scope Expansion'],
  ['project_complexity', 'Project Complexity'],
  ['business_impact', 'Business Impact'],
  ['skill_evolution', 'Skill Evolution'],
  ['leadership_maturity', 'Leadership Maturity'],
  ['adaptability', 'Adaptability'],
];

export const RADAR_SCORE_KEYS = [
  ...METRIC_KEYS,
  ['future_role_readiness', 'Future Role Readiness'],
];

export const ANALYSIS_STEPS = [
  'Upload CV',
  'Parse & extract',
  'Feature engineering',
  'Score trajectory',
  'Generate report',
];

const METRIC_DESCRIPTIONS = {
  career_progression: 'Progression depth signal.',
  tenure_stability: 'Role tenure consistency.',
  scope_expansion: 'Increasing responsibility.',
  project_complexity: 'Complexity of delivery.',
  business_impact: 'Outcome orientation.',
  skill_evolution: 'Skill growth pattern.',
  leadership_maturity: 'People and influence signals.',
  adaptability: 'Transition readiness.',
  future_role_readiness: 'Readiness for target role scope.',
  retention_risk: 'Likelihood of early attrition based on tenure patterns.',
  overall_career_trajectory: 'Composite trajectory score across all dimensions.',
};

export function formatScore(score) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return `${Math.round(Number(score))}%`;
}

export function formatScoreFraction(score, max = 100) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return `${Math.round(Number(score))}/${max}`;
}

export function getMetricDescription(key) {
  return METRIC_DESCRIPTIONS[key] || 'Trajectory dimension signal.';
}

export function getConfidenceLabel(scoreData) {
  const c = scoreData?.confidence;
  if (!c) return null;
  return `Confidence: ${c}`;
}

export function getDecisionGateShortLabel(category) {
  if (!category) return '—';
  return String(category).split(':')[0].trim();
}

export function formatDecisionGateLabel(category) {
  if (!category) return '—';
  return String(category).trim();
}

export function getDecisionChipClass(category) {
  const lower = String(category || '').toLowerCase();
  if (lower.includes('strong') || lower.includes('high fit')) return 'ct-chip green';
  if (lower.includes('moderate') || lower.includes('validate')) return 'ct-chip orange';
  if (lower.includes('weak') || lower.includes('low') || lower.includes('reject')) return 'ct-chip';
  return 'ct-chip orange';
}

export function getArchetypeChipClass(isSecondary = false) {
  return isSecondary ? 'ct-chip green' : 'ct-chip';
}

export function getRiskSeverityClass(severity) {
  const s = String(severity || '').toLowerCase();
  if (s === 'high') return 'ct-tag high';
  if (s === 'medium') return 'ct-tag medium';
  if (s === 'low') return 'ct-tag green';
  return 'ct-tag blue';
}

export function getPriorityTagClass(priority) {
  const p = String(priority || 'medium').toLowerCase();
  if (p === 'high') return 'ct-tag high';
  if (p === 'low') return 'ct-tag blue';
  return 'ct-tag medium';
}

export function getSeverityTagClass(severity) {
  const s = String(severity || 'info').toLowerCase();
  if (s === 'high') return 'ct-tag high';
  if (s === 'low') return 'ct-tag green';
  if (s === 'medium') return 'ct-tag medium';
  return 'ct-tag blue';
}

export function formatReportHistoryRow(row) {
  return {
    id: row.id,
    createdLabel: row.created_at ? new Date(row.created_at).toLocaleString() : '—',
    overallScore: formatScore(row.scores?.overall_career_trajectory?.score),
    archetype: row.primary_archetype?.name || '—',
    decisionGate: getDecisionGateShortLabel(row.decision_gate?.category),
    decisionGateFull: formatDecisionGateLabel(row.decision_gate?.category),
  };
}

export function buildExecutiveChips(report) {
  const chips = [];
  if (report?.primary_archetype?.name) {
    chips.push({ label: report.primary_archetype.name, className: getArchetypeChipClass(false) });
  }
  if (report?.secondary_archetype?.name) {
    chips.push({ label: report.secondary_archetype.name, className: getArchetypeChipClass(true) });
  }
  if (report?.decision_gate?.category) {
    chips.push({
      label: formatDecisionGateLabel(report.decision_gate.category),
      className: getDecisionChipClass(report.decision_gate.category),
    });
  }
  return chips;
}

export function buildRadarData(scores) {
  if (!scores) return [];
  return RADAR_SCORE_KEYS.map(([key, label]) => ({
    subject: label.split(' ')[0],
    score: scores[key]?.score ?? 0,
  }));
}

export function buildMetricCards(scores) {
  return METRIC_KEYS.map(([key, label]) => ({
    key,
    label,
    description: getMetricDescription(key),
    score: formatScore(scores?.[key]?.score),
    confidence: getConfidenceLabel(scores?.[key]),
    scoreData: scores?.[key],
  }));
}

export function formatMissingEvidenceItem(item) {
  if (typeof item === 'string') return item;
  return [item?.area, item?.note].filter(Boolean).join(' — ') || 'Additional evidence needed';
}

export function ownerLabel(role) {
  const labels = {
    hiring_manager: 'Hiring manager',
    recruiter: 'Recruiter',
    interviewer: 'Interviewer',
    hiring_team: 'Hiring team',
    candidate: 'Candidate',
  };
  return labels[role] || role || 'Team';
}

export function formatTimeframe(tf) {
  if (!tf) return null;
  return tf.replace(/_/g, ' ');
}
