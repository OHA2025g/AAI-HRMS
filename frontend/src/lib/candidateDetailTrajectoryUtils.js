import { formatExperienceMeta } from './candidateDetailOverviewUtils';

export function formatScorePercent(score) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return `${Math.round(Number(score))}%`;
}

export function formatScoreRaw(score) {
  if (score == null || Number.isNaN(Number(score))) return '—';
  return String(Math.round(Number(score)));
}

export function scoreRingStyle(score, max = 100) {
  const pct = Math.min(100, Math.max(0, (Number(score || 0) / max) * 100));
  const deg = pct * 3.6;
  return {
    background: `conic-gradient(#6d5dfc 0 ${deg}deg, #e9edf5 ${deg}deg 360deg)`,
  };
}

export function overallScoreValue(report) {
  if (!report) return null;
  return report.scores?.overall_career_trajectory?.score ?? report.overall_score ?? null;
}

export function confidenceLabel(scoreData) {
  const raw = scoreData?.confidence;
  if (!raw) return 'Medium';
  const s = String(raw).trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function barWidthPercent(score) {
  if (score == null || Number.isNaN(Number(score))) return 0;
  return Math.min(100, Math.max(0, Number(score)));
}

export function fullReportUrl(candidateId) {
  return `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${encodeURIComponent(candidateId)}`;
}

export function trajectoryReadyBadge(hasReport) {
  if (!hasReport) return null;
  return { label: 'AI trajectory ready', variant: 'purple' };
}

export function needsEvidenceTag(report) {
  const gate = String(report?.decision_gate?.category || '').toLowerCase();
  const missing = report?.missing_evidence?.length;
  if (gate.includes('caution') || gate.includes('validate') || missing) {
    return { label: 'Needs evidence', variant: 'amber' };
  }
  return null;
}

export function buildSummaryTags(report, phase2Report) {
  const tags = [];
  const archetype = report?.primary_archetype?.name;
  if (archetype) tags.push({ label: archetype, variant: 'purple' });

  const evidence = needsEvidenceTag(report);
  if (evidence) tags.push(evidence);

  const fit = phase2Report?.overall_contextual_fit_score ?? overallScoreValue(report);
  if (fit != null) {
    tags.push({ label: `Context fit: ${formatScorePercent(fit)}`, variant: 'teal' });
  }

  const conf = confidenceLabel(report?.scores?.overall_career_trajectory);
  tags.push({ label: `Confidence: ${conf}`, variant: 'gray' });

  return tags;
}

export function buildPhase1Metrics(report) {
  const scores = report?.scores || {};
  return [
    {
      key: 'overall',
      label: 'Overall',
      scoreData: scores.overall_career_trajectory,
      valueClass: '',
      barClass: 'orange',
      fallbackText:
        'Composite trajectory score from experience depth, scope, and leadership language.',
    },
    {
      key: 'leadership',
      label: 'Leadership',
      scoreData: scores.leadership_maturity,
      valueClass: '',
      barClass: 'orange',
      fallbackText: 'Inferred from résumé signals for leadership maturity and manager readiness.',
    },
    {
      key: 'progression',
      label: 'Progression',
      scoreData: scores.career_progression,
      valueClass: 'amber',
      barClass: 'amber',
      fallbackText:
        'Career progression is visible, but role transitions need evidence and timeline clarity.',
    },
    {
      key: 'retention',
      label: 'Retention risk',
      scoreData: scores.retention_risk,
      valueClass: 'teal',
      barClass: 'teal',
      highlightRisk: true,
      fallbackText: 'Risk is moderate based on tenure patterns and role transitions.',
    },
  ];
}

export function buildQuickInsightCards(report, phase2Report) {
  const overall = overallScoreValue(report);
  const leadership = report?.scores?.leadership_maturity?.score;
  const progression = report?.scores?.career_progression?.score;
  const retention = report?.scores?.retention_risk?.score;
  const managerFit = phase2Report?.manager_fit?.manager_fit_score;
  const nextStep = report?.decision_gate?.recommended_next_step;

  return [
    {
      key: 'next-action',
      icon: 'bolt',
      tone: 'purple',
      title: 'Next best action',
      text:
        nextStep ||
        (report?.missing_evidence?.length
          ? 'Ask for quantified impact during recruiter follow-up.'
          : 'Proceed with structured interview using trajectory probes.'),
    },
    {
      key: 'evidence-gap',
      icon: 'alert',
      tone: 'amber',
      title: 'Evidence gap',
      text: (() => {
        const items = report?.missing_evidence || [];
        if (!items.length) {
          return 'Business outcome metrics are missing from experience signals.';
        }
        const first = items[0];
        if (typeof first === 'string') return first;
        return (
          [first?.area, first?.note].filter(Boolean).join(' — ') ||
          'Business outcome metrics are missing from experience signals.'
        );
      })(),
    },
    {
      key: 'manager-fit',
      icon: 'user',
      tone: 'teal',
      title: 'Manager fit',
      text:
        managerFit != null
          ? `Moderate fit at ${formatScorePercent(managerFit)}; validate communication and ownership style.`
          : 'Run Phase 2 simulation to estimate manager alignment.',
    },
    {
      key: 'interview-focus',
      icon: 'chart',
      tone: 'blue',
      title: 'Interview focus',
      text: `Probe role scope, progression reasons, and retention risk${
        progression != null ? ` (progression ${formatScorePercent(progression)})` : ''
      }${retention != null ? ` with ${formatScorePercent(retention)} retention signal` : ''}.`,
    },
  ].map((card) => ({
    ...card,
    text: card.text || `Overall trajectory score is ${formatScorePercent(overall)}.`,
  }));
}

export function buildTimelineSignals(report, phase2Report, profile) {
  const leadership = report?.scores?.leadership_maturity?.score;
  const progression = report?.scores?.career_progression?.score;
  const retention = report?.scores?.retention_risk?.score;
  const managerFit = phase2Report?.manager_fit?.manager_fit_score;
  const retentionLevel = report?.scores?.retention_risk?.risk_level || 'Medium';
  const timeline = Array.isArray(report?.career_timeline) ? report.career_timeline : [];
  const early = timeline[0];
  const current = timeline[timeline.length - 1] || timeline[0];

  return [
    {
      key: 'early',
      icon: 'chart',
      range: 'Early career',
      title: early?.role_title || 'Operational execution foundation',
      body:
        early?.career_signal ||
        'Experience indicates hands-on execution and exposure to high-mobility work environments, but responsibilities require tighter structuring.',
      chips: ['Role scope signal', 'Execution language'],
    },
    {
      key: 'current',
      icon: 'user',
      range: 'Current signal',
      title: current?.role_title || 'Leadership maturity emerging',
      body:
        leadership != null
          ? `Leadership maturity scored ${formatScorePercent(leadership)}. The profile suggests coordination capability, but does not yet prove formal people management or ownership depth.`
          : report?.executive_summary ||
            'Current role signals suggest steady progression with scope to validate in interview.',
      chips: [
        leadership != null ? `Leadership: ${confidenceLabel(report?.scores?.leadership_maturity)}` : 'Leadership signal',
        managerFit != null ? `Manager fit: ${formatScorePercent(managerFit)}` : 'Manager fit pending',
      ],
    },
    {
      key: 'probe',
      icon: 'arrow',
      range: 'Interview probe',
      title: 'Progression requires validation',
      body:
        progression != null
          ? `Progression is not weak, but the résumé needs clearer before/after impact, role expansion evidence, and measurable outcomes to improve score quality (${formatScorePercent(progression)}).`
          : report?.decision_gate?.recommended_next_step ||
            'Validate tenure reasons, measurable outcomes, and role expansion evidence in structured screening.',
      chips: [
        progression != null ? `Progression: ${formatScorePercent(progression)}` : 'Progression review',
        `Retention risk: ${retentionLevel}`,
      ],
    },
  ];
}

export function buildMissingEvidenceAlert(report) {
  const items = report?.missing_evidence || [];
  if (!items.length) return null;

  const parts = items.map((item) => {
    if (typeof item === 'string') return item;
    return [item?.area, item?.note].filter(Boolean).join(' — ') || 'Additional evidence needed';
  });

  return {
    title: 'Missing evidence',
    text:
      parts.join(' ') ||
      'Quantified business impact is not yet available. Add measurable outcomes, team size, budget exposure, and project KPIs during follow-up.',
  };
}

export function buildPhase2SignalRows(phase2Report, phase1Report) {
  const managerFit = phase2Report?.manager_fit?.manager_fit_score ?? 0;
  const communication = phase2Report?.communication?.overall_communication_score ?? 0;
  const retentionRisk = phase1Report?.scores?.retention_risk?.score ?? 35;
  const retentionComfort = Math.min(100, Math.max(0, 100 - Number(retentionRisk)));

  return [
    { key: 'manager', label: 'Manager fit', value: managerFit, barClass: '' },
    { key: 'communication', label: 'Communication', value: communication, barClass: 'teal' },
    { key: 'retention', label: 'Retention comfort', value: retentionComfort, barClass: 'amber' },
  ];
}

export function buildPhase2FitChips(phase2Report) {
  if (!phase2Report) return [];
  const chips = [];
  const style = phase2Report.leadership_style?.primary_style?.name;
  if (style) chips.push({ label: `Leadership: ${style}`, variant: 'purple' });
  const comm = phase2Report.communication?.overall_communication_score;
  if (comm != null) chips.push({ label: `Communication: ${formatScorePercent(comm)}`, variant: 'blue' });
  const risk = phase2Report.manager_fit?.risk_level;
  if (risk) chips.push({ label: `Risk: ${risk}`, variant: 'amber' });
  return chips;
}

export function buildGuidanceSections(phase2Report) {
  if (!phase2Report) {
    return {
      insights: [],
      recommendations: [],
      actionItems: [],
      nextSteps: [],
    };
  }
  return {
    insights: phase2Report.insights || [],
    recommendations: phase2Report.recommendations || [],
    actionItems: phase2Report.action_items || [],
    nextSteps: phase2Report.recommended_next_steps || [],
  };
}

export function guidanceSectionMeta() {
  return [
    {
      key: 'insights',
      title: 'Insights',
      description: 'Key signals about trajectory, leadership, communication, and manager alignment.',
      icon: 'insights',
      accent: 'amber',
      defaultOpen: true,
    },
    {
      key: 'recommendations',
      title: 'Recommendations',
      description: 'Suggested moves for recruiters, interviewers, and hiring managers.',
      icon: 'recommendations',
      accent: 'purple',
    },
    {
      key: 'actionItems',
      title: 'Action items',
      description: 'Concrete tasks with owner and timeframe to advance this candidate.',
      icon: 'actions',
      accent: 'green',
    },
    {
      key: 'nextSteps',
      title: 'Summary next steps',
      description: 'Condensed checklist from insights and recommendations.',
      icon: 'next',
      accent: 'gray',
    },
  ];
}

export function ownerLabel(role) {
  const labels = {
    hiring_manager: 'Hiring manager',
    recruiter: 'Recruiter',
    interviewer: 'Interviewer',
    hiring_team: 'Hiring team',
    candidate: 'Candidate',
  };
  return labels[role] || role || 'Team';
}

export function formatTimeframe(tf) {
  if (!tf) return null;
  return String(tf).replace(/_/g, ' ');
}

export function categoryTopic(category) {
  const map = {
    career_trajectory: 'Career trajectory',
    leadership: 'Leadership',
    communication: 'Communication',
    manager_fit: 'Manager fit',
    contextual_fit: 'Contextual fit',
    retention: 'Retention',
  };
  return map[category] || category || 'Insight';
}

export function severityChipVariant(severity) {
  const s = String(severity || 'info').toLowerCase();
  if (s === 'high') return 'red';
  if (s === 'medium') return 'amber';
  if (s === 'low') return 'teal';
  return 'purple';
}

export async function downloadPhase2Export(reportId, format, phase2FitApi) {
  const res = await phase2FitApi.exportReport(reportId, format);
  const blob =
    format === 'pdf' || format === 'csv' || format === 'xlsx'
      ? res.data
      : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `phase2-fit-${reportId}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPhase1Export(reportId, format, careerTrajectoryApi) {
  const res = await careerTrajectoryApi.exportReport(reportId, format);
  const blob =
    format === 'pdf' || format === 'csv' || format === 'xlsx'
      ? res.data
      : new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `career-trajectory-${reportId}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function summaryExperienceLine(profile) {
  return formatExperienceMeta(profile?.total_experience_years);
}

export function buildEmptyStateCopy(profile) {
  const exp = summaryExperienceLine(profile);
  return {
    title: 'No career trajectory report yet',
    body: `Run AI analysis on this candidate's résumé to generate trajectory scores, manager fit simulation, and interview probes.${exp !== '—' ? ` Profile shows ${exp.replace(' experience', ' exp')}.` : ''}`,
  };
}
