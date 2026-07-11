import React from 'react';
import { Link } from 'react-router-dom';
import { fmtNum, initials, pipelineStageRows } from '@/shared/lib/jobsCommandUtils';

const ACTION_ICONS = {
  escalate: '⚠',
  candidates: '♙',
  interviews: '▧',
  default: '◈',
};

export default function JobsCommandSidebar({ pack }) {
  const insights = (pack?.ai_insights || []).slice(0, 3);
  const stages = pipelineStageRows(pack?.pipeline_by_stage || {});
  const owners = (pack?.recruiter_performance || []).slice(0, 3);
  const actions = (pack?.smart_actions || []).slice(0, 3);

  return (
    <aside className="jobs-side" data-testid="jobs-command-sidebar">
      <div className="card jobs-ai-insights-card">
        <div className="section-title jobs-ai-insights-head">
          <h2>AI Job Insights</h2>
          <Link to="/dashboard?tab=signals" className="jobs-ai-insights-link">
            View all →
          </Link>
        </div>
        <div className="jobs-ai-insights-list">
          {insights.length > 0 ? (
            insights.map((item, i) => (
              <div key={`${item.title}-${i}`} className={`jobs-ai-insight insight ${item.severity || 'blue'}`}>
                <h4>{item.title}</h4>
                <p>{item.message}</p>
                {item.action_path ? (
                  <Link to={item.action_path} className="mini-btn">
                    {item.action_label || 'View details'}
                  </Link>
                ) : null}
              </div>
            ))
          ) : (
            <div className="jobs-ai-insight insight blue">
              <h4>No insights yet</h4>
              <p>AI insights appear once jobs and candidates are active in the pipeline.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="jobs-side-heading">Pipeline by Stage</h3>
        {stages.map((stage) => (
          <React.Fragment key={stage.key}>
            <div className="bars jobs-pipeline-row">
              <span>{stage.label}</span>
              <b>{fmtNum(stage.count)}</b>
            </div>
            <div className="bar">
              <i style={{ width: `${stage.pct}%` }} />
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="card">
        <h3 className="jobs-side-heading">Owner Workload</h3>
        {owners.length > 0 ? (
          owners.map((owner) => (
            <div key={owner.recruiter_id || owner.recruiter_name} className="jobs-owner">
              <span className="avatar">{initials(owner.recruiter_name)}</span>
              <div>
                <b>{owner.recruiter_name}</b>
                <br />
                <small>
                  {owner.reqs} jobs
                  {owner.fill_rate_pct != null ? ` · ${Math.round(owner.fill_rate_pct)}% fill rate` : ''}
                </small>
              </div>
            </div>
          ))
        ) : (
          <p className="jobs-side-empty">Assign recruiters to jobs to see workload.</p>
        )}
      </div>

      <div className="card">
        <h3 className="jobs-side-heading">Smart Action Center</h3>
        {actions.length > 0 ? (
          actions.map((action, i) => (
            <Link
              key={`${action.id || action.label}-${i}`}
              to={action.action_path || '/dashboard'}
              className="jobs-action-card"
            >
              <span className="jobs-action-ico">{ACTION_ICONS[action.id] || ACTION_ICONS.default}</span>
              <div>
                <b>{action.label}</b>
                <small>{action.status === 'done' ? 'Completed' : 'Needs attention'}</small>
              </div>
              {action.count ? <span className="pill">{action.count}</span> : null}
            </Link>
          ))
        ) : (
          <div className="jobs-action-card">
            <span className="jobs-action-ico">✓</span>
            <div>
              <b>All caught up</b>
              <small>No urgent job actions</small>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
