/** Pipeline stage advance rules (mirror backend assert_stage_transition). */

export const NEXT_PIPELINE_STEP = {
  SOURCED: { next: 'SCREENING', label: 'Selected for next round' },
  SCREENING: { next: 'ASSESSMENT_SENT', label: 'Send to assessment' },
  ASSESSMENT_SENT: { next: 'ASSESSMENT_CLEARED', label: 'Mark cleared' },
  ASSESSMENT_CLEARED: { next: 'INTERVIEW_1', label: 'Start interview' },
  INTERVIEW_1: { next: 'INTERVIEW_2', label: 'Next round' },
  INTERVIEW_2: { next: 'INTERVIEW_3', label: 'Next round' },
  INTERVIEW_3: { next: 'HR_ROUND', label: 'HR round' },
  HR_ROUND: { next: 'OFFER', label: 'Move to offer' },
  OFFER: { next: 'JOINED', label: 'Mark joined' },
};

export function canAdvanceApplicationStage(app, perms) {
  if (perms.pipelineReadOnly || !perms.canAdvancePipeline) return false;
  const step = NEXT_PIPELINE_STEP[app?.stage];
  if (!step) return false;
  if (step.next === 'OFFER' || step.next === 'JOINED') return perms.canMoveToOffer;
  return true;
}

export function canUpdateOfferStatus(perms) {
  return !perms.pipelineReadOnly && perms.canMoveToOffer;
}

export function canSendAssessmentInvite(perms) {
  return !perms.pipelineReadOnly && perms.canPublishAssessment;
}

export function canMoveToStage(perms, toStage) {
  if (perms.pipelineReadOnly || !perms.canAdvancePipeline) return false;
  if (toStage === 'OFFER' || toStage === 'JOINED') return perms.canMoveToOffer;
  return true;
}

/** TM: request HM approval instead of direct move to Offer. */
export function canRequestOfferStage(perms, toStage = 'OFFER') {
  if (toStage !== 'OFFER' && toStage !== 'JOINED') return false;
  return Boolean(perms.canRequestOfferApproval);
}
