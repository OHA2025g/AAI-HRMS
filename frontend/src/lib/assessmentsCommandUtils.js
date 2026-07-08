const IN_PROGRESS_STATUSES = new Set(['INVITED', 'IN_PROGRESS', 'SUBMITTED']);
const FUNNEL_COLORS = ['purple', 'violet', 'pink', 'orange', 'green', 'blue'];

export function computeAssessmentKpis(headline) {
  const h = headline || {};
  return {
    totalAssessments: h.total_assessments?.value ?? 0,
    totalSub: 'Published tests',
    inAssessment: h.candidates_in_assessment_sent?.value ?? 0,
    inAssessmentSub: 'Candidates active',
    cleared: h.candidates_assessment_cleared?.value ?? 0,
    clearedSub: 'Ready for next stage',
    clearanceRate: h.clearance_rate_pct != null ? `${h.clearance_rate_pct}%` : '—',
    clearanceSub: 'Cleared ÷ sent',
    completionRate: h.completion_rate_pct != null ? `${h.completion_rate_pct}%` : '—',
    completionSub: 'Scored ÷ invited',
    jobsMissing: h.jobs_missing_assessment?.value ?? 0,
    jobsMissingSub: (h.jobs_missing_assessment?.value ?? 0) === 0 ? 'No immediate gap' : 'Needs coverage',
    avgQuestions:
      h.avg_questions_per_assessment != null
        ? Math.round(h.avg_questions_per_assessment * 10) / 10
        : '—',
    avgDuration:
      h.avg_duration_minutes != null ? `${Math.round(h.avg_duration_minutes)} min` : '—',
    passThreshold: h.pass_threshold_pct != null ? `${Math.round(h.pass_threshold_pct)}%` : '70%',
  };
}

export function computeAssessmentHealth(headline, summary) {
  const h = headline || {};
  const completion = h.completion_rate_pct ?? 0;
  const clearance = h.clearance_rate_pct ?? 0;
  const missing = h.jobs_missing_assessment?.value ?? 0;
  let score = 50;
  score += Math.min(completion * 0.25, 25);
  score += Math.min(clearance * 0.2, 20);
  score -= missing * 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let message = 'Healthy coverage across open roles.';
  if (completion < 50) message = 'Healthy coverage, but completion velocity needs attention.';
  else if (missing > 0) message = 'Some open jobs still need assessment mapping.';
  else if (clearance < 25) message = 'Clearance rate is below target — review pass thresholds.';

  const alerts = summary?.alerts || [];
  if (alerts.length) message = alerts[0]?.message || message;

  return {
    score,
    message,
    avgDuration: h.avg_duration_minutes != null ? `${Math.round(h.avg_duration_minutes)} min` : '—',
    avgQuestions:
      h.avg_questions_per_assessment != null
        ? Math.round(h.avg_questions_per_assessment * 10) / 10
        : '—',
    passThreshold: h.pass_threshold_pct != null ? `${Math.round(h.pass_threshold_pct)}%` : '70%',
  };
}

export function computeQualitySignals(headline, skillBreakdown = []) {
  const h = headline || {};
  const medianFit = h.median_fit_score_pct ?? h.median_fit_pct ?? 80;
  const careerCoverage = h.career_coverage_pct ?? 0;
  const referralSignal = h.referral_signal_count ?? 0;

  const lowSkills = (skillBreakdown || []).filter((s) => (s.avg_score_pct ?? 100) < 70);
  const skillGapNote =
    lowSkills.length > 0
      ? `${lowSkills.slice(0, 2).map((s) => s.skill).join(' and ')} scores are below desired level.`
      : null;

  return {
    signals: [
      { label: 'Median fit score', pct: Math.min(100, Math.round(medianFit)), display: `${Math.round(medianFit)}%`, barClass: '' },
      { label: 'Career coverage', pct: Math.min(100, Math.round(careerCoverage)), display: `${careerCoverage}%`, barClass: 'green' },
      { label: 'Referral signal', pct: Math.min(100, referralSignal * 10), display: String(referralSignal), barClass: 'orange' },
    ],
    skillGapNote,
  };
}

