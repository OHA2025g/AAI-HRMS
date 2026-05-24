import React, { useEffect, useMemo, useState } from 'react';
import { assessmentsApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

function diffSummary(current, previous) {
  if (!previous) return { questionDelta: null, titleChanged: false };
  const qDelta = (current.question_count ?? 0) - (previous.question_count ?? 0);
  return {
    questionDelta: qDelta,
    titleChanged: (current.title || '') !== (previous.title || ''),
    durationChanged: (current.duration_minutes ?? null) !== (previous.duration_minutes ?? null),
  };
}

function VersionRow({ snap, previous, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const diff = diffSummary(snap, previous);

  return (
    <Card className="border-slate-200">
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="flex items-start gap-2 text-left flex-1"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown className="w-4 h-4 mt-1 shrink-0" /> : <ChevronRight className="w-4 h-4 mt-1 shrink-0" />}
            <div>
              <CardTitle className="text-sm font-semibold">
                v{snap.version}
                <Badge variant="secondary" className="ml-2 capitalize">
                  {snap.action?.replace(/_/g, ' ') || 'update'}
                </Badge>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                {snap.saved_at ? new Date(snap.saved_at).toLocaleString() : '—'}
                {snap.question_count != null ? ` · ${snap.question_count} questions` : ''}
              </p>
              {diff.questionDelta != null && diff.questionDelta !== 0 ? (
                <p className="text-xs text-indigo-600 mt-1">
                  {diff.questionDelta > 0 ? `+${diff.questionDelta}` : diff.questionDelta} questions vs prior version
                </p>
              ) : null}
              {diff.titleChanged ? <p className="text-xs text-amber-700 mt-1">Title changed</p> : null}
              {diff.durationChanged ? <p className="text-xs text-amber-700 mt-1">Duration changed</p> : null}
            </div>
          </button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="pt-0 px-4 pb-4 space-y-2 max-h-64 overflow-auto">
          {(snap.questions || []).map((q, idx) => (
            <div key={q.id || idx} className="text-sm border-b border-slate-100 pb-2 last:border-0">
              <span className="font-medium">Q{idx + 1}.</span> {q.question_text}
              <span className="text-xs text-slate-500 ml-2">
                {q.question_type}
                {q.max_marks != null ? ` · ${q.max_marks}m` : ''}
              </span>
            </div>
          ))}
          {!snap.questions?.length ? (
            <p className="text-sm text-slate-500">No question snapshot stored for this version.</p>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function AssessmentVersionHistoryPanel({ assessmentId }) {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    if (!assessmentId) return;
    let cancelled = false;
    setLoading(true);
    setVersions([]);
    (async () => {
      try {
        const res = await assessmentsApi.listVersions(assessmentId);
        if (!cancelled) setVersions(res.data || []);
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Failed to load version history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  const ordered = useMemo(
    () => [...versions].sort((a, b) => (b.version || 0) - (a.version || 0)),
    [versions]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!ordered.length) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center" data-testid="assessment-version-history-empty">
        Version snapshots appear after publish or question updates.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="assessment-version-history">
      <p className="text-xs text-slate-500">
        Question snapshots captured on create, publish, and edits ({ordered.length} saved).
      </p>
      {ordered.map((snap, idx) => (
        <VersionRow
          key={`${snap.version}-${snap.saved_at}`}
          snap={snap}
          previous={ordered[idx + 1]}
          defaultOpen={idx === 0}
        />
      ))}
    </div>
  );
}
