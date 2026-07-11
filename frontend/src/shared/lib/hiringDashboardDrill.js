/** Drill-through helpers for Smart Hiring Dashboard → Jobs / Pipeline / Candidates */

const STAGE_TO_PIPELINE_TAB = {
  SOURCED: 'SOURCED',
  SCREENING: 'SCREENING',
  ASSESSMENT_SENT: 'ASSESSMENT',
  ASSESSMENT_CLEARED: 'ASSESSMENT',
  INTERVIEW_1: 'INTERVIEW',
  INTERVIEW_2: 'INTERVIEW',
  INTERVIEW_3: 'INTERVIEW',
  HR_ROUND: 'INTERVIEW',
  OFFER: 'SALARY',
  JOINED: 'SALARY',
};

export function pipelineTabForStage(stage) {
  return STAGE_TO_PIPELINE_TAB[stage] || 'SOURCED';
}

export function pipelinePathForStage(stage) {
  if (stage?.startsWith('OFFER_')) {
    const status = stage.replace(/^OFFER_/, '');
    return `/pipeline?stage=SALARY&offer_status=${encodeURIComponent(status)}`;
  }
  return `/pipeline?stage=${pipelineTabForStage(stage)}`;
}

export function candidatesPathForChannel(channel) {
  if (!channel) return '/candidates';
  return `/candidates?display_channel=${encodeURIComponent(channel)}`;
}

export function jobsOpenPath(extraParams = '') {
  if (!extraParams) return '/jobs?status=OPEN';
  const cleaned = extraParams.replace(/^\?/, '');
  return `/jobs?status=OPEN&${cleaned}`;
}

export function jobMatchesPath(jobId) {
  if (!jobId) return '/jobs';
  return `/jobs/${jobId}?tab=matches`;
}

export function applicationActivityPath(activity) {
  if (!activity) return '/pipeline';
  if (activity.stage) return pipelinePathForStage(activity.stage);
  if (activity.job_id) return `/jobs/${activity.job_id}`;
  return '/pipeline';
}

/** Fit histogram bucket → candidate list query params */
export const FIT_BUCKET_DRILL = {
  '<50': { fit_min: 0, fit_max: 49 },
  '50-70': { fit_min: 50, fit_max: 69 },
  '70-90': { fit_min: 70, fit_max: 89 },
  '90+': { fit_min: 90, fit_max: 100 },
};

export function candidatesPathForFitBucket(bucket) {
  const range = FIT_BUCKET_DRILL[bucket];
  if (!range) return '/candidates';
  const params = new URLSearchParams();
  params.set('fit_min', String(range.fit_min));
  params.set('fit_max', String(range.fit_max));
  return `/candidates?${params.toString()}`;
}

/** KPI headline tile drill targets */
export const KPI_DRILL_PATHS = {
  open_jobs: '/jobs?status=OPEN',
  active_pipeline: '/pipeline',
  new_applications: '/pipeline?stage=SOURCED',
  hires: '/pipeline?stage=SALARY',
  pending_offers: '/pipeline?stage=SALARY',
  avg_fit_score: '/candidates',
  good_fit_pct: '/candidates?fit_min=70',
  high_fit_pct: '/candidates?fit_min=90',
  ai_adoption: '/jobs?status=OPEN',
  interview_yield: '/pipeline?stage=INTERVIEW',
  assessment_pass: '/assessments?tab=overview',
};