export function formatAiAlerts(alerts = []) {
  return (alerts || []).map((a) => ({
    id: a.id || a.title,
    title: a.title || 'Alert',
    message: a.message || '',
    severity: a.severity || 'warning',
    actionPath: a.action_path,
  }));
}

export function getTabCounts(submissions = []) {
  const inProgress = submissions.filter((s) => IN_PROGRESS_STATUSES.has(s.status)).length;
  const results = submissions.filter((s) => s.status === 'SCORED').length;
  return { inProgress, results };
}

export function formatFunnelData(funnel = []) {
  const rows = funnel || [];
  if (!rows.length) return [];
  const max = Math.max(...rows.map((r) => r.count || 0), 1);
  return rows.map((row, i) => ({
    label: row.label,
    count: row.count ?? 0,
    widthPct: Math.round(((row.count || 0) / max) * 100),
    colorClass: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }));
}

export function formatCompletionDonut(passRate = [], headline) {
  const h = headline || {};
  const rate = h.completion_rate_pct ?? 0;
  const completedPct = Math.min(100, Math.max(0, rate));
  const pendingPct = Math.min(100 - completedPct, 30);
  const notStartedPct = Math.max(0, 100 - completedPct - pendingPct);
  const completedEnd = completedPct;
  const pendingEnd = completedEnd + pendingPct;
  return {
    rate: `${completedPct.toFixed(2)}%`,
    gradient: `conic-gradient(#10b981 0 ${completedEnd}%, #6d4cff ${completedEnd}% ${pendingEnd}%, #e5e7eb ${pendingEnd}% 100%)`,
    legend: [
      { color: '#10b981', label: 'Completed' },
      { color: '#6d4cff', label: 'Pending' },
      { color: '#e5e7eb', label: 'Not started' },
    ],
    passRateRows: passRate || [],
  };
}

export function formatScoreHistogram(buckets = []) {
  const data = (buckets || []).map((b) => ({
    name: b.bucket || b.name,
    count: b.count ?? 0,
    min: b.min_score ?? b.min,
    max: b.max_score ?? b.max,
  }));
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return data.map((d) => ({
    ...d,
    heightPct: d.count > 0 ? Math.max(8, Math.round((d.count / maxCount) * 100)) : 0,
  }));
}

export function formatTrendsCombo(trends = []) {
  const rows = trends || [];
  const maxInvited = Math.max(...rows.map((r) => r.invited || 0), 1);
  return rows.map((r) => ({
    label: r.label || r.week || '',
    invited: r.invited ?? 0,
    completed: r.completed ?? 0,
    passRate: r.pass_rate_pct,
    invitedHeight: Math.round(((r.invited || 0) / maxInvited) * 170),
    completedHeight: Math.round(((r.completed || 0) / maxInvited) * 170),
  }));
}

export function formatSkillBars(skills = []) {
  return (skills || []).slice(0, 10).map((s) => {
    const pct = Math.round(s.avg_score_pct ?? 0);
    return {
      skill: s.skill,
      pct,
      barClass: pct >= 70 ? 'green' : pct >= 50 ? 'orange' : 'red',
    };
  });
}

export function buildLibraryCardMeta(assessment, jobs = []) {
  const usage = assessment?.usage || {};
  const jobTitle = jobs.find((j) => j.id === assessment.job_id)?.title || 'Unknown Job';
  return {
    id: assessment.id,
    title: assessment.title,
    type: assessment.assessment_type,
    status: assessment.status || 'DRAFT',
    isPrimary: !!assessment.is_primary,
    jobTitle,
    jobId: assessment.job_id,
    duration: assessment.duration_minutes,
    createdAt: assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : '—',
    questionCount: assessment.questions?.length || 0,
    invited: usage.invited_count || 0,
    passed: usage.pass_count || 0,
    sent: usage.sent_count || 0,
    cleared: usage.cleared_count || 0,
    marks: assessment.total_marks,
    assessment,
  };
}

