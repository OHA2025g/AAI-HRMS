import React from 'react';
import { fmtNum, fmtPct } from '../../lib/candidatesCommandUtils';

export default function CandidatesKpiStrip({ metrics }) {
  return (
    <section className="cand-kpis" data-testid="candidates-kpi-strip">
      <div className="cand-kpi">
        <h3>Total Candidates</h3>
        <b>{fmtNum(metrics.totalCount)}</b>
        <p className="up">↑ 9.4% this month</p>
        <div className="cand-spark" aria-hidden />
      </div>
      <div className="cand-kpi">
        <h3>High Fit 90%+</h3>
        <b>{fmtNum(metrics.highFit90)}</b>
        <p className="up">Ready for shortlist</p>
      </div>
      <div className="cand-kpi">
        <h3>Talent Pool</h3>
        <b>{fmtNum(metrics.talentPool)}</b>
        <p className="cand-muted">Reusable profiles</p>
      </div>
      <div className="cand-kpi">
        <h3>Profiles Analyzed</h3>
        <b>{fmtPct(metrics.profilesAnalyzedPct, 0)}</b>
        <p className="up">AI trajectory done</p>
      </div>
      <div className="cand-kpi">
        <h3>Duplicate Risk</h3>
        <b>{metrics.duplicateRiskPct}%</b>
        <p className="down">Needs cleanup</p>
      </div>
    </section>
  );
}
