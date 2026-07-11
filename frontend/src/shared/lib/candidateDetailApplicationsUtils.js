import { buildAiInsight } from './candidatesCommandUtils';
import { getCandidateDisplaySource } from './candidateSource';
import {
  getFitMetrics,
  getFitTier,
  getMatchedSkills,
  getOverallFitScore,
  ringGradientStyle,
} from './jobDetailCandidatesUtils';
import { getFitTierLabel, getRingColor } from './jobDetailMatchesUtils';
import { DEFAULT_STAGE_SLA } from './hiringDashboardConfigConstants';

export { getFitMetrics, getFitTier, getMatchedSkills, getOverallFitScore, ringGradientStyle };

export function pickPrimaryApplication(applications = []) {
  if (!applications.length) return null;
  return [...applications].sort((a, b) => {
    const scoreA = getOverallFitScore(a) ?? -1;
    const scoreB = getOverallFitScore(b) ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (
      new Date(b.updated_at || b.created_at || 0).getTime() -
      new Date(a.updated_at || a.created_at || 0).getTime()
    );
  })[0];
}

export function formatApplicationShortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function formatApplicationFullDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${sec}`;
}

export function formatStageLabel(stage) {
  if (!stage) return '—';
  return String(stage)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function requirementsLabel(fitScore) {
  if (!fitScore) return 'Pending';
  return fitScore.must_have_ok ? 'Met' : 'Missing';
}

export function requirementsMet(fitScore) {
  return Boolean(fitScore?.must_have_ok);
}

export function computeApplicationsKpis(profile, applications = []) {
  const primary = pickPrimaryApplication(applications);
  const fitScore = getOverallFitScore(primary);
  const lastUpdated = applications.reduce((latest, app) => {
    const ts = new Date(app.updated_at || app.created_at || 0).getTime();
    return ts > latest ? ts : latest;
  }, 0);

  return {
    applications: applications.length,
    fitScore,
    fitScoreLabel: fitScore != null ? `${fitScore}%` : '—',
    currentStage: primary?.stage ? formatStageLabel(primary.stage) : '—',
    lastUpdated: lastUpdated ? formatApplicationShortDate(new Date(lastUpdated).toISOString()) : '—',
    requirements: primary?.fit_score ? requirementsLabel(primary.fit_score) : '—',
    requirementsMet: primary?.fit_score ? requirementsMet(primary.fit_score) : null,
    primary,
  };
}

const APPLICATIONS_KPI_META = [
  { key: 'applications', label: 'Applications', icon: '▣', iconClass: 'purple' },
  { key: 'fitScoreLabel', label: 'Fit Score', icon: '◎', iconClass: 'green' },
  { key: 'currentStage', label: 'Current Stage', icon: '◷', iconClass: 'blue' },
  { key: 'lastUpdated', label: 'Last Updated', icon: '📅', iconClass: 'orange' },
  { key: 'requirements', label: 'Requirements', icon: '✓', iconClass: 'green', valueKey: 'requirements' },
];

export function applicationsKpiStripItems(kpis) {
  return APPLICATIONS_KPI_META.map((meta) => ({
    ...meta,
    value: String(kpis[meta.valueKey || meta.key] ?? '—'),
  }));
}

export function getApplicationSourceLabel(app, profile) {
  const badge = getCandidateDisplaySource(profile || app?.candidate);
  return badge?.label || 'Other';
}

export function computeDaysInCurrentStage(app, historyEntries = []) {
  if (!app?.stage) return null;

  const rows = Array.isArray(historyEntries) ? historyEntries : [];
  const stageEntries = rows.filter((e) => e.to_stage === app.stage);
  const lastEntry = stageEntries[stageEntries.length - 1];
  const enteredAt = lastEntry?.changed_at || app.updated_at || app.created_at;
  if (!enteredAt) return null;

  const entered = new Date(enteredAt);
  if (Number.isNaN(entered.getTime())) return null;
  const diffMs = Date.now() - entered.getTime();
  return Math.round(Math.max(0, diffMs / 86400000) * 10) / 10;
}

export function computeSlaStatus(app, daysInStage) {
  const sla = DEFAULT_STAGE_SLA[app?.stage];
  if (daysInStage == null || sla == null) {
    return { label: 'On track', tone: 'good' };
  }
  if (daysInStage >= sla) return { label: 'Breached', tone: 'bad' };
  if (daysInStage >= sla * 0.75) return { label: 'At risk', tone: 'warn' };
  return { label: 'On track', tone: 'good' };
}

const NEXT_ACTION_BY_STAGE = {
  SOURCED: 'Review profile',
  SCREENING: 'Review profile',
  ASSESSMENT_SENT: 'Follow up on assessment',
  ASSESSMENT_CLEARED: 'Schedule interview',
  INTERVIEW_1: 'Collect interview feedback',
  INTERVIEW_2: 'Collect interview feedback',
  INTERVIEW_3: 'Collect interview feedback',
  HR_ROUND: 'Prepare offer discussion',
  OFFER: 'Follow up on offer',
  JOINED: 'Onboarding handoff',
  REJECTED: 'Archive candidate',
  DROPPED: 'Archive candidate',
};

export function getNextAction(app) {
  return NEXT_ACTION_BY_STAGE[app?.stage] || 'Review application';
}

export function buildApplicationRecommendation(app, profile, fitScore, trajSummary) {
  const score = getOverallFitScore(app) ?? fitScore;
  const tier = score != null ? getFitTierLabel(score) : null;
  const jobTitle = app?.job?.title || 'this role';

  const insight = buildAiInsight(profile, app, trajSummary, score);
  if (insight && insight !== 'Profile enriched with AI skills and experience signals. Review for open roles.') {
    return insight;
  }

  if (score != null && score >= 80 && app?.fit_score?.must_have_ok) {
    return `Candidate is an excellent match. Move to assessment round after screening checklist validation.`;
  }
  if (score != null && score >= 70) {
    return `Strong fit for ${jobTitle}. ${tier || 'Good match'} — proceed with stage validation before advancing.`;
  }
  if (app?.fit_score && !app.fit_score.must_have_ok) {
    return `Review missing required skills before advancing. Address gaps in screening or reassess role alignment.`;
  }
  return `Review ${jobTitle} application details and validate screening checklist before next stage.`;
}

export function buildActionSteps(app) {
  const jobTitle = app?.job?.title || 'the role';
  const stage = app?.stage || 'SCREENING';

  if (stage === 'SCREENING' || stage === 'SOURCED') {
    return [
      {
        step: 1,
        title: 'Complete Screening',
        description: 'Validate role alignment, availability, and compensation expectation.',
      },
      {
        step: 2,
        title: 'Trigger Assessment',
        description: `Send ${jobTitle} technical assessment if screening clears.`,
      },
      {
        step: 3,
        title: 'Prepare Interview',
        description: 'Create structured interview panel with role-specific focus areas.',
      },
    ];
  }

  if (stage === 'ASSESSMENT_SENT' || stage === 'ASSESSMENT_CLEARED') {
    return [
      {
        step: 1,
        title: 'Review Assessment',
        description: 'Validate assessment scores and skill coverage against job requirements.',
      },
      {
        step: 2,
        title: 'Schedule Interview',
        description: `Book interview panel for ${jobTitle} with hiring manager.`,
      },
      {
        step: 3,
        title: 'Collect Feedback',
        description: 'Gather structured feedback before advancing to offer stage.',
      },
    ];
  }

  return [
    {
      step: 1,
      title: 'Review Stage Status',
      description: `Confirm ${formatStageLabel(stage)} milestones are complete for ${jobTitle}.`,
    },
    {
      step: 2,
      title: 'Advance Pipeline',
      description: 'Move candidate to the next hiring stage when checklist items are satisfied.',
    },
    {
      step: 3,
      title: 'Update Stakeholders',
      description: 'Notify hiring manager and recruiters on stage progression.',
    },
  ];
}

export function fitRingStyle(score) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color = getRingColor(pct);
  return {
    background: `conic-gradient(${color} 0 ${pct}%, #e2e8f0 ${pct}% 100%)`,
  };
}

