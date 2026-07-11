import React from 'react';
import { computeAssessmentKpis } from '@/shared/lib/assessmentsCommandUtils';

export default function AssessmentsInsightStrip({ headline, refetching }) {
  if (refetching) {
    return (
      <section className="as-insight-strip" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="as-insight skeleton" />
        ))}
      </section>
    );
  }
  if (!headline) return null;
  const kpis = computeAssessmentKpis(headline);

  return (
    <section className="as-insight-strip" data-testid="assessments-library-metrics">
      <div className="as-insight">
        <div className="as-insight-ico purple">?</div>
        <div>
          <small>Avg questions / assessment</small>
          <b>{kpis.avgQuestions}</b>
        </div>
      </div>
      <div className="as-insight">
        <div className="as-insight-ico orange">◷</div>
        <div>
          <small>Avg duration</small>
          <b>{kpis.avgDuration}</b>
        </div>
      </div>
      <div className="as-insight">
        <div className="as-insight-ico green">◎</div>
        <div>
          <small>Typical pass threshold</small>
          <b>{kpis.passThreshold}</b>
        </div>
      </div>
    </section>
  );
}
