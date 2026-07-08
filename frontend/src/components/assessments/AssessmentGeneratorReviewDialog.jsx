import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { assessmentsApi } from '../../lib/api';
import {
  buildQualitySummary,
  buildQuestionRationale,
  computeReviewStats,
  formatQuestionTypeLabel,
  getDifficultyOptions,
  questionNavSubtitle,
  questionNavTitle,
  questionReviewStatus,
  questionTypeChipClass,
} from '../../lib/assessmentReviewDialogUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';

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
  const [showQualityNotes, setShowQualityNotes] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef([]);

  useEffect(() => {
    if (draft) {
      setQuestions(JSON.parse(JSON.stringify(draft.questions || [])));
      setPassThreshold(draft.rubric?.pass_threshold ?? 70);
      setThresholdHint('');
      setShowQualityNotes(false);
      setActiveIndex(0);
    }
  }, [draft]);

  const stats = useMemo(
    () => computeReviewStats(draft, questions, passThreshold),
    [draft, questions, passThreshold]
  );

  const qualitySummary = useMemo(() => buildQualitySummary(draft), [draft]);
  const progressPct = stats.totalQuestions
    ? Math.round((stats.reviewed / stats.totalQuestions) * 100)
    : 0;

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

  const persistAssessment = async ({ publish = false } = {}) => {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await assessmentsApi.update(draft.id, {
        questions,
        rubric: { ...(draft.rubric || {}), pass_threshold: Number(passThreshold) || 70 },
      });
      if (publish && draft.status !== 'ACTIVE') {
        await assessmentsApi.publish(draft.id);
      }
      toast.success(publish ? 'Assessment published' : 'Draft saved');
      if (publish) {
        onOpenChange(false);
        onPublished?.();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => persistAssessment({ publish: publishOnSave !== false });
  const handleSaveDraft = () => persistAssessment({ publish: false });

  const scrollToQuestion = (idx) => {
    setActiveIndex(idx);
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="as-rev-dialog"
        data-testid="assessment-review-dialog"
        aria-describedby="assessment-review-description"
      >
        <header className="as-rev-head">
          <div className="as-rev-title-wrap">
            <div className="as-rev-spark" aria-hidden>
              ✦
            </div>
            <div>
              <DialogTitle className="as-rev-heading" id="assessment-review-title">
                Review generated assessment
              </DialogTitle>
              <DialogDescription className="as-rev-subtitle" id="assessment-review-description">
                Edit questions, marks, options and pass threshold before publishing.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            className="as-rev-close"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            ×
          </button>
        </header>

        <div className="as-rev-body">
          <div className="as-rev-toolbar">
            <div className="as-rev-threshold-card">
              <span className="as-rev-field-label">Pass threshold %</span>
              <input
                className="as-rev-input as-rev-threshold"
                type="number"
                min={0}
                max={100}
                value={passThreshold}
                onChange={(e) => setPassThreshold(e.target.value)}
                data-testid="assessment-pass-threshold-input"
              />
              <button
                type="button"
                className="as-rev-btn"
                disabled={suggestingThreshold || !draft?.id}
                onClick={handleSuggestThreshold}
                data-testid="suggest-pass-threshold-btn"
              >
                {suggestingThreshold ? <Loader2 className="as-rev-btn-spinner" aria-hidden /> : null}
                Suggest threshold
              </button>
              <span className="as-rev-chip green">AI recommended</span>
            </div>
            <div className="as-rev-stats">
              <div className="as-rev-stat">
                <b>{stats.totalQuestions}</b>
                <span>Questions</span>
              </div>
              <div className="as-rev-stat">
                <b>{stats.totalMarks}</b>
                <span>Total marks</span>
              </div>
              <div className="as-rev-stat">
                <b>{stats.duration}m</b>
                <span>Duration</span>
              </div>
              <div className="as-rev-stat">
                <b>{stats.pass}%</b>
                <span>Pass score</span>
              </div>
            </div>
          </div>

          {thresholdHint ? (
            <p className="as-rev-threshold-hint" data-testid="pass-threshold-suggestion-hint">
              {thresholdHint}
            </p>
          ) : null}

          <div className="as-rev-ai-strip">
            <div className="as-rev-ai-icon" aria-hidden>
              ✦
            </div>
            <div>
              <b>AI quality check complete</b>
              <p>{qualitySummary}</p>
              {showQualityNotes && draft?.rubric?.grading_guide ? (
                <p className="as-rev-quality-notes">{draft.rubric.grading_guide}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="as-rev-btn green"
              onClick={() => setShowQualityNotes((v) => !v)}
            >
              {showQualityNotes ? 'Hide quality notes' : 'View quality notes'}
            </button>
          </div>

          <div className="as-rev-qa-grid">
            <aside className="as-rev-question-nav">
              <h3>Question outline</h3>
              {questions.map((q, idx) => {
                const status = questionReviewStatus(q);
                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    className={`as-rev-nav-item${activeIndex === idx ? ' active' : ''}`}
                    onClick={() => scrollToQuestion(idx)}
                  >
                    <div className="as-rev-qnum">{idx + 1}</div>
                    <div>
                      <div className="as-rev-nav-title">{questionNavTitle(q, idx)}</div>
                      <div className="as-rev-nav-sub">{questionNavSubtitle(q)}</div>
                    </div>
                    <span className={`as-rev-score-pill${status === 'Ready' ? ' ready' : ''}`}>
                      {status}
                    </span>
                  </button>
                );
              })}
              <div className="as-rev-progress">
                <i style={{ width: `${progressPct}%` }} />
              </div>
              <p className="as-rev-nav-foot">
                Showing {questions.length} of {stats.totalQuestions} questions
              </p>
            </aside>

            <section className="as-rev-question-list">
              {questions.map((q, idx) => {
                const typeLabel = formatQuestionTypeLabel(q.question_type);
                const chipClass = questionTypeChipClass(q.question_type);
                const isMcq = (q.question_type || '').toUpperCase() === 'MCQ';
                const rationale = buildQuestionRationale(q);

                return (
                  <article
                    key={q.id || idx}
                    className="as-rev-q-card"
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    data-testid={q.id ? `review-question-${q.id}` : undefined}
                  >
                    <div className="as-rev-q-head">
                      <div className="as-rev-q-title">
                        <span className="as-rev-qnum">{idx + 1}</span>
                        Question {idx + 1}
                      </div>
                      <div className="as-rev-q-actions">
                        <span className={`as-rev-chip ${chipClass}`}>{typeLabel}</span>
                        {q.id ? (
                          <button
                            type="button"
                            className="as-rev-btn"
                            disabled={regeneratingId === q.id}
                            onClick={() => handleRegenerate(q.id, idx)}
                            data-testid={`regenerate-question-${q.id}`}
                          >
                            {regeneratingId === q.id ? (
                              <Loader2 className="as-rev-btn-spinner" aria-hidden />
                            ) : (
                              '↻'
                            )}{' '}
                            Regenerate
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="as-rev-q-body">
                      <textarea
                        className="as-rev-textarea"
                        value={q.question_text || ''}
                        onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                        rows={3}
                      />

                      {isMcq && Array.isArray(q.options) ? (
                        <textarea
                          className="as-rev-textarea options"
                          value={q.options.join('\n')}
                          onChange={(e) =>
                            updateQuestion(
                              idx,
                              'options',
                              e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)
                            )
                          }
                          placeholder="One option per line"
                          rows={5}
                        />
                      ) : null}

                      <div className="as-rev-meta-row">
                        <div>
                          <label className="as-rev-field-label">Max marks</label>
                          <input
                            className="as-rev-input"
                            type="number"
                            value={q.max_marks ?? 10}
                            onChange={(e) =>
                              updateQuestion(idx, 'max_marks', parseInt(e.target.value, 10) || 10)
                            }
                          />
                        </div>
                        <div>
                          <label className="as-rev-field-label">
                            {isMcq ? 'Answer key' : q.question_type === 'SHORT_ANSWER' ? 'Expected keywords' : 'Expected answer'}
                          </label>
                          <input
                            className="as-rev-input answer-key"
                            value={q.answer_key || ''}
                            onChange={(e) => updateQuestion(idx, 'answer_key', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="as-rev-field-label">Difficulty</label>
                          <select
                            className="as-rev-input"
                            value={(q.difficulty || 'MEDIUM').toUpperCase()}
                            onChange={(e) => updateQuestion(idx, 'difficulty', e.target.value)}
                          >
                            {getDifficultyOptions().map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {rationale ? (
                        <div className="as-rev-rubric">
                          <b>AI rationale:</b> {rationale}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </div>

        <footer className="as-rev-footer">
          <div className="as-rev-footer-left">
            <b>Draft assessment</b> · {stats.reviewed} reviewed of {stats.totalQuestions} · Auto-saved
            just now
          </div>
          <div className="as-rev-footer-actions">
            <button
              type="button"
              className="as-rev-btn"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              Save draft
            </button>
            <button type="button" className="as-rev-btn" onClick={() => onOpenChange(false)}>
              Back
            </button>
            <button
              type="button"
              className="as-rev-btn primary"
              onClick={handlePublish}
              disabled={saving}
              data-testid="publish-assessment-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="as-rev-btn-spinner" aria-hidden />
                  Saving…
                </>
              ) : (
                'Publish assessment →'
              )}
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
