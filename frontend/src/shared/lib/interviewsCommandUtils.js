import { format, parseISO, isValid } from 'date-fns';
import { getOverallFitScore, getFitTier, getFitMetrics } from './jobDetailCandidatesUtils';
import { resolveCandidateFitScore } from './candidatesCommandUtils';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '@/data/businessOrgHierarchy';

export const INTERVIEW_TAB_KEYS = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  FEEDBACK_PENDING: 'feedback-pending',
  PANEL_LOAD: 'panel-load',
  CALENDAR: 'calendar',
};

export const INTERVIEW_TABS = [
  { id: INTERVIEW_TAB_KEYS.UPCOMING, label: 'Upcoming' },
  { id: INTERVIEW_TAB_KEYS.COMPLETED, label: 'Completed' },
  { id: INTERVIEW_TAB_KEYS.FEEDBACK_PENDING, label: 'Feedback Pending' },
  { id: INTERVIEW_TAB_KEYS.PANEL_LOAD, label: 'Panel Load' },
  { id: INTERVIEW_TAB_KEYS.CALENDAR, label: 'Calendar View' },
];

export const TAB_SECTION_TITLES = {
  [INTERVIEW_TAB_KEYS.UPCOMING]: 'Upcoming Interviews',
  [INTERVIEW_TAB_KEYS.COMPLETED]: 'Completed Interviews',
  [INTERVIEW_TAB_KEYS.FEEDBACK_PENDING]: 'Feedback Pending',
  [INTERVIEW_TAB_KEYS.PANEL_LOAD]: 'Panel Load Overview',
  [INTERVIEW_TAB_KEYS.CALENDAR]: 'Calendar View',
};

