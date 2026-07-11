import React from 'react';
import ChartHoverTip from './ChartHoverTip';

function pillNode(level) {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'medium') {
    return <span className="pill medium">Medium</span>;
  }
  if (normalized === 'low') {
    return <span className="pill low">Low</span>;
  }
  return <span className="pill">High</span>;
}

function dotbarNode(level, count) {
  const isLow = String(level || '').toLowerCase() === 'low';
  const dotCount = Math.max(1, count || 1);
  return (
    <span className={isLow ? 'dotbar low' : 'dotbar'} aria-hidden>
      {Array.from({ length: dotCount }).map((_, i) => (
        <span key={i} />
      ))}
    </span>
  );
}

export default function DepartmentRiskHeatmap({ rows = [] }) {
  if (!rows.length) return null;

  return (
    <div className="dots dept-risk-rows" data-testid="department-risk-rows">
      {rows.map((row) => (
        <ChartHoverTip
          key={row.department}
          as="div"
          className="dotrow dept-risk-row"
          tip={`${row.department}: ${row.risk_level || 'High'} risk · ${row.open_roles ?? row.dot_count ?? 0} open role(s)`}
        >
          <span className="dept-risk-name" title={row.department}>
            {row.department}
          </span>
          <div className="dept-risk-pill">{pillNode(row.risk_level)}</div>
          <div className="dept-risk-dots">{dotbarNode(row.risk_level, row.dot_count)}</div>
        </ChartHoverTip>
      ))}
    </div>
  );
}
