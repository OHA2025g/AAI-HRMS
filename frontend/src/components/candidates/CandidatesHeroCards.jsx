import React from 'react';
import { Link } from 'react-router-dom';
import { fmtNum } from '../../lib/candidatesCommandUtils';

export default function CandidatesHeroCards({ metrics }) {
  const reviewCount = metrics.reviewHighFitCount ?? metrics.highFit90 ?? 0;

  return (
    <section className="cand-hero" data-testid="candidates-hero-cards">
      <div className="cand-hero-card">
        <div className="cand-eyebrow">Candidate pool</div>
        <div className="cand-big">{fmtNum(metrics.totalCount)}</div>
        <div className="cand-muted">Unique profiles available</div>
        <div className="cand-chips">
          <span className="cand-chip cand-chip-ai">AI enriched</span>
          <span className="cand-chip cand-chip-green">{fmtNum(metrics.activeCount)} active</span>
          <span className="cand-chip cand-chip-blue">{fmtNum(metrics.highFit90)} high-fit</span>
        </div>
      </div>

      <div className="cand-hero-card">
        <div className="cand-eyebrow">AI shortlisting</div>
        <div className="cand-big">{metrics.shortlistQuality}%</div>
        <div className="up">↑ 14% better match quality</div>
        <p className="cand-muted">
          Top candidates prioritized using skills, role fit, experience and career trajectory signals.
        </p>
      </div>

      <div className="cand-hero-card">
        <div className="cand-eyebrow">Recommended action</div>
        <h2 className="cand-action-title">Review {fmtNum(reviewCount)} high-fit candidates</h2>
        <p className="cand-muted">
          Engineering and Data roles have the strongest ready-to-interview pool.
        </p>
        <Link to="/candidates?fit_min=90" className="btn primary">
          Review AI Matches →
        </Link>
      </div>
    </section>
  );
}
