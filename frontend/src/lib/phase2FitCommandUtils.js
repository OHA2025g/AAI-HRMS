import {
  getPriorityTagClass as ctPriorityTagClass,
  getSeverityTagClass as ctSeverityTagClass,
  ownerLabel,
  formatTimeframe,
} from './careerTrajectoryCommandUtils';

export { ownerLabel, formatTimeframe };

export const METRIC_LABELS = {
  manager_fit: 'Manager fit',
  communication_fit: 'Communication fit',
  leadership_style: 'Leadership style',
  friction_risk: 'Friction risk',
  decision_rights_clarity: 'Decision rights clarity',
  stakeholder_complexity_handling: 'Stakeholder complexity handling',
  role_ambiguity_tolerance: 'Role ambiguity tolerance',
};

function clampScore(value, min = 0, max = 100) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function riskLevelToPercent(riskLevel) {
  const level = String(riskLevel || '').toLowerCase();
  if (level === 'low') return 15;
  if (level === 'high') return 65;
  return 35;
}

export function riskChipClass(riskLevel) {
  const level = String(riskLevel || '').toLowerCase();
  if (level === 'low') return 'p2-chip g';
  if (level === 'high') return 'p2-chip';
  return 'p2-chip o';
}

export function riskChipLabel(riskLevel) {
  const level = String(riskLevel || 'Medium').trim();
  return `${level} Risk`;
}

export function getP2SeverityTagClass(severity) {
  const ct = ctSeverityTagClass(severity);
  if (ct.includes('high')) return 'p2-tag high';
  if (ct.includes('green')) return 'p2-tag open';
  if (ct.includes('medium')) return 'p2-tag med';
  return 'p2-tag med';
}

export function getP2PriorityTagClass(priority) {
  const ct = ctPriorityTagClass(priority);
  if (ct.includes('high')) return 'p2-tag high';
  if (ct.includes('blue')) return 'p2-tag open';
  return 'p2-tag med';
}

export function computeKpiMetrics(report) {
  const managerFit = clampScore(report?.manager_fit?.manager_fit_score ?? 0);
  const communicationFit = clampScore(report?.communication?.overall_communication_score ?? 0);
  const leadershipConfidence = report?.leadership_style?.primary_style?.confidence;
  const leadershipStyle =
    leadershipConfidence != null
      ? clampScore(Number(leadershipConfidence) * 100)
      : clampScore(report?.overall_contextual_fit_score ?? managerFit);
  const frictionRisk = clampScore(
    report?.manager_fit?.risk_level
      ? riskLevelToPercent(report.manager_fit.risk_level)
      : 100 - managerFit
  );

  const leadershipName = report?.leadership_style?.primary_style?.name || 'Collaborative';

  return [
    {
      key: 'manager_fit',
      label: METRIC_LABELS.manager_fit,
      value: managerFit,
      hint: managerFit >= 70 ? 'Strong alignment' : managerFit >= 55 ? 'Moderate alignment' : 'Needs validation',
      barClass: '',
    },
    {
      key: 'communication_fit',
      label: METRIC_LABELS.communication_fit,
      value: communicationFit,
      hint: communicationFit >= 70 ? 'Clear communicator' : 'Validate communication style',
      barClass: '',
    },
    {
      key: 'leadership_style',
      label: METRIC_LABELS.leadership_style,
      value: leadershipStyle,
      hint: leadershipName,
      barClass: '',
    },
    {
      key: 'friction_risk',
      label: METRIC_LABELS.friction_risk,
      value: frictionRisk,
      hint: `${report?.manager_fit?.risk_level || 'Medium'} risk`,
      barClass: 'p2-progress-warn',
      valueClass: 'p2-metric-warn',
    },
  ];
}

