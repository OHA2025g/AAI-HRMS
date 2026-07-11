import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const VALID_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const QUICK_STEPS = [
  { num: 1, title: 'Choose the open job', sub: 'Link referral to the right requisition' },
  { num: 2, title: 'Add candidate details', sub: 'Name and at least one contact channel' },
  { num: 3, title: 'Upload resume', sub: 'AI parses skills, experience and fit score' },
];

const CHECKLIST_ITEMS = [
  {
    key: 'job',
    title: 'Open job selected',
    sub: 'Connects candidate to role requirements.',
  },
  {
    key: 'contact',
    title: 'Candidate contact available',
    sub: 'Email or phone should be added.',
  },
  {
    key: 'resume',
    title: 'Resume attached or summary pasted',
    sub: 'Improves AI extraction confidence.',
  },
  {
    key: 'note',
    title: 'Referral context added',
    sub: 'Helps recruiters prioritize follow-up.',
  },
];

function computeReadiness(formData, resumeFile) {
  let score = 0;
  const hasJob = Boolean(formData.job_id);
  const hasName = Boolean(formData.candidate_name?.trim());
  const hasContact = Boolean(formData.candidate_email?.trim() || formData.candidate_phone?.trim());
  const hasResume = Boolean(resumeFile || formData.resume_text?.trim());
  const hasNote = Boolean(formData.note?.trim());

  if (hasJob) score += 20;
  if (hasName) score += 20;
  if (hasContact) score += 15;
  if (hasResume) score += 25;
  if (hasNote) score += 20;

  const checklist = {
    job: hasJob,
    contact: hasContact,
    resume: hasResume,
    note: hasNote,
  };

  let headline = 'Add required details';
  let hint = 'Select a job and enter the candidate name to begin.';

  if (score >= 100) {
    headline = 'Ready to submit';
    hint = 'All recommended fields are complete. Submit when you are ready.';
  } else if (score >= 80) {
    headline = 'Almost ready';
    hint = 'Strong referral package — add any missing optional context before submitting.';
  } else if (score >= 60) {
    headline = 'Good starting point';
    hint = 'Add resume and referral note to improve match confidence and screening speed.';
  } else if (score >= 40) {
    headline = 'Getting started';
    hint = 'Keep going — contact details and resume will boost AI fit scoring.';
  }

  const tags = [];
  if (hasJob) tags.push({ label: 'Fit scoring', tone: 'purple' });
  if (resumeFile) tags.push({ label: 'Resume parsing', tone: 'green' });
  else if (formData.resume_text?.trim()) tags.push({ label: 'Summary added', tone: 'green' });
  if (!hasNote) tags.push({ label: 'Missing note', tone: 'orange' });
  if (hasContact) tags.push({ label: 'Contact added', tone: 'green' });

  return { score, headline, hint, checklist, tags };
}

function validateFile(file) {
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!VALID_EXTENSIONS.includes(ext)) {
    toast.error('Only PDF and DOC/DOCX files are supported');
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error('File size exceeds 10MB limit');
    return false;
  }
  return true;
}

