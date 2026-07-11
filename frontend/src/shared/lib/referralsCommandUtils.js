import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
} from '@/data/businessOrgHierarchy';

const ACTIVE_STATUSES = new Set(['PENDING', 'REVIEWED']);

export function filterReferralsByPlacement(referrals, jobs, placement) {
  const jobMap = new Map((jobs || []).map((j) => [j.id, j]));
  const { pillarId, departmentId, subDepartment, projectId } = placement || {};
  if (!pillarId && !departmentId && !subDepartment && !projectId) {
    return referrals || [];
  }

  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label || '';
  const deptLabel =
    pillarId && departmentId
      ? getDepartmentsForPillar(pillarId).find((d) => d.id === departmentId)?.label || ''
      : '';

  return (referrals || []).filter((ref) => {
    const job = jobMap.get(ref.job_id);
    if (!job) return false;
    if (pillarLabel && (job.business_pillar || '') !== pillarLabel) return false;
    if (deptLabel && (job.business_department || '') !== deptLabel) return false;
    if (subDepartment && (job.business_sub_department || '') !== subDepartment) return false;
    if (projectId && (job.project_id || '') !== projectId) return false;
    return true;
  });
}

export function getFitPercent(referral) {
  const score = referral?.fit_score?.final_score ?? referral?.fit_score?.overall;
  if (score == null || Number.isNaN(Number(score))) return null;
  return Math.round(Number(score));
}

export function computeReferralKpis(referrals) {
  const list = referrals || [];
  const total = list.length;
  const active = list.filter((r) => ACTIVE_STATUSES.has(r.status)).length;
  const hires = list.filter((r) => r.status === 'HIRED').length;

  const fitScores = list.map(getFitPercent).filter((v) => v != null);
  const avgFit =
    fitScores.length > 0
      ? `${Math.round(fitScores.reduce((a, b) => a + b, 0) / fitScores.length)}%`
      : '—';

  const hireRate = total > 0 ? `${Math.round((hires / total) * 100)}%` : '—';

  return {
    total,
    active,
    avgFit,
    hireRate,
    totalSub: total === 0 ? 'No submissions yet' : `${total} submission${total === 1 ? '' : 's'}`,
    activeSub: total === 0 ? 'Awaiting first referral' : `${active} in progress`,
    avgSub: fitScores.length ? 'Across matched referrals' : 'Available after matching',
    hireSub: total === 0 ? 'Baseline pending' : `${hires} hire${hires === 1 ? '' : 's'} recorded`,
  };
}

export function computeQualitySignals(referrals) {
  const list = referrals || [];
  const total = list.length;
  if (total === 0) {
    return [
      { label: 'Role-fit coverage', pct: 0, sub: 'No candidates yet' },
      { label: 'Hiring manager response', pct: 0, sub: 'No reviews yet' },
      { label: 'Conversion momentum', pct: 0, sub: 'Starts after first referral' },
    ];
  }

  const withFit = list.filter((r) => getFitPercent(r) != null).length;
  const reviewed = list.filter((r) => r.status !== 'PENDING').length;
  const hires = list.filter((r) => r.status === 'HIRED').length;

  return [
    {
      label: 'Role-fit coverage',
      pct: Math.round((withFit / total) * 100),
      sub: `${withFit} of ${total} matched`,
    },
    {
      label: 'Hiring manager response',
      pct: Math.round((reviewed / total) * 100),
      sub: reviewed ? `${reviewed} reviewed` : 'No reviews yet',
    },
    {
      label: 'Conversion momentum',
      pct: Math.round((hires / total) * 100),
      sub: hires ? `${hires} converted` : 'Building momentum',
    },
  ];
}

export function buildLeaderboardRows(referrals) {
  const list = referrals || [];
  if (list.length === 0) {
    return [
      { rank: 1, employee: 'Awaiting first referrer', referrals: 0, pipeline: 0, hires: 0, impact: '—', gold: true },
      { rank: 2, employee: '—', referrals: 0, pipeline: 0, hires: 0, impact: '—', gold: false },
      { rank: 3, employee: '—', referrals: 0, pipeline: 0, hires: 0, impact: '—', gold: false },
    ];
  }

  const byReferrer = {};
  for (const ref of list) {
    const key = ref.referred_by || ref.referrer_name || 'Unknown';
    if (!byReferrer[key]) {
      byReferrer[key] = { employee: ref.referrer_name || key, referrals: 0, pipeline: 0, hires: 0 };
    }
    byReferrer[key].referrals += 1;
    if (ACTIVE_STATUSES.has(ref.status)) byReferrer[key].pipeline += 1;
    if (ref.status === 'HIRED') byReferrer[key].hires += 1;
  }

  const rows = Object.values(byReferrer)
    .sort((a, b) => b.referrals - a.referrals || b.hires - a.hires)
    .slice(0, 3)
    .map((row, i) => ({
      rank: i + 1,
      employee: row.employee,
      referrals: row.referrals,
      pipeline: row.pipeline,
      hires: row.hires,
      impact: row.hires > 0 ? 'High' : row.pipeline > 0 ? 'Medium' : '—',
      gold: i === 0,
    }));

  while (rows.length < 3) {
    rows.push({
      rank: rows.length + 1,
      employee: '—',
      referrals: 0,
      pipeline: 0,
      hires: 0,
      impact: '—',
      gold: false,
    });
  }

  return rows;
}

export function getReferralStageClass(status) {
  if (status === 'PENDING') return 'rf-stage pending';
  if (status === 'HIRED') return 'rf-stage';
  if (status === 'REJECTED') return 'rf-stage rejected';
  return 'rf-stage';
}

export function formatReferralStage(status) {
  return (status || 'PENDING').replace(/_/g, ' ');
}

export function jobTitleForReferral(referral, jobs) {
  return (jobs || []).find((j) => j.id === referral.job_id)?.title || 'Open role';
}