export function buildCoverageRows(byJob = []) {
  return (byJob || []).map((row) => ({
    role: row.title,
    jobId: row.job_id,
    status: row.has_assessment ? 'Mapped' : 'Missing',
    statusClass: row.has_assessment ? 'ok' : 'missing',
    invited: row.invited ?? 0,
    completed: row.completed ?? 0,
    passRate: row.pass_rate_pct != null ? `${row.pass_rate_pct}%` : '—',
    action: row.has_assessment ? (row.completed > 0 ? 'Review results' : 'Open pipeline') : 'Generate test',
  }));
}

export function getInitials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeCompletionPct(submission) {
  if (submission.status === 'SCORED') return 100;
  if (submission.status === 'SUBMITTED') return 85;
  if (submission.status === 'IN_PROGRESS') return 50;
  return 15;
}

export function computePriority(submission) {
  const days = daysSince(submission.invited_at);
  if (submission.status === 'SUBMITTED') return 'High';
  if (days != null && days >= 10) return 'High';
  if (days != null && days >= 5) return 'Medium';
  return 'Low';
}

export function buildInProgressWorklistRows(submissions = []) {
  return submissions
    .filter((s) => IN_PROGRESS_STATUSES.has(s.status))
    .map((s) => ({
      id: s.id,
      initials: getInitials(s.candidate_name),
      name: s.candidate_name || s.candidate_id,
      assessment: s.assessment_title,
      status: s.status,
      invitedAt: s.invited_at ? new Date(s.invited_at).toLocaleDateString() : '—',
      emailStatus: s.email_status,
      takeUrl: s.take_url,
      completionPct: computeCompletionPct(s),
      priority: computePriority(s),
      daysSinceInvite: daysSince(s.invited_at),
      submission: s,
    }))
    .sort((a, b) => (b.daysSinceInvite ?? 0) - (a.daysSinceInvite ?? 0));
}

export function buildStatusDistribution(submissions = []) {
  const inProgress = submissions.filter((s) => s.status === 'IN_PROGRESS').length;
  const needsGrading = submissions.filter((s) => s.status === 'SUBMITTED').length;
  const invited = submissions.filter((s) => s.status === 'INVITED').length;
  const total = inProgress + needsGrading + invited || 1;
  const p1 = Math.round((inProgress / total) * 100);
  const p2 = Math.round((needsGrading / total) * 100);
  const p3 = 100 - p1 - p2;
  return {
    total: inProgress + needsGrading + invited,
    gradient: `conic-gradient(#5b4bff 0 ${p1}%, #f59e0b ${p1}% ${p1 + p2}%, #10b981 ${p1 + p2}% 100%)`,
    legend: [
      { color: '#5b4bff', label: `In progress — ${inProgress}` },
      { color: '#f59e0b', label: `Needs grading — ${needsGrading}` },
      { color: '#10b981', label: `Recently invited — ${invited}` },
    ],
  };
}

export function buildAgeingBuckets(submissions = []) {
  const inProgress = submissions.filter((s) => IN_PROGRESS_STATUSES.has(s.status));
  const buckets = [
    { label: '0–2 days', min: 0, max: 2, count: 0 },
    { label: '3–7 days', min: 3, max: 7, count: 0 },
    { label: '8–14 days', min: 8, max: 14, count: 0 },
    { label: '15+ days', min: 15, max: Infinity, count: 0 },
  ];
  for (const s of inProgress) {
    const days = daysSince(s.invited_at);
    if (days == null) continue;
    const bucket = buckets.find((b) => days >= b.min && days <= b.max);
    if (bucket) bucket.count += 1;
  }
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return buckets.map((b) => ({ ...b, widthPct: Math.round((b.count / max) * 100) }));
}

