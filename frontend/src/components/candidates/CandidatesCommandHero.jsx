import React from 'react';
import { Link } from 'react-router-dom';
import { fmtNum } from '../../lib/candidatesCommandUtils';

export default function CandidatesCommandHero({
  subtitle,
  canBulkImport,
  canAddCandidate,
  onAddClick,
}) {
  return (
    <header className="top" data-testid="candidates-command-hero">
      <div>
        <h1 data-testid="candidates-heading">Candidate Intelligence</h1>
        <p>{subtitle}</p>
      </div>
      <div className="actions">
        {canBulkImport ? (
          <Link to="/candidates/import" className="btn" data-testid="bulk-import-btn">
            ⇧ Bulk Import
          </Link>
        ) : null}
        {canAddCandidate ? (
          <button type="button" className="btn primary" onClick={onAddClick} data-testid="add-candidate-btn">
            + Add Candidate
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function formatCandidatesSubtitle(totalCount) {
  return `${fmtNum(totalCount)} candidates enriched with AI fit, skills, trajectory and pipeline readiness.`;
}
