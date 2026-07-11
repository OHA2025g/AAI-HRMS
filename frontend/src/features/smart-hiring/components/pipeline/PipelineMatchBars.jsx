import React from 'react';
import { FIT_EXCELLENT_MIN, getFitMetrics, getOverallFitScore } from '@/shared/lib/jobDetailCandidatesUtils';

function barFillClass(score, overall) {
  const ref = overall ?? score;
  if (ref != null && ref >= FIT_EXCELLENT_MIN) return 'pl-bar-fill-green';
  return 'pl-bar-fill-purple';
}

export default function PipelineMatchBars({ app, variant = 'default' }) {
  const overall = getOverallFitScore(app);
  const metrics = getFitMetrics(app?.fit_score);

  if (!metrics.length) {
    return (
      <div className="pl-match pl-match-empty">
        <span className="pl-muted">Fit breakdown pending</span>
      </div>
    );
  }

  const rowClass = variant === 'stacked' ? 'pl-barline-stacked' : 'pl-barline';

  return (
    <div className={`pl-match ${variant === 'compact' ? 'pl-match-compact' : ''}`}>
      {metrics.map(({ key, label, score }) => (
        <div key={key} className={rowClass}>
          {variant === 'stacked' ? (
            <>
              <div className="pl-barline-row">
                <span>{label}</span>
                <b>{score}%</b>
              </div>
              <div className="pl-bar">
                <i style={{ width: `${score}%` }} className={barFillClass(score, overall)} />
              </div>
            </>
          ) : (
            <>
              <span>{label}</span>
              <div className="pl-bar">
                <i style={{ width: `${score}%` }} className={barFillClass(score, overall)} />
              </div>
              <b>{score}%</b>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
