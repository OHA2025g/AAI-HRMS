const INTERVIEW_STAGES = new Set(['INTERVIEW_1', 'INTERVIEW_2', 'INTERVIEW_3', 'HR_ROUND']);
const SHORTLIST_STAGES = new Set(['SCREENING', 'ASSESSMENT_SENT', 'ASSESSMENT_CLEARED']);

const RUBRIC_COLORS = ['#5b4cf6', '#1684ff', '#14b8a6', '#ff9f1c', '#ef4444'];

const RUBRIC_LABELS = {
  title: 'Title Match',
  skill: 'Skills Match',
  activity: 'Activity Match',
  experience: 'Experience',
  leadership: 'Leadership',
  communication: 'Communication',
};

export function fmtOrg(v) {
  return v != null && String(v).trim() !== '' ? String(v).trim() : '—';
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function formatJobDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function workLocationLabel(job) {
  const loc = fmtOrg(job?.location);
  const mode = job?.work_mode ? String(job.work_mode) : '';
  if (loc === '—' && !mode) return '—';
  if (loc !== '—' && mode) return `${loc} (${mode.charAt(0).toUpperCase()}${mode.slice(1)})`;
  return loc !== '—' ? loc : mode;
}

export function statusBadgeClass(status) {
  if (status === 'OPEN') return 'jd-badge-open';
  if (status === 'PAUSED') return 'jd-badge-paused';
  if (status === 'CLOSED') return 'jd-badge-closed';
  return 'jd-badge-draft';
}

function avgFitFromApps(applications) {
  const scores = applications
    .map((a) => a?.fit_score?.final_score ?? a?.fit_score?.score)
    .filter((v) => v != null && !Number.isNaN(Number(v)));
  if (!scores.length) return null;
  return Math.round(scores.reduce((s, v) => s + Number(v), 0) / scores.length);
}

function avgFitFromMatches(matches) {
  const scores = matches
    .map((m) => m?.fit_score?.final_score ?? m?.fit_score?.score)
    .filter((v) => v != null && !Number.isNaN(Number(v)));
  if (!scores.length) return null;
  return Math.round(scores.reduce((s, v) => s + Number(v), 0) / scores.length);
}

export function computeOverviewKpis(applications = [], matchingCandidates = []) {
  const avgApp = avgFitFromApps(applications);
  const avgMatch = avgFitFromMatches(matchingCandidates);
  return {
    totalCandidates: applications.length,
    aiMatched: matchingCandidates.length,
    shortlisted: applications.filter((a) => SHORTLIST_STAGES.has(a.stage)).length,
    inInterview: applications.filter((a) => INTERVIEW_STAGES.has(a.stage)).length,
    offerExtended: applications.filter((a) => a.stage === 'OFFER').length,
    avgFitScore: avgApp ?? avgMatch,
  };
}

export function buildRubricRows(job) {
  const weights = job?.scoring_rubric?.weights;
  if (weights && Object.keys(weights).length) {
    return Object.entries(weights).map(([key, value], i) => ({
      key,
      label: RUBRIC_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      score: Math.round(Number(value) * 100),
      color: RUBRIC_COLORS[i % RUBRIC_COLORS.length],
    }));
  }
  return [
    { key: 'skill', label: 'Skills Match', score: 80, color: RUBRIC_COLORS[0] },
    { key: 'activity', label: 'Activity Match', score: 70, color: RUBRIC_COLORS[1] },
    { key: 'experience', label: 'Experience', score: 65, color: RUBRIC_COLORS[2] },
  ];
}

export function descriptionBullets(job) {
  const rows = [
    ['Business Unit', fmtOrg(job?.business_pillar)],
    ['Department', fmtOrg(job?.business_department)],
    ['Role', job?.title],
    ['Project ID', fmtOrg(job?.project_id)],
  ];
  const mustSkills = (job?.skills || []).filter((s) => s.skill_type === 'MUST_HAVE').map((s) => s.skill_name);
  if (mustSkills.length) {
    rows.push(['Key Must-have Skills', mustSkills.join(', ')]);
  }
  return rows.filter(([, v]) => v && v !== '—');
}

const KPI_META = [
  { key: 'totalCandidates', label: 'Total Candidates', icon: '♙', circle: 'purple' },
  { key: 'aiMatched', label: 'AI Matched', icon: '♙', circle: 'blue' },
  { key: 'shortlisted', label: 'Shortlisted', icon: '✓', circle: 'green' },
  { key: 'inInterview', label: 'In Interview', icon: '◷', circle: 'orange' },
  { key: 'offerExtended', label: 'Offer Extended', icon: '♕', circle: 'purple' },
  { key: 'avgFitScore', label: 'Avg. Fit Score', icon: '▥', circle: 'orange', isPct: true },
];

export function kpiStripItems(kpis) {
  return KPI_META.map((meta) => ({
    ...meta,
    value: meta.isPct
      ? kpis.avgFitScore != null
        ? `${kpis.avgFitScore}%`
        : '—'
      : String(kpis[meta.key] ?? 0),
  }));
}
