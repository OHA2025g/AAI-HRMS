import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { careerTrajectoryApi } from '@/shared/lib/api';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';

/**
 * Compact career trajectory strip for pipeline / candidate / job application cards.
 */
export function CareerTrajectorySummary({ candidateId, jobId, summary, loading, onAnalyzed }) {
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
      <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading trajectory…
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-600 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          No career trajectory yet
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={analyzing}
            onClick={runQuickAnalyze}
          >
            {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Analyze'}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" asChild>
            <Link to={analyzeUrl}>Open</Link>
          </Button>
        </div>
      </div>
    );
  }

  const retention = summary.retention_risk ?? 0;
  const retentionTone =
    retention >= 60 ? 'text-rose-600' : retention >= 35 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div
      className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/30 px-3 py-2 space-y-1.5"
      data-testid={`career-traj-summary-${candidateId}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
          Trajectory {Math.round(summary.overall_score ?? 0)}%
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-indigo-700" asChild>
          <Link to={analyzeUrl}>Full report</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {summary.primary_archetype ? (
          <Badge variant="secondary" className="text-[10px] font-normal">
            {summary.primary_archetype}
          </Badge>
        ) : null}
        <Badge variant="outline" className="text-[10px] font-normal max-w-full truncate">
          {(summary.decision_gate || '').split(':')[0] || 'Review'}
        </Badge>
        <span className={`text-[10px] ${retentionTone}`}>
          Retention risk {Math.round(retention)}%
        </span>
      </div>
    </div>
  );
}
