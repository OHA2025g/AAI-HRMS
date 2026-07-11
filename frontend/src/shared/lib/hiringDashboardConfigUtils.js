import { DEFAULT_STAGE_SLA } from './hiringDashboardConfigConstants';

export function slaBarWidth(days, maxDays = 30) {
  return `${Math.min(100, Math.round((Number(days) / maxDays) * 100))}%`;
}

export function computeConfigHealth({
  stageSlaDays,
  lowFitThreshold,
  stuckCriticalCount,
  monthlyHireTarget,
  staleReqZeroDays,
}) {
  let score = 100;
  const stages = Object.keys(stageSlaDays || {}).length;
  if (stages < Object.keys(DEFAULT_STAGE_SLA).length) score -= 8;
  if (!Number(lowFitThreshold)) score -= 10;
  if (!Number(stuckCriticalCount)) score -= 10;
  if (!Number(monthlyHireTarget)) score -= 5;
  if (!Number(staleReqZeroDays)) score -= 5;
  return Math.max(0, Math.min(100, score));
}

export function formatStageLabel(stage) {
  return String(stage).replace(/_/g, ' ');
}

export function auditEntryIcon(entry) {
  const summary = String(entry?.summary || '').toLowerCase();
  if (summary.includes('default') || summary.includes('restored') || entry?.user_name === 'System') {
    return 'reset';
  }
  if (summary.includes('sla') || summary.includes('increased') || summary.includes('decreased')) {
    return 'warning';
  }
  return 'check';
}

export function auditEntryChip(entry) {
  const summary = String(entry?.summary || '').toLowerCase();
  if (entry?.user_name === 'System' || summary.includes('default') || summary.includes('restored')) {
    return 'System';
  }
  if (summary.includes('sla')) return 'SLA';
  if (summary.includes('target') || summary.includes('hire')) return 'Target';
  if (summary.includes('rule')) return 'Rules';
  return 'Config';
}

export const PRIMARY_RULE_IDS = ['low-fit', 'stuck-stage', 'stale-req', 'trend-target'];
