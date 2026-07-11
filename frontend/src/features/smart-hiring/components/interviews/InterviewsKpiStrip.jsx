import React from 'react';

export default function InterviewsKpiStrip({ kpis }) {
  return (
    <section className="iv-kpis" data-testid="interviews-kpi-strip">
      <div className="iv-card iv-kpi">
        <div>
          <div className="iv-num">{kpis.upcoming}</div>
          <div className="iv-lbl">Upcoming interviews</div>
        </div>
        <div className="iv-icon" aria-hidden>
          📅
        </div>
      </div>
      <div className="iv-card iv-kpi">
        <div>
          <div className="iv-num">{kpis.completed}</div>
          <div className="iv-lbl">Completed</div>
        </div>
        <div className="iv-icon iv-icon-green" aria-hidden>
          ✓
        </div>
      </div>
      <div className="iv-card iv-kpi">
        <div>
          <div className="iv-num">{kpis.positive}</div>
          <div className="iv-lbl">Positive feedback</div>
        </div>
        <div className="iv-icon iv-icon-blue" aria-hidden>
          ★
        </div>
      </div>
      <div className="iv-card iv-kpi">
        <div>
          <div className="iv-num">{kpis.total}</div>
          <div className="iv-lbl">Total interview events</div>
        </div>
        <div className="iv-icon iv-icon-orange" aria-hidden>
          ◎
        </div>
      </div>
    </section>
  );
}
