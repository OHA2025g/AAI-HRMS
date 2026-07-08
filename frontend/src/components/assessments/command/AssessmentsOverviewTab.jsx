import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assessmentsApi } from '../../../lib/api';
import { chartTitleCase } from '../../../lib/chartTitleCase';
import {
  formatFunnelData,
  formatCompletionDonut,
  formatScoreHistogram,
  formatTrendsCombo,
  formatSkillBars,
} from '../../../lib/assessmentsCommandUtils';
import AssessmentAdminEmailOps from '../AssessmentAdminEmailOps';

function CoverageHeatmapTable({ matrix }) {
  const { jobs = [], types = [], cells = [] } = matrix || {};
  const cellMap = new Map(cells.map((c) => [`${c.job_id}:${c.assessment_type}`, c]));

  if (!jobs.length) {
    return (
      <section className="as-chart-card wide">
        <h3>{chartTitleCase('Coverage heatmap')}</h3>
        <p className="as-hint">No open jobs in scope for heatmap</p>
      </section>
    );
  }

  const typeLabels = {
    BEHAVIORAL: 'Behavioral',
    CORE_SKILL: 'Core Skill',
    SCREENING: 'Screening',
    WORK_SIMULATION: 'Work Simulation',
  };
  const displayTypes = types.length ? types : ['BEHAVIORAL', 'CORE_SKILL', 'SCREENING', 'WORK_SIMULATION'];

  return (
    <section className="as-chart-card wide" data-testid="assessment-coverage-heatmap">
      <h3>{chartTitleCase('Coverage heatmap')}</h3>
      <p className="as-hint">Assessment matrix by job and type. Color reflects invites and completions.</p>
      <table className="as-heat">
        <thead>
          <tr>
            <th>Job</th>
            {displayTypes.map((t) => (
              <th key={t}>{typeLabels[t] || t.replace(/_/g, ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.job_id}>
              <td>{job.title}</td>
              {displayTypes.map((type) => {
                const cell = cellMap.get(`${job.job_id}:${type}`) || { assessment_count: 0, intensity: 0 };
                const count = cell.assessment_count || 0;
                let cellClass = 'empty';
                if (count > 0) cellClass = cell.intensity >= 0.5 ? 'c2' : 'c1';
                return (
                  <td key={type} className={`cell ${cellClass}`}>
                    {count > 0 ? count : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function JobCoverageTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <section className="as-chart-card wide">
        <h3>Job coverage</h3>
        <p className="as-hint">No open jobs in scope</p>
      </section>
    );
  }

  return (
    <section className="as-chart-card wide" data-testid="assessment-job-coverage">
      <h3>Job coverage</h3>
      <p className="as-hint">Which open jobs have assessments and how candidates are progressing</p>
      <table className="as-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Tests</th>
            <th>Invited</th>
            <th>Completed</th>
            <th>Pass rate</th>
            <th>In pipeline</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.job_id}>
              <td>
                <b>{row.title}</b>
              </td>
              <td>
                {row.has_assessment ? (
                  <span className="as-tag good">{row.assessment_count}</span>
                ) : (
                  <span className="as-tag warn">Missing</span>
                )}
              </td>
              <td>{row.invited ?? 0}</td>
              <td>{row.completed ?? 0}</td>
              <td>{row.pass_rate_pct != null ? `${row.pass_rate_pct}%` : '—'}</td>
              <td>
                {row.sent ?? 0} sent · {row.cleared ?? 0} cleared
              </td>
              <td>
                {row.has_assessment ? (
                  <Link to={`/pipeline?job=${row.job_id}&stage=ASSESSMENT`}>
                    <b>Pipeline</b>
                  </Link>
                ) : (
                  <b>Create test</b>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function AuditLogSection() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assessmentsApi
      .auditLog({ limit: 100 })
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="as-chart-card wide log" data-testid="assessment-audit-log-panel">
      <h3>Activity log</h3>
      <p className="as-hint">Invites, grading, archive and email events</p>
      {loading ? (
        <p className="as-muted">Loading activity…</p>
      ) : rows.length === 0 ? (
        <p className="as-muted">No audit events yet.</p>
      ) : (
        <table className="as-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Assessment</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((row) => (
              <tr key={row.id}>
                <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                <td>{(row.action || '').replace(/_/g, ' ')}</td>
                <td>{row.actor_name || row.actor_id || '—'}</td>
                <td>{row.assessment_id ? String(row.assessment_id).slice(0, 8) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function AssessmentsOverviewTab({
  ws,
  isAdmin,
  passThresholdPct,
  scoreBuckets,
  onScoreBucketClick,
  refetching,
}) {
  if (refetching) {
    return <div className="as-tab-content" aria-busy="true"><div className="as-chart-card skeleton" style={{ minHeight: 200 }} /></div>;
  }

  const funnel = formatFunnelData(ws.funnel);
  const donut = formatCompletionDonut(ws.passRate, ws.summary?.headline);
  const histogram = formatScoreHistogram(scoreBuckets);
  const trends = formatTrendsCombo(ws.trends);
  const skills = formatSkillBars(ws.skillBreakdown);

  return (
    <div className="as-tab-content" data-testid="assessments-overview-tab">
      <section className="as-grid2">
        <div className="as-chart-card">
          <h3>{chartTitleCase('Assessment funnel')}</h3>
          <p className="as-hint">Invite → Start → Submit → Pass → Pipeline cleared</p>
          {funnel.length ? (
            <div className="as-funnel">
              <div className="as-flabels">
                {funnel.map((r) => (
                  <span key={r.label}>{r.label}</span>
                ))}
              </div>
              <div className="as-fbars">
                {funnel.map((r) => (
                  <div key={r.label} className="as-fbar">
                    <i className={r.colorClass} style={{ width: `${r.widthPct}%` }} />
                  </div>
                ))}
              </div>
              <div className="as-fnums">
                {funnel.map((r) => (
                  <span key={r.label}>{r.count}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="as-muted">No funnel data yet</p>
          )}
        </div>
        <div className="as-chart-card">
          <h3>{chartTitleCase('Assessment completion')}</h3>
          <p className="as-hint">Completion rate across invited candidates</p>
          <div className="as-donut" style={{ background: donut.gradient }}>
            <span>{donut.rate}</span>
          </div>
          <div className="as-legend">
            {donut.legend.map((l) => (
              <span key={l.label}>
                <i style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="as-grid2eq">
        <div className="as-chart-card" data-testid="assessment-score-histogram">
          <h3>{chartTitleCase('Score distribution')}</h3>
          <p className="as-hint">Click a bar to filter scored results</p>
          <div className="as-hist">
            {histogram.map((b) => (
              <button
                key={b.name}
                type="button"
                className="as-hist-col"
                style={{ height: `${b.heightPct}%` }}
                onClick={() => b.count > 0 && onScoreBucketClick({ ...b, bucket: b.name, min: b.min, max: b.max, count: b.count })}
                disabled={b.count === 0}
                aria-label={`${b.name}: ${b.count} submissions`}
              >
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="as-chart-card">
          <h3>{chartTitleCase('Invites & completions')}</h3>
          <p className="as-hint">Weekly invite volume vs completed attempts</p>
          <div className="as-combo">
            {trends.map((t) => (
              <div key={t.label} className="as-combo-group">
                <div className="as-vbar purple" style={{ height: `${t.invitedHeight}px` }} />
                <div className="as-vbar green" style={{ height: `${t.completedHeight}px` }} />
                <label>{t.label}</label>
              </div>
            ))}
          </div>
          <div className="as-legend">
            <span><i style={{ background: '#6d4cff' }} />Invited</span>
            <span><i style={{ background: '#10b981' }} />Completed</span>
            <span><i style={{ background: '#f59e0b' }} />Pass rate %</span>
          </div>
        </div>
      </section>

      <section className="as-chart-card wide">
        <h3>{chartTitleCase('Skill performance')}</h3>
        <p className="as-hint">Average score by assessed skill</p>
        <div className="as-skill">
          {skills.length ? (
            skills.map((s) => (
              <div key={s.skill} className="as-skill-row">
                <b>{s.skill}</b>
                <div className={`as-bar ${s.barClass}`}>
                  <i style={{ width: `${s.pct}%` }} />
                </div>
                <b>{s.pct}%</b>
              </div>
            ))
          ) : (
            <p className="as-muted">No skill-level scores yet</p>
          )}
        </div>
      </section>

      <CoverageHeatmapTable matrix={ws.coverageMatrix} />
      <JobCoverageTable rows={ws.summary?.by_job || []} />

      {isAdmin ? (
        <div className="as-email-ops-wrap">
          <AssessmentAdminEmailOps />
        </div>
      ) : null}

      <AuditLogSection />
    </div>
  );
}
