import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { assessmentsApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Badge } from '@/shared/ui/badge';
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

function draftKey(token) {
  return `assessment_draft_${token}`;
}

function isLongFormType(qtype) {
  const t = (qtype || '').toUpperCase();
  return t === 'SHORT_ANSWER' || t === 'CODING' || t === 'ESSAY' || t === 'FREE_RESPONSE';
}

export default function AssessmentTakePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState(null);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [draftStatus, setDraftStatus] = useState('idle');
  const skipDraftSave = useRef(true);
  const draftTimer = useRef(null);

  const mergeDraftAnswers = useCallback((questions, serverAnswers, localAnswers) => {
    const init = {};
    (questions || []).forEach((q) => {
      init[q.id] = '';
    });
    (serverAnswers || []).forEach((a) => {
      if (a?.question_id) init[a.question_id] = a.response ?? '';
    });
    Object.assign(init, localAnswers || {});
    return init;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await assessmentsApi.publicTakeStart(token);
        const res = await assessmentsApi.publicTake(token);
        if (!cancelled) {
          setPayload(res.data);
          let localAnswers = {};
          try {
            const saved = localStorage.getItem(draftKey(token));
            if (saved) localAnswers = JSON.parse(saved);
          } catch {
            /* ignore corrupt draft */
          }
          setAnswers(mergeDraftAnswers(res.data?.questions, res.data?.saved_answers, localAnswers));
          if (res.data?.draft_saved_at) setDraftStatus('saved');
          const mins = Number(res.data?.duration_minutes) || 0;
          if (mins > 0) setSecondsLeft(mins * 60);
          skipDraftSave.current = true;
        }
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Invalid or expired assessment link');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, mergeDraftAnswers]);

  useEffect(() => {
    if (!token || done) return;
    try {
      localStorage.setItem(draftKey(token), JSON.stringify(answers));
    } catch {
      /* storage full */
    }
  }, [answers, token, done]);

  useEffect(() => {
    if (!token || done || loading) return;
    if (skipDraftSave.current) {
      skipDraftSave.current = false;
      return;
    }
    if (draftTimer.current) clearTimeout(draftTimer.current);
    setDraftStatus('saving');
    draftTimer.current = setTimeout(async () => {
      try {
        const body = {
          answers: Object.entries(answers).map(([question_id, response]) => ({ question_id, response })),
        };
        await assessmentsApi.publicTakeDraft(token, body);
        setDraftStatus('saved');
      } catch {
        setDraftStatus('error');
      }
    }, 1500);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [answers, token, done, loading]);

  const submitAssessment = useCallback(async () => {
    if (submitting || done) return;
    setSubmitting(true);
    try {
      const body = {
        answers: Object.entries(answers).map(([question_id, response]) => ({ question_id, response })),
      };
      const res = await assessmentsApi.publicTakeSubmit(token, body);
      setResult(res.data);
      setDone(true);
      localStorage.removeItem(draftKey(token));
      toast.success('Assessment submitted');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }, [answers, done, submitting, token]);

  useEffect(() => {
    if (secondsLeft == null || done) return undefined;
    if (secondsLeft <= 0) {
      submitAssessment();
      return undefined;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, done, submitAssessment]);

  const timerLabel = useMemo(() => {
    if (secondsLeft == null) return null;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [secondsLeft]);

  const handleSubmit = (e) => {
    e.preventDefault();
    submitAssessment();
  };

  const setAnswer = (qid, value) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center text-slate-600">This assessment link is invalid or has expired.</CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" data-testid="assessment-take-done">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Outfit' }}>Thank you</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-slate-600">
            <p>
              Your responses for <strong>{payload.title}</strong> were submitted.
            </p>
            {result?.score_pct != null ? (
              <p className="text-lg font-semibold text-slate-900" data-testid="assessment-score-result">
                Score: {result.score_pct}% {result.passed ? '(Pass)' : '(Fail)'}
              </p>
            ) : (
              <p className="text-sm" data-testid="assessment-pending-review">
                Your submission will be reviewed by the hiring team.
                {result?.status === 'SUBMITTED' ? ' Manual grading is required for some questions.' : ''}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4" data-testid="assessment-take-page">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              {payload.title}
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              {payload.duration_minutes} minutes · {payload.total_marks} marks
            </p>
          </div>
          {timerLabel ? (
            <Badge
              variant="outline"
              className={secondsLeft <= 300 ? 'border-red-300 text-red-700 bg-red-50' : ''}
              data-testid="assessment-timer"
            >
              <Clock className="w-3 h-3 mr-1" />
              {timerLabel}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-slate-500" data-testid="assessment-draft-status">
          {draftStatus === 'saving'
            ? 'Saving progress to server…'
            : draftStatus === 'saved'
              ? 'Progress saved to this browser and server.'
              : draftStatus === 'error'
                ? 'Could not sync to server — saved locally in this browser.'
                : 'Progress saves automatically to this browser and server.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(payload.questions || []).map((q, idx) => (
            <Card key={q.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between gap-2">
                  <span>
                    Q{idx + 1}. {q.question_text}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {q.question_type}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {q.question_type === 'MCQ' && Array.isArray(q.options) ? (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswer(q.id, opt)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : isLongFormType(q.question_type) ? (
                  <Textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder={q.question_type === 'CODING' ? 'Enter code or pseudocode…' : 'Your answer…'}
                    rows={q.question_type === 'CODING' ? 8 : 4}
                    className={q.question_type === 'CODING' ? 'font-mono text-sm' : ''}
                    data-testid={`answer-${q.id}`}
                  />
                ) : (
                  <Input
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Your answer"
                    data-testid={`answer-${q.id}`}
                  />
                )}
              </CardContent>
            </Card>
          ))}
          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            disabled={submitting}
            data-testid="assessment-submit-btn"
          >
            {submitting ? 'Submitting…' : 'Submit assessment'}
          </Button>
        </form>
      </div>
    </div>
  );
}
