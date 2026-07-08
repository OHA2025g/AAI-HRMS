import React from 'react';
import AssessmentMetricGlossary from '../AssessmentMetricGlossary';

export default function AssessmentsCommandHero({
  tab,
  windowDays,
  onWindowChange,
  canGenerate,
  onGenerateClick,
  featureFlags,
}) {
  const titles = {
    overview: { title: 'Assessments Command Center', subtitle: 'AI tests, pipeline outcomes, assessment coverage and hire-quality signals.' },
    library: { title: 'Assessment Library', subtitle: 'Create, manage, invite, and monitor AI-powered assessments across open roles.' },
    'in-progress': { title: 'Assessments', subtitle: 'AI tests, pipeline outcomes, scoring queues, and hire-quality signals.' },
    results: { title: 'Assessments', subtitle: 'AI tests, pipeline outcomes, and hire-quality signals' },
    insights: { title: 'Assessments', subtitle: 'AI tests, pipeline outcomes, and hire-quality signals' },
  };
  const { title, subtitle } = titles[tab] || titles.overview;

  return (
    <header className="as-page-head" data-testid="assessments-command-hero">
      <div>
        <h1 data-testid="assessments-heading">{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="as-toolbar">
        <AssessmentMetricGlossary featureFlags={featureFlags} commandStyle />
        <div className="as-period-toggle" role="group" aria-label="Analytics period">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              className={windowDays === d ? 'active' : ''}
              onClick={() => onWindowChange(d)}
            >
              {d}d
            </button>
          ))}
        </div>
        {canGenerate ? (
          <button type="button" className="as-btn primary" onClick={onGenerateClick} data-testid="create-assessment-btn">
            ✦ Generate Assessment
          </button>
        ) : null}
      </div>
    </header>
  );
}
