import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { candidateDisplayName } from '../../../lib/candidateListUtils';
import { ANALYSIS_STEPS } from '../../../lib/careerTrajectoryCommandUtils';
import { CareerTrajectoryJobErrorBanner } from '../CareerTrajectoryJobErrorBanner';

export default function CareerTrajectoryAnalyzePanel({
  sectionRef,
  candidates,
  candidatesLoading = false,
  candidateId,
  onCandidateChange,
  file,
  onFileChange,
  dragOver,
  onDragOver,
  onDragLeave,
  onDropFile,
  resumeText,
  onResumeTextChange,
  loading,
  step,
  onAnalyze,
  failedJob,
  onRetryFailedJob,
  onDismissFailedJob,
  retrying,
}) {
  const cvFileInputRef = useRef(null);

  return (
    <section className="ct-card" ref={sectionRef} data-testid="career-traj-analyze-panel">
      <h3>Analyze resume</h3>
      <p className="ct-muted">Select a candidate, upload PDF/DOCX/TXT, or paste resume text.</p>

      <div className="ct-form-grid">
        <div>
          <div className="ct-label">Candidate optional</div>
          <select
            className="ct-input"
            value={candidateId || ''}
            onChange={(e) => onCandidateChange(e.target.value)}
            disabled={candidatesLoading}
            data-testid="career-traj-candidate-select"
          >
            <option value="">
              {candidatesLoading ? 'Loading candidates…' : 'None — text/upload only'}
            </option>
            {candidates.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.label || candidateDisplayName(c)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="ct-label">Upload CV</div>
          <div
            className={`ct-drop${dragOver ? ' active' : ''}${file ? ' has-file' : ''}`}
            data-testid="career-traj-dropzone"
            role="button"
            tabIndex={0}
            onClick={() => cvFileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                cvFileInputRef.current?.click();
              }
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDropFile}
          >
            {file ? file.name : 'Drag & drop PDF, DOCX, or TXT — or click to choose a file'}
          </div>
          <input
            ref={cvFileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="sr-only"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <textarea
        className="ct-textarea"
        placeholder="Paste resume text (min 50 characters)..."
        value={resumeText}
        onChange={(e) => onResumeTextChange(e.target.value)}
        data-testid="career-traj-resume-text"
      />

      <div className="ct-actions-row">
        <button
          type="button"
          className="ct-btn primary"
          onClick={onAnalyze}
          disabled={loading}
          data-testid="career-traj-analyze-btn"
        >
          {loading ? <Loader2 className="ct-inline-spinner" aria-hidden /> : null}
          ⇧ Analyze career trajectory
        </button>
        {candidateId ? (
          <Link className="ct-btn" to={`/candidates/${candidateId}`}>
            View candidate profile
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="ct-status" data-testid="career-traj-bg-status">
          Running analysis in background…
        </p>
      ) : null}

      {failedJob ? (
        <div className="ct-error-wrap">
          <CareerTrajectoryJobErrorBanner
            message={failedJob.message}
            onRetry={onRetryFailedJob}
            onDismiss={onDismissFailedJob}
            retrying={retrying}
          />
        </div>
      ) : null}

      {loading || step > 0 ? (
        <div className="ct-steps">
          {ANALYSIS_STEPS.map((s, i) => (
            <span key={s} className={`ct-step-badge${i <= step ? ' active' : ''}`}>
              {s}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
