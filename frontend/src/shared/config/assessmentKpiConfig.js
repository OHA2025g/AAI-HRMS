/** Assessment Command Center KPI definitions and metric glossary. */

export const ASSESSMENT_KPI_META = {
  total_assessments: {
    label: 'Total assessments',
    definition: 'Count of assessment definitions in scope (all statuses except archived, per org filter).',
    formula: 'COUNT(assessments)',
  },
  assessments_on_open_jobs: {
    label: 'On open jobs',
    definition: 'Assessments linked to jobs that are currently OPEN.',
    formula: 'COUNT(assessments WHERE job.status = OPEN)',
  },
  active_submissions: {
    label: 'Active submissions',
    definition: 'Candidates with an invite in flight — invited, in progress, or awaiting grading.',
    formula: 'COUNT(submissions WHERE status IN (INVITED, IN_PROGRESS, SUBMITTED))',
  },
  candidates_in_assessment_sent: {
    label: 'In assessment (pipeline)',
    definition: 'Applications currently in ASSESSMENT_SENT stage.',
    formula: 'COUNT(applications WHERE stage = ASSESSMENT_SENT)',
  },
  candidates_assessment_cleared: {
    label: 'Cleared',
    definition: 'Applications in ASSESSMENT_CLEARED — passed or manually cleared.',
    formula: 'COUNT(applications WHERE stage = ASSESSMENT_CLEARED)',
  },
  clearance_rate_pct: {
    label: 'Clearance rate',
    definition: 'Share of sent candidates who reached cleared stage.',
    formula: 'cleared ÷ sent × 100',
  },
  completion_rate_pct: {
    label: 'Completion rate',
    definition: 'Share of invited submissions that were scored in the selected window.',
    formula: 'scored ÷ invited × 100',
  },
  pass_rate_pct: {
    label: 'Pass rate',
    definition: 'Share of scored submissions that met the pass threshold.',
    formula: 'passed ÷ scored × 100',
  },
  median_time_to_complete_minutes: {
    label: 'Median time',
    definition: 'Median minutes from start to completion for scored submissions in the window.',
    formula: 'MEDIAN(completed_at − started_at)',
  },
  jobs_missing_assessment: {
    label: 'Jobs missing test',
    definition: 'Open jobs with candidates in assessment stages but no assessment created.',
    formula: 'COUNT(open jobs WHERE (sent > 0 OR cleared > 0) AND assessment_count = 0)',
  },
  avg_questions_per_assessment: {
    label: 'Avg questions',
    definition: 'Mean question count across assessments in the library.',
    formula: 'AVG(LEN(questions))',
  },
  avg_duration_minutes: {
    label: 'Avg duration',
    definition: 'Mean configured duration (minutes) across assessments.',
    formula: 'AVG(duration_minutes)',
  },
  pass_threshold_pct: {
    label: 'Avg pass threshold',
    definition: 'Mean rubric pass threshold across assessments.',
    formula: 'AVG(rubric.pass_threshold)',
  },
};

export const ASSESSMENT_FEATURE_FLAG_LABELS = {
  command_center: 'Assessment Command Center UI',
  public_take: 'Public candidate take links',
  ai_grading: 'AI grade suggestions',
  auto_clear_pipeline: 'Auto-clear pipeline on pass',
  reminder_emails: 'Reminder email dispatch',
  outcome_analytics: 'Interview/hire outcome panel',
  coverage_heatmap: 'Job × type coverage heatmap',
};
