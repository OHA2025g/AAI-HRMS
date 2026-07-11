import React from 'react';
import { Link } from 'react-router-dom';
import { ROUND_TABS, getTabCount } from '@/shared/lib/pipelineCommandUtils';

export default function PipelineJobSummaryBar({ job, pipeline, activeTab }) {
  if (!job) return null;

  const activeLabel = ROUND_TABS.find((t) => t.key === activeTab)?.label || 'Pipeline';

  return (
    <section className="pl-summary">
      <div className="pl-job-title">
        <div className="pl-job-icon" aria-hidden>
          ♙
        </div>
        <div>
          <b>{job.title}</b>
          <span>
            {job.candidate_count ?? 0} candidates total · {activeLabel} active
          </span>
        </div>
      </div>
      {ROUND_TABS.map((tab) => (
        <div
          key={tab.key}
          className={`pl-stage-stat ${activeTab === tab.key ? 'active' : ''}`}
        >
          <b>{getTabCount(pipeline, tab)}</b>
          <span>{tab.shortLabel || tab.label}</span>
        </div>
      ))}
    </section>
  );
}

export function PipelineSummaryInterview({ job, pipeline, activeTab }) {
  if (!job) return null;
  const interviewCount = getTabCount(pipeline, ROUND_TABS.find((t) => t.key === activeTab) || ROUND_TABS[3]);

  return (
    <section className="pl-summary pl-summary-interview">
      <div className="pl-job">
        <div className="pl-jobicon" aria-hidden>
          ♙
        </div>
        <div>
          <b>{job.title}</b>
          <small>
            {job.candidate_count ?? 0} candidates total · {interviewCount} currently in interview
          </small>
        </div>
      </div>
      {ROUND_TABS.map((tab) => (
        <div
          key={tab.key}
          className={`pl-stage-num ${activeTab === tab.key ? 'active' : ''}`}
        >
          <strong>{getTabCount(pipeline, tab)}</strong>
          <span>{tab.label}</span>
        </div>
      ))}
    </section>
  );
}

export function PipelineSummarySalary({ job, pipeline, activeTab }) {
  if (!job) return null;

  return (
    <section className="pl-summary pl-summary-salary">
      <div className="pl-job-info">
        <div className="pl-job-icon" aria-hidden>
          ♙
        </div>
        <div>
          <h3>{job.title}</h3>
          <span>{job.candidate_count ?? 0} candidates total · High priority role</span>
        </div>
      </div>
      {ROUND_TABS.map((tab) => (
        <div key={tab.key} className={`pl-metric ${activeTab === tab.key ? 'active' : ''}`}>
          <b>{getTabCount(pipeline, tab)}</b>
          <span>{tab.shortLabel || tab.label}</span>
        </div>
      ))}
    </section>
  );
}

export function PipelineViewJobLink({ jobId }) {
  if (!jobId) return null;
  return (
    <Link to={`/jobs/${jobId}`} className="pl-btn">
      👁 View Job
    </Link>
  );
}
