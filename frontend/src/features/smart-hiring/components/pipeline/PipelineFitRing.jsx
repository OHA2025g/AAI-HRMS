import React from 'react';
import { getFitTier, getOverallFitScore, ringGradientStyle } from '@/shared/lib/jobDetailCandidatesUtils';

export default function PipelineFitRing({ app, size = 'md', className = '' }) {
  const score = getOverallFitScore(app);
  const tier = getFitTier(score);
  const display = score != null ? `${score}%` : '—';
  const ringClass =
    tier.ringClass === 'green' ? 'pl-ring-green' : tier.ringClass === 'purple' ? 'pl-ring-purple' : 'pl-ring-blue';

  return (
    <div
      className={`pl-ring ${size === 'sm' ? 'pl-ring-sm' : ''} ${ringClass} ${className}`}
      style={ringGradientStyle(score, tier.ringClass)}
      aria-label={score != null ? `Overall fit ${score}%` : 'Fit score pending'}
    >
      <span>{display}</span>
    </div>
  );
}
