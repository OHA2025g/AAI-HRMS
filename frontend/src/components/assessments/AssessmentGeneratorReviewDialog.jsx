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
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AssessmentGeneratorReviewDialog({
  open,
  draft,
  publishOnSave,
  onOpenChange,
  onPublished,
}) {
  const [questions, setQuestions] = useState([]);
  const [passThreshold, setPassThreshold] = useState(70);
  const [saving, setSaving] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [suggestingThreshold, setSuggestingThreshold] = useState(false);
  const [thresholdHint, setThresholdHint] = useState('');

  useEffect(() => {
    if (draft) {
      setQuestions(JSON.parse(JSON.stringify(draft.questions || [])));
      setPassThreshold(draft.rubric?.pass_threshold ?? 70);
      setThresholdHint('');
    }
  }, [draft]);

  const handleSuggestThreshold = async () => {
    if (!draft?.id) return;
    setSuggestingThreshold(true);
    try {
      const res = await assessmentsApi.suggestPassThreshold(draft.id);
      const data = res.data || {};
      if (data.suggested_pass_threshold_pct != null) {
        setPassThreshold(data.suggested_pass_threshold_pct);
      }
      setThresholdHint(data.rationale || '');
      toast.success('Pass threshold suggestion applied');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not suggest pass threshold');
    } finally {
      setSuggestingThreshold(false);
    }
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const handleRegenerate = async (questionId, idx) => {
    if (!draft?.id || !questionId) return;
    setRegeneratingId(questionId);
    try {
      const res = await assessmentsApi.regenerateQuestion(draft.id, questionId);
      const updated = (res.data?.questions || []).find((q) => q.id === questionId);
      if (updated) {
        setQuestions((prev) => prev.map((q, i) => (i === idx ? updated : q)));
        toast.success('Question regenerated');
      } else {
        setQuestions(res.data?.questions || []);
        toast.success('Question regenerated');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to regenerate question');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handlePublish = async () => {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await assessmentsApi.update(draft.id, {
        questions,
        rubric: { ...(draft.rubric || {}), pass_threshold: Number(passThreshold) || 70 },
      });
      if (publishOnSave && draft.status !== 'ACTIVE') {
        await assessmentsApi.publish(draft.id);
      }
      toast.success(publishOnSave ? 'Assessment published' : 'Assessment saved');
      onOpenChange(false);
      onPublished?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Review generated assessment</DialogTitle>
          <DialogDescription>
            Edit questions and pass threshold before {publishOnSave ? 'publishing' : 'saving'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="shrink-0">Pass threshold %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={passThreshold}
              onChange={(e) => setPassThreshold(e.target.value)}
              className="w-24"
              data-testid="assessment-pass-threshold-input"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={suggestingThreshold || !draft?.id}
              onClick={handleSuggestThreshold}
              data-testid="suggest-pass-threshold-btn"
            >
              {suggestingThreshold ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Suggest threshold'}
            </Button>
          </div>
          {thresholdHint ? (
            <p className="text-xs text-slate-600" data-testid="pass-threshold-suggestion-hint">
              {thresholdHint}
            </p>
          ) : null}

          {questions.map((q, idx) => (
            <div key={q.id || idx} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between gap-2 items-center">
                <Label>Question {idx + 1}</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{q.question_type}</Badge>
                  {q.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={regeneratingId === q.id}
                      onClick={() => handleRegenerate(q.id, idx)}
                      data-testid={`regenerate-question-${q.id}`}
                    >
                      {regeneratingId === q.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
              <Textarea
                value={q.question_text || ''}
                onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                rows={2}
              />
              {q.question_type === 'MCQ' && Array.isArray(q.options) ? (
                <Textarea
                  value={q.options.join('\n')}
                  onChange={(e) =>
                    updateQuestion(
                      idx,
                      'options',
                      e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="One option per line"
                  rows={4}
                />
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Max marks</Label>
                  <Input
                    type="number"
                    value={q.max_marks ?? 10}
                    onChange={(e) => updateQuestion(idx, 'max_marks', parseInt(e.target.value, 10) || 10)}
                  />
                </div>
                {q.question_type === 'MCQ' ? (
                  <div>
                    <Label className="text-xs">Answer key</Label>
                    <Input
                      value={q.answer_key || ''}
                      onChange={(e) => updateQuestion(idx, 'answer_key', e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="bg-indigo-600" onClick={handlePublish} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : publishOnSave ? 'Publish' : 'Save draft'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
