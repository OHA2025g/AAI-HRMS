import { getCandidateDisplaySource } from './candidateSource';

export const FIT_EXCELLENT_MIN = 80;
export const FIT_GOOD_MIN = 70;

const METRIC_FIELDS = [
  { key: 'skill_match_pct', label: 'Skills Match' },
  { key: 'title_score', label: 'Title Match' },
  { key: 'activity_match_pct', label: 'Activity Match' },
  { key: 'experience_score', label: 'Experience' },
];

export function getOverallFitScore(app) {
  const fs = app?.fit_score;
  const v = fs?.final_score ?? fs?.score;
  if (v == null || Number.isNaN(Number(v))) return null;
  return Math.round(Number(v));
}

export function getFitTier(score) {
  if (score == null) return { key: 'unknown', label: 'Fit pending', ringClass: 'blue' };
  if (score >= FIT_EXCELLENT_MIN) {
    return { key: 'excellent', label: 'Excellent Match', ringClass: 'green' };
  }
  if (score >= FIT_GOOD_MIN) {
    return { key: 'good', label: 'Good Match', ringClass: 'blue' };
  }
  if (score >= 60) return { key: 'fair', label: 'Fair Match', ringClass: 'blue' };
  return { key: 'low', label: 'Low Match', ringClass: 'blue' };
}

export function ringGradientStyle(score, ringClass) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color = ringClass === 'green' ? '#16b981' : '#6366f1';
  return {
    background: `conic-gradient(${color} 0 ${pct}%, #e2e8f0 ${pct}% 100%)`,
  };
}

export function metricBarClass(score, overallScore) {
  const ref = overallScore ?? score;
  if (ref != null && ref >= FIT_EXCELLENT_MIN) return 'jd-cand-fill';
  return 'jd-cand-fill jd-cand-fill-blue';
}

export function getFitMetrics(fitScore) {
  if (!fitScore) return [];
  return METRIC_FIELDS.map(({ key, label }) => {
    const raw = fitScore[key];
    if (raw == null || Number.isNaN(Number(raw))) return null;
    return { key, label, score: Math.round(Number(raw)) };
  }).filter(Boolean);
}

export function getMatchedSkills(fitScore) {
  return fitScore?.explanation?.matched_skills || [];
}

export function computeCandidatesSummary(applications = []) {
  const scores = applications.map(getOverallFitScore).filter((s) => s != null);
  const excellent = applications.filter((a) => {
    const s = getOverallFitScore(a);
    return s != null && s >= FIT_EXCELLENT_MIN;
  }).length;
  const good = applications.filter((a) => {
    const s = getOverallFitScore(a);
    return s != null && s >= FIT_GOOD_MIN && s < FIT_EXCELLENT_MIN;
  }).length;
  const readyForNext = applications.filter((a) => {
    const s = getOverallFitScore(a);
    return s != null && s >= FIT_GOOD_MIN;
  }).length;
  const avgFit =
    scores.length > 0
      ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length)
      : null;

  return {
    total: applications.length,
    excellent,
    good,
    readyForNext,
    avgFit,
  };
}

export function getApplicationSourceLabel(app) {
  const badge = getCandidateDisplaySource(app?.candidate);
  return badge?.label || 'Other';
}

export function collectSourceOptions(applications) {
  const labels = new Set(applications.map(getApplicationSourceLabel));
  return ['All', ...Array.from(labels).sort()];
}

export const FIT_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const SORT_OPTIONS = [
  { value: 'best_fit', label: 'Best fit' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'fit_asc', label: 'Lowest fit' },
];

function matchesFitFilter(score, fitFilter) {
  if (fitFilter === 'all') return true;
  if (score == null) return fitFilter === 'low';
  if (fitFilter === 'high') return score >= FIT_EXCELLENT_MIN;
  if (fitFilter === 'medium') return score >= FIT_GOOD_MIN && score < FIT_EXCELLENT_MIN;
  return score < FIT_GOOD_MIN;
}

function matchesSearch(app, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const name = (app.candidate?.full_name || '').toLowerCase();
  const email = (app.candidate?.email || '').toLowerCase();
  const headline = (app.candidate?.headline || '').toLowerCase();
  const source = getApplicationSourceLabel(app).toLowerCase();
  const fit = String(getOverallFitScore(app) ?? '');
  const skills = (app.fit_score?.explanation?.matched_skills || [])
    .join(' ')
    .toLowerCase();
  return (
    name.includes(q) ||
    email.includes(q) ||
    headline.includes(q) ||
    source.includes(q) ||
    fit.includes(q) ||
    skills.includes(q)
  );
}

export function filterAndSortApplications(applications, { search, sourceFilter, fitFilter, sort }) {
  let list = applications.filter((app) => {
    if (sourceFilter !== 'All' && getApplicationSourceLabel(app) !== sourceFilter) {
      return false;
    }
    if (!matchesFitFilter(getOverallFitScore(app), fitFilter)) return false;
    return matchesSearch(app, search);
  });

  list = [...list].sort((a, b) => {
    const scoreA = getOverallFitScore(a) ?? -1;
    const scoreB = getOverallFitScore(b) ?? -1;
    const nameA = (a.candidate?.full_name || '').toLowerCase();
    const nameB = (b.candidate?.full_name || '').toLowerCase();

    switch (sort) {
      case 'name_asc':
        return nameA.localeCompare(nameB);
      case 'name_desc':
        return nameB.localeCompare(nameA);
      case 'fit_asc':
        return scoreA - scoreB;
      case 'best_fit':
      default:
        return scoreB - scoreA;
    }
  });

  return list;
}
