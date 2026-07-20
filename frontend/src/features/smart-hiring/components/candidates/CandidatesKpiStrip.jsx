import React from 'react';
import { fmtNum, fmtPct } from '@/shared/lib/candidatesCommandUtils';

export default function CandidatesKpiStrip({ metrics }) {
  const totalDelta = metrics.totalDeltaPct;
  const analyzed = metrics.profilesAnalyzedPct;
  const duplicateRisk = metrics.duplicateRiskPct;
  const hasCandidates = Number(metrics.totalCount) > 0;

  return (
    <section className="cand-kpis" data-testid="candidates-kpi-strip">
      <div className="cand-kpi">
        <h3>Total Candidates</h3>
        <b>{fmtNum(metrics.totalCount)}</b>
        {totalDelta != null ? (
          <p className={totalDelta >= 0 ? 'up' : 'down'}>
            {totalDelta >= 0 ? '↑' : '↓'} {Math.abs(totalDelta)}% this month
          </p>
        ) : (
          <p className="cand-muted">{hasCandidates ? 'Live pool size' : 'No candidates yet'}</p>
        )}
        {hasCandidates && totalDelta != null ? <div className="cand-spark" aria-hidden /> : null}
      </div>
      <div className="cand-kpi">
        <h3>High Fit 90%+</h3>
        <b>{fmtNum(metrics.highFit90)}</b>
        <p className={metrics.highFit90 > 0 ? 'up' : 'cand-muted'}>
          {metrics.highFit90 > 0 ? 'Ready for shortlist' : 'No high-fit profiles yet'}
        </p>
      </div>
      <div className="cand-kpi">
        <h3>Talent Pool</h3>
        <b>{fmtNum(metrics.talentPool)}</b>
        <p className="cand-muted">Reusable profiles</p>
      </div>
      <div className="cand-kpi">
        <h3>Profiles Analyzed</h3>
        <b>{analyzed != null ? fmtPct(analyzed, 0) : '—'}</b>
        <p className={analyzed != null && analyzed > 0 ? 'up' : 'cand-muted'}>
          {analyzed != null && analyzed > 0 ? 'AI trajectory done' : 'No AI analysis yet'}
        </p>
      </div>
      <div className="cand-kpi">
        <h3>Duplicate Risk</h3>
        <b>{duplicateRisk != null ? `${duplicateRisk}%` : '—'}</b>
        <p className={duplicateRisk != null && duplicateRisk > 0 ? 'down' : 'cand-muted'}>
          {duplicateRisk != null && duplicateRisk > 0 ? 'Needs cleanup' : 'No duplicates detected'}
        </p>
      </div>
    </section>
  );
}
