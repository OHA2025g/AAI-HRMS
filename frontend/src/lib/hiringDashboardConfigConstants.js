export const DEFAULT_RULE_FLAGS = {
  low_fit: true,
  stuck_stage: true,
  stale_req: true,
  trend_target: true,
  no_pipeline: true,
  no_ai_matches: true,
  high_fit_recent: true,
};

export const DEFAULT_STAGE_SLA = {
  SCREENING: 14,
  ASSESSMENT_SENT: 10,
  ASSESSMENT_CLEARED: 14,
  INTERVIEW_1: 21,
  INTERVIEW_2: 14,
  INTERVIEW_3: 14,
  HR_ROUND: 14,
  OFFER: 7,
};

export const RULE_MATRIX = [
  {
    id: 'low-fit',
    flagKey: 'low_fit',
    title: 'Low-fit alert',
    description: 'Flags candidates below the configured fit threshold for recruiter review.',
  },
  {
    id: 'stuck-stage',
    flagKey: 'stuck_stage',
    title: 'Stuck-stage alert',
    description: 'Highlights candidates crossing stage SLA days and pushes action items.',
  },
  {
    id: 'stale-req',
    flagKey: 'stale_req',
    title: 'Stale requisition',
    description: 'Detects open roles without interview movement for configured days.',
  },
  {
    id: 'trend-target',
    flagKey: 'trend_target',
    title: 'Trend target line',
    description: 'Shows monthly hire target on analytics and leadership dashboard charts.',
  },
  {
    id: 'no-pipeline',
    flagKey: 'no_pipeline',
    title: 'Empty pipeline alert',
    description: 'Surfaces open jobs with no applications yet.',
  },
  {
    id: 'no-ai-matches',
    flagKey: 'no_ai_matches',
    title: 'Missing AI matches',
    description: 'Flags open jobs without fit scores — prompts Find Matches runs.',
  },
  {
    id: 'high-fit-recent',
    flagKey: 'high_fit_recent',
    title: 'New high-fit candidates',
    description: 'Highlights recent candidates at or above 90% fit.',
  },
];
