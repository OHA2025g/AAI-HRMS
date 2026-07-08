import React from 'react';
import {
  buildSummaryTags,
  formatScoreRaw,
  overallScoreValue,
  scoreRingStyle,
} from '../../../lib/candidateDetailTrajectoryUtils';
import { chartTitleCase } from '../../../lib/chartTitleCase';

export default function TrajectorySummaryCard({ report, phase2Report }) {
  const overall = overallScoreValue(report);
  const tags = buildSummaryTags(report, phase2Report);

  return (
    <div className="cdt-summary-card" data-testid="trajectory-summary-card">
      <div
        className="cdt-score-ring"
        style={scoreRingStyle(overall)}
        aria-label={`Overall trajectory score ${formatScoreRaw(overall)} percent`}
      >
        <div className="cdt-score-inner">
          <b>{formatScoreRaw(overall)}</b>
          <span>Score / 100</span>
        </div>
      </div>
      <div className="cdt-summary-copy">
        <h3>{chartTitleCase('Career trajectory summary')}</h3>
        <p>{report?.executive_summary || 'Career trajectory analysis summary will appear here after analysis.'}</p>
        <div className="cdt-chip-row">
          {tags.map((tag) => (
            <span key={tag.label} className={`cdt-chip cdt-chip-${tag.variant}`}>
              {tag.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
