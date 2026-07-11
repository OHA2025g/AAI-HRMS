import React from 'react';
import { buildResultChips, riskChipClass, riskChipLabel } from '@/shared/lib/phase2FitCommandUtils';

export default function Phase2FitResultCard({ report }) {
  if (!report) {
    return (
      <div className="p2-card p2-score-panel">
        <div className="p2-section-title">
          <h3>Contextual fit result</h3>
        </div>
        <p className="p2-muted">No Phase 2 report yet. Run simulation after Phase 1 analysis.</p>
      </div>
    );
  }

  const score = Math.round(report.overall_contextual_fit_score ?? 0);
  const chips = buildResultChips(report);
  const riskLevel = report.manager_fit?.risk_level;

  return (
    <div className="p2-card p2-score-panel">
      <div className="p2-section-title">
        <h3>Contextual fit result</h3>
        {riskLevel ? (
          <span className={riskChipClass(riskLevel)} data-testid="phase2-risk-chip">
            {riskChipLabel(riskLevel)}
          </span>
        ) : null}
      </div>
      <div className="p2-big" data-testid="phase2-contextual-fit-score">
        {score}
        <span>% contextual fit</span>
      </div>
      <p className="p2-summary">{report.executive_summary}</p>
      <div className="p2-chips">
        {chips.map((chip) => (
          <span key={chip.label} className={chip.className}>
            {chip.label}
          </span>
        ))}
      </div>
    </div>
  );
}
