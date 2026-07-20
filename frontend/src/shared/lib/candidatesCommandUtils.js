import {
  formatSourceLabel,
  getCandidateDisplaySource,
  isTalentPoolCandidate,
} from './candidateSource';
import { getOverallFitScore } from './jobDetailCandidatesUtils';
import { fmtNum, fmtPct } from './jobsCommandUtils';

export { fmtNum, fmtPct };

export const PAGE_SIZE = 10;

export const FIT_SCORE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Fit Scores' },
  { value: '90+', label: '90%+ High Fit', fitMin: 90 },
  { value: '80+', label: '80%+ Good Fit', fitMin: 80 },
  { value: '70+', label: '70%+ Fair Fit', fitMin: 70 },
  { value: 'below70', label: 'Below 70%', fitMax: 69 },
];

export const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'DIRECT_UPLOAD', label: 'Direct Upload' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'NAUKRI', label: 'Naukri' },
  { value: 'INDEED', label: 'Indeed' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'TALENT_POOL', label: 'Talent Pool (all)' },
  { value: '__display_talent_pool_ex__', label: 'Talent Pool-Ex (Excel)' },
];

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ringGradientStyle(score) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  return {
    background: `conic-gradient(#6d4cff 0 ${pct}%, #e5e7eb ${pct}% 100%)`,
  };
}

export function getCandidateSourceLabel(candidate) {
  const badge = getCandidateDisplaySource(candidate);
  if (badge?.label === 'Inhouse Database' && isTalentPoolCandidate(candidate)) {
    return 'Talent Pool-Ex';
  }
  return badge?.label || formatSourceLabel(candidate?.source);
}

export function estimateProfileReadinessScore(candidate) {
  if (!candidate) return null;

  let score = 52;
  const skillCount = topSkillNames(candidate?.skills, 20).length;
  score += Math.min(22, skillCount * 2);

  const yrs = Number(candidate?.total_experience_years);
  if (Number.isFinite(yrs)) {
    if (yrs >= 3 && yrs <= 10) score += 14;
    else if (yrs >= 1) score += 10;
    else score += 4;
  }

  if (candidate?.email) score += 4;
  if (candidate?.headline) score += 4;
  if (candidate?.location) score += 2;
  if (candidate?.resume_text || candidate?.resume_url) score += 4;

  return Math.min(92, Math.max(58, Math.round(score)));
}

export function resolveCandidateFitScore(candidate, app, trajSummary) {
  const fromApp = getOverallFitScore(app);
  if (fromApp != null) return fromApp;

  const fromCandidate = candidate?.best_fit_score;
  if (fromCandidate != null && !Number.isNaN(Number(fromCandidate))) {
    return Math.round(Number(fromCandidate));
  }

  const fromTraj = trajSummary?.overall_score;
  if (fromTraj != null && !Number.isNaN(Number(fromTraj))) {
    return Math.round(Number(fromTraj));
  }

  return estimateProfileReadinessScore(candidate);
}

export function getStatusBadgeLabel(candidate, app, fitScore) {
  const score = fitScore ?? resolveCandidateFitScore(candidate, app);
  if (score != null && score >= 90) return 'High Fit';
  if (score != null && score >= 80) return 'AI Match';
  if (isTalentPoolCandidate(candidate)) return 'Talent Pool';
  if (app?.stage) return String(app.stage).replace(/_/g, ' ');
  return 'Talent Pool';
}

