import { fmtField } from './candidateDetailOverviewUtils';
import { pickPrimaryApplication } from './candidateDetailApplicationsUtils';
import { getOverallFitScore } from './jobDetailCandidatesUtils';

const PENDING_STATUSES = new Set(['INVITED', 'IN_PROGRESS', 'SUBMITTED']);
const TERMINAL_STATUSES = new Set(['SCORED', 'CANCELLED', 'EXPIRED']);

export const LIFECYCLE_STEPS = [
  { key: 'created', label: 'Created', hint: 'Assessment assigned' },
  { key: 'invited', label: 'Invited', hint: 'Link sent to candidate' },
  { key: 'started', label: 'Started', hint: 'Awaiting first attempt' },
  { key: 'submitted', label: 'Submitted', hint: 'Evaluation pending' },
  { key: 'decision', label: 'Decision', hint: 'Pass/fail review' },
];

export function formatAssessmentStatus(status) {
  if (!status) return '—';
  const map = {
    INVITED: 'Invited',
    IN_PROGRESS: 'In Progress',
    SUBMITTED: 'Submitted',
    SCORED: 'Scored',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
  };
  return map[status] || String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusPillClass(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'INVITED') return 'invited';
  if (s === 'IN_PROGRESS' || s === 'SUBMITTED') return 'pending';
  if (s === 'SCORED') return 'ready';
  return 'invited';
}

export function isPendingSubmission(submission) {
  return PENDING_STATUSES.has(String(submission?.status || '').toUpperCase());
}

export function pickActiveSubmission(submissions = []) {
  if (!submissions.length) return null;
  const sorted = [...submissions].sort((a, b) => {
    const ta = new Date(a.invited_at || a.created_at || 0).getTime();
    const tb = new Date(b.invited_at || b.created_at || 0).getTime();
    return tb - ta;
  });
  const pending = sorted.find((s) => isPendingSubmission(s));
  return pending || sorted[0];
}

export function countPendingSubmissions(submissions = []) {
  return submissions.filter((s) => isPendingSubmission(s)).length;
}

export function assessmentPendingBadge(submissions = []) {
  const pending = countPendingSubmissions(submissions);
  if (!pending) return null;
  return { label: 'Assessment Pending', variant: 'amber' };
}

export function formatScoreDisplay(submission) {
  if (submission?.score_pct != null) return `${Math.round(submission.score_pct)}%`;
  if (submission?.score != null) return `${Math.round(submission.score)}%`;
  return '—';
}

export function formatPassDecision(submission) {
  if (submission?.passed === true) return 'Pass';
  if (submission?.passed === false) return 'Fail';
  if (String(submission?.status || '').toUpperCase() === 'SCORED') return 'Review';
  return 'Pending';
}

export function computeAssessmentsKpis(submissions = []) {
  const active = pickActiveSubmission(submissions);
  const assigned = submissions.length;
  const completed = submissions.filter((s) => String(s.status).toUpperCase() === 'SCORED').length;
  const currentStatus = active ? formatAssessmentStatus(active.status) : '—';
  const score = active?.score_pct != null || active?.score != null ? formatScoreDisplay(active) : '—';
  const passDecision = active ? formatPassDecision(active) : '—';

  return {
    assigned,
    assignedNote: active?.job_title || (assigned ? `${assigned} total` : 'None assigned'),
    currentStatus,
    currentStatusNote: active
      ? isPendingSubmission(active)
        ? 'Waiting for candidate action'
        : String(active.status).toUpperCase() === 'SCORED'
          ? 'Evaluation complete'
          : 'Tracking in progress'
      : 'No active assessment',
    completed,
    completedNote:
      completed === 0
        ? 'No submission received'
        : `${completed} scored`,
    score,
    scoreNote: score === '—' ? 'Available after evaluation' : 'Latest assessment score',
    passDecision,
    passDecisionNote:
      passDecision === 'Pending'
        ? 'Auto + recruiter review'
        : passDecision === 'Pass'
          ? 'Cleared for next stage'
          : 'Requires follow-up',
    active,
  };
}

const ASSESSMENTS_KPI_META = [
  { key: 'assigned', label: 'Assigned', noteKey: 'assignedNote', noteClass: 'info' },
  { key: 'currentStatus', label: 'Current Status', noteKey: 'currentStatusNote', noteClass: 'warn' },
  { key: 'completed', label: 'Completed', noteKey: 'completedNote', noteClass: 'warn' },
  { key: 'score', label: 'Score', noteKey: 'scoreNote', noteClass: '' },
  { key: 'passDecision', label: 'Pass Decision', noteKey: 'passDecisionNote', noteClass: 'info' },
];

