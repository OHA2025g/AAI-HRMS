import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

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
  const hasScore = score != null && !Number.isNaN(Number(score));
  const badge = hasScore ? STATUS_BADGE[status] || STATUS_BADGE.watch : null;
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

  const updatedLabel =
    hasScore && asOf
      ? new Date(asOf).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : null;

  const hasRecommendation = Boolean(
    aiRecommendation?.title || aiRecommendation?.headline || aiRecommendation?.message
  );
  const recTitle = aiRecommendation?.title || aiRecommendation?.headline;
  const impactDays = aiRecommendation?.impact_days;

  return (
    <section
      className={cn('hero', presentationMode && 'hero--stacked')}
      data-testid="dashboard-hero-health"
    >
      <div className="hero-score">
        <h4>AI HIRING HEALTH SCORE</h4>
        <div className="score">
          {hasScore ? (
            <>
              {score}
              <span>/100</span>
            </>
          ) : (
            '—'
          )}
        </div>
        {badge ? (
          <span className={cn('badge', badge.className)}>
            {badge.prefix} {badge.label}
          </span>
        ) : (
          <span className="badge badge--empty">No hiring data yet</span>
        )}
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
        {hasRecommendation ? (
          <>
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
          </>
        ) : (
          <p className="muted">No recommendations until hiring activity starts.</p>
        )}
      </div>
    </section>
  );
}
