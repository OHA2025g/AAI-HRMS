/** Six overview funnel buckets matching the pixel-perfect mock. */
export const OVERVIEW_FUNNEL_GROUPS = [
  { key: 'applications', label: 'Applications', stages: ['SOURCED', 'APPLICATIONS'] },
  { key: 'screened', label: 'Screened', stages: ['SCREENING', 'SCREENED'] },
  {
    key: 'assessment',
    label: 'Assessment',
    stages: ['ASSESSMENT_SENT', 'ASSESSMENT_CLEARED', 'ASSESSMENT'],
  },
  {
    key: 'interview',
    label: 'Interview',
    stages: ['INTERVIEW_1', 'INTERVIEW_2', 'INTERVIEW_3', 'HR_ROUND', 'INTERVIEW'],
  },
  { key: 'offer', label: 'Offer', stages: ['OFFER'] },
  { key: 'joined', label: 'Joined', stages: ['JOINED'] },
];

const OVERVIEW_LABELS = new Set(OVERVIEW_FUNNEL_GROUPS.map((group) => group.label));

/**
 * Collapse pipeline funnel stages into the six overview rows shown in the mock.
 * If the API already returns aggregated rows, preserve those counts.
 */
export function aggregateOverviewFunnel(funnel = []) {
  if (!funnel.length) return [];

  const byStage = Object.fromEntries(funnel.map((row) => [row.stage, row]));
  const alreadyAggregated =
    funnel.length <= 6 && funnel.every((row) => OVERVIEW_LABELS.has(row.label));

  if (alreadyAggregated) {
    return OVERVIEW_FUNNEL_GROUPS.map((group) => {
      const match = funnel.find((row) => row.label === group.label);
      return {
        key: group.key,
        label: group.label,
        stage: match?.stage || group.stages[0],
        count: match?.count ?? 0,
      };
    });
  }

  return OVERVIEW_FUNNEL_GROUPS.map((group) => ({
    key: group.key,
    label: group.label,
    stage: group.stages[0],
    count: group.stages.reduce((sum, stage) => sum + (byStage[stage]?.count || 0), 0),
  }));
}
