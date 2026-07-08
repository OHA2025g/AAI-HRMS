import React from 'react';
import { Link } from 'react-router-dom';
import {
  avatarLabel,
  fmtField,
  formatExperienceMeta,
  formatPhone,
  sourceBadgeMeta,
  subtitleLabel,
  analyzeFitUrl,
} from '../../lib/candidateDetailOverviewUtils';

export default function CandidateDetailHero({
  profile,
  candidateId,
  onEdit,
  primaryAction,
  secondaryAction,
  extraBadges = [],
}) {
  const badge = sourceBadgeMeta(profile);
  const analyzeUrl = analyzeFitUrl(candidateId, profile);
  const primary =
    primaryAction ||
    {
      label: 'Analyze Fit',
      href: analyzeUrl,
      testId: 'analyze-fit-btn',
    };

  return (
    <>
      <Link to="/candidates" className="cd-back" data-testid="back-btn">
        ← Back to Candidates
      </Link>

      <section className="cd-hero" data-testid="candidate-detail-hero">
        <div className="cd-candidate-avatar" aria-hidden>
          {avatarLabel(profile)}
        </div>
        <div>
          <h1 data-testid="candidate-detail-name">
            {profile.full_name}
            {badge ? (
              <span className={`cd-badge cd-badge-${badge.variant}`}>{badge.label}</span>
            ) : null}
            {extraBadges.map((item) => (
              <span key={item.label} className={`cd-badge cd-badge-${item.variant || 'default'}`}>
                {item.label}
              </span>
            ))}
          </h1>
          <div className="cd-subtitle">{subtitleLabel(profile)}</div>
          <div className="cd-meta">
            <span>✉ {fmtField(profile.email)}</span>
            <span>☎ {formatPhone(profile.phone)}</span>
            <span>⌖ {fmtField(profile.location)}</span>
            <span>▣ {formatExperienceMeta(profile.total_experience_years)}</span>
          </div>
        </div>
        <div className="cd-actions">
          <button type="button" className="cd-action" onClick={onEdit} data-testid="edit-candidate-btn">
            ✎ Edit
          </button>
          {secondaryAction ? (
            <button
              type="button"
              className="cd-action cd-action-soft"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              data-testid={secondaryAction.testId || 'candidate-secondary-action'}
            >
              {secondaryAction.icon ? `${secondaryAction.icon} ` : '◌ '}
              {secondaryAction.label}
            </button>
          ) : null}
          {primary.onClick ? (
            <button
              type="button"
              className="cd-action cd-action-primary"
              onClick={primary.onClick}
              disabled={primary.disabled}
              data-testid={primary.testId || 'candidate-primary-action'}
            >
              ✦ {primary.label}
            </button>
          ) : (
            <Link
              to={primary.href || analyzeUrl}
              className="cd-action cd-action-primary"
              data-testid={primary.testId || 'analyze-fit-btn'}
            >
              ✦ {primary.label}
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
