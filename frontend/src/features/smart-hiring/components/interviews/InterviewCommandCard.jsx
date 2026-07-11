import React from 'react';
import { toast } from 'sonner';
import {
  buildCardInsight,
  formatInterviewDateTime,
  formatModeLabel,
  formatRoundLabel,
  getCardStatusTag,
  getInterviewMatchBars,
  getMatchLabel,
  isFeedbackDue,
  ivRingGradientStyle,
  resolveInterviewFitScore,
} from '@/shared/lib/interviewsCommandUtils';

function tagClassName(variant) {
  if (variant === 'warn') return 'iv-tag iv-tag-warn';
  if (variant === 'good') return 'iv-tag iv-tag-good';
  return 'iv-tag';
}

export default function InterviewCommandCard({
  interview,
  applicationMap,
  canManageInterviews,
  onFeedback,
  onCancel,
}) {
  const fit = resolveInterviewFitScore(interview, applicationMap);
  const displayFit = fit ?? 0;
  const matchLabel = getMatchLabel(fit);
  const tag = getCardStatusTag(interview, applicationMap);
  const bars = getInterviewMatchBars(interview, applicationMap);
  const insight = buildCardInsight(interview, applicationMap);
  const feedbackDue = isFeedbackDue(interview);
  const primaryLabel = feedbackDue ? 'Send Reminder' : 'Open Interview';

  const handlePrimary = () => {
    if (feedbackDue) {
      toast.info('Reminder queued for panel members (demo).');
      return;
    }
    if (interview.meeting_link) {
      window.open(interview.meeting_link, '_blank', 'noopener,noreferrer');
      return;
    }
    toast.info('No meeting link available for this interview.');
  };

  return (
    <article className="iv-card iv-interview" data-testid={`interview-card-${interview.id}`}>
      <div className="iv-row1">
        <div className="iv-person">
          <div className="iv-circle" aria-hidden>
            ♙
          </div>
          <div>
            <h3>{interview.candidate?.full_name || 'Candidate'}</h3>
            <p>{interview.job?.title || '—'}</p>
          </div>
        </div>
        <span className={tagClassName(tag.variant)}>{tag.label}</span>
      </div>

      <div className="iv-meta">
        <div>
          <small>Date & Time</small>
          <b>{formatInterviewDateTime(interview.scheduled_start)}</b>
        </div>
        <div>
          <small>Round</small>
          <b>{formatRoundLabel(interview.round)}</b>
        </div>
        <div>
          <small>Mode</small>
          <b>{formatModeLabel(interview.mode)}</b>
        </div>
      </div>

      <div className="iv-fit">
        <div className="iv-ring" style={ivRingGradientStyle(displayFit)}>
          <div>{fit != null ? `${fit}%` : '—'}</div>
        </div>
        <div>
          <b>{matchLabel}</b>
          <p className="iv-fit-copy">{insight}</p>
        </div>
      </div>

      {bars.skills != null || bars.role != null ? (
        <div className="iv-bars">
          {bars.skills != null ? (
            <div>
              <div className="iv-bar-label">
                <span>Skills Match</span>
                <span>{bars.skills}%</span>
              </div>
              <div className="iv-bar">
                <i style={{ width: `${bars.skills}%` }} />
              </div>
            </div>
          ) : null}
          {bars.role != null ? (
            <div>
              <div className="iv-bar-label">
                <span>Role Match</span>
                <span>{bars.role}%</span>
              </div>
              <div className="iv-bar">
                <i style={{ width: `${bars.role}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {canManageInterviews ? (
        <div className="iv-actions-row">
          <button type="button" className="iv-btn" onClick={() => onFeedback(interview)}>
            Feedback
          </button>
          <button type="button" className="iv-btn iv-btn-danger" onClick={() => onCancel(interview.id)}>
            Cancel
          </button>
          <button type="button" className="iv-btn iv-btn-main" onClick={handlePrimary}>
            {primaryLabel}
          </button>
        </div>
      ) : null}
    </article>
  );
}
