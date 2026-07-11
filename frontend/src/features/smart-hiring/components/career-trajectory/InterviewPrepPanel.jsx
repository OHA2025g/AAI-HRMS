import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import { careerTrajectoryApi } from '@/shared/lib/api';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

/** AI-generated interview probes from career trajectory analysis. */
export function InterviewPrepPanel({ candidateId }) {
  const [prep, setPrep] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!candidateId) {
      setPrep(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    careerTrajectoryApi
      .getInterviewPrep(candidateId)
      .then((res) => {
        if (!cancelled) setPrep(res.data);
      })
      .catch(() => {
        if (!cancelled) setPrep(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  if (!candidateId) return null;

  if (loading) {
    return (
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        Loading career trajectory interview prep…
      </div>
    );
  }

  if (!prep) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        No career trajectory report — run analysis on the{' '}
        <Link
          to={`/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}`}
          className="text-indigo-600 hover:underline"
        >
          Career Trajectory
        </Link>{' '}
        page first.
      </div>
    );
  }

  const probes = prep.recommended_interview_probes || [];

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4 space-y-3" data-testid="interview-prep-panel">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Career trajectory interview prep
        </p>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link to={`/ai-hiring/candidate-fit/career-trajectory?candidate_id=${candidateId}`}>
            Full report
          </Link>
        </Button>
      </div>
      <p className="text-xs text-slate-600 line-clamp-2">{prep.executive_summary}</p>
      <div className="flex flex-wrap gap-1">
        {prep.primary_archetype?.name ? (
          <Badge variant="secondary" className="text-[10px]">
            {prep.primary_archetype.name}
          </Badge>
        ) : null}
        {prep.decision_gate?.category ? (
          <Badge variant="outline" className="text-[10px] max-w-[200px] truncate">
            {(prep.decision_gate.category || '').split(':')[0]}
          </Badge>
        ) : null}
      </div>
      {probes.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {probes.map((p, i) => (
            <li key={i} className="border-l-2 border-indigo-300 pl-2">
              <span className="font-medium text-slate-700">{p.area}: </span>
              {p.question}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">No probes generated.</p>
      )}
    </div>
  );
}