export function assessmentsKpiStripItems(kpis) {
  return ASSESSMENTS_KPI_META.map((meta) => ({
    key: meta.key,
    label: meta.label,
    value: String(kpis[meta.key] ?? '—'),
    note: kpis[meta.noteKey] || '',
    noteClass: meta.noteClass,
  }));
}

export function getLifecycleSteps(submission) {
  const status = String(submission?.status || '').toUpperCase();
  const passed = submission?.passed;

  let activeIndex = 0;
  if (!submission) {
    return LIFECYCLE_STEPS.map((step, i) => ({ ...step, state: i === 0 ? 'active' : 'upcoming' }));
  }

  if (status === 'INVITED') activeIndex = 1;
  else if (status === 'IN_PROGRESS') activeIndex = 2;
  else if (status === 'SUBMITTED') activeIndex = 3;
  else if (status === 'SCORED') activeIndex = 4;
  else if (TERMINAL_STATUSES.has(status)) activeIndex = 4;

  return LIFECYCLE_STEPS.map((step, i) => {
    let state = 'upcoming';
    if (i < activeIndex) state = 'done';
    else if (i === activeIndex) state = 'active';
    if (status === 'SCORED' && i === 4 && passed != null) state = 'done';
    return { ...step, state, index: i + 1 };
  });
}

export function buildAssessmentCardDescription(submission, profile) {
  const title = submission?.job_title || 'this role';
  const status = String(submission?.status || '').toUpperCase();
  const name = profile?.full_name?.split(' ')[0] || 'The candidate';

  if (status === 'INVITED') {
    return `Assigned for ${title}. ${name} has received the link but has not started or submitted the assessment yet.`;
  }
  if (status === 'IN_PROGRESS') {
    return `Assigned for ${title}. ${name} has started the assessment but has not submitted yet.`;
  }
  if (status === 'SUBMITTED') {
    return `Assigned for ${title}. Submission received — evaluation and pass decision are pending.`;
  }
  if (status === 'SCORED') {
    const score = formatScoreDisplay(submission);
    const pass = formatPassDecision(submission);
    return `Assigned for ${title}. Scored ${score} with ${pass.toLowerCase()} decision.`;
  }
  return `Assigned for ${title}. Track invite, completion, and evaluation from this workspace.`;
}

function skillTokens(profile) {
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  return skills
    .map((s) => String(s?.skill_name || s || '').toLowerCase())
    .filter(Boolean);
}

export function buildReadinessSignals(profile, submission, primaryApplication) {
  const fit = getOverallFitScore(primaryApplication);
  const roleRelevance = fit != null ? Math.min(98, Math.max(42, Math.round(fit))) : 72;
  const tokens = skillTokens(profile);
  const biFit = tokens.some((t) => /bi|business intelligence|analytics|data/.test(t))
    ? Math.min(92, roleRelevance + 4)
    : Math.max(48, roleRelevance - 8);
  const investigationFit = tokens.some((t) => /investigation|research|audit|compliance/.test(t))
    ? Math.min(88, roleRelevance)
    : Math.max(44, roleRelevance - 14);
  const pending = submission && isPendingSubmission(submission);
  const riskPct = pending ? 35 : submission?.passed === false ? 72 : 22;

  return [
    { key: 'role', label: 'Role relevance', value: roleRelevance, display: `${roleRelevance}%` },
    { key: 'bi', label: 'BI fit', value: biFit, display: `${biFit}%` },
    {
      key: 'investigation',
      label: 'Investigation fit',
      value: investigationFit,
      display: `${investigationFit}%`,
    },
    {
      key: 'risk',
      label: 'Assessment risk',
      value: riskPct,
      display: riskPct <= 40 ? 'Low' : riskPct <= 65 ? 'Medium' : 'High',
    },
  ];
}