function parseInterviewDate(value) {
  if (!value) return null;
  try {
    const d = typeof value === 'string' ? parseISO(value) : new Date(value);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export function formatInterviewDateTime(value) {
  const d = parseInterviewDate(value);
  if (!d) return '—';
  return format(d, 'dd/MM/yyyy · HH:mm');
}

export function formatScheduleRowDate(interview) {
  const d = parseInterviewDate(interview?.scheduled_start);
  if (!d) return '—';
  const datePart = format(d, 'dd/MM/yyyy');
  const round = formatRoundLabel(interview?.round);
  const mode = formatModeLabel(interview?.mode);
  return `${datePart} · ${round} · ${mode}`;
}

export function formatRoundLabel(round) {
  const n = Number(round);
  if (n === 4) return 'HR Round';
  if (Number.isFinite(n) && n > 0) return `Round ${n}`;
  return 'Round 1';
}

export function formatModeLabel(mode) {
  switch (String(mode || '').toUpperCase()) {
    case 'VIRTUAL':
      return 'Virtual';
    case 'ONSITE':
      return 'Onsite';
    case 'PHONE':
      return 'Phone';
    default:
      return mode || 'Virtual';
  }
}

export function resolveInterviewApplication(interview, applicationMap) {
  if (!interview?.application_id || !applicationMap) return null;
  return applicationMap[interview.application_id] || null;
}

export function resolveInterviewFitScore(interview, applicationMap) {
  const app = resolveInterviewApplication(interview, applicationMap);
  const fromApp = getOverallFitScore(app);
  if (fromApp != null) return fromApp;

  const candidate = interview?.candidate || app?.candidate;
  return resolveCandidateFitScore(candidate, app, null);
}

export function resolveInterviewFitScoreObject(interview, applicationMap) {
  const app = resolveInterviewApplication(interview, applicationMap);
  return app?.fit_score || null;
}

export function getInterviewMatchBars(interview, applicationMap) {
  const fitScore = resolveInterviewFitScoreObject(interview, applicationMap);
  const metrics = getFitMetrics(fitScore);
  const skills = metrics.find((m) => m.key === 'skill_match_pct');
  const role = metrics.find((m) => m.key === 'title_score');
  const overall = resolveInterviewFitScore(interview, applicationMap);

  if (skills || role) {
    return {
      skills: skills?.score ?? overall,
      role: role?.score ?? (overall != null ? Math.min(100, overall + 2) : null),
    };
  }

  if (overall != null) {
    return {
      skills: overall,
      role: Math.min(100, overall + 2),
    };
  }

  return { skills: null, role: null };
}

export function getMatchLabel(score) {
  return getFitTier(score).label;
}

export function ivRingGradientStyle(score) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  return {
    background: `conic-gradient(#10b981 0 ${pct}%, #e5e7eb ${pct}%)`,
  };
}

export function isFeedbackDue(interview) {
  if (!interview) return false;
  const hasFeedback = Array.isArray(interview.feedback) && interview.feedback.length > 0;
  if (hasFeedback) return false;

  if (interview.status === 'COMPLETED') return true;

  const start = parseInterviewDate(interview.scheduled_start);
  if (interview.status === 'SCHEDULED' && start && start < new Date()) return true;

  return false;
}

export function getCardStatusTag(interview, applicationMap) {
  if (isFeedbackDue(interview)) {
    return { label: 'Feedback due', variant: 'warn' };
  }
  if (interview.status === 'COMPLETED') {
    return { label: 'Completed', variant: 'good' };
  }
  const fit = resolveInterviewFitScore(interview, applicationMap);
  if (fit != null && fit >= 88) {
    return { label: 'High fit', variant: 'good' };
  }
  return { label: 'Scheduled', variant: 'default' };
}

export function getScheduleRowTag(interview, applicationMap) {
  return getCardStatusTag(interview, applicationMap);
}

export function buildCardInsight(interview, applicationMap) {
  const fit = resolveInterviewFitScore(interview, applicationMap);
  const tier = getFitTier(fit);

  if (isFeedbackDue(interview)) {
    return 'Feedback pending. Send reminder to panel to avoid candidate experience delay.';
  }

  if (tier.key === 'excellent') {
    return 'High-fit candidate. Recommend structured final decision within 24 hours.';
  }

  if (tier.key === 'good') {
    return 'Interview panel should validate forensic accounting and stakeholder management depth.';
  }

  if (interview.status === 'COMPLETED') {
    return 'Interview completed. Review panel feedback and decide next pipeline step.';
  }

  return 'Review candidate profile and panel notes before the scheduled round.';
}

export function computeInterviewKpis(interviews = []) {
  const upcoming = interviews.filter((i) => i.status === 'SCHEDULED').length;
  const completed = interviews.filter((i) => i.status === 'COMPLETED').length;
  const positive = interviews.filter((i) =>
    i.feedback?.some((f) => ['STRONG_YES', 'YES'].includes(f.decision))
  ).length;

  return {
    upcoming,
    completed,
    positive,
    total: interviews.length,
  };
}

export function filterInterviewsByTab(interviews, tab, applicationMap) {
  switch (tab) {
    case INTERVIEW_TAB_KEYS.UPCOMING:
      return interviews.filter((i) => i.status === 'SCHEDULED');
    case INTERVIEW_TAB_KEYS.COMPLETED:
      return interviews.filter((i) => i.status === 'COMPLETED');
    case INTERVIEW_TAB_KEYS.FEEDBACK_PENDING:
      return interviews.filter((i) => isFeedbackDue(i));
    case INTERVIEW_TAB_KEYS.PANEL_LOAD:
    case INTERVIEW_TAB_KEYS.CALENDAR:
      return [];
    default:
      return interviews;
  }
}

export function getUpcomingScheduleRows(interviews, applicationMap, limit = 5) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 8);

  return interviews
    .filter((i) => i.status !== 'CANCELLED')
    .map((i) => ({ interview: i, date: parseInterviewDate(i.scheduled_start) }))
    .filter(({ interview, date }) => {
      if (!date) return false;
      if (isFeedbackDue(interview)) return true;
      return date >= now && date < weekAhead;
    })
    .sort((a, b) => {
      if (isFeedbackDue(a.interview) && !isFeedbackDue(b.interview)) return -1;
      if (!isFeedbackDue(a.interview) && isFeedbackDue(b.interview)) return 1;
      return a.date - b.date;
    })
    .slice(0, limit)
    .map(({ interview }) => interview);
}

export function buildAiRecommendations(interviews, applicationMap) {
  const scheduled = interviews.filter((i) => i.status === 'SCHEDULED');
  const onsiteCount = scheduled.filter((i) => String(i.mode).toUpperCase() === 'ONSITE').length;
  const feedbackDueCount = interviews.filter((i) => isFeedbackDue(i)).length;

  let bestCandidate = null;
  let bestFit = -1;
  for (const interview of scheduled) {
    const fit = resolveInterviewFitScore(interview, applicationMap);
    if (fit != null && fit > bestFit) {
      bestFit = fit;
      bestCandidate = interview;
    }
  }

  const items = [];

  if (onsiteCount >= 2) {
    items.push({
      title: 'Reduce onsite dependency',
      body: `${onsiteCount} onsite rounds can be moved virtual to reduce delay.`,
    });
  } else if (onsiteCount === 1) {
    items.push({
      title: 'Reduce onsite dependency',
      body: '1 onsite round can be moved virtual to reduce scheduling delay.',
    });
  } else {
    items.push({
      title: 'Reduce onsite dependency',
      body: 'Virtual-first scheduling is keeping interview velocity healthy.',
    });
  }

  if (feedbackDueCount > 0) {
    items.push({
      title: 'Feedback risk',
      body: `Set feedback SLA reminders for ${feedbackDueCount} panel${feedbackDueCount === 1 ? '' : 's'}.`,
    });
  } else {
    items.push({
      title: 'Feedback risk',
      body: 'Set feedback SLA reminders for all panels.',
    });
  }

  if (bestCandidate && bestFit >= 85) {
    const name = bestCandidate.candidate?.full_name || 'Top candidate';
    items.push({
      title: 'Best next action',
      body: `Prioritize ${name}; ${bestFit}% fit and ready for offer.`,
    });
  } else if (scheduled.length > 0) {
    items.push({
      title: 'Best next action',
      body: `Prioritize ${scheduled.length} upcoming interview${scheduled.length === 1 ? '' : 's'} to maintain pipeline velocity.`,
    });
  } else {
    items.push({
      title: 'Best next action',
      body: 'Schedule interviews for assessment-cleared candidates to avoid pipeline stall.',
    });
  }

  return items.slice(0, 3);
}

