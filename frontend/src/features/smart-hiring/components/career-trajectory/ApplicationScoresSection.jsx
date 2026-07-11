import React from 'react';
import { FitScoreCard } from '../FitScore';
import { CareerTrajectorySummary } from './CareerTrajectorySummary';

/** Fit score + career trajectory on recruitment cards. */
export function ApplicationScoresSection({
  app,
  jobId,
  trajSummaries,
  trajLoading,
  onTrajRefresh,
  showFitScore = true,
}) {
  const candidateId = app?.candidate_id;
  const fitScore = app?.fit_score;

  return (
    <>
      {showFitScore ? (
        <div className="mt-4">
          {fitScore ? (
            <FitScoreCard fitScore={fitScore} showDetails />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-center text-sm text-slate-600">
              Fit score is not available for this application yet.
            </div>
          )}
        </div>
      ) : null}
      <CareerTrajectorySummary
        candidateId={candidateId}
        jobId={jobId}
        summary={trajSummaries?.[candidateId]}
        loading={trajLoading}
        onAnalyzed={onTrajRefresh}
      />
    </>
  );
}