export function buildAiAssessmentInsights(profile, submissions = [], primaryApplication) {
  const active = pickActiveSubmission(submissions);
  const status = String(active?.status || '').toUpperCase();
  const scored = status === 'SCORED';
  const skills = skillTokens(profile).slice(0, 6);

  const summary = scored
    ? 'Score and pass decision are available. Use strengths, gaps, and interview probes to guide the next recruiter action.'
    : 'No score is available yet because the candidate has only been invited. The system should focus on follow-up, expiry tracking, and readiness validation.';

  const insights = [];
  if (!scored) {
    insights.push({
      key: 'next-action',
      variant: 'warning',
      title: 'Next best action',
      body: 'Send reminder and keep the candidate in assessment-pending queue.',
    });
  } else if (active?.passed === true) {
    insights.push({
      key: 'next-action',
      variant: 'success',
      title: 'Next best action',
      body: 'Advance to interview or confirm recruiter review before pipeline move.',
    });
  } else {
    insights.push({
      key: 'next-action',
      variant: 'warning',
      title: 'Next best action',
      body: 'Review score breakdown and decide on reassessment or rejection.',
    });
  }

  const focusAreas = [];
  if (skills.some((s) => /bi|analytics|data/.test(s))) focusAreas.push('BI analytics');
  if (skills.some((s) => /investigation|research/.test(s))) focusAreas.push('investigation reasoning');
  focusAreas.push('data interpretation', 'written communication');

  insights.push({
    key: 'focus',
    variant: 'default',
    title: 'Suggested evaluation focus',
    body: [...new Set(focusAreas)].slice(0, 4).join(', ') + '.',
  });

  const jobTitle = active?.job_title || primaryApplication?.job?.title;
  insights.push({
    key: 'alignment',
    variant: 'success',
    title: 'Profile alignment',
    body: jobTitle
      ? `Assessment role is relevant to ${jobTitle.toLowerCase()} responsibilities.`
      : 'Assessment role aligns with analyst and investigation-oriented responsibilities.',
  });

  return { summary, insights, awaitingSubmission: !scored };
}

export function buildInviteDetails(profile, submission, invitedByLabel) {
  const status = String(submission?.status || '').toUpperCase();
  let inviteStatus = 'Not sent';
  if (submission?.take_url) inviteStatus = 'Link active';
  if (status === 'EXPIRED') inviteStatus = 'Expired';
  if (status === 'CANCELLED') inviteStatus = 'Cancelled';

  let lastActivity = 'No attempt yet';
  if (submission?.completed_at) lastActivity = 'Submitted';
  else if (submission?.started_at) lastActivity = 'In progress';
  else if (submission?.invited_at) lastActivity = 'Invited';

  return [
    { label: 'Assessment owner', value: invitedByLabel || submission?.invited_by || 'Recruiter' },
    { label: 'Candidate email', value: fmtField(profile?.email || submission?.candidate_email) },
    { label: 'Invite status', value: inviteStatus },
    { label: 'Last activity', value: lastActivity },
  ];
}

export function buildRecommendedAddons(profile) {
  const tokens = skillTokens(profile);
  const addons = [
    {
      key: 'bi-case',
      title: 'BI Case Study',
      description: 'Dashboard interpretation, business metrics, and written recommendation task.',
      duration: '45 min',
    },
    {
      key: 'data-practical',
      title: 'Data Analysis Practical',
      description: 'Excel/SQL-style data cleaning, aggregation, and insight generation.',
      duration: '60 min',
    },
  ];

  if (tokens.some((t) => /investigation|audit|compliance/.test(t))) {
    addons.unshift({
      key: 'investigation-case',
      title: 'Investigation Scenario',
      description: 'Structured case review, evidence synthesis, and stakeholder recommendation.',
      duration: '50 min',
    });
  }

  return addons.slice(0, 2);
}

export function buildRecruiterNotes(submissions = []) {
  const pending = countPendingSubmissions(submissions);
  const scored = submissions.filter((s) => String(s.status).toUpperCase() === 'SCORED');
  const latest = pickActiveSubmission(submissions);

  return [
    {
      label: 'Follow-up priority',
      value: pending > 0 ? 'Medium' : scored.length ? 'Low' : 'High',
    },
    {
      label: 'Suggested reminder',
      value: pending > 0 ? 'Today' : 'Not needed',
    },
    {
      label: 'Interview dependency',
      value: latest && !scored.length ? 'Wait for score' : scored.length ? 'Score available' : 'None',
    },
    {
      label: 'Decision gate',
      value: latest?.passed != null ? (latest.passed ? 'Pass confirmed' : 'Fail review') : 'Pass + review',
    },
  ];
}

export function pickInviteApplication(profile, applications = []) {
  const primary = pickPrimaryApplication(applications);
  if (primary) return primary;
  return applications[0] || null;
}
