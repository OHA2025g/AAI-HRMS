import React from 'react';
import { Loader2 } from 'lucide-react';
import { formatReportHistoryRow } from '../../../lib/careerTrajectoryCommandUtils';

export default function CareerTrajectoryReportHistory({
  rows,
  loading,
  onView,
  onDelete,
}) {
  return (
    <section className="ct-card ct-history" data-testid="career-traj-report-history">
      <h3>Report history</h3>
      <p className="ct-muted">Past trajectory analyses for this candidate.</p>

      {loading ? (
        <div className="ct-loading-inline">
          <Loader2 className="ct-spinner" aria-hidden />
        </div>
      ) : rows.length === 0 ? (
        <p className="ct-muted">No reports yet. Run an analysis above.</p>
      ) : (
        <table className="ct-table">
          <thead>
            <tr>
              <th>Created</th>
              <th>Overall</th>
              <th>Archetype</th>
              <th>Decision gate</th>
              <th className="ct-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const formatted = formatReportHistoryRow(row);
              return (
                <tr key={formatted.id}>
                  <td>{formatted.createdLabel}</td>
                  <td>
                    <span className="ct-score-link">{formatted.overallScore}</span>
                  </td>
                  <td>{formatted.archetype}</td>
                  <td>{formatted.decisionGate}</td>
                  <td className="ct-right ct-actions-cell">
                    <button type="button" className="ct-btn" onClick={() => onView(formatted.id)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="ct-btn danger"
                      onClick={() => onDelete(formatted.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