export function buildQueueSummary(submissions = [], headline) {
  const inProgress = submissions.filter((s) => IN_PROGRESS_STATUSES.has(s.status));
  const active = headline?.active_submissions?.value ?? headline?.active_submissions ?? inProgress.length;
  const total = active || inProgress.length || 1;
  const pct = Math.round((inProgress.length / total) * 100);
  return {
    count: inProgress.length,
    workloadPct: Math.min(100, pct || 64),
    overdue: inProgress.filter((s) => (daysSince(s.invited_at) ?? 0) >= 2).length,
    noEmail: inProgress.filter((s) => !s.email_status || s.email_status === 'none').length,
    readyToGrade: inProgress.filter((s) => s.status === 'SUBMITTED').length,
  };
}

export function buildResultsSummary(results = [], headline) {
  const scores = results.map((r) => r.score_pct).filter((v) => v != null);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passed = results.filter((r) => r.passed).length;
  const passRate = results.length ? Math.round((passed / results.length) * 100) : 0;
  const highPotential = results.filter((r) => (r.score_pct ?? 0) >= 80).length;
  return {
    avgScore: scores.length ? `${avgScore}%` : '—',
    avgScorePct: avgScore,
    passRate: results.length ? `${passRate}%` : '—',
    passRatePct: passRate,
    completed: results.length,
    completedPct: Math.min(100, Math.round((results.length / Math.max(results.length, 30)) * 100)),
    highPotential,
    highPotentialPct: results.length ? Math.round((highPotential / results.length) * 100) : 0,
    passThreshold: headline?.pass_threshold_pct ?? 70,
  };
}

export function buildResultsLeaderboardRows(results = []) {
  return [...results]
    .sort((a, b) => (b.score_pct ?? 0) - (a.score_pct ?? 0) || new Date(b.completed_at) - new Date(a.completed_at))
    .map((s, i) => ({
      rank: i + 1,
      initials: getInitials(s.candidate_name),
      name: s.candidate_name || s.candidate_id,
      jobTitle: s.job_title || '',
      assessment: s.assessment_title,
      score: s.score_pct != null ? `${Math.round(s.score_pct)}%` : '—',
      scorePct: s.score_pct ?? 0,
      passed: !!s.passed,
      completedAt: s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '—',
      submission: s,
    }));
}

export function buildResultInsights(results = [], headline) {
  const passed = results.filter((r) => r.passed).length;
  const allPass = results.length > 0 && passed === results.length;
  const perfectScores = results.filter((r) => r.score_pct >= 99).length;
  const highPotential = results.filter((r) => (r.score_pct ?? 0) >= 80).length;
  const insights = [];
  if (allPass) {
    insights.push({ type: 'good', title: 'Strong technical clearance', text: 'All scored candidates passed the benchmark in this window.' });
  }
  if (perfectScores >= 3) {
    insights.push({ type: 'warn', title: 'Score clustering detected', text: 'Multiple candidates scored 100%, review question difficulty and calibration.' });
  }
  if (highPotential > 0) {
    insights.push({ type: 'good', title: `${highPotential} high-potential candidates`, text: 'Move top scorers to interview before offer pipeline slows down.' });
  }
  if (!insights.length) {
    insights.push({ type: 'good', title: 'Building result history', text: 'Score more submissions to unlock AI result insights.' });
  }
  return insights;
}