export function computeFitBreakdown(report, phase1Meta = null) {
  const managerFit = Number(report?.manager_fit?.manager_fit_score ?? 0);
  const communicationFit = Number(report?.communication?.overall_communication_score ?? 0);
  const contextual = Number(report?.overall_contextual_fit_score ?? 0);
  const adaptability = Number(phase1Meta?.adaptability_score ?? 0);
  const leadershipConfidence = Number(report?.leadership_style?.primary_style?.confidence ?? 0.69);

  const decisionRights = clampScore(
    adaptability > 0 ? (adaptability + managerFit) / 2 - 4 : managerFit - 6
  );
  const stakeholderComplexity = clampScore((communicationFit + managerFit) / 2);
  const roleAmbiguity = clampScore(
    leadershipConfidence > 0 && leadershipConfidence <= 1
      ? leadershipConfidence * 100
      : contextual - 2
  );

  return [
    {
      key: 'decision_rights_clarity',
      label: METRIC_LABELS.decision_rights_clarity,
      value: decisionRights,
      barClass: decisionRights < 65 ? 'p2-progress-mixed' : '',
    },
    {
      key: 'stakeholder_complexity_handling',
      label: METRIC_LABELS.stakeholder_complexity_handling,
      value: stakeholderComplexity,
      barClass: '',
    },
    {
      key: 'role_ambiguity_tolerance',
      label: METRIC_LABELS.role_ambiguity_tolerance,
      value: roleAmbiguity,
      barClass: '',
    },
  ];
}

export function buildTimelineSteps(report, phase1Meta = null) {
  const archetype = phase1Meta?.primary_archetype || 'Deep Specialist';
  const score = phase1Meta?.overall_score != null ? Math.round(phase1Meta.overall_score) : null;
  const managerName =
    report?.manager_fit?.manager_name ||
    (report?.manager_fit?.manager_employee_id ? 'Selected manager profile' : 'Collaborative technical profile');
  const frictionPoints = report?.manager_fit?.friction_points || [];
  const riskNote =
    frictionPoints[0] ||
    (report?.manager_fit?.risk_level
      ? `${report.manager_fit.risk_level} contextual risk`
      : 'Contextual risk evaluated');
  const actionCount = (report?.action_items || []).length;

  return [
    {
      title: 'Phase 1 trajectory completed',
      detail: score != null ? `${archetype} · ${score}/100` : archetype,
    },
    {
      title: 'Manager archetype applied',
      detail: managerName,
    },
    {
      title: 'Contextual risk evaluated',
      detail: riskNote,
    },
    {
      title: 'Next best actions generated',
      detail:
        actionCount > 0
          ? `${actionCount} action item${actionCount === 1 ? '' : 's'} and interview probes created`
          : 'Interview probes and action items created',
    },
  ];
}

export function buildResultChips(report) {
  const chips = [];
  const leadership = report?.leadership_style?.primary_style?.name;
  if (leadership) chips.push({ label: `Leadership: ${leadership}`, className: 'p2-chip p' });
  const managerFit = report?.manager_fit?.manager_fit_score;
  if (managerFit != null) {
    chips.push({ label: `Manager fit: ${Math.round(managerFit)}%`, className: 'p2-chip p' });
  }
  const comm = report?.communication?.overall_communication_score;
  if (comm != null) {
    chips.push({ label: `Communication: ${Math.round(comm)}%`, className: 'p2-chip b' });
  }
  if (report?.manager_fit?.risk_level) {
    chips.push({
      label: `Risk: ${report.manager_fit.risk_level}`,
      className: riskChipClass(report.manager_fit.risk_level),
    });
  }
  return chips;
}

export function formatSimulatingNote(meta) {
  if (!meta?.full_name && !meta?.candidate_id) return null;
  const name = meta.full_name || meta.candidate_id;
  const parts = [name];
  if (meta.primary_archetype) parts.push(meta.primary_archetype);
  if (meta.overall_score != null) parts.push(`${Math.round(meta.overall_score)}% trajectory`);
  return parts.join(' · ');
}
