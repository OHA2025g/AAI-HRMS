import React from 'react';
import { computeAssessmentKpis } from '../../../lib/assessmentsCommandUtils';

const KPI_CONFIG = [
  { key: 'totalAssessments', label: 'Total assessments', subKey: 'totalSub', icon: '☑', iconClass: '' },
  { key: 'inAssessment', label: 'In assessment', subKey: 'inAssessmentSub', icon: '♙', iconClass: '' },
  { key: 'cleared', label: 'Cleared', subKey: 'clearedSub', icon: '✓', iconClass: 'green' },
  { key: 'clearanceRate', label: 'Clearance rate', subKey: 'clearanceSub', icon: '%', iconClass: '' },
  { key: 'completionRate', label: 'Completion rate', subKey: 'completionSub', icon: '◎', iconClass: 'orange' },
  { key: 'jobsMissing', label: 'Jobs missing test', subKey: 'jobsMissingSub', icon: '⚠', iconClass: 'red' },
];

export default function AssessmentsKpiStrip({ headline, refetching }) {
  if (refetching) {
    return (
      <section className="as-kpis" aria-busy="true">
        {KPI_CONFIG.map((k) => (
          <div key={k.key} className="as-kpi-card skeleton" />
        ))}
      </section>
    );
  }
  if (!headline) return null;
  const kpis = computeAssessmentKpis(headline);

  return (
    <section className="as-kpis" data-testid="assessments-kpi-strip">
      {KPI_CONFIG.map((k) => (
        <div key={k.key} className="as-kpi-card">
          <div className="as-kpi-top">
            <h3>{k.label}</h3>
            <div className={`as-kpi-ico ${k.iconClass}`}>{k.icon}</div>
          </div>
          <div className="as-kpi-num">{kpis[k.key]}</div>
          <div className="as-kpi-sub">{kpis[k.subKey]}</div>
        </div>
      ))}
    </section>
  );
}
