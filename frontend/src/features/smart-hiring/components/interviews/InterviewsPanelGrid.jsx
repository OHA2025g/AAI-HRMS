import React from 'react';
import { buildPanelPerformanceRows } from '@/shared/lib/interviewsCommandUtils';

function qualityClass(variant) {
  if (variant === 'warn') return 'iv-tag iv-tag-warn';
  return 'iv-score-pill';
}

export default function InterviewsPanelGrid({ interviews, showPanelTable = true }) {
  const rows = buildPanelPerformanceRows(interviews);

  if (!showPanelTable) {
    return (
      <section className="iv-panel-grid" data-testid="interviews-panel-grid">
        <div className="iv-card">
          <h3>Interview Load Trend</h3>
          <div className="iv-mini-chart" aria-hidden />
        </div>
      </section>
    );
  }

  return (
    <section className="iv-panel-grid" data-testid="interviews-panel-grid">
      <div className="iv-card">
        <h3>Interview Load Trend</h3>
        <div className="iv-mini-chart" aria-hidden />
      </div>
      <div className="iv-card">
        <h3>Panel Performance</h3>
        <table className="iv-table">
          <thead>
            <tr>
              <th>Panel</th>
              <th>Assigned</th>
              <th>Feedback SLA</th>
              <th>Quality</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.panel}>
                <td>{row.panel}</td>
                <td>{row.assigned}</td>
                <td>{row.sla}%</td>
                <td>
                  <span className={qualityClass(row.qualityVariant)}>{row.quality}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function InterviewsCalendarPlaceholder() {
  return (
    <div className="iv-card iv-calendar-placeholder" data-testid="interviews-calendar-placeholder">
      <h3>Calendar View</h3>
      <p>Interview calendar scheduling view will appear here.</p>
      <div className="iv-calendar-grid" aria-hidden>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className={`iv-calendar-cell ${i % 7 === 0 || i % 7 === 6 ? 'muted' : ''}`} />
        ))}
      </div>
    </div>
  );
}
