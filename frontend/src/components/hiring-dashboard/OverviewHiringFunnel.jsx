import React from 'react';
import { aggregateOverviewFunnel } from '../../lib/aggregateOverviewFunnel';
import ChartHoverTip from './ChartHoverTip';

function fmtNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '0';
  return Number(value).toLocaleString();
}

export default function OverviewHiringFunnel({ funnel = [] }) {
  const rows = aggregateOverviewFunnel(funnel);
  if (!rows.length) return null;

  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="funnel overview-funnel" data-testid="overview-funnel">
      <div className="funnel-shape" aria-hidden data-testid="overview-funnel-shape" />
      <div className="funnel-list" data-testid="overview-funnel-list">
        {rows.map((row) => (
          <ChartHoverTip
            key={row.key}
            as="div"
            className="funnel-list-row"
            tip={`${row.label}: ${fmtNum(row.count)} candidates (${Math.round((row.count / maxCount) * 100)}% of top stage)`}
          >
            {row.label} <b>{fmtNum(row.count)}</b>
          </ChartHoverTip>
        ))}
      </div>
    </div>
  );
}
