import React from 'react';
import { computeKpiMetrics } from '@/shared/lib/phase2FitCommandUtils';

export default function Phase2FitMetricsGrid({ report }) {
  if (!report) return null;

  const metrics = computeKpiMetrics(report);

  return (
    <section className="p2-grid4" data-testid="phase2-kpi-grid">
      {metrics.map((metric) => (
        <div key={metric.key} className="p2-card p2-metric" data-testid={`phase2-kpi-${metric.key}`}>
          <h4>{metric.label}</h4>
          <b className={metric.valueClass || ''}>{metric.value}%</b>
          <small>{metric.hint}</small>
          <div className="p2-progress">
            <i className={metric.barClass || ''} style={{ width: `${metric.value}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}
