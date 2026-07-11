import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { careerTrajectoryApi } from '@/shared/lib/api';
import {
  getRetryableJobId,
  pollAnalyzeJob,
  retryAndPollAnalyzeJob,
} from '@/shared/lib/careerTrajectoryPoll';
import { CareerTrajectoryJobErrorBanner } from '../career-trajectory/CareerTrajectoryJobErrorBanner';
import {
  buildEmptyStateCopy,
  buildMissingEvidenceAlert,
  fullReportUrl,
} from '@/shared/lib/candidateDetailTrajectoryUtils';
import TrajectorySummaryCard from './trajectory/TrajectorySummaryCard';
import TrajectoryQuickInsights from './trajectory/TrajectoryQuickInsights';
import Phase1MetricsGrid from './trajectory/Phase1MetricsGrid';
import TrajectoryTimelinePanel from './trajectory/TrajectoryTimelinePanel';
import Phase2ManagerFitPanel from './trajectory/Phase2ManagerFitPanel';
import TrajectoryGuidanceAccordion from './trajectory/TrajectoryGuidanceAccordion';
import TrajectoryExportRow from './trajectory/TrajectoryExportRow';
import TrajectoryInterviewPrepFooter from './trajectory/TrajectoryInterviewPrepFooter';

export default function CandidateDetailTrajectoryTab({
  candidateId,
  profile,
  resumeText,
  candidateName,
  onHeroStateChange,
}) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [failedJob, setFailedJob] = useState(null);
  const [report, setReport] = useState(null);
  const [phase2Report, setPhase2Report] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    careerTrajectoryApi
      .getByCandidate(candidateId)
      .then((res) => {
        setReport(res.data);
      })
      .catch(() => {
        setReport(null);
      })
      .finally(() => setLoading(false));
  }, [candidateId]);

  useEffect(() => {
    if (candidateId) load();
  }, [candidateId, load]);

  const runAnalyze = useCallback(async () => {
    const text = resumeText || profile?.resume_text || '';
    if (!text || text.length < 50) {
      toast.error('Upload or add resume text on the candidate profile first.');
      return;
    }
    setAnalyzing(true);
    setFailedJob(null);
    try {
      const res = await careerTrajectoryApi.reanalyze(candidateId, { background: true });
      let reportData;
      if (res.status === 202 && res.data?.id) {
        toast.info('Analysis running in background…');
        reportData = await pollAnalyzeJob(res.data.id);
      } else {
        reportData = res.data;
      }
      setReport(reportData);
      toast.success('Career trajectory analyzed');
    } catch (e) {
      const retryId = getRetryableJobId(e);
      if (retryId) {
        setFailedJob({ id: retryId, message: e.message || 'Analysis failed' });
      } else {
        toast.error(e?.response?.data?.detail || e.message || 'Analysis failed');
      }
    } finally {
      setAnalyzing(false);
    }
  }, [candidateId, profile?.resume_text, resumeText]);

  const handleRetryFailedJob = async () => {
    if (!failedJob?.id) return;
    setRetrying(true);
    setAnalyzing(true);
    setFailedJob(null);
    try {
      toast.info('Retrying analysis…');
      const reportData = await retryAndPollAnalyzeJob(failedJob.id);
      setReport(reportData);
      toast.success('Career trajectory analyzed');
    } catch (e) {
      const retryId = getRetryableJobId(e);
      if (retryId) {
        setFailedJob({ id: retryId, message: e.message || 'Analysis failed' });
      } else {
        toast.error(e?.response?.data?.detail || e.message || 'Retry failed');
      }
    } finally {
      setRetrying(false);
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    onHeroStateChange?.({
      hasReport: Boolean(report),
      analyzing: analyzing || retrying,
      onReanalyze: runAnalyze,
    });
    return () => onHeroStateChange?.(null);
  }, [report, analyzing, retrying, runAnalyze, onHeroStateChange]);

  const errorBanner = failedJob ? (
    <CareerTrajectoryJobErrorBanner
      message={failedJob.message}
      onRetry={handleRetryFailedJob}
      onDismiss={() => setFailedJob(null)}
      retrying={retrying}
    />
  ) : null;

  if (loading) {
    return (
      <div className="cdt-tab" data-testid="career-traj-tab-loading">
        <div className="cdt-loading">
          <span className="cdt-btn-spinner" aria-hidden />
          Loading career trajectory…
        </div>
      </div>
    );
  }

  if (!report) {
    const empty = buildEmptyStateCopy(profile);
    return (
      <div className="cdt-tab" data-testid="career-traj-tab-empty">
        {errorBanner}
        <div className="cdt-empty-state">
          <div className="cdt-empty-icon">✦</div>
          <h3>{empty.title}</h3>
          <p>{empty.body}</p>
          {analyzing ? (
            <p className="cdt-muted-note" data-testid="career-traj-tab-bg-status">
              Running analysis in background…
            </p>
          ) : null}
          <div className="cdt-empty-actions">
            <button
              type="button"
              className="cdt-btn cdt-btn-primary"
              onClick={runAnalyze}
              disabled={analyzing || retrying}
              data-testid="career-traj-tab-analyze-btn"
            >
              {analyzing ? <span className="cdt-btn-spinner" aria-hidden /> : null}
              Analyze career trajectory
            </button>
            <Link to={fullReportUrl(candidateId)} className="cdt-btn cdt-btn-ghost">
              Open analyzer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const missingEvidence = buildMissingEvidenceAlert(report);

  return (
    <div className="cdt-tab" data-testid="career-traj-tab-report">
      {errorBanner}

      {analyzing ? (
        <p className="cdt-bg-status" data-testid="career-traj-tab-bg-status">
          Running analysis in background…
        </p>
      ) : null}

      <div className="cdt-summary-strip">
        <TrajectorySummaryCard report={report} phase2Report={phase2Report} />
        <TrajectoryQuickInsights report={report} phase2Report={phase2Report} />
      </div>

      <div className="cdt-section-head">
        <div>
          <h3>Phase 1 — Career signal scoring</h3>
          <p>
            AI interpretation of résumé trajectory, leadership maturity, progression, and retention
            risk, with confidence markers to guide recruiter judgement.
          </p>
        </div>
        <div className="cdt-toolbar">
          <button
            type="button"
            className="cdt-btn cdt-btn-ghost"
            onClick={runAnalyze}
            disabled={analyzing || retrying}
            data-testid="career-traj-tab-reanalyze-btn"
          >
            {analyzing ? <span className="cdt-btn-spinner" aria-hidden /> : null}
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            Re-analyze
          </button>
          <Link to={fullReportUrl(candidateId)} className="cdt-btn cdt-btn-ghost">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8M16 17H8M10 9H8" />
            </svg>
            Full report
          </Link>
        </div>
      </div>

      <Phase1MetricsGrid report={report} />

      {missingEvidence ? (
        <div className="cdt-alert-card" data-testid="trajectory-missing-evidence">
          <div className="cdt-alert-icon">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </div>
          <div>
            <strong>{missingEvidence.title}</strong>
            <span>{missingEvidence.text}</span>
          </div>
        </div>
      ) : null}

      <div className="cdt-trajectory-layout">
        <TrajectoryTimelinePanel report={report} phase2Report={phase2Report} profile={profile} />
        <Phase2ManagerFitPanel
          candidateId={candidateId}
          candidateName={candidateName}
          trajectoryReport={report}
          onPhase2Change={setPhase2Report}
        />
      </div>

      <TrajectoryGuidanceAccordion phase2Report={phase2Report} />
      <TrajectoryExportRow phase1Report={report} phase2Report={phase2Report} />
      <TrajectoryInterviewPrepFooter candidateId={candidateId} report={report} />
    </div>
  );
}
