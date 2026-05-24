import React, { useEffect, useState } from 'react';
import { assessmentsApi } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AssessmentGradeDialog({ open, submission, onOpenChange, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [notes, setNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [passedOverride, setPassedOverride] = useState(null);

  useEffect(() => {
    if (!open || !submission) return;
    let cancelled = false;
    setNotes(submission.notes || '');
    setOverrideReason(submission.override_reason || '');
    setPassedOverride(submission.passed ?? null);
    setAnswers(submission.answers || []);

    (async () => {
      setLoading(true);
      try {
        const res = await assessmentsApi.get(submission.assessment_id);
        if (cancelled) return;
        setAssessment(res.data);
        const qmap = Object.fromEntries((res.data?.questions || []).map((q) => [q.id, q]));
        const merged = (submission.answers || []).length
          ? submission.answers.map((a) => ({ ...a, question: qmap[a.question_id] }))
          : (res.data?.questions || []).map((q) => ({
              question_id: q.id,
              response: '',
              marks_awarded: '',
              max_marks: q.max_marks || 10,
              question: q,
            }));
        setAnswers(merged);
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Failed to load assessment');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, submission]);

  const totalMarks = assessment?.total_marks || 0;
  const threshold = assessment?.rubric?.pass_threshold ?? 70;
  const computedRaw = answers.reduce((sum, a) => sum + (parseFloat(a.marks_awarded) || 0), 0);
  const computedPct = totalMarks ? Math.round((100 * computedRaw) / totalMarks) : 0;
  const autoPass = computedPct >= threshold;

  const updateMark = (questionId, value) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.question_id === questionId ? { ...a, marks_awarded: value === '' ? '' : Number(value) } : a
      )
    );
  };

  const handleAiSuggest = async () => {
    if (!submission) return;
    setSuggesting(true);
    try {
      const res = await assessmentsApi.aiSuggestGrades(submission.id);
      const suggestions = res.data || [];
      if (!suggestions.length) {
        toast.message('No manual questions to suggest grades for');
        return;
      }
      setAnswers((prev) =>
        prev.map((a) => {
          const hit = suggestions.find((s) => s.question_id === a.question_id);
          if (!hit || hit.marks_awarded == null) return a;
          return { ...a, marks_awarded: hit.marks_awarded, ai_rationale: hit.rationale };
        })
      );
      toast.success('AI suggestions applied — review before saving');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'AI grading unavailable');
    } finally {
      setSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!submission) return;
    try {
      const payload = {
        answers: answers.map((a) => ({
          question_id: a.question_id,
          response: a.response || '',
          marks_awarded: parseFloat(a.marks_awarded) || 0,
          auto_scored: false,
          max_marks: a.max_marks || a.question?.max_marks || 10,
        })),
        notes: notes.trim() || undefined,
        passed: passedOverride ?? undefined,
        override_reason:
          passedOverride != null && passedOverride !== autoPass ? overrideReason.trim() || undefined : undefined,
      };
      await assessmentsApi.gradeSubmission(submission.id, payload);
      toast.success('Score saved');
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save score');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade assessment</DialogTitle>
          <DialogDescription>
            {submission?.candidate_name} — {submission?.assessment_title}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  Total: {computedRaw}/{totalMarks}
                </Badge>
                <Badge variant="secondary">{computedPct}%</Badge>
                <Badge className={autoPass ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                  {autoPass ? 'Auto pass' : 'Below threshold'} ({threshold}%)
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAiSuggest}
                disabled={suggesting}
                data-testid="ai-suggest-grades-btn"
              >
                {suggesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" /> AI suggest marks
                  </>
                )}
              </Button>
            </div>

            {(answers || []).map((a, idx) => (
              <div key={a.question_id} className="border rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  Q{idx + 1}. {a.question?.question_text || a.question_id}
                </p>
                <p className="text-xs text-slate-500">
                  {a.question?.question_type || '—'} · max {a.max_marks || a.question?.max_marks || 10} marks
                </p>
                {a.response ? (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded p-2">{a.response}</p>
                ) : null}
                {a.ai_rationale ? (
                  <p className="text-xs text-indigo-600 bg-indigo-50 rounded p-2">AI: {a.ai_rationale}</p>
                ) : null}
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Marks</Label>
                  <Input
                    type="number"
                    min={0}
                    max={a.max_marks || a.question?.max_marks || 10}
                    value={a.marks_awarded ?? ''}
                    onChange={(e) => updateMark(a.question_id, e.target.value)}
                    className="h-8 w-24"
                  />
                </div>
              </div>
            ))}

            <div className="space-y-2">
              <Label>Reviewer notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Pass / fail override</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={passedOverride === true ? 'default' : 'outline'}
                  onClick={() => setPassedOverride(true)}
                >
                  Pass
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={passedOverride === false ? 'default' : 'outline'}
                  onClick={() => setPassedOverride(false)}
                >
                  Fail
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPassedOverride(null)}>
                  Use score
                </Button>
              </div>
            </div>

            {passedOverride != null && passedOverride !== autoPass ? (
              <div className="space-y-2">
                <Label>Override reason *</Label>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Why override the automatic pass/fail?"
                  rows={2}
                />
              </div>
            ) : null}

            <Button
              className="w-full bg-indigo-600"
              onClick={handleSave}
              disabled={
                passedOverride != null && passedOverride !== autoPass && !overrideReason.trim()
              }
            >
              Save & score
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
