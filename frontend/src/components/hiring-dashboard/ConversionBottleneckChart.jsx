import React from 'react';
import ChartHoverTip from './ChartHoverTip';
import { chartTitleCase } from '../../lib/chartTitleCase';

const TRANSITIONS = [
  { label: 'Screening → I1', stage: 'INTERVIEW_1' },
  { label: 'I1 → I2', stage: 'INTERVIEW_2' },
  { label: 'I2 → I3', stage: 'INTERVIEW_3' },
  { label: 'HR → Offer', stage: 'OFFER' },
];

function buildInterviewConversionBars(funnel) {
  const byStage = Object.fromEntries((funnel || []).map((row) => [row.stage, row]));

  return TRANSITIONS.map(({ label, stage }) => {
    const row = byStage[stage];
    const pct = row?.conversion_from_prev_pct;
    const hasData = pct != null;
    let barClass = '';
    if (hasData && pct >= 50) barClass = 'green';
    else if (hasData && pct <= 0) barClass = 'orange';
    else if (hasData) barClass = 'orange';

    return {
      label,
      stage,
      count: row?.count,
      width: hasData ? Math.min(100, Math.max(0, pct)) : 0,
      display: hasData ? `${pct}%` : '—',
      barClass,
      pct,
    };
  });
}

function buildBottleneckInsight(interviewRoundMetrics, conversionBottleneck) {
  const topBottleneck = (conversionBottleneck || [])[0];
  if (topBottleneck?.label && topBottleneck?.median_days != null) {
    return `${topBottleneck.label} is the slowest stage with ${topBottleneck.median_days}d median dwell.`;
  }

  const delayed = (interviewRoundMetrics || []).find(
    (row) => (row.active_count || 0) > 0 && ((row.avg_days != null && row.avg_days >= 7) || row.conversion_to_next_pct === 0)
  );
  if (delayed?.label) {
    return `Clear pending decisions in ${delayed.label} before adding new interview slots.`;
  }
  return 'No major interview bottleneck detected in the current window.';
}

export default function ConversionBottleneckChart({
  funnel = [],
  interviewRoundMetrics = [],
  conversionBottleneck = [],
}) {
  const bars = buildInterviewConversionBars(funnel);
  const insight = buildBottleneckInsight(interviewRoundMetrics, conversionBottleneck);

  return (
    <div className="card interviews-bottleneck-card" data-testid="conversion-bottleneck-chart">
      <div className="section-title interviews-bottleneck-title">
        <h2>{chartTitleCase('Conversion bottleneck')}</h2>
        <span className="pill orange">Attention</span>
      </div>
      <div className="bars interviews-bottleneck-bars">
        {bars.map((row) => (
          <ChartHoverTip
            key={row.label}
            as="div"
            className="bar-row"
            tip={
              row.pct != null
                ? `${row.label}: ${row.pct}% conversion${row.count != null ? ` · ${row.count} in stage` : ''}`
                : `${row.label}: no conversion data`
            }
          >
            <span>{row.label}</span>
            <div className={`bar ${row.barClass}`.trim()}>
              <i style={{ width: `${row.width}%` }} />
            </div>
            <b>{row.display}</b>
          </ChartHoverTip>
        ))}
      </div>
      <p className="sub interviews-bottleneck-note">{insight}</p>
    </div>
  );
}
