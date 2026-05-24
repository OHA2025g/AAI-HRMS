import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { assessmentsApi } from '../lib/api';
import { canClearAssessmentWithoutOverride } from '../lib/assessmentUtils';
import AssessmentClearOverrideDialog from '../components/assessments/AssessmentClearOverrideDialog';

/** Returns true when advancing to ASSESSMENT_CLEARED from ASSESSMENT_SENT. */
export function isAssessmentClearanceTransition(fromStage, toStage) {
  return fromStage === 'ASSESSMENT_SENT' && toStage === 'ASSESSMENT_CLEARED';
}

export function useAssessmentClearance() {
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const findSubmissionForApp = useCallback(async (app) => {
    if (!app?.id) return null;
    try {
      const params = app.job_id ? { job_id: app.job_id, limit: 200 } : { limit: 200 };
      const res = await assessmentsApi.listSubmissions(params);
      return (res.data || []).find((s) => s.application_id === app.id) || null;
    } catch {
      return null;
    }
  }, []);

  /** Run stage update; prompts for override when marking cleared without a pass. */
  const runWithClearanceCheck = useCallback(
    async (app, fromStage, toStage, updateFn) => {
      if (!isAssessmentClearanceTransition(fromStage, toStage)) {
        await updateFn();
        return;
      }
      const submission = await findSubmissionForApp(app);
      if (canClearAssessmentWithoutOverride(submission)) {
        await updateFn();
        return;
      }
      setReason('');
      setPending({ app, submission, updateFn });
    },
    [findSubmissionForApp]
  );

  const confirmClearance = async () => {
    if (!pending) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error('Provide an override reason — candidate has not passed the assessment');
      return;
    }
    setBusy(true);
    try {
      const { submission, updateFn } = pending;
      if (submission?.id && submission.status === 'SCORED') {
        try {
          await assessmentsApi.gradeSubmission(submission.id, {
            override_reason: trimmed,
            auto_clear_pipeline: false,
          });
        } catch {
          /* stage history still records override */
        }
      }
      await updateFn(trimmed);
      setPending(null);
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  const clearanceDialog = (
    <AssessmentClearOverrideDialog
      open={!!pending}
      reason={reason}
      onReasonChange={setReason}
      onCancel={() => setPending(null)}
      onConfirm={confirmClearance}
      busy={busy}
    />
  );

  return { runWithClearanceCheck, clearanceDialog };
}
