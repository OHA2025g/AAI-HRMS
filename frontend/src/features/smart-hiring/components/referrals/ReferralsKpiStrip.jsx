import React from 'react';

export default function ReferralsKpiStrip({ kpis }) {
  const k = kpis || {};
  return (
    <section className="rf-kpis" data-testid="referrals-kpi-strip">
      <div className="rf-card rf-kpi">
        <div className="rf-label">Total referrals</div>
        <div className="rf-num">{k.total ?? 0}</div>
        <small>{k.totalSub}</small>
      </div>
      <div className="rf-card rf-kpi">
        <div className="rf-label">Active in pipeline</div>
        <div className="rf-num">{k.active ?? 0}</div>
        <small>{k.activeSub}</small>
      </div>
      <div className="rf-card rf-kpi">
        <div className="rf-label">Avg AI fit</div>
        <div className="rf-num">{k.avgFit ?? '—'}</div>
        <small>{k.avgSub}</small>
      </div>
      <div className="rf-card rf-kpi">
        <div className="rf-label">Referral hire rate</div>
        <div className="rf-num">{k.hireRate ?? '—'}</div>
        <small className="rf-warn">{k.hireSub}</small>
      </div>
    </section>
  );
}
