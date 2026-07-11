import React from 'react';
import {
  barWidthPercent,
  buildPhase1Metrics,
  confidenceLabel,
  formatScorePercent,
} from '@/shared/lib/candidateDetailTrajectoryUtils';

export default function Phase1MetricsGrid({ report }) {
  const metrics = buildPhase1Metrics(report);

  return (
    <div className="cdt-metric-grid" data-testid="trajectory-phase1-metrics">
      {metrics.map((metric) => {
        const score = metric.scoreData?.score;
        const text = metric.scoreData?.explanation || metric.fallbackText;
        return (
          <article key={metric.key} className="cdt-metric-card">
            <div className="cdt-metric-label">
              <span className="cdt-metric-dot" />
              {metric.label}
            </div>
            <div className={`cdt-metric-value ${metric.valueClass || ''}`}>
              {formatScorePercent(score)}
            </div>
            <div className="cdt-metric-text">{text}</div>
            <div className={`cdt-mini-bar ${metric.barClass || ''}`}>
              <i style={{ width: `${barWidthPercent(score)}%` }} />
            </div>
            <div className="cdt-confidence">Confidence: {confidenceLabel(metric.scoreData)}</div>
          </article>
        );
      })}
    </div>
  );
}
