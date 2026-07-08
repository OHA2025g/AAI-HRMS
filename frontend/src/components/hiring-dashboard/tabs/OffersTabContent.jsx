import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import ChartHoverTip from '../ChartHoverTip';

function lifecycleStepClass(index) {
  if (index === 0) return 'done';
  if (index === 1) return 'current';
  return '';
}

function formatOfferSalary(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const lakhs = n >= 100000 ? n / 100000 : n;
  const formatted = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1);
  return `₹${formatted}L`;
}

function formatEnteredDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB');
}

function buildOfferFunnelRows(pack) {
  const joined = pack?.pipeline_by_stage?.JOINED ?? 0;
  const funnelRows = (pack?.offer_funnel || [])
    .filter((row) => row.stage !== 'OFFER_DECLINED')
    .map((row) => ({ label: row.label, count: row.count ?? 0 }));

  if (joined > 0) {
    funnelRows.push({ label: 'Joined', count: joined });
  }

  return funnelRows;
}

function buildPriorityActions(pack) {
  return (pack?.offer_priority_actions || []).map((row) => ({
    ...row,
    subtitle: row.subtitle || row.job_title || 'Offer in progress',
  }));
}

function exportOfferAgingCsv(rows) {
  if (!rows.length) return;
  const header = ['Candidate', 'Role', 'Offer value', 'Days', 'Status', 'Entered'];
  const body = rows.map((row) => [
    row.candidate_name,
    row.job_title,
    row.offer_value ?? '',
    `${row.days_in_offer ?? 0}d`,
    row.offer_status ?? '',
    formatEnteredDate(row.entered_offer_at),
  ]);
  const csv = [header, ...body].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'offer-ageing.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function OfferLifecycleTimeline({ offerStatusCounts = [], joinedCount = 0, atRisk = 0 }) {
  const byStatus = Object.fromEntries(offerStatusCounts.map((row) => [row.status, row.count]));
  const steps = [
    { label: 'Approved', count: (byStatus.SENT || 0) + (byStatus.NEGOTIATION || 0) + (byStatus.ACCEPTED || 0) },
    { label: 'Offer sent', count: byStatus.SENT || 0 },
    { label: 'Negotiation', count: byStatus.NEGOTIATION || 0 },
    { label: 'Accepted', count: byStatus.ACCEPTED || 0 },
    { label: 'Joined', count: joinedCount },
  ];

  const lifecycleNote =
    atRisk > 0
      ? `${atRisk} offer(s) need immediate follow-up to protect joining conversion.`
      : 'No ageing risk yet. Continue follow-up within SLA to maintain joining conversion.';

  return (
    <div className="card offers-lifecycle-card" data-testid="offers-lifecycle">
      <div className="section-title offers-lifecycle-title">
        <h2>Offer Lifecycle</h2>
        <span className="muted offers-lifecycle-subtitle">Salary discussion → Joining</span>
      </div>
      <div className="offers-lifecycle-track">
        <div className="timeline offers-lifecycle-timeline">
          {steps.map((step, index) => (
            <ChartHoverTip
              key={step.label}
              as="div"
              className={cn('step', lifecycleStepClass(index))}
              tip={`${step.label}: ${step.count} candidate${step.count === 1 ? '' : 's'}`}
            >
              <div className="dot">{step.count}</div>
              <small>{step.label}</small>
            </ChartHoverTip>
          ))}
        </div>
      </div>
      <p className="muted offers-lifecycle-note">{lifecycleNote}</p>
    </div>
  );
}

function OfferLifecycleFunnel({ rows }) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="card offers-funnel-card" data-testid="offers-lifecycle-funnel">
      <div className="section-title">
        <h2>Offer Lifecycle Funnel</h2>
        <Link to="/pipeline?stage=SALARY" className="muted offers-funnel-link">
          View details →
        </Link>
      </div>
      {rows.map((row) => {
        const pct = max > 0 ? (row.count / max) * 100 : 0;
        return (
          <ChartHoverTip
            key={row.label}
            as="div"
            className="funnel-row"
            tip={`${row.label}: ${row.count} candidate${row.count === 1 ? '' : 's'} (${Math.round(pct)}% of max stage)`}
          >
            <span>{row.label}</span>
            <div className="track">
              <i style={{ width: `${pct}%` }} />
            </div>
            <b>{row.count}</b>
          </ChartHoverTip>
        );
      })}
    </div>
  );
}