export function formatTimelineRows(historyEntries = []) {
  return historyEntries.map((entry) => {
    const isOfferStatusEvent =
      entry.offer_status &&
      entry.from_stage === entry.to_stage &&
      entry.to_stage === 'OFFER';

    const title = isOfferStatusEvent
      ? `Offer — ${String(entry.offer_status).replace(/_/g, ' ')}`
      : formatStageLabel(entry.to_stage);

    const fromLabel = entry.from_stage ? formatStageLabel(entry.from_stage) : null;
    const subtitle = formatApplicationFullDate(entry.changed_at);
    const suffix = !isOfferStatusEvent && fromLabel ? ` · from ${fromLabel}` : '';

    return {
      title,
      subtitle: `${subtitle}${suffix}`,
      daysInStage: !isOfferStatusEvent ? entry.days_in_stage : null,
    };
  });
}

export function getApplicationFitMetrics(fitScore) {
  if (!fitScore) return [];
  const fields = [
    { key: 'skills', label: 'Skills Match', value: fitScore.skill_match_pct ?? fitScore.skill_score },
    { key: 'title', label: 'Title Match', value: fitScore.title_score },
    { key: 'activity', label: 'Activity Match', value: fitScore.activity_match_pct },
    { key: 'experience', label: 'Experience', value: fitScore.experience_score },
  ];
  return fields
    .map(({ key, label, value }) => {
      if (value == null || Number.isNaN(Number(value))) return null;
      return { key, label, score: Math.round(Number(value)) };
    })
    .filter(Boolean);
}

export function metricBarFillClass(score, overallScore) {
  const ref = overallScore ?? score;
  if (ref != null && ref >= 80) return 'cda-fill-green';
  if (ref != null && ref >= 60) return 'cda-fill-orange';
  return 'cda-fill-red';
}
