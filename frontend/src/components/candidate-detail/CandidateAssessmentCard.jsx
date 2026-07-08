import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  buildAssessmentCardDescription,
  formatPassDecision,
  formatScoreDisplay,
  formatAssessmentStatus,
  getLifecycleSteps,
  statusPillClass,
} from '../../lib/candidateDetailAssessmentsUtils';
import CandidateAssessmentLifecycleStepper from './CandidateAssessmentLifecycleStepper';

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11 4" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7.1 7.1L13 20" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function CandidateAssessmentCard({
  submission,
  profile,
  onCopyLink,
  onSendReminder,
  copyingId,
  remindingId,
}) {
  const steps = getLifecycleSteps(submission);
  const pillClass = statusPillClass(submission?.status);
  const description = buildAssessmentCardDescription(submission, profile);
  const scoreDisplay = formatScoreDisplay(submission);
  const passDisplay = formatPassDecision(submission);
  const scored = String(submission?.status || '').toUpperCase() === 'SCORED';
  const busyCopy = copyingId === submission?.id;
  const busyRemind = remindingId === submission?.id;

  return (
    <article className="cdas-assessment-card" data-testid={`assessment-card-${submission?.id}`}>
      <div className="cdas-assessment-top">
        <div className="cdas-assessment-title">
          <div className="cdas-assessment-icon">
            <CheckIcon />
          </div>
          <div>
            <h5>{submission?.assessment_title || 'Assessment'}</h5>
            <p>{description}</p>
          </div>
        </div>
        <span className={`cdas-status-pill ${pillClass}`}>{formatAssessmentStatus(submission?.status)}</span>
      </div>

      <div className="cdas-assessment-meta">
        <div className="cdas-meta-cell">
          <div className="cdas-meta-label">Assessment</div>
          <div className="cdas-meta-value">{submission?.assessment_title || '—'}</div>
        </div>
        <div className="cdas-meta-cell">
          <div className="cdas-meta-label">Job</div>
          <div className="cdas-meta-value">{submission?.job_title || '—'}</div>
        </div>
        <div className="cdas-meta-cell">
          <div className="cdas-meta-label">Score</div>
          <div className={`cdas-meta-value ${scoreDisplay === '—' ? 'muted' : ''}`}>
            {scoreDisplay === '—' ? 'Not available' : scoreDisplay}
          </div>
        </div>
        <div className="cdas-meta-cell">
          <div className="cdas-meta-label">Pass</div>
          <div className={`cdas-meta-value ${passDisplay === 'Pending' ? 'muted' : ''}`}>{passDisplay}</div>
        </div>
      </div>

      <div className="cdas-assessment-actions">
        <div className="cdas-action-left">
          {submission?.take_url && !scored ? (
            <button
              type="button"
              className="cdas-link-btn"
              onClick={() => onCopyLink?.(submission)}
              disabled={busyCopy}
              data-testid={`copy-link-${submission?.id}`}
            >
              {busyCopy ? <Loader2 className="cdas-btn-spinner" /> : <LinkIcon />}
              Copy link
            </button>
          ) : null}
          {!scored ? (
            <button
              type="button"
              className="cdas-link-btn"
              onClick={() => onSendReminder?.(submission)}
              disabled={busyRemind}
              data-testid={`send-reminder-${submission?.id}`}
            >
              {busyRemind ? <Loader2 className="cdas-btn-spinner" /> : <SendIcon />}
              Send reminder
            </button>
          ) : null}
          <Link
            to={`/assessments?tab=results&submission=${submission?.id}`}
            className="cdas-link-btn"
            data-testid={`view-assessment-${submission?.id}`}
          >
            <EyeIcon />
            View
          </Link>
        </div>
        {scored ? (
          <Link
            to={`/assessments?tab=results&submission=${submission?.id}`}
            className="cdas-tiny-link"
            data-testid={`open-result-${submission?.id}`}
          >
            Open detailed result →
          </Link>
        ) : null}
      </div>

      <CandidateAssessmentLifecycleStepper steps={steps} />
    </article>
  );
}
