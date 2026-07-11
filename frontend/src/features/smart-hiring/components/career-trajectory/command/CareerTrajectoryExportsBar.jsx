import React from 'react';
import { Link } from 'react-router-dom';

export default function CareerTrajectoryExportsBar({
  reportId,
  candidateId,
  jobId,
  onExport,
  onFitPack,
  onReAnalyze,
}) {
  if (!reportId) return null;

  return (
    <div className="ct-exports">
      <button type="button" className="ct-btn" onClick={() => onExport('json')} data-testid="career-traj-export-json">
        ⇩ Export JSON
      </button>
      <button type="button" className="ct-btn" onClick={() => onExport('pdf')} data-testid="career-traj-export-pdf">
        Export PDF
      </button>
      <button type="button" className="ct-btn" onClick={() => onExport('csv')} data-testid="career-traj-export-csv">
        Export CSV
      </button>
      <button type="button" className="ct-btn" onClick={() => onExport('xlsx')}>
        Export XLSX
      </button>
      {candidateId ? (
        <button
          type="button"
          className="ct-btn"
          onClick={onFitPack}
          data-testid="career-traj-export-fit-pack"
        >
          Export fit pack (P1+P2)
        </button>
      ) : null}
      {candidateId ? (
        <Link
          className="ct-btn"
          to={`/ai-hiring/candidate-fit/phase2?candidate_id=${candidateId}&trajectory_report_id=${reportId}${jobId ? `&job_id=${jobId}` : ''}`}
        >
          Phase 2 fit
        </Link>
      ) : null}
      {candidateId ? (
        <button type="button" className="ct-btn" onClick={onReAnalyze}>
          Re-analyze
        </button>
      ) : null}
    </div>
  );
}
