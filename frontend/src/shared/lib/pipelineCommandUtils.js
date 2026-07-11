import { getCandidateDisplaySource, formatSourceLabel } from './candidateSource';
import {
  getFitMetrics,
  getFitTier,
  getMatchedSkills,
  getOverallFitScore,
} from './jobDetailCandidatesUtils';
import { topSkillNames } from './candidatesCommandUtils';

export const TAB_KEYS = {
  SOURCED: 'SOURCED',
  SCREENING: 'SCREENING',
  ASSESSMENT: 'ASSESSMENT',
  INTERVIEW: 'INTERVIEW',
  SALARY: 'SALARY',
};

export const INTERVIEW_ROUND_STAGE_IDS = ['INTERVIEW_1', 'INTERVIEW_2', 'INTERVIEW_3', 'HR_ROUND'];

export const ROUND_TABS = [
  { key: TAB_KEYS.SOURCED, label: 'Sourced', shortLabel: 'Sourced', stageIds: ['SOURCED'] },
  { key: TAB_KEYS.SCREENING, label: 'Screening Round', shortLabel: 'Screening', stageIds: ['SCREENING'] },
  {
    key: TAB_KEYS.ASSESSMENT,
    label: 'Assessment Round',
    shortLabel: 'Assessment',
    stageIds: ['ASSESSMENT_SENT', 'ASSESSMENT_CLEARED'],
  },
  {
    key: TAB_KEYS.INTERVIEW,
    label: 'Interview',
    shortLabel: 'Interview',
    stageIds: INTERVIEW_ROUND_STAGE_IDS,
  },
  { key: TAB_KEYS.SALARY, label: 'Salary Discussion', shortLabel: 'Salary', stageIds: ['OFFER'] },
];

export const TAB_SUBTITLES = {
  [TAB_KEYS.SOURCED]: 'AI-assisted candidate movement across hiring rounds.',
  [TAB_KEYS.SCREENING]: 'Review candidate fit, shortlist faster, and move quality profiles to assessment.',
  [TAB_KEYS.ASSESSMENT]:
    'Assessment round command view with candidate readiness, test status, and AI match quality.',
  [TAB_KEYS.INTERVIEW]:
    'Interview command view with candidate readiness, panel schedule and AI next-best actions.',
  [TAB_KEYS.SALARY]:
    'Manage candidates across rounds with AI fit, offer readiness and joining confidence.',
};

export const TAB_PAGE_TITLES = {
  [TAB_KEYS.SCREENING]: 'Screening Round',
};

export const OFFER_STATUS_OPTIONS = [
  { value: 'SENT', label: 'Offer sent' },
  { value: 'NEGOTIATION', label: 'In negotiation' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
];

const FUNNEL_STAGES = [
  { key: 'SOURCED', label: 'Sourced' },
  { key: 'SCREENING', label: 'Screening' },
  { key: 'ASSESSMENT_SENT', label: 'Assessment', aggregate: ['ASSESSMENT_SENT', 'ASSESSMENT_CLEARED'] },
  { key: 'INTERVIEW_1', label: 'Interview', aggregate: INTERVIEW_ROUND_STAGE_IDS },
];

export function getStageCount(pipeline, stageId) {
  return pipeline?.[stageId]?.length || 0;
}

export function getTabCount(pipeline, tab) {
  return (tab.stageIds || []).reduce((acc, sid) => acc + getStageCount(pipeline, sid), 0);
}

export function getAllTabCounts(pipeline) {
  const counts = {};
  for (const tab of ROUND_TABS) {
    counts[tab.key] = getTabCount(pipeline, tab);
  }
  return counts;
}

export function getTotalCandidates(pipeline) {
  const ids = new Set();
  Object.values(pipeline || {}).forEach((apps) => {
    (apps || []).forEach((a) => {
      if (a?.id) ids.add(a.id);
    });
  });
  return ids.size;
}

export function appsForStages(pipeline, stageIds) {
  const out = [];
  (stageIds || []).forEach((sid) => {
    (pipeline[sid] || []).forEach((app) => {
      if (app?.id) out.push(app);
    });
  });
  return out.sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  );
}

export function computeFunnelStages(pipeline) {
  const total = getTotalCandidates(pipeline) || 1;
  return FUNNEL_STAGES.map((stage) => {
    const count = stage.aggregate
      ? stage.aggregate.reduce((acc, sid) => acc + getStageCount(pipeline, sid), 0)
      : getStageCount(pipeline, stage.key);
    return {
      ...stage,
      count,
      pct: Math.round((count / total) * 100),
    };
  });
}

export function getMatchLabel(score) {
  return getFitTier(score).label;
}

export function getRingVariant(score) {
  return getFitTier(score).ringClass;
}

