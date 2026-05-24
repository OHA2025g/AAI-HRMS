/** Pick the primary ACTIVE assessment for a job, or the first active one. */
export function pickPrimaryAssessment(assessments = []) {
  const active = (assessments || []).filter((a) => a.status === 'ACTIVE');
  if (!active.length) return null;
  return active.find((a) => a.is_primary) || active[0];
}

/** Whether pipeline can mark cleared without an override reason. */
export function canClearAssessmentWithoutOverride(submission) {
  return submission?.passed === true;
}
