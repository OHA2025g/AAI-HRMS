import React from 'react';
import { Link } from 'react-router-dom';

export default function CareerTrajectoryCommandHero({ onNewAnalysis }) {
  return (
    <header className="ct-page-head" data-testid="career-trajectory-command-hero">
      <div>
        <span className="ct-eyebrow">✦ AI Hiring Intelligence</span>
        <h1 data-testid="career-trajectory-heading">Candidate Fit Simulation Agent</h1>
        <p>
          Career trajectory analysis from CV — growth, maturity, complexity, and readiness signals.
        </p>
        <Link className="ct-link" to="/ai-hiring/candidate-fit/career-trajectory/compare">
          Compare multiple candidates
        </Link>
      </div>
      <button type="button" className="ct-btn primary" onClick={onNewAnalysis} data-testid="career-traj-new-analysis-btn">
        + New analysis
      </button>
    </header>
  );
}
