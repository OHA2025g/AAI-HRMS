import React from 'react';
import { Link } from 'react-router-dom';
import {
  computeAssessmentHealth,
  computeQualitySignals,
  formatAiAlerts,
} from '../../../lib/assessmentsCommandUtils';

export default function AssessmentsHealthRow({ headline, summary, skillBreakdown, refetching }) {
  if (refetching) {
    return (
      <section className="as-health-row" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="as-panel skeleton" />
        ))}
      </section>
    );
  }
  if (!headline) return null;

  const health = computeAssessmentHealth(headline, summary);
  const { signals, skillGapNote } = computeQualitySignals(headline, skillBreakdown);
  const alerts = formatAiAlerts(summary?.alerts || []);

  if (skillGapNote && !alerts.some((a) => a.title.toLowerCase().includes('skill'))) {
    alerts.push({
      id: 'skill-gap',
      title: 'Skill gap pattern',
      message: skillGapNote,
      severity: 'warning',
    });
  }

  return (
    <section className="as-health-row" data-testid="assessments-health-row">
      <div className="as-panel">
        <h2>Assessment health</h2>
        <div className="as-scorebig">
          {health.score}
          <span>/100</span>
        </div>
        <p>{health.message}</p>
        <div className="as-status-line">
          <span>Avg duration: {health.avgDuration}</span>
          <span>Avg questions: {health.avgQuestions}</span>
          <span>Pass threshold: {health.passThreshold}</span>
        </div>
      </div>
      <div className="as-panel">
        <h2>Quality signals</h2>
        <div className="as-mini-grid">
          {signals.map((s) => (
            <div key={s.label} className="as-mini-row">
              <span>{s.label}</span>
              <div className={`as-bar ${s.barClass}`}>
                <i style={{ width: `${s.pct}%` }} />
              </div>
              <b>{s.display}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="as-panel">
        <h2>AI alerts</h2>
        {alerts.length ? (
          alerts.slice(0, 3).map((a) => (
            <div key={a.id} className="as-alert">
              <b>⚠</b>
              <div>
                <b>{a.title}</b>
                <br />
                <span>{a.message}</span>
                {a.actionPath ? (
                  <>
                    <br />
                    <Link to={a.actionPath} className="as-alert-link">
                      View details →
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="as-muted">No active alerts — assessment operations look healthy.</p>
        )}
      </div>
    </section>
  );
}