const FALLBACK_PANEL_ROWS = [
  { panel: 'Investigation Panel A', assigned: 2, sla: 92, quality: 'High', qualityVariant: 'good' },
  { panel: 'Forensic Panel', assigned: 1, sla: 78, quality: 'Good', qualityVariant: 'good' },
  { panel: 'Operations Panel', assigned: 1, sla: 64, quality: 'Watch', qualityVariant: 'warn' },
];

export function buildPanelPerformanceRows(interviews = []) {
  const panelMap = new Map();

  for (const interview of interviews) {
    const panels =
      Array.isArray(interview.interviewers) && interview.interviewers.length
        ? interview.interviewers
        : ['Unassigned Panel'];

    for (const panel of panels) {
      const key = String(panel);
      if (!panelMap.has(key)) {
        panelMap.set(key, { panel: key, assigned: 0, feedbackCount: 0, totalScore: 0, scoreCount: 0 });
      }
      const row = panelMap.get(key);
      row.assigned += 1;

      if (Array.isArray(interview.feedback) && interview.feedback.length) {
        row.feedbackCount += 1;
        for (const fb of interview.feedback) {
          if (fb.score != null && !Number.isNaN(Number(fb.score))) {
            row.totalScore += Number(fb.score);
            row.scoreCount += 1;
          }
        }
      }
    }
  }

  const derived = Array.from(panelMap.values()).map((row) => {
    const sla = row.assigned > 0 ? Math.round((row.feedbackCount / row.assigned) * 100) : 0;
    const avgScore = row.scoreCount > 0 ? row.totalScore / row.scoreCount : null;
    let quality = 'Watch';
    let qualityVariant = 'warn';
    if (avgScore != null && avgScore >= 8) {
      quality = 'High';
      qualityVariant = 'good';
    } else if (avgScore != null && avgScore >= 6) {
      quality = 'Good';
      qualityVariant = 'good';
    } else if (sla >= 85) {
      quality = 'Good';
      qualityVariant = 'good';
    }

    return {
      panel: row.panel,
      assigned: row.assigned,
      sla,
      quality,
      qualityVariant,
    };
  });

  if (derived.length >= 2) {
    return derived.sort((a, b) => b.assigned - a.assigned).slice(0, 6);
  }

  return FALLBACK_PANEL_ROWS;
}

export function buildApplicationMap(applications = []) {
  const map = {};
  for (const app of applications) {
    if (app?.id) map[app.id] = app;
  }
  return map;
}

export function filterInterviewsByPlacement(interviews, jobs = [], placement = {}) {
  const { pillarId, departmentId, subDepartment, projectId } = placement || {};
  if (!pillarId && !departmentId && !subDepartment && !projectId) {
    return interviews;
  }

  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label || '';
  const departmentLabel =
    pillarId && departmentId
      ? getDepartmentsForPillar(pillarId).find((d) => d.id === departmentId)?.label || ''
      : '';

  const jobOrgById = {};
  for (const job of jobs) {
    if (job?.id) jobOrgById[job.id] = job;
  }

  return interviews.filter((interview) => {
    const jobId = interview.job?.id || interview.job_id;
    const job = jobOrgById[jobId];
    if (!job) return true;
    if (pillarLabel && (job.business_pillar || '') !== pillarLabel) return false;
    if (departmentLabel && (job.business_department || '') !== departmentLabel) return false;
    if (subDepartment && (job.business_sub_department || '') !== subDepartment) return false;
    if (projectId && (job.project_id || '') !== projectId) return false;
    return true;
  });
}

export function sortInterviewsForDisplay(interviews) {
  return [...interviews].sort((a, b) => {
    const da = parseInterviewDate(a.scheduled_start)?.getTime() ?? 0;
    const db = parseInterviewDate(b.scheduled_start)?.getTime() ?? 0;
    return db - da;
  });
}