function PriorityActionsCard({ actions }) {
  return (
    <div className="card offers-priority-card" data-testid="offers-priority-actions">
      <div className="section-title">
        <h2>Priority Actions</h2>
        <span className="pill orange">{actions.length} tasks</span>
      </div>
      <div className="action-panel">
        {actions.map((action) => (
          <div key={action.application_id} className="action-item">
            <div>
              <b>{action.candidate_name}</b>
              <span className="muted">{action.subtitle}</span>
            </div>
            <Link to={action.action_path || '/pipeline?stage=SALARY'} className="offers-action-btn">
              {action.action_label || 'Send'}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function OfferAgeingTable({ rows }) {
  return (
    <section className="card offers-aging-card" data-testid="offers-aging-table">
      <div className="section-title">
        <h2>Offer Ageing & Candidate Status</h2>
        <button type="button" className="btn" onClick={() => exportOfferAgingCsv(rows)}>
          Export
        </button>
      </div>
      {rows.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Role</th>
              <th>Offer value</th>
              <th>Days</th>
              <th>Status</th>
              <th>Entered</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.application_id}>
                <td className="candidate">
                  <Link to={`/candidates/${row.candidate_id}`}>{row.candidate_name}</Link>
                </td>
                <td>{row.job_title}</td>
                <td>
                  <span className="salary">{formatOfferSalary(row.offer_value)}</span>
                </td>
                <td>
                  <b>{row.days_in_offer ?? 0}d</b>
                </td>
                <td>
                  {row.offer_status ? (
                    <span className="pill blue">{row.offer_status.replace(/_/g, ' ')}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{formatEnteredDate(row.entered_offer_at)}</td>
                <td>
                  <Link to={row.action_path || `/candidates/${row.candidate_id}`} className="btn offers-view-btn">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted offers-aging-empty">No pending offers in scope</p>
      )}
    </section>
  );
}

export default function OffersTabContent({ pack }) {
  const kpis = pack?.tab_kpis?.offers || {};
  const insight = pack?.offer_insight;
  const funnelRows = buildOfferFunnelRows(pack);
  const priorityActions = buildPriorityActions(pack);
  const offerAging = pack?.offer_aging || [];

  const healthMessage = insight?.healthy
    ? insight?.message || 'No offer has breached SLA. Response window is still healthy.'
    : insight?.message || 'Monitor offer ageing closely and follow up on SLA breaches.';

  const conversionRiskMessage =
    (kpis.at_risk ?? 0) > 0
      ? `${kpis.at_risk} offer(s) are at risk and need immediate follow-up.`
      : 'No offers currently flagged as at risk.';

  const nextActionMessage =
    priorityActions[0]?.subtitle ||
    insight?.message ||
    'Review active offers and follow up within SLA.';

  return (
    <div data-testid="dash-offers">
      <section className="offers-hero">
        <div className="card offers-command-card" data-testid="offers-command-center">
          <div className="section-title offers-command-title">
            <h2>Offer Command Center</h2>
            <span className="pill blue">{kpis.active_offers ?? 0} active</span>
          </div>
          <div className="offers-command-body">
            <div className="offer-score">{kpis.active_offers ?? 0}</div>
            <p className="muted offers-command-copy">Offers currently sent and awaiting candidate response.</p>
          </div>
          <div className="mini-grid offers-command-metrics">
            <div className="mini-kpi">
              <small className="muted">Acceptance rate</small>
              <br />
              <b>{kpis.acceptance_rate_pct != null ? `${kpis.acceptance_rate_pct}%` : '—'}</b>
            </div>
            <div className="mini-kpi">
              <small className="muted">Avg age</small>
              <br />
              <b>{kpis.avg_age_days != null ? `${kpis.avg_age_days}d` : '—'}</b>
            </div>
            <div className="mini-kpi">
              <small className="muted">At risk</small>
              <br />
              <b className={kpis.at_risk ? 'red' : 'green'}>{kpis.at_risk ?? 0}</b>
            </div>
          </div>
        </div>

        <OfferLifecycleTimeline
          offerStatusCounts={pack?.offer_status_counts}
          joinedCount={pack?.pipeline_by_stage?.JOINED ?? 0}
          atRisk={kpis.at_risk ?? 0}
        />

        <div className="card offers-insight-card" data-testid="offers-ai-insight">
          <div className="section-title offers-insight-title">
            <h2>AI Offer Insight</h2>
            <span className="offers-insight-sparkle" aria-hidden>
              ✦
            </span>
          </div>
          <div className="offers-insight-body">
            <p className="offers-insight-headline">
              <b>{insight?.headline || 'Review active offers'}</b>
            </p>
            <p className="muted offers-insight-message">
              {insight?.message ||
                'Send a personalized follow-up to improve response probability and reduce drop-off risk.'}
            </p>
            <Link to="/pipeline?stage=SALARY" className="primary-outline offers-insight-cta">
              Generate follow-up →
            </Link>
          </div>
        </div>
      </section>

      <section className="grid2 offers-grid2">
        <OfferLifecycleFunnel rows={funnelRows} />
        <PriorityActionsCard actions={priorityActions} />
      </section>

      <OfferAgeingTable rows={offerAging} />

      <section className="insights offers-bottom-insights">
        <div className="insight greenbg">
          <h3>Offer health</h3>
          <p className="muted">{healthMessage}</p>
        </div>
        <div className="insight orangebg">
          <h3>Conversion risk</h3>
          <p className="muted">{conversionRiskMessage}</p>
        </div>
        <div className="insight bluebg">
          <h3>Next best action</h3>
          <p className="muted">{nextActionMessage}</p>
        </div>
      </section>
    </div>
  );
}
