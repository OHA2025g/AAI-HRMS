import React from 'react';
import {
  ROUND_TABS,
  buildScreeningAiAction,
  getTabCount,
} from '../../lib/pipelineCommandUtils';

export default function PipelineCommandHero({
  job,
  pipeline,
  activeTab,
  screeningApps,
}) {
  if (!job) return null;

  const screeningAction = buildScreeningAiAction(screeningApps);

  if (activeTab === 'SCREENING') {
    return (
      <div className="pl-hero pl-hero-screening">
        <div className="pl-job">
          <div className="pl-icon" aria-hidden>
            ♙
          </div>
          <div>
            <h3>{job.title}</h3>
            <p>
              {job.candidate_count ?? 0} candidates total · {screeningApps.length} currently in screening
            </p>
          </div>
        </div>
        <div className="pl-stage-metrics">
          {ROUND_TABS.map((tab) => (
            <div key={tab.key} className="pl-m">
              <b>{getTabCount(pipeline, tab)}</b>
              <span>{tab.shortLabel || tab.label}</span>
            </div>
          ))}
        </div>
        <div className="pl-ai-box">
          <b>AI next-best action</b>
          <p>{screeningAction}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-hero pl-hero-sourced">
      <div className="pl-job-title-block">
        <div className="pl-job-icon" aria-hidden>
          ♙
        </div>
        <div>
          <h2>{job.title}</h2>
          <p className="pl-muted">
            {job.candidate_count ?? 0} candidates total
            {job.business_department ? ` • ${job.business_department}` : ''}
            {job.seniority ? ` • ${job.seniority}` : ''}
          </p>
          {job.status === 'OPEN' ? (
            <span className="pl-badge-open">Open requisition</span>
          ) : null}
        </div>
      </div>
      <div className="pl-stats">
        {ROUND_TABS.map((tab) => (
          <div key={tab.key} className="pl-stat">
            <b>{getTabCount(pipeline, tab)}</b>
            <span>{tab.shortLabel || tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
