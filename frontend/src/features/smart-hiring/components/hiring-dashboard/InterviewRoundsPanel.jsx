import React from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelinePathForStage } from '@/shared/lib/hiringDashboardDrill';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';

function roundRiskPill(row) {
  if ((row.active_count || 0) === 0) {
    return { label: 'No data', className: '' };
  }
  if (row.avg_days != null && row.avg_days >= 7) {
    return { label: 'Delayed', className: 'orange' };
  }
  if (row.conversion_to_next_pct === 0) {
    return { label: 'Delayed', className: 'orange' };
  }
  return { label: 'On track', className: 'green' };
}

export default function InterviewRoundsPanel({ interviewRoundMetrics = [] }) {
  const navigate = useNavigate();

  return (
    <div className="card interviews-rounds-card" data-testid="interview-rounds-panel">
      <div className="section-title interviews-rounds-title">
        <h2>{chartTitleCase('Interview rounds performance')}</h2>
        <span className="pill">Live stage view</span>
      </div>
      <div className="interviews-rounds-table-wrap">
        <table className="table interviews-rounds-table" aria-label="Interview round metrics">
          <thead>
            <tr>
              <th>Round</th>
              <th>Active</th>
              <th>Avg days</th>
              <th>Next %</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {interviewRoundMetrics.map((row) => {
              const risk = roundRiskPill(row);
              const rowTip = `${row.label}: ${row.active_count ?? 0} active · ${row.avg_days != null ? `${row.avg_days}d avg` : 'no avg age'} · ${row.conversion_to_next_pct != null ? `${row.conversion_to_next_pct}% to next` : 'no conversion data'}`;
              return (
                <tr key={row.stage} className="chart-hover-tip-row" title={rowTip}>
                  <td className="round">
                    <button
                      type="button"
                      className="interviews-round-link"
                      onClick={() => navigate(pipelinePathForStage(row.stage))}
                    >
                      {row.label}
                    </button>
                  </td>
                  <td>{row.active_count > 0 ? <b>{row.active_count}</b> : row.active_count}</td>
                  <td>{row.avg_days != null ? `${row.avg_days}d` : '—'}</td>
                  <td>{row.conversion_to_next_pct != null ? `${row.conversion_to_next_pct}%` : '—'}</td>
                  <td>
                    <span className={`pill ${risk.className}`.trim()}>{risk.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
