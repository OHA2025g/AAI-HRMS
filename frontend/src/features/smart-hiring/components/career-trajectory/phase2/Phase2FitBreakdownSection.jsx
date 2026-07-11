import React from 'react';
import { computeFitBreakdown, buildTimelineSteps } from '@/shared/lib/phase2FitCommandUtils';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';

export default function Phase2FitBreakdownSection({ report, phase1Meta }) {
  if (!report) return null;

  const breakdown = computeFitBreakdown(report, phase1Meta);
  const timeline = buildTimelineSteps(report, phase1Meta);

  return (
    <section className="p2-two" data-testid="phase2-breakdown-section">
      <div className="p2-card">
        <div className="p2-section-title">
          <h3>{chartTitleCase('Fit breakdown')}</h3>
          <span className="p2-link p2-link-muted">View explainability</span>
        </div>
        {breakdown.map((item) => (
          <div key={item.key} className="p2-metric p2-metric-inline">
            <h4>{item.label}</h4>
            <b>{item.value}%</b>
            <div className="p2-progress">
              <i className={item.barClass || ''} style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="p2-card">
        <div className="p2-section-title">
          <h3>{chartTitleCase('Simulation timeline')}</h3>
          <span className="p2-chip p">Phase 2</span>
        </div>
        <div className="p2-timeline" data-testid="phase2-timeline">
          {timeline.map((step) => (
            <div key={step.title} className="p2-t">
              <b>{step.title}</b>
              <small>{step.detail}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
