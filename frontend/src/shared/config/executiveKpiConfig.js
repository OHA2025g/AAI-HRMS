/** Client-side KPI metadata & section anchors (M9 executive dashboard). */

/** Executive KPI dashboard primary tabs (tab panel content). */
export const EXEC_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'workforce', label: 'Workforce' },
  { id: 'skills', label: 'Skills' },
  { id: 'people', label: 'People' },
  { id: 'hiring', label: 'Hiring' },
  { id: 'automation', label: 'Automation' },
  { id: 'reports', label: 'Reports' },
];

/** @deprecated Use EXEC_TABS — kept for any legacy anchor references */
export const EXEC_SECTIONS = EXEC_TABS;

export const EXEC_QUICK_LINKS = [
  { to: '/dashboard', label: 'Hiring dashboard' },
  { to: '/workforce-intelligence/executive-intelligence', label: 'WFI executive intelligence' },
  { to: '/employee-satisfaction-engagement/executive-decision-support', label: 'ESE executive support' },
  { to: '/cost-optimization-automation/executive-decision-support', label: 'COA decision support' },
  { to: '/high-skill-talent-retention/dashboard', label: 'High-skill retention' },
];

export const KPI_META = {
  headcount_active: {
    label: 'Active headcount',
    kpiId: 'headcount_active',
    icon: 'users',
    format: 'number',
  },
  attrition_rate_pct: {
    label: 'Attrition rate',
    kpiId: 'attrition_rate_pct',
    icon: 'trending',
    format: 'percent',
    suffix: '%',
  },
  skill_coverage_pct: {
    label: 'Skill coverage',
    kpiId: 'skill_coverage_pct',
    icon: 'target',
    format: 'percent',
    suffix: '%',
  },
  forecast_gap_total: {
    label: 'Forecast skill gap',
    kpiId: 'forecast_gap_total',
    icon: 'alert',
    format: 'number',
  },
  engagement_avg_rating: {
    label: 'Engagement avg',
    kpiId: 'engagement_avg_rating',
    icon: 'heart',
    format: 'decimal',
  },
  retention_avg_risk_score: {
    label: 'Retention risk',
    kpiId: 'retention_avg_risk_score',
    icon: 'shield',
    format: 'decimal',
  },
};

export const CHART_COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#14B8A6', '#F97316'];

export function statusBorderClass(status) {
  if (status === 'critical') return 'border-rose-300 bg-rose-50/50';
  if (status === 'warn') return 'border-amber-300 bg-amber-50/50';
  if (status === 'unknown') return 'border-slate-200 bg-slate-50/50';
  return 'border-slate-200 bg-white';
}

export function formatDelta(deltaPct) {
  if (deltaPct == null || Number.isNaN(Number(deltaPct))) return null;
  const n = Number(deltaPct);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}%`;
}

/** True when org drill filters are active (trend chart stays org-wide from snapshots). */
export function hasExecutiveDrillFilters(filters) {
  return Boolean(
    filters?.department?.trim() ||
      filters?.managerRootId?.trim() ||
      filters?.roleContains?.trim(),
  );
}
