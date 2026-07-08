import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

const STATUS_BADGE = {
  ok: { label: 'Healthy', className: 'badge--ok', prefix: '✓' },
  watch: { label: 'Moderate Risk', className: 'badge--watch', prefix: '↗' },
  critical: { label: 'Critical', className: 'badge--critical', prefix: '↓' },
};

export default function DashboardHeroHealth({
  score,
  status,
  asOf,
  heroRisk,
  aiRecommendation,
  presentationMode,
}) {
  const badge = STATUS_BADGE[status] || STATUS_BADGE.watch;
  const risks = [
    {
      icon: '⚠️',
      value: heroRisk?.reqs_at_risk ?? 0,
      label: 'Requisitions at risk',
      hint: 'Needs attention',
      tone: 'warn',
    },
    {
      icon: '⚠️',
      value: heroRisk?.jobs_miss_sla ?? 0,
      label: 'Jobs likely to miss SLA',
      hint: 'Action required',
      tone: 'action',
    },
    {
      icon: '🔔',
      value: heroRisk?.high_fit_awaiting_review ?? 0,
      label: 'High-fit candidates',
      hint: 'Awaiting review',
      tone: 'info',
    },
  ];

  const updatedLabel = asOf
    ? new Date(asOf).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  const recTitle =
    aiRecommendation?.title ||
    aiRecommendation?.headline ||
    'Review hiring dashboard alerts and take action on the highest-risk items.';
  const impactDays = aiRecommendation?.impact_days;

  return (
    <section
      className={cn('hero', presentationMode && 'hero--stacked')}
      data-testid="dashboard-hero-health"
    >
      <div className="hero-score">
        <h4>AI HIRING HEALTH SCORE</h4>
        <div className="score">
          {score}
          <span>/100</span>
        </div>
        <span className={cn('badge', badge.className)}>{badge.prefix} {badge.label}</span>
        {updatedLabel ? <p className="hero-updated">Updated {updatedLabel}</p> : null}
      </div>

      <div className="risk-list hero-risks">
        {risks.map((r) => (
          <div key={r.label} className={cn('risk', `risk--${r.tone}`)}>
            <span className="ico" aria-hidden>
              {r.icon}
            </span>
            <div className="risk-copy">
              <div className="risk-headline">
                <b>{r.value}</b>
                <span className="risk-label">{r.label}</span>
              </div>
              <small className={cn('risk-hint', `risk-hint--${r.tone}`)}>{r.hint}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="ai hero-ai">
        <h4>🧠 AI RECOMMENDATION</h4>
        <b>{recTitle}</b>
        <p>Expected hiring delay reduction</p>
        {impactDays != null ? <div className="impact">{impactDays} days</div> : null}
        {aiRecommendation?.action_path ? (
          <Link to={aiRecommendation.action_path} className="primary">
            View Recommendation →
          </Link>
        ) : (
          <button type="button" className="primary">
            View Recommendation →
          </button>
        )}
      </div>
    </section>
  );
}
