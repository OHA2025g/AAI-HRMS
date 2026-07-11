import React from 'react';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';
import {
  formatOutcomeFunnel,
  buildAiInterpretation,
  buildNextBestActions,
  buildCalibrationCards,
  buildReviewQueue,
} from '@/shared/lib/assessmentsCommandUtils';
import { FitVsScoreScatterChart, TimeVsScoreScatterChart } from '../AssessmentCharts';

export default function AssessmentsInsightsTab({
  outcome,
  calibration,
  fitVsScore,
  timeVsScore,
  submissions,
  results,
  headline,
  passThresholdPct,
  refetching,
}) {
  if (refetching) {
    return <div className="as-tab-content" aria-busy="true"><div className="as-chart-card skeleton" style={{ minHeight: 240 }} /></div>;
  }

  const funnel = formatOutcomeFunnel(outcome);
  const interpretation = buildAiInterpretation(outcome);
  const inProgressCount = (submissions || []).filter((s) => ['INVITED', 'IN_PROGRESS', 'SUBMITTED'].includes(s.status)).length;
  const actions = buildNextBestActions(outcome, inProgressCount);
  const calibCards = buildCalibrationCards(calibration, headline);
  const reviewQueue = buildReviewQueue(submissions, results);
  const hasCalibAlerts =
    (calibration?.low_pass_assessments || []).length > 0 ||
    (calibration?.stale_unused_assessments || []).length > 0;

  return (
    <div className="as-tab-content" data-testid="assessments-insights-tab">
      <section className="as-hero-insight">
        <div className="as-panel">
          <h3>{chartTitleCase('Assessment → Interview & Hire')}</h3>
          <p>Outcome funnel for scored submissions in the selected organization scope.</p>
          <div className="as-bigchart">
            {funnel.bars.map((b) => (
              <div key={b.label} className={`as-bar-col ${b.colorClass}`} style={{ height: `${Math.max(b.heightPct, 3)}%` }}>
                <span>{b.count}</span>
                <label>{b.label}</label>
              </div>
            ))}
          </div>
          <div className="as-insight-kpis">
            {funnel.kpis.map((k) => (
              <div key={k.label}>
                <small>{k.label}</small>
                <b>{k.value}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="as-panel">
          <h3>AI Interpretation</h3>
          <p>{interpretation.summary}</p>
          <div className="as-recommend">
            {interpretation.recs.map((r) => (
              <div key={r.title} className={`as-rec ${r.type}`}>
                <strong>{r.title}</strong>
                {r.text}
              </div>
            ))}
          </div>
        </div>
        <div className="as-panel">
          <h3>Next Best Actions</h3>
          <p>Prioritized actions to improve assessment-to-hire quality.</p>
          <div className="as-recommend">
            {actions.map((a) => (
              <div key={a.title} className="as-rec">
                <strong>{a.title}</strong>
                {a.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="as-grid2 scatter-grid">
        <div className="as-panel as-chart-wrap">
          <FitVsScoreScatterChart points={fitVsScore} threshold={passThresholdPct} />
        </div>
        <div className="as-panel as-chart-wrap">
          <TimeVsScoreScatterChart points={timeVsScore} />
        </div>
      </section>

      <section className="as-panel">
        <h3>{chartTitleCase('Calibration insights')}</h3>
        <p>Quality signals from scored submissions</p>
        <div className="as-calibration">
          {calibCards.map((c) => (
            <div key={c.title} className="as-calib-card">
              <b>{c.title}</b>
              <p>{c.text}</p>
              <span className={`as-tag ${c.tagClass}`}>{c.tag}</span>
            </div>
          ))}
        </div>
        {!hasCalibAlerts ? (
          <div className="as-empty-calib">
            No critical calibration alerts yet — score more submissions to strengthen insights.
          </div>
        ) : null}
        {(calibration?.low_pass_assessments || []).length > 0 ? (
          <ul className="as-calib-list">
            {calibration.low_pass_assessments.map((a) => (
              <li key={a.assessment_id}>
                {a.title} — {a.pass_rate_pct}% pass · {a.completed} scored
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="as-panel" style={{ marginTop: 18 }}>
        <h3>Recommended review queue</h3>
        <p>Profiles and assessments that should be reviewed first.</p>
        <table className="as-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Signal</th>
              <th>Assessment</th>
              <th>Recommended action</th>
            </tr>
          </thead>
          <tbody>
            {reviewQueue.map((row, i) => (
              <tr key={`${row.candidate}-${i}`}>
                <td>{row.candidate}</td>
                <td><span className={`as-tag ${row.signalClass}`}>{row.signal}</span></td>
                <td>{row.assessment}</td>
                <td>{row.action}</td>
              </tr>
            ))}
            {!reviewQueue.length ? (
              <tr>
                <td colSpan={4} className="as-muted center">No review queue items yet</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