export function extractSkills(app, candidate) {
  const matched = getMatchedSkills(app?.fit_score);
  if (matched.length) return matched.slice(0, 6);
  return topSkillNames(candidate?.skills, 6);
}

export function formatCandidateSubtitle(app, jobTitle) {
  const name = app?.candidate?.full_name || 'Candidate';
  const headline = app?.candidate?.headline || app?.candidate?.email || '';
  if (jobTitle && headline) return `${jobTitle} — ${headline}`;
  if (headline) return headline;
  return jobTitle || name;
}

export function getSourceLabel(app) {
  const badge = getCandidateDisplaySource(app?.candidate);
  return badge?.label || formatSourceLabel(app?.candidate?.source) || 'Direct';
}

export function avgFitScore(apps) {
  const scores = apps.map(getOverallFitScore).filter((s) => s != null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function countRecommended(apps, threshold = 77) {
  return apps.filter((a) => {
    const s = getOverallFitScore(a);
    return s != null && s >= threshold;
  }).length;
}

export function countMatchedSkillsAcross(apps) {
  const set = new Set();
  for (const app of apps) {
    for (const skill of extractSkills(app, app.candidate)) {
      set.add(skill.toLowerCase());
    }
  }
  return set.size;
}

export function buildScreeningAiAction(screeningApps) {
  if (!screeningApps.length) {
    return 'Move sourced candidates into screening to start shortlisting.';
  }
  const top = [...screeningApps].sort(
    (a, b) => (getOverallFitScore(b) ?? 0) - (getOverallFitScore(a) ?? 0)
  )[0];
  const name = top?.candidate?.full_name || 'Top candidate';
  return `${name} is ready for Assessment. Move now to avoid screening delay.`;
}

export function computeScreeningKpis(screeningApps) {
  const avg = avgFitScore(screeningApps);
  return {
    count: screeningApps.length,
    avgFit: avg,
    pending: screeningApps.length,
    recommendedAction: screeningApps.length ? 'Move' : 'Review',
    recommendedTarget: 'Assessment round',
  };
}

export function computeAssessmentMetrics(assessmentSentApps, submissions = []) {
  const invitesSent = submissions.filter((s) => s.status && s.status !== 'NOT_STARTED').length;
  const inProgress = submissions.filter((s) => s.status === 'IN_PROGRESS').length;
  return {
    inAssessment: assessmentSentApps.length,
    invitesSent,
    inProgress,
  };
}

export function buildInterviewInsights(interviewApps) {
  const top = [...interviewApps].sort(
    (a, b) => (getOverallFitScore(b) ?? 0) - (getOverallFitScore(a) ?? 0)
  )[0];
  const topName = top?.candidate?.full_name?.split(' ')[0] || 'Candidate';
  return {
    aiInsight: top
      ? `${topName} is a strong match and should be prioritized for offer conversion. Suggested action: finalize panel feedback today.`
      : 'Schedule interviews for assessment-cleared candidates to keep pipeline velocity.',
    activeCount: interviewApps.length,
    panelReadiness: interviewApps.length ? 92 : null,
    slaRisk: interviewApps.length ? 'Medium' : 'Low',
  };
}

export function computeSalaryHeroMetrics(salaryApps) {
  const offerSent = salaryApps.filter((a) => (a.offer_status || 'SENT') === 'SENT').length;
  const negotiation = salaryApps.filter((a) => a.offer_status === 'NEGOTIATION').length;
  const accepted = salaryApps.filter((a) => a.offer_status === 'ACCEPTED').length;
  const total = salaryApps.length || 1;
  return {
    count: salaryApps.length,
    offerSentPct: Math.round((offerSent / total) * 100),
    negotiationPct: Math.round((negotiation / total) * 100),
    joiningPct: Math.round((accepted / total) * 100),
  };
}

export function buildSalaryAiGuidance(salaryApps) {
  if (!salaryApps.length) {
    return 'No candidates in salary discussion yet. Move interview-ready candidates to offer stage.';
  }
  const sorted = [...salaryApps].sort(
    (a, b) => (getOverallFitScore(b) ?? 0) - (getOverallFitScore(a) ?? 0)
  );
  const top = sorted[0]?.candidate?.full_name?.split(' ')[0] || 'Top candidate';
  if (salaryApps.length === 1) {
    return `${top} is within acceptable fit range. Prioritize offer closure this week.`;
  }
  return `Both candidates are within acceptable fit range. ${top} has stronger joining probability and should be prioritized for immediate closure.`;
}

export function getFitMetricsForApp(app) {
  return getFitMetrics(app?.fit_score);
}

export { getOverallFitScore, getFitMetrics, getMatchedSkills, getFitTier };
