import React from 'react';
import { fmtNum, fmtPct } from '../../lib/jobsCommandUtils';

export default function JobsCommandKpis({ metrics, pack }) {
  const openPct = metrics.totalJobs ? Math.round((metrics.openJobs / metrics.totalJobs) * 100) : 0;
  const avgFit = metrics.avgFit;
  const delta = pack?.headline?.avg_fit_score?.delta_pct;

  return (
    <section className="kpis" data-testid="jobs-command-kpis">
      <div className="card kpi">
        <h3>Total Jobs</h3>
        <div className="num">{fmtNum(metrics.totalJobs)}</div>
        <p className="up">Active requisitions</p>
      </div>
      <div className="card kpi">
        <h3>Open Jobs</h3>
        <div className="num">{fmtNum(metrics.openJobs)}</div>
        <p className="up">{openPct}% active</p>
      </div>
      <div className="card kpi">
        <h3>Avg Candidates / Job</h3>
        <div className="num">{metrics.avgCandidates ? metrics.avgCandidates.toFixed(1) : '0'}</div>
        <p className={metrics.avgCandidates >= 8 ? 'up' : 'down'}>
          {metrics.avgCandidates >= 8 ? 'Healthy pipeline depth' : 'Below target depth'}
        </p>
      </div>
      <div className="card kpi">
        <h3>Jobs at Risk</h3>
        <div className="num">{fmtNum(metrics.atRisk)}</div>
        <p className="down">Needs action</p>
      </div>
      <div className="card kpi">
        <h3>Avg Fit Score</h3>
        <div className="num">{avgFit != null ? fmtPct(avgFit, 0) : '—'}</div>
        <p className={avgFit != null && avgFit >= 70 ? 'up' : 'down'}>
          {delta != null ? `${delta >= 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}% trend` : 'Strong pipeline quality'}
        </p>
      </div>
    </section>
  );
}