export default function ReferralSubmitModal({
  open,
  onOpenChange,
  formData,
  setFormData,
  filteredJobs,
  resumeFile,
  setResumeFile,
  submitting,
  onSubmit,
  onReset,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const readiness = useMemo(() => computeReadiness(formData, resumeFile), [formData, resumeFile]);

  const handleClose = () => {
    onOpenChange(false);
    onReset();
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (file) => {
    if (!file || !validateFile(file)) return;
    setResumeFile(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const fileLabel = resumeFile?.name || 'Choose file or drag resume here';

  if (!open) return null;

  return createPortal(
    <div
      className="sr-modal-root sr-modal-layer"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      data-testid="submit-referral-modal"
    >
      <article className="sr-modal" role="dialog" aria-modal="true" aria-labelledby="sr-modalTitle">
        <header className="sr-modal-head">
          <button type="button" className="sr-close" aria-label="Close modal" onClick={handleClose}>
            <svg viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="sr-head-row">
            <div className="sr-head-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                <circle cx="9.5" cy="7" r="4" />
                <path d="M19 8v6" />
                <path d="M22 11h-6" />
              </svg>
            </div>
            <div>
              <h1 id="sr-modalTitle">Submit a Referral</h1>
              <p className="sr-modal-sub">
                Refer a candidate for an open position. AI will extract resume signals and calculate role fit
                automatically.
              </p>
            </div>
          </div>
          <div className="sr-quick-strip" aria-label="Referral steps">
            {QUICK_STEPS.map((step) => (
              <div key={step.num} className="sr-quick">
                <div className="sr-dot">{step.num}</div>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </header>

        <form onSubmit={onSubmit}>
          <div className="sr-modal-body">
            <div className="sr-form-grid">
              <section className="sr-panel">
                <div className="sr-panel-title">
                  <div>
                    <h3>Referral details</h3>
                    <p>
                      Fields marked with * are required. Resume upload is optional but recommended for best AI
                      matching.
                    </p>
                  </div>
                  <span className="sr-required-chip">Required inputs</span>
                </div>
                <div className="sr-form-section">
                  <div className="sr-field">
                    <label htmlFor="referral_job_id">
                      Select Job <span className="sr-req">*</span>
                    </label>
                    <select
                      id="referral_job_id"
                      value={formData.job_id}
                      onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                      required
                      data-testid="referral-job-select"
                    >
                      <option value="" disabled>
                        Select a job position
                      </option>
                      {filteredJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sr-field">
                    <label htmlFor="candidate_name">
                      Candidate Name <span className="sr-req">*</span>
                    </label>
                    <div className="sr-with-icon">
                      <svg viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <input
                        id="candidate_name"
                        value={formData.candidate_name}
                        onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                        placeholder="e.g., Aarav Sharma"
                        required
                        data-testid="referral-name-input"
                      />
                    </div>
                  </div>

                  <div className="sr-two">
                    <div className="sr-field">
                      <label htmlFor="candidate_email">Email</label>
                      <div className="sr-with-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M4 4h16v16H4z" />
                          <path d="m22 6-10 7L2 6" />
                        </svg>
                        <input
                          id="candidate_email"
                          type="email"
                          value={formData.candidate_email}
                          onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                          placeholder="candidate@email.com"
                          data-testid="referral-email-input"
                        />
                      </div>
                    </div>
                    <div className="sr-field">
                      <label htmlFor="candidate_phone">Phone</label>
                      <div className="sr-with-icon">
                        <svg viewBox="0 0 24 24">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.89.66 2.78a2 2 0 0 1-.45 2.11L8.1 9.78a16 16 0 0 0 6.12 6.12l1.17-1.17a2 2 0 0 1 2.11-.45c.89.31 1.82.53 2.78.66A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <input
                          id="candidate_phone"
                          type="tel"
                          value={formData.candidate_phone}
                          onChange={(e) => setFormData({ ...formData, candidate_phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          data-testid="referral-phone-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="sr-field">
                    <label>
                      Resume / CV <span className="sr-optional">PDF or DOCX</span>
                    </label>
                    <label
                      className={`sr-file-box${dragOver ? ' sr-drag-over' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileInputChange}
                        data-testid="referral-resume-file"
                      />
                      <span className="sr-upload-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <path d="M17 8l-5-5-5 5" />
                          <path d="M12 3v12" />
                        </svg>
                      </span>
                      <span className="sr-file-copy">
                        <strong>{fileLabel}</strong>
                        <span>
                          Maximum 10MB. Skills, experience, education, contact details and fit signals will be
                          extracted.
                        </span>
                      </span>
                    </label>
                    <div className="sr-helper">
                      <svg viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M9 15h6M9 11h3" />
                      </svg>
                      <div>
                        <strong>AI resume intelligence:</strong> the system will parse candidate profile, enrich the
                        referral, and compute job-fit score against the selected role.
                      </div>
                    </div>
                  </div>

                  <div className="sr-field">
                    <label htmlFor="resume_text">
                      Resume text / profile summary <span className="sr-optional">optional</span>
                    </label>
                    <textarea
                      id="resume_text"
                      placeholder="Paste resume text, LinkedIn summary, or add notes alongside an uploaded file..."
                      value={formData.resume_text}
                      onChange={(e) => setFormData({ ...formData, resume_text: e.target.value })}
                      data-testid="referral-resume-input"
                    />
                  </div>

                  <div className="sr-field">
                    <label htmlFor="note">
                      Your note to hiring team <span className="sr-optional">optional</span>
                    </label>
                    <textarea
                      id="note"
                      placeholder="Why are you referring this candidate? Mention strengths, availability, relationship, or expected role fit..."
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <aside className="sr-side-panel">
                <div className="sr-ai-card">
                  <h3>AI referral readiness</h3>
                  <p>Completeness score improves as you add job, contact details, resume and context.</p>
                  <div className="sr-score-row">
                    <div
                      className="sr-ring"
                      style={{
                        background: `conic-gradient(#6748f5 0 ${readiness.score}%, #e6eaf3 ${readiness.score}% 100%)`,
                      }}
                      aria-hidden="true"
                    >
                      <strong>{readiness.score}</strong>
                    </div>
                    <div className="sr-score-copy">
                      <strong>{readiness.headline}</strong>
                      <span>{readiness.hint}</span>
                    </div>
                  </div>
                  <div className="sr-tags">
                    {readiness.tags.map((tag) => (
                      <span key={tag.label} className={`sr-tag ${tag.tone}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="sr-check-card">
                  <h3>Submission checklist</h3>
                  <p>Use this as a quick quality gate before sending the referral.</p>
                  <div className="sr-checks">
                    {CHECKLIST_ITEMS.map((item) => {
                      const done = readiness.checklist[item.key];
                      return (
                        <div key={item.key} className={`sr-check${done ? ' done' : ''}`}>
                          <span className="sr-box">{done ? '✓' : '○'}</span>
                          <div>
                            <strong>{item.title}</strong>
                            <span>{item.sub}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="sr-note-card">
                  <svg viewBox="0 0 24 24">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                  <div>
                    <strong>Privacy reminder:</strong> upload only candidate-approved resumes and relevant hiring
                    information.
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <footer className="sr-modal-footer">
            <div className="sr-footer-hint">
              <svg viewBox="0 0 24 24">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Draft will be saved to referral pipeline after submission.
            </div>
            <button type="button" className="sr-btn secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="sr-btn primary"
              disabled={submitting || !formData.job_id || !formData.candidate_name?.trim()}
              data-testid="submit-referral-form-btn"
            >
              {submitting ? (
                <svg className="sr-btn-spinner" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <path d="M22 2 11 13" />
                  <path d="m22 2-7 20-4-9-9-4 20-7Z" />
                </svg>
              )}
              Submit Referral
            </button>
          </footer>
        </form>
      </article>
    </div>,
    document.body
  );
}
