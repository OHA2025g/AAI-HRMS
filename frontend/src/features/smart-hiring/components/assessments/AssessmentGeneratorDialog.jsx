import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog';

const ASSESSMENT_TYPES = [
  { value: 'CORE_SKILL', label: 'Core Skill Test' },
  { value: 'WORK_SIMULATION', label: 'Work Simulation' },
  { value: 'SCREENING', label: 'Screening Assessment' },
  { value: 'BEHAVIORAL', label: 'Behavioral Assessment' },
];

const STEPS = [
  'Configure assessment',
  'Review AI questions',
  'Publish & invite',
];

export default function AssessmentGeneratorDialog({
  open,
  onOpenChange,
  openJobs = [],
  formData,
  onFormChange,
  generating = false,
  onSubmit,
}) {
  const setField = (key, value) => {
    onFormChange?.({ ...formData, [key]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="as-gen-dialog"
        data-testid="assessment-generator-dialog"
        aria-describedby="assessment-generator-description"
      >
        <header className="as-gen-header">
          <div className="as-gen-title">
            <div className="as-gen-icon" aria-hidden>
              ✦
            </div>
            <div>
              <DialogTitle className="as-gen-heading" id="assessment-generator-title">
                AI Assessment Generator
              </DialogTitle>
              <DialogDescription className="as-gen-subtitle" id="assessment-generator-description">
                Select a job and assessment type. AI will generate 25 role-aligned questions for review
                before publishing.
              </DialogDescription>
              <span className="as-gen-chip">● Draft mode enabled</span>
            </div>
          </div>
          <button
            type="button"
            className="as-gen-close"
            aria-label="Close"
            onClick={() => onOpenChange?.(false)}
          >
            ×
          </button>
        </header>

        <form className="as-gen-body" onSubmit={handleSubmit}>
          <div className="as-gen-steps" aria-label="Assessment generation steps">
            {STEPS.map((label, index) => (
              <div
                key={label}
                className={`as-gen-step${index === 0 ? ' active' : ''}`}
                aria-current={index === 0 ? 'step' : undefined}
              >
                <span>{index + 1}</span>
                {label}
              </div>
            ))}
          </div>

          <section className="as-gen-form-grid">
            <div className="as-gen-field full">
              <label htmlFor="assessment-job-select">Select Job *</label>
              <select
                id="assessment-job-select"
                className="as-gen-select"
                value={formData.job_id || ''}
                onChange={(e) => setField('job_id', e.target.value)}
                required
                data-testid="assessment-job-select"
              >
                <option value="" disabled>
                  {openJobs.length ? 'Select a job to base the assessment on' : 'No open jobs available'}
                </option>
                {openJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
              <p className="as-gen-help">
                AI uses job title, skills, seniority, and requisition details to create relevant questions.
              </p>
            </div>

            <div className="as-gen-field full">
              <label htmlFor="assessment-title-input">Assessment Title *</label>
              <input
                id="assessment-title-input"
                className="as-gen-input"
                placeholder="e.g., Data Analyst Technical Assessment"
                value={formData.title}
                onChange={(e) => setField('title', e.target.value)}
                required
                data-testid="assessment-title-input"
              />
            </div>

            <div className="as-gen-field">
              <label htmlFor="assessment-type-select">Assessment Type</label>
              <select
                id="assessment-type-select"
                className="as-gen-select"
                value={formData.assessment_type}
                onChange={(e) => setField('assessment_type', e.target.value)}
              >
                {ASSESSMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="as-gen-field">
              <label htmlFor="assessment-duration-input">Duration (minutes)</label>
              <input
                id="assessment-duration-input"
                className="as-gen-input"
                type="number"
                min={5}
                max={480}
                value={formData.duration_minutes}
                onChange={(e) =>
                  setField('duration_minutes', parseInt(e.target.value, 10) || 60)
                }
              />
            </div>
          </section>

          <section className="as-gen-ai-panel" aria-label="AI generation details">
            <div className="as-gen-ai-card">
              <b>Question mix</b>
              <p>MCQ, scenario, short answer, and practical reasoning questions.</p>
            </div>
            <div className="as-gen-ai-card">
              <b>Difficulty balance</b>
              <p>Auto-balanced across basic, intermediate, and advanced levels.</p>
            </div>
            <div className="as-gen-ai-card">
              <b>Review control</b>
              <p>Recruiter can edit, remove, reorder, or regenerate questions.</p>
            </div>
          </section>

          <div className="as-gen-toggle-row">
            <label className="as-gen-check" htmlFor="assessment-publish-checkbox">
              <input
                id="assessment-publish-checkbox"
                type="checkbox"
                checked={Boolean(formData.publish)}
                onChange={(e) => setField('publish', e.target.checked)}
              />
              Publish after review
            </label>
            <span className="as-gen-help">
              Recruiters can invite candidates from the pipeline after approval.
            </span>
          </div>

          <footer className="as-gen-footer">
            <div className="as-gen-note">⚡ Estimated generation time: 20–30 seconds</div>
            <div className="as-gen-actions">
              <button
                type="button"
                className="as-gen-btn"
                onClick={() => onOpenChange?.(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="as-gen-btn primary"
                disabled={generating || !formData.job_id || !formData.title}
                data-testid="generate-assessment-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="as-gen-btn-spinner" aria-hidden />
                    Generating…
                  </>
                ) : (
                  <>✦ Generate & review</>
                )}
              </button>
            </div>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
