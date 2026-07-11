import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { careerTrajectoryApi } from '@/shared/lib/api';
import {
  getRetryableJobId,
  pollAnalyzeJob,
  retryAndPollAnalyzeJob,
} from '@/shared/lib/careerTrajectoryPoll';
import { CareerTrajectoryJobErrorBanner } from './CareerTrajectoryJobErrorBanner';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { TrajectoryScoreCard } from './TrajectoryScoreCard';
import { MissingEvidencePanel } from './MissingEvidencePanel';
import { InterviewPrepPanel } from './InterviewPrepPanel';
import { Phase2FitPanel } from './Phase2FitPanel';

export function CandidateCareerTrajectoryTab({ candidateId, resumeText, candidateName }) {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [failedJob, setFailedJob] = useState(null);
  const [report, setReport] = useState(null);

  const load = () => {
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
  };

  useEffect(() => {
    if (candidateId) load();
  }, [candidateId]);

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
        toast.error(e.response?.data?.detail || e.message || 'Retry failed');
      }
    } finally {
      setRetrying(false);
      setAnalyzing(false);
    }
  };

  const runAnalyze = async () => {
    if (!resumeText || resumeText.length < 50) {
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
        toast.error(e.response?.data?.detail || e.message || 'Analysis failed');
      }
    } finally {
      setAnalyzing(false);
    }
  };

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
      <div className="flex justify-center py-12" data-testid="career-traj-tab-loading">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4">
        {errorBanner}
        <Card data-testid="career-traj-tab-empty">
          <CardContent className="py-10 text-center space-y-4">
            <Sparkles className="h-10 w-10 text-indigo-500 mx-auto" />
            <p className="text-slate-600">No career trajectory report yet for this candidate.</p>
            {analyzing ? (
              <p className="text-sm text-indigo-600" data-testid="career-traj-tab-bg-status">
                Running analysis in background…
              </p>
            ) : null}
            <div className="flex justify-center gap-2">
              <Button onClick={runAnalyze} disabled={analyzing || retrying} data-testid="career-traj-tab-analyze-btn">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Analyze career trajectory
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}`}>
                  Open analyzer
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="career-traj-tab-report">
      {errorBanner}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-slate-600">{report.executive_summary}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge>{report.primary_archetype?.name}</Badge>
            <Badge variant="outline">{report.decision_gate?.category}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runAnalyze}
            disabled={analyzing || retrying}
            data-testid="career-traj-tab-reanalyze-btn"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Re-analyze
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}`}>
              Full report
            </Link>
          </Button>
        </div>
      </div>
      {analyzing ? (
        <p className="text-sm text-indigo-600" data-testid="career-traj-tab-bg-status">
          Running analysis in background…
        </p>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TrajectoryScoreCard label="Overall" scoreData={report.scores?.overall_career_trajectory} />
        <TrajectoryScoreCard label="Leadership" scoreData={report.scores?.leadership_maturity} />
        <TrajectoryScoreCard label="Progression" scoreData={report.scores?.career_progression} />
        <TrajectoryScoreCard label="Retention risk" scoreData={report.scores?.retention_risk} highlightRisk />
      </div>
      <MissingEvidencePanel items={report.missing_evidence} />
      <Phase2FitPanel
        candidateId={candidateId}
        trajectoryReportId={report.id}
        jobId={report.job_id}
        phase1Ready
        lockToCandidate
        candidateDisplayName={candidateName}
      />
      <InterviewPrepPanel candidateId={candidateId} />
    </div>
  );
}