export function formatOutcomeFunnel(outcome) {
  if (!outcome) return { bars: [], kpis: [] };
  const values = [
    { label: 'Scored', count: outcome.scored || 0, colorClass: '' },
    { label: 'Passed', count: outcome.passed || 0, colorClass: 'green' },
    { label: 'Interview+', count: outcome.reached_interview || 0, colorClass: 'orange' },
    { label: 'Hired', count: outcome.hired || 0, colorClass: 'gray' },
  ];
  const max = Math.max(...values.map((v) => v.count), 1);
  return {
    bars: values.map((v) => ({ ...v, heightPct: Math.round(((v.count || 0) / max) * 100) })),
    kpis: [
      { label: 'Pass → interview', value: outcome.pass_to_interview_pct != null ? `${outcome.pass_to_interview_pct}%` : '—' },
      { label: 'Scored → interview', value: outcome.scored_to_interview_pct != null ? `${outcome.scored_to_interview_pct}%` : '—' },
      { label: 'Pass → hire', value: outcome.pass_to_hire_pct != null ? `${outcome.pass_to_hire_pct}%` : '—' },
      { label: 'Hiring conversion', value: outcome.hired > 0 ? `${outcome.pass_to_hire_pct ?? 0}%` : 'Pending' },
    ],
  };
}

export function buildAiInterpretation(outcome) {
  if (!outcome) return { summary: '', recs: [] };
  const recs = [];
  if ((outcome.pass_to_interview_pct ?? 0) >= 50) {
    recs.push({ type: 'green', title: 'Strong interview signal', text: `${outcome.pass_to_interview_pct}% of passed candidates reached interview stage.` });
  }
  if ((outcome.hired ?? 0) === 0) {
    recs.push({ type: 'orange', title: 'Hiring gap', text: 'No hires recorded yet from scored submissions.' });
    recs.push({ type: 'red', title: 'Action needed', text: 'Review interview feedback and offer readiness for passed candidates.' });
  }
  return {
    summary: 'The assessment screen is strong at moving pass candidates to interview, but hire conversion is still unproven.',
    recs,
  };
}

export function buildNextBestActions(outcome, inProgressCount) {
  const actions = [];
  if (outcome?.reached_interview > 0) {
    actions.push({ title: `1. Move ${outcome.reached_interview} interview-ready profiles`, text: 'Assign owners and target interview completion this week.' });
  }
  actions.push({ title: '2. Calibrate low-score outliers', text: 'Check whether test difficulty is aligned with role level.' });
  actions.push({ title: '3. Connect assessment to offer data', text: 'Enable hire-quality learning loop.' });
  if (inProgressCount > 0) {
    actions.unshift({ title: `0. Remind ${inProgressCount} in-progress candidates`, text: 'Send completion reminders for invites older than 48 hours.' });
  }
  return actions.slice(0, 3);
}

export function buildCalibrationCards(calibration, headline) {
  const lowPass = calibration?.low_pass_assessments || [];
  const stale = calibration?.stale_unused_assessments || [];
  return [
    {
      title: 'Assessment quality',
      text: lowPass.length
        ? `${lowPass.length} assessment(s) have pass rates below 40%.`
        : 'Tests are producing a measurable spread of outcomes, but more hires are needed to validate predictive power.',
      tag: lowPass.length ? 'Review needed' : 'Needs more data',
      tagClass: 'warn',
    },
    {
      title: 'Candidate quality',
      text: 'High-fit candidates are scoring strongly; prioritize them for faster interview scheduling.',
      tag: 'Healthy signal',
      tagClass: '',
    },
    {
      title: 'Role coverage',
      text: (headline?.jobs_missing_assessment?.value ?? 0) > 0
        ? `${headline.jobs_missing_assessment.value} open job(s) still need primary assessment mapping.`
        : 'Maintain coverage for core roles and watch missing tests for new requisitions.',
      tag: (headline?.jobs_missing_assessment?.value ?? 0) > 0 ? 'Gap detected' : 'On track',
      tagClass: (headline?.jobs_missing_assessment?.value ?? 0) > 0 ? 'warn' : '',
    },
  ];
}

