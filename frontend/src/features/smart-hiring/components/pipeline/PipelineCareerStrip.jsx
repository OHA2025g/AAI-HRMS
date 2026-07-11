import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { careerTrajectoryApi } from '@/shared/lib/api';

export default function PipelineCareerStrip({
  candidateId,
  jobId,
  summary,
  loading,
  onAnalyzed,
  className = 'pl-career',
}) {
  const [analyzing, setAnalyzing] = useState(false);

  if (!candidateId) return null;

  const analyzeUrl = jobId
    ? `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}&job_id=${jobId}`
    : `/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}`;

  const runQuickAnalyze = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAnalyzing(true);
    try {
      await careerTrajectoryApi.reanalyze(candidateId);
      toast.success('Career trajectory analyzed');
      onAnalyzed?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Analysis failed — add resume text on profile first');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <span>
          <Loader2 className="pl-inline-spin" aria-hidden />
          Loading trajectory…
        </span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={className}>
        <span>✦ No career trajectory yet</span>
        <span className="pl-career-actions">
          <button type="button" className="pl-btn pl-btn-sm" disabled={analyzing} onClick={runQuickAnalyze}>
            {analyzing ? '…' : 'Analyze'}
          </button>
          <Link to={analyzeUrl} className="pl-btn pl-btn-sm">
            Open
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className={`${className} pl-career-has-data`}>
      <span>
        ✦ Trajectory {Math.round(summary.overall_score ?? 0)}%
        {summary.primary_archetype ? ` · ${summary.primary_archetype}` : ''}
      </span>
      <span className="pl-career-actions">
        <button type="button" className="pl-btn pl-btn-sm" disabled={analyzing} onClick={runQuickAnalyze}>
          {analyzing ? '…' : 'Re-analyze'}
        </button>
        <Link to={analyzeUrl} className="pl-btn pl-btn-sm">
          Open
        </Link>
      </span>
    </div>
  );
}
