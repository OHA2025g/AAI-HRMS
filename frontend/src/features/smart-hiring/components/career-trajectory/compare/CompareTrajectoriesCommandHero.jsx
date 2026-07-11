import React from 'react';
import { Link } from 'react-router-dom';

export default function CompareTrajectoriesCommandHero({ onAnalyzeMissing, missingCount, analyzing }) {
  return (
    <header className="ctc-hero-title" data-testid="compare-trajectories-command-hero">
      <div>
        <div className="ctc-eyebrow">✣ AI Hiring Intelligence</div>
        <h1 data-testid="compare-trajectories-heading">Compare Career Trajectories</h1>
        <p>
          Select up to 5 candidates and compare trajectory strength, role readiness, leadership maturity,
          retention risk, and decision gates in one view.
        </p>
      </div>
      <div className="ctc-actions">
        <Link className="ctc-btn" to="/ai-hiring/candidate-fit/career-trajectory">
          Open analyzer
        </Link>
        <button
          type="button"
          className="ctc-btn primary"
          onClick={onAnalyzeMissing}
          disabled={!missingCount || analyzing}
          data-testid="compare-analyze-missing-btn"
        >
          {analyzing ? 'Analyzing…' : `Analyze missing reports${missingCount ? ` (${missingCount})` : ''}`}
        </button>
      </div>
    </header>
  );
}
