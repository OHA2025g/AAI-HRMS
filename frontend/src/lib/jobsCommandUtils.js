const HIGH_FIT_THRESHOLD = 70;

export function fmtNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '0';
  return Number(value).toLocaleString();
}

export function fmtPct(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits)}%`;
}

export function fmtOrg(v) {
  return v != null && String(v).trim() !== '' ? String(v).trim() : '—';
}

export function daysSince(iso) {
  if (!iso) return 0;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - dt.getTime()) / 86400000));
}

export function buildTopJobMap(topJobs = []) {
  const map = new Map();
  topJobs.forEach((row) => {
    if (row?.job_id) map.set(row.job_id, row);
  });
  return map;
}

export function enrichJob(job, topJobMap = new Map()) {
  const top = topJobMap.get(job.id);
  const pipeline = top?.pipeline_count ?? job.candidate_count ?? 0;
  const avgFit = top?.avg_fit_score ?? null;
  const openDays = top?.open_days ?? daysSince(job.created_at);
  const highFit =
    avgFit != null && pipeline > 0
      ? Math.max(0, Math.round(pipeline * (avgFit / 100) * 0.35))
      : Math.max(0, Math.round(pipeline * 0.1));

  return {
    ...job,
    pipelineCount: pipeline,
    avgFitScore: avgFit,
    openDays,
    highFitCount: highFit,
    risk: computeJobRisk({ openDays, highFit, pipeline, avgFit }),
    healthPct: computeHealthPct({ avgFit, pipeline, openDays }),
  };
}

export function computeJobRisk({ openDays, highFit, pipeline, avgFit }) {
  if ((openDays > 30 && highFit < 2) || (pipeline < 3 && openDays > 21)) return 'high';
  if (openDays > 30 || highFit < 2 || (avgFit != null && avgFit < 55) || pipeline < 5) return 'medium';
  return 'low';
}

export function computeHealthPct({ avgFit, pipeline, openDays }) {
  if (avgFit != null) return Math.min(100, Math.max(12, Math.round(avgFit)));
  const base = Math.min(92, Math.max(18, pipeline * 7));
  if (openDays > 30) return Math.max(20, base - 18);
  return base;
}

export function healthBadge(status) {
  if (status === 'ok') return { className: 'badge--ok', label: 'Healthy' };
  if (status === 'critical') return { className: 'badge--critical', label: 'Critical Risk' };
  return { className: 'badge--watch', label: 'Moderate Risk' };
}

export function computeCommandMetrics(jobs = [], pack = null) {
  const topMap = buildTopJobMap(pack?.top_jobs);
  const enriched = jobs.map((j) => enrichJob(j, topMap));
  const openJobs = enriched.filter((j) => j.status === 'OPEN');
  const totalCandidates = enriched.reduce((s, j) => s + (j.pipelineCount || 0), 0);
  const avgCandidates = enriched.length ? totalCandidates / enriched.length : 0;
  const agingBeyond30 = openJobs.filter((j) => j.openDays > 30).length;
  const weakPipeline = openJobs.filter((j) => j.pipelineCount < 5).length;
  const weakPipelinePct = openJobs.length ? Math.round((weakPipeline / openJobs.length) * 100) : 0;
  const atRisk = enriched.filter((j) => j.risk !== 'low').length;
  const avgFitValues = openJobs.map((j) => j.avgFitScore).filter((v) => v != null);
  const avgFit =
    avgFitValues.length > 0
      ? avgFitValues.reduce((a, b) => a + b, 0) / avgFitValues.length
      : pack?.headline?.avg_fit_score?.value ?? null;

  return {
    enriched,
    totalJobs: enriched.length,
    openJobs: openJobs.length,
    avgCandidates,
    atRisk,
    avgFit,
    agingBeyond30,
    weakPipelinePct,
    slaRisk: pack?.hero_risk_metrics?.jobs_miss_sla ?? atRisk,
    highFitWaiting: pack?.hero_risk_metrics?.high_fit_awaiting_review ?? 0,
  };
}

export function filterJobs(jobs, { searchQuery, tab, statusFilter, aiRiskFilter, department, location, seniority, owner }) {
  const q = (searchQuery || '').toLowerCase();
  return jobs.filter((job) => {
    const blob = [
      job.title,
      job.normalized_title,
      job.location,
      job.business_pillar,
      job.business_department,
      job.business_sub_department,
      job.project_id,
      ...(job.skills || []).map((s) => s.skill_name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (q && !blob.includes(q)) return false;
    if (statusFilter && statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (department && department !== 'all' && fmtOrg(job.business_department) !== department) return false;
    if (location && location !== 'all' && fmtOrg(job.location) !== location) return false;
    if (seniority && seniority !== 'all' && fmtOrg(job.seniority) !== seniority) return false;
    if (owner && owner !== 'all') {
      const recruiter = job.hiring_team?.recruiter?.full_name || job.hiring_team?.recruiter?.email;
      if (recruiter !== owner) return false;
    }
    if (aiRiskFilter && aiRiskFilter !== 'all' && job.risk !== aiRiskFilter) return false;

    if (tab === 'at-risk') return job.risk !== 'low';
    if (tab === 'high-fit') return job.highFitCount >= 3 || (job.avgFitScore != null && job.avgFitScore >= HIGH_FIT_THRESHOLD);
    if (tab === 'aging') return job.openDays > 30;
    if (tab === 'draft') return job.status === 'DRAFT';
    return true;
  });
}

export function sortJobs(jobs, sortKey) {
  const rows = [...jobs];
  if (sortKey === 'title') {
    rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    return rows;
  }
  if (sortKey === 'candidates') {
    rows.sort((a, b) => (b.pipelineCount || 0) - (a.pipelineCount || 0));
    return rows;
  }
  if (sortKey === 'risk') {
    const rank = { high: 0, medium: 1, low: 2 };
    rows.sort((a, b) => (rank[a.risk] ?? 9) - (rank[b.risk] ?? 9));
    return rows;
  }
  rows.sort((a, b) => {
    const ar = a.risk === 'high' ? 0 : a.risk === 'medium' ? 1 : 2;
    const br = b.risk === 'high' ? 0 : b.risk === 'medium' ? 1 : 2;
    if (ar !== br) return ar - br;
    return (b.openDays || 0) - (a.openDays || 0);
  });
  return rows;
}

export function uniqueFilterValues(jobs, getter) {
  return [...new Set(jobs.map(getter).filter((v) => v && v !== '—'))].sort();
}

export function pipelineStageRows(pipelineByStage = {}) {
  const labels = {
    APPLIED: 'Applied',
    SCREENING: 'Screening',
    ASSESSMENT_SENT: 'Assessment',
    INTERVIEW_1: 'Interview',
    OFFER_SENT: 'Offer',
  };
  const order = ['APPLIED', 'SCREENING', 'ASSESSMENT_SENT', 'INTERVIEW_1', 'OFFER_SENT'];
  const rows = order.map((key) => ({
    key,
    label: labels[key] || key.replace(/_/g, ' '),
    count: pipelineByStage[key] ?? 0,
  }));
  const max = Math.max(...rows.map((r) => r.count), 1);
  return rows.map((r) => ({ ...r, pct: Math.round((r.count / max) * 100) }));
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}