export function formatExperienceYears(years) {
  if (years == null || Number.isNaN(Number(years))) return '—';
  const n = Number(years);
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} yrs`;
}

export function formatAvailability(candidate) {
  const notice = candidate?.notice_period_days ?? candidate?.availability_days;
  if (notice != null && !Number.isNaN(Number(notice))) {
    const n = Number(notice);
    if (n <= 0) return 'Immediate';
    return `${n} days`;
  }
  if (candidate?.availability) return String(candidate.availability);
  return '—';
}

export function topSkillNames(candidateSkills = [], limit = 5) {
  const rows = Array.isArray(candidateSkills) ? candidateSkills : [];
  const map = new Map();
  for (const s of rows) {
    const name = String(s?.skill_name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, name);
  }
  return [...map.values()].slice(0, limit);
}

export function buildAiInsight(candidate, app, trajSummary, fitScore) {
  if (trajSummary?.summary_text) return trajSummary.summary_text;
  if (trajSummary?.primary_archetype) {
    return `Trajectory signals suggest ${trajSummary.primary_archetype.toLowerCase()} profile with strong role alignment.`;
  }
  const matched = app?.fit_score?.explanation?.matched_skills;
  if (Array.isArray(matched) && matched.length) {
    return `Strong match on ${matched.slice(0, 3).join(', ')}. Recommended for screening pipeline.`;
  }
  const skills = topSkillNames(candidate?.skills, 3);
  if (skills.length) {
    return `Skills profile highlights ${skills.join(', ')}. Add to relevant requisition pipeline.`;
  }
  if (fitScore != null && fitScore >= 85) {
    return 'High-fit profile with interview-ready signals across skills and experience.';
  }
  return 'Profile enriched with AI skills and experience signals. Review for open roles.';
}

export function buildBestAppMap(applications = []) {
  const map = new Map();
  for (const app of applications) {
    if (!app?.candidate_id) continue;
    const score = getOverallFitScore(app) ?? -1;
    const prev = map.get(app.candidate_id);
    const prevScore = prev ? getOverallFitScore(prev) ?? -1 : -999;
    const prevTs = new Date(prev?.updated_at || prev?.created_at || 0).getTime();
    const ts = new Date(app.updated_at || app.created_at || 0).getTime();
    if (!prev || score > prevScore || (score === prevScore && ts > prevTs)) {
      map.set(app.candidate_id, app);
    }
  }
  return map;
}

export function computeCommandMetrics({
  totalCount = 0,
  candidates = [],
  applications = [],
  pack = null,
  trajSummaries = {},
}) {
  const bestAppMap = buildBestAppMap(applications);
  const fitScores = [];
  let highFit90 = 0;
  let activePipeline = 0;
  let talentPool = 0;
  let analyzed = 0;

  for (const c of candidates) {
    if (isTalentPoolCandidate(c)) talentPool += 1;
    const app = bestAppMap.get(c.id);
    const score = resolveCandidateFitScore(c, app, trajSummaries[c.id]);
    if (score != null) {
      fitScores.push(score);
      if (score >= 90) highFit90 += 1;
    }
    if (app?.stage && !['JOINED'].includes(app.stage)) activePipeline += 1;
    if (trajSummaries[c.id]) analyzed += 1;
  }

  const packHighFit = pack?.talent_quality?.high_fit_count;
  const packTalentPool = pack?.talent_quality?.talent_pool_count;
  const coverage = pack?.career_trajectory_coverage?.coverage_pct;
  const avgFitFromPack = pack?.tab_kpis?.analytics?.avg_fit_pct;
  const avgFit =
    fitScores.length > 0
      ? Math.round(fitScores.reduce((a, b) => a + b, 0) / fitScores.length)
      : avgFitFromPack != null
        ? Math.round(Number(avgFitFromPack))
        : null;

  // Empty pool: never invent shortlist / analyzed / duplicate percentages.
  const isEmpty = Number(totalCount) <= 0 && candidates.length === 0;

  const shortlistQuality = avgFit != null ? Math.min(100, Math.max(0, avgFit)) : null;
  let profilesAnalyzedPct = null;
  if (coverage != null) {
    const cov = Number(coverage);
    profilesAnalyzedPct = Math.round(cov <= 1 ? cov * 100 : cov);
  } else if (candidates.length > 0) {
    profilesAnalyzedPct = Math.round((analyzed / candidates.length) * 100);
  } else if (isEmpty) {
    profilesAnalyzedPct = null;
  }

  const funnel = pack?.funnel || [];
  const sourced = funnel.find((f) => f.stage === 'SOURCED')?.count ?? pack?.tab_kpis?.pipeline?.sourced ?? 0;
  const screened = funnel.find((f) => f.stage === 'SCREENING')?.count ?? 0;
  const interviewReady =
    pack?.tab_kpis?.pipeline?.interview_ready ??
    funnel.find((f) => f.stage === 'INTERVIEW_1')?.count ??
    0;

  const resolvedHighFit = packHighFit ?? highFit90;

  return {
    totalCount,
    highFit90: resolvedHighFit,
    talentPool: packTalentPool ?? talentPool,
    profilesAnalyzedPct,
    duplicateRiskPct: isEmpty ? null : estimateDuplicateRiskPct(candidates),
    avgFit,
    shortlistQuality,
    shortlistDeltaPct: null,
    totalDeltaPct: null,
    activeCount: pack?.tab_kpis?.pipeline?.total ?? activePipeline,
    aiEnriched: totalCount,
    bestAppMap,
    pipelineStages: computePipelineStages({
      pack,
      sourced,
      screened,
      highFit: resolvedHighFit,
      interviewReady,
    }),
    recommendations: buildRecommendations(pack, resolvedHighFit, isEmpty),
    talentSegments: computeTalentSegments(candidates, pack),
    reviewHighFitCount: pack?.smart_actions?.find((a) => a.id === 'review-high-fit')?.count ?? highFit90,
  };
}

function estimateDuplicateRiskPct(candidates = []) {
  if (!candidates.length) return null;
  const emails = candidates
    .map((c) => String(c?.email || '').trim().toLowerCase())
    .filter(Boolean);
  if (!emails.length) return null;
  const unique = new Set(emails);
  const dupes = emails.length - unique.size;
  if (dupes <= 0) return 0;
  return Math.round((dupes / emails.length) * 1000) / 10;
}

function computePipelineStages({ pack, sourced, screened, highFit, interviewReady }) {
  const pipeline = pack?.pipeline_by_stage || {};
  const newProfiles = Number(pipeline.SOURCED ?? sourced ?? 0);
  const aiScreened = Number(pipeline.SCREENING ?? screened ?? 0);
  const highFitCount = Number(highFit ?? 0);
  const ready = Number(interviewReady ?? 0);
  const max = Math.max(newProfiles, aiScreened, highFitCount, ready, 1);

  return [
    { key: 'new', label: 'New Profiles', count: newProfiles, pct: Math.round((newProfiles / max) * 100) },
    { key: 'screened', label: 'AI Screened', count: aiScreened, pct: Math.round((aiScreened / max) * 100) },
    { key: 'high-fit', label: 'High Fit', count: highFitCount, pct: Math.round((highFitCount / max) * 100) },
    { key: 'ready', label: 'Interview Ready', count: ready, pct: Math.round((ready / max) * 100) },
  ];
}

function buildRecommendations(pack, highFitCount, isEmpty = false) {
  if (isEmpty) return [];

  const fromPack = (pack?.signal_recommendations || pack?.ai_insights || []).slice(0, 3);
  if (fromPack.length) {
    return fromPack.map((item, i) => ({
      icon: i === 0 ? '✦' : i === 1 ? '⚠' : '↗',
      title: item.title,
      message: item.message,
      actionPath: item.action_path,
    }));
  }

  if (highFitCount > 0) {
    return [
      {
        icon: '↗',
        title: 'Review high-fit candidates',
        message: `${highFitCount} profile${highFitCount === 1 ? '' : 's'} scored 90%+ and may be ready for screening.`,
        actionPath: '/candidates?fit_min=90',
      },
    ];
  }

  return [];
}

function computeTalentSegments(candidates = [], pack = null) {
  const fromPack = pack?.talent_intelligence;
  if (Array.isArray(fromPack) && fromPack.length) {
    return fromPack.slice(0, 4).map((row) => ({
      label: row.skill,
      score: Math.round(row.pct ?? row.count ?? 0),
    }));
  }

  if (!candidates.length) return [];

  const counts = new Map();
  for (const c of candidates) {
    for (const skill of topSkillNames(c?.skills, 8)) {
      const key = skill.toLowerCase();
      counts.set(key, { label: skill, count: (counts.get(key)?.count || 0) + 1 });
    }
  }

  const ranked = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 4);
  const max = Math.max(...ranked.map((r) => r.count), 1);
  return ranked.map((row) => ({
    label: row.label,
    score: Math.round((row.count / max) * 100),
  }));
}

export function collectSkillOptions(candidates = []) {
  const set = new Set();
  for (const c of candidates) {
    for (const skill of topSkillNames(c?.skills, 12)) {
      set.add(skill);
    }
  }
  return ['All Skills', ...Array.from(set).sort()];
}

export function pageWindow(current, total) {
  if (total <= 7) return { start: 1, end: total };
  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);
  start = Math.max(1, end - 4);
  return { start, end };
}
