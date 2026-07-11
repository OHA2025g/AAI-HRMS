import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { pipelinePathForStage } from '@/shared/lib/hiringDashboardDrill';
import ChartHoverTip from '../ChartHoverTip';

const BAR_FILL_CLASS = {
  SOURCED: '',
  SCREENING: 'green',
  ASSESSMENT_SENT: 'pink',
  ASSESSMENT_CLEARED: 'orange',
  INTERVIEW_1: 'green',
  INTERVIEW_2: '',
  INTERVIEW_3: '',
  HR_ROUND: '',
  OFFER: '',
  JOINED: '',
};

function fmtNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '0';
  return Number(value).toLocaleString();
}

function HorizontalPipelineFunnel({ funnel = [] }) {
  const max = Math.max(...funnel.map((f) => f.count), 1);
  const pillStages = funnel.filter((row) => row.count > 0).slice(0, 6);

  return (
    <div className="card funnel-card">
      <div className="section-title">
        <h2>Pipeline Funnel</h2>
        <Link to="/pipeline">View as table →</Link>
      </div>
      <div className="bar-chart">
        {funnel.map((row) => {
          const pct = max > 0 ? (row.count / max) * 100 : 0;
          const fillClass = BAR_FILL_CLASS[row.stage] || '';
          const conv = row.conversion_from_prev_pct;
          const tip = conv != null
            ? `${row.label}: ${fmtNum(row.count)} candidates (${conv}% from previous stage)`
            : `${row.label}: ${fmtNum(row.count)} candidates`;
          return (
            <ChartHoverTip
              key={row.stage}
              as={Link}
              to={pipelinePathForStage(row.stage)}
              className="bar-row"
              style={{ textDecoration: 'none', color: 'inherit' }}
              tip={tip}
            >
              <div className="bar-label">{row.label}</div>
              <div className="bar-track">
                <div className={cn('bar-fill', fillClass)} style={{ width: `${pct}%` }} />
              </div>
              <div className="bar-value">{fmtNum(row.count)}</div>
            </ChartHoverTip>
          );
        })}
      </div>
      {pillStages.length ? (
        <div className="stage-pills">
          {pillStages.map((row) => (
            <span key={row.stage}>
              {row.label} <b>{fmtNum(row.count)}</b>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function alertSeverityClass(severity) {
  if (severity === 'critical') return 'red';
  if (severity === 'info') return 'info';
  return '';
}

function alertDisplayTitle(alert) {
  const title = alert.title || '';
  if (title.startsWith('⚠') || title.startsWith('💡')) return title;
  if (alert.severity === 'critical' || alert.severity === 'warning') return `⚠ ${title}`;
  if (alert.severity === 'info') return `💡 ${title}`;
  return title;
}

function AlertsPanelMock({ alerts = [] }) {
  const visible = alerts.slice(0, 3);
  return (
    <div className="card pipeline-alerts-card">
      <div className="section-title">
        <h3>AI Alerts</h3>
        <Link to="/pipeline">Manage →</Link>
      </div>
      <div className="alerts">
        {visible.map((alert) => (
          <div
            key={alert.id || alert.title}
            className={cn('alert', alertSeverityClass(alert.severity))}
          >
            <div className="alert-top">
              <h4>{alertDisplayTitle(alert)}</h4>
              <b>{alert.count ?? alert.metric ?? '—'}</b>
            </div>
            <p>{alert.message}</p>
            {alert.action_path ? (
              <Link to={alert.action_path}>{alert.action_label || 'Review candidates →'}</Link>
            ) : (
              <span className="alert-link-placeholder">Review candidates →</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const SNAPSHOT_STAGES = [
  { key: 'SOURCED', label: 'Sourced' },
  { key: 'SCREENING', label: 'Screening' },
  { key: 'ASSESSMENT_SENT', label: 'Assessment' },
  { key: 'ASSESSMENT_CLEARED', label: 'Cleared' },
  { key: 'INTERVIEW_1', label: 'Interview' },
  { key: 'OFFER', label: 'Offer' },
];

export default function PipelineTabContent({ pack, alerts, dismissed, onDismiss }) {
  const kpis = pack?.tab_kpis?.pipeline || {};
  const topAlert = (pack?.alerts || [])[0];
  const pipelineByStage = pack?.pipeline_by_stage || {};
  const smartActions = pack?.smart_actions || [];

  return (
    <div data-testid="dash-funnel">
      <section className="pipeline-kpis">
        <div className="card pkpi">
          <h3>Total Pipeline</h3>
          <div className="num">{fmtNum(kpis.total)}</div>
          <p>{kpis.total ? `${kpis.total} active candidates` : 'No active candidates'}</p>
        </div>
        <div className="card pkpi">
          <h3>Sourced Candidates</h3>
          <div className="num">{fmtNum(kpis.sourced)}</div>
          <p>
            {kpis.total ? `${((kpis.sourced / kpis.total) * 100).toFixed(1)}%` : '0%'} of total pipeline
          </p>
        </div>
        <div className="card pkpi">
          <h3>Assessment Pending</h3>
          <div className="num">{fmtNum(kpis.assessment_pending)}</div>
          <p>
            <span className="down">{kpis.stuck_assessment ?? 0} stuck</span> beyond SLA
          </p>
        </div>
        <div className="card pkpi">
          <h3>Interview Ready</h3>
          <div className="num">{fmtNum(kpis.interview_ready)}</div>
          <p>{kpis.interview_ready ?? 0} candidates in Interview 1</p>
        </div>
      </section>

      <section className="content-grid">
        <HorizontalPipelineFunnel funnel={pack?.funnel} />
        <AlertsPanelMock alerts={alerts} dismissedIds={dismissed} onDismiss={onDismiss} />
      </section>

      {topAlert ? (
        <section className="recommendation-strip">
          <div>
            <h3>Suggested Action: {topAlert.title}</h3>
            <p>{topAlert.message}</p>
          </div>
          <div className="rec-actions">
            <button type="button" className="btn">
              Export List
            </button>
            {topAlert.action_path ? (
              <Link to={topAlert.action_path} className="btn primary-btn">
                Take Action →
              </Link>
            ) : (
              <button type="button" className="btn primary-btn">
                Take Action →
              </button>
            )}
          </div>
        </section>
      ) : null}

      <section className="pipeline-bottom">
        <div className="card">
          <div className="section-title">
            <h3>Pipeline Snapshot</h3>
            <Link to="/pipeline">Open pipeline →</Link>
          </div>
          <div className="snapshot">
            {SNAPSHOT_STAGES.map(({ key, label }) => (
              <div key={key} className="snap">
                <small>{label}</small>
                <b>{fmtNum(pipelineByStage[key])}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Smart Actions</h3>
            <Link to="/pipeline">View all →</Link>
          </div>
          <div className="action-list">
            {smartActions.slice(0, 3).map((a, i) => (
              <div key={a.id} className="action-item">
                <div className="iconbox">{i === 0 ? '✓' : i === 1 ? '⏱' : 'AI'}</div>
                <div>
                  <b>{a.label}</b>
                  <small>
                    {a.count} {a.count === 1 ? 'candidate' : 'candidates'} pending
                  </small>
                </div>
                {a.action_path ? (
                  <Link to={a.action_path} className="mini-btn">
                    Review
                  </Link>
                ) : (
                  <button type="button" className="mini-btn">
                    Review
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
