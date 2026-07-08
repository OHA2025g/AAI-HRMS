import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { fmtNum, healthBadge } from '../../lib/jobsCommandUtils';

export default function JobsCommandHero({ pack, metrics }) {
  const score =
    pack?.health_score ??
    (metrics?.avgFit != null ? Math.min(100, Math.round(metrics.avgFit)) : 0);
  const badge = healthBadge(
    pack?.health_status ??
      (metrics?.atRisk > Math.max(1, metrics?.openJobs || 0) * 0.25 ? 'critical' : 'ok')
  );
  const rec = pack?.ai_recommendation;

  return (
    <section className="hero" data-testid="jobs-command-hero">
      <div className="hero-score">
        <h4>REQUISITION HEALTH</h4>
        <div className="score">
          {score}
          <span>/100</span>
        </div>
        <span className={cn('badge', badge.className)}>{badge.label}</span>
        <p className="hero-updated">
          {fmtNum(metrics.openJobs)} active requisitions · updated live
        </p>
      </div>

      <div className="hero-risks jobs-risk-grid">
        <div className="jobs-risk-cell">
          <b>{fmtNum(metrics.slaRisk)}</b>
          <p>Jobs at SLA risk</p>
        </div>
        <div className="jobs-risk-cell">
          <b>{fmtNum(metrics.agingBeyond30)}</b>
          <p>Aging beyond 30 days</p>
        </div>
        <div className="jobs-risk-cell">
          <b>{fmtNum(metrics.highFitWaiting)}</b>
          <p>High-fit candidates waiting</p>
        </div>
        <div className="jobs-risk-cell">
          <b>{metrics.weakPipelinePct}%</b>
          <p>Roles with weak pipeline</p>
        </div>
      </div>

      <div className="ai hero-ai">
        <h4>🧠 AI RECOMMENDATION</h4>
        <b>{rec?.title || 'Prioritize at-risk requisitions'}</b>
        <p>{rec?.message || 'Move high-fit candidates to interview within 48 hours.'}</p>
        {rec?.impact_days != null ? (
          <div className="impact">{rec.impact_days} days</div>
        ) : null}
        <Link to={rec?.action_path || '/jobs?tab=at-risk'} className="primary">
          Review Priority Jobs →
        </Link>
      </div>
    </section>
  );
}
