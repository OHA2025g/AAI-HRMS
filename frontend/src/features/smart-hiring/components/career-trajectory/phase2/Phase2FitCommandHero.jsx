import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function Phase2FitCommandHero({ onRun, loading = false, disabled = false }) {
  return (
    <header className="p2-page-head" data-testid="phase2-fit-command-hero">
      <div>
        <div className="p2-eyebrow">👥 AI Hiring Intelligence</div>
        <h1 data-testid="phase2-fit-heading">
          Contextual Fit Simulation <span className="p2-title-accent">(Phase 2)</span>
        </h1>
        <p>
          Leadership style, communication, role-context and manager-fit analysis built on Phase 1
          trajectory.
        </p>
        <Link className="p2-link" to="/ai-hiring/candidate-fit/career-trajectory">
          Back to Phase 1 analyzer
        </Link>
      </div>
      <button
        type="button"
        className="p2-btn primary"
        onClick={onRun}
        disabled={disabled || loading}
        data-testid="phase2-hero-run-btn"
      >
        {loading ? <Loader2 className="p2-btn-spinner" aria-hidden /> : null}
        Run Phase 2 simulation
      </button>
    </header>
  );
}
