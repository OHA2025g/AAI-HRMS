import React from 'react';
import { Link } from 'react-router-dom';
import { fmtNum } from '@/shared/lib/candidatesCommandUtils';

export default function CandidatesHeroCards({ metrics }) {
  const reviewCount = metrics.reviewHighFitCount ?? metrics.highFit90 ?? 0;
  const shortlist = metrics.shortlistQuality;
  const shortlistDelta = metrics.shortlistDeltaPct;
  const hasCandidates = Number(metrics.totalCount) > 0;

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
        <div className="cand-big">{shortlist != null ? `${shortlist}%` : '—'}</div>
        {shortlistDelta != null ? (
          <div className={shortlistDelta >= 0 ? 'up' : 'down'}>
            {shortlistDelta >= 0 ? '↑' : '↓'} {Math.abs(shortlistDelta)}% better match quality
          </div>
        ) : (
          <div className="cand-muted">
            {hasCandidates ? 'Match quality from current pool' : 'No shortlist quality yet'}
          </div>
        )}
        <p className="cand-muted">
          {hasCandidates
            ? 'Top candidates prioritized using skills, role fit, experience and career trajectory signals.'
            : 'Add candidates to generate AI shortlisting quality scores.'}
        </p>
      </div>

      <div className="cand-hero-card">
        <div className="cand-eyebrow">Recommended action</div>
        <h2 className="cand-action-title">
          {hasCandidates
            ? `Review ${fmtNum(reviewCount)} high-fit candidates`
            : 'Add your first candidate'}
        </h2>
        <p className="cand-muted">
          {hasCandidates
            ? reviewCount > 0
              ? 'Prioritize high-fit profiles for screening and interview.'
              : 'Build the pool further to surface high-fit matches.'
            : 'Import or create profiles to start AI matching.'}
        </p>
        <Link to={hasCandidates ? '/candidates?fit_min=90' : '/candidates/import'} className="btn primary">
          {hasCandidates ? 'Review AI Matches →' : 'Import Candidates →'}
        </Link>
      </div>
    </section>
  );
}