export function buildReviewQueue(submissions = [], results = []) {
  const queue = [];
  for (const r of results.filter((s) => s.passed && (s.score_pct ?? 0) >= 80).slice(0, 2)) {
    queue.push({
      candidate: r.candidate_name,
      signal: 'High fit · Pass',
      signalClass: '',
      assessment: r.assessment_title,
      action: 'Schedule final interview',
    });
  }
  for (const r of results.filter((s) => !s.passed && (s.score_pct ?? 0) < 60).slice(0, 1)) {
    queue.push({
      candidate: r.candidate_name,
      signal: 'High fit · Low score',
      signalClass: 'warn',
      assessment: r.assessment_title,
      action: 'Review question difficulty',
    });
  }
  for (const s of submissions.filter((x) => IN_PROGRESS_STATUSES.has(x.status)).slice(0, 1)) {
    queue.push({
      candidate: s.candidate_name,
      signal: 'In progress',
      signalClass: 'warn',
      assessment: s.assessment_title,
      action: 'Send completion reminder',
    });
  }
  return queue;
}

export function buildLibraryRecommendations(assessments = [], byJob = [], results = []) {
  const rolesNeedingPrimary = (byJob || []).filter((r) => !r.has_assessment).length;
  const draftsReady = (assessments || []).filter((a) => a.status === 'DRAFT').length;
  const awaitingReview = (results || []).length;
  return [
    { value: rolesNeedingPrimary, label: 'roles need primary assessment mapping' },
    { value: draftsReady, label: 'draft tests ready to publish' },
    { value: awaitingReview, label: 'candidates awaiting result review' },
  ];
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'ACTIVE':
      return 'as-badge active';
    case 'DRAFT':
      return 'as-badge draft';
    case 'ARCHIVED':
      return 'as-badge draft';
    case 'INVITED':
      return 'as-badge warn';
    case 'IN_PROGRESS':
      return 'as-badge warn';
    case 'SUBMITTED':
      return 'as-badge';
    case 'SCORED':
      return 'as-badge green';
    default:
      return 'as-badge';
  }
}

export function getTypeBadgeClass(type) {
  switch (type) {
    case 'WORK_SIMULATION':
      return 'as-badge work';
    case 'CORE_SKILL':
      return 'as-badge core';
    case 'SCREENING':
      return 'as-badge core';
    case 'BEHAVIORAL':
      return 'as-badge work';
    default:
      return 'as-badge core';
  }
}

export function getEmailBadgeClass(emailStatus) {
  switch (emailStatus) {
    case 'sent':
      return 'as-badge green';
    case 'queued':
      return 'as-badge warn';
    case 'failed':
      return 'as-badge red';
    default:
      return 'as-badge red';
  }
}

export function getEmailLabel(emailStatus) {
  switch (emailStatus) {
    case 'sent':
      return 'Email sent';
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed';
    default:
      return 'No email';
  }
}

export function formatCompletionTimeline(trends = []) {
  const rows = trends || [];
  const max = Math.max(...rows.map((r) => r.completed || 0), 1);
  return rows.map((r) => ({
    label: r.label || '',
    count: r.completed ?? 0,
    widthPct: Math.round(((r.completed || 0) / max) * 100),
  }));
}

export function formatResultsDistribution(buckets = []) {
  const nonZero = (buckets || []).filter((b) => (b.count ?? 0) > 0);
  if (!nonZero.length) return [];
  const max = Math.max(...nonZero.map((b) => b.count), 1);
  return nonZero.slice(-5).map((b) => ({
    label: b.bucket || b.name,
    count: b.count,
    heightPct: Math.round((b.count / max) * 100),
  }));
}

export const TAB_TITLES = {
  overview: { title: 'Assessments Command Center', subtitle: 'AI tests, pipeline outcomes, assessment coverage and hire-quality signals.' },
  library: { title: 'Assessment Library', subtitle: 'Create, manage, invite, and monitor AI-powered assessments across open roles.' },
  'in-progress': { title: 'Assessments', subtitle: 'AI tests, pipeline outcomes, scoring queues, and hire-quality signals.' },
  results: { title: 'Assessments', subtitle: 'AI tests, pipeline outcomes, and hire-quality signals' },
  insights: { title: 'Assessments', subtitle: 'AI tests, pipeline outcomes, and hire-quality signals' },
};
