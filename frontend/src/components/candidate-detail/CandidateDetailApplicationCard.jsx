import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { applicationsApi } from '../../lib/api';
import {
  buildActionSteps,
  buildApplicationRecommendation,
  computeDaysInCurrentStage,
  computeSlaStatus,
  formatApplicationFullDate,
  formatStageLabel,
  formatTimelineRows,
  getApplicationSourceLabel,
  getApplicationFitMetrics,
  getFitTier,
  getMatchedSkills,
  getNextAction,
  getOverallFitScore,
  metricBarFillClass,
  requirementsMet,
  fitRingStyle,
} from '../../lib/candidateDetailApplicationsUtils';
import { getFitTierLabel } from '../../lib/jobDetailMatchesUtils';
import { chartTitleCase } from '../../lib/chartTitleCase';

export default function CandidateDetailApplicationCard({
  app,
  profile,
  trajSummary,
  pipelineStep,
  canAdvance,
  stageUpdatingId,
  onAdvanceStage,
}) {
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!app?.id) return;
    setHistoryLoading(true);
    applicationsApi
      .getStageHistory(app.id)
      .then((res) => setHistoryEntries(res.data || []))
      .catch(() => setHistoryEntries([]))
      .finally(() => setHistoryLoading(false));
  }, [app?.id, app?.stage, app?.updated_at]);

  const fitScore = app?.fit_score;
  const overallScore = getOverallFitScore(app);
  const tier = getFitTier(overallScore);
  const metrics = getApplicationFitMetrics(fitScore);
  const matchedSkills = getMatchedSkills(fitScore);
  const ringStyle = overallScore != null ? fitRingStyle(overallScore) : undefined;
  const daysInStage = computeDaysInCurrentStage(app, historyEntries);
  const sla = computeSlaStatus(app, daysInStage);
  const recommendation = buildApplicationRecommendation(app, profile, overallScore, trajSummary);
  const actionSteps = buildActionSteps(app);
  const timelineRows = formatTimelineRows(historyEntries);
  const sourceLabel = getApplicationSourceLabel(app, profile);
  const metRequirements = requirementsMet(fitScore);

  return (
    <article className="cda-application-card" data-testid={`candidate-application-card-${app.id}`}>
      <div className="cda-app-header">
        <div className="cda-job-icon" aria-hidden>
          ▣
        </div>
        <div>
          <Link to={`/jobs/${app.job?.id}`} className="cda-job-title">
            {app.job?.title || 'Unknown Job'}
          </Link>
          <div className="cda-app-header-meta">
            <span className="cda-stage-badge">{formatStageLabel(app.stage).toUpperCase()}</span>
            <span className="cda-updated">
              Updated {formatApplicationFullDate(app.updated_at).split(',')[0]}
            </span>
          </div>
        </div>
        {fitScore ? (
          <div className="cda-score-chip" data-testid="application-fit-score-chip">
            <div className="cda-ring cda-ring-sm" style={ringStyle}>
              <span>{overallScore != null ? `${overallScore}%` : '—'}</span>
            </div>
            <div>
              <p>Fit Score</p>
              <b className={metRequirements ? 'cda-good' : 'cda-bad'}>
                {metRequirements ? '✓ Requirements met' : '✗ Missing requirements'}
              </b>
            </div>
          </div>
        ) : null}
      </div>

      <div className="cda-main-grid">
        <div className="cda-main-left">
          {fitScore ? (
            <>
              <div className="cda-fit-summary">
                <div className="cda-ring" style={ringStyle}>
                  <span>{overallScore != null ? `${overallScore}%` : '—'}</span>
                </div>
                <div className="cda-match">
                  <small>Overall Fit</small>
                  <b>{overallScore != null ? getFitTierLabel(overallScore) : tier.label}</b>
                </div>
              </div>

              {metrics.map((metric) => (
                <div key={metric.key} className="cda-metric">
                  <div className="cda-metric-title">
                    <span>{metric.label}</span>
                    <span>{metric.score}%</span>
                  </div>
                  <div className="cda-bar">
                    <div
                      className={`cda-fill ${metricBarFillClass(metric.score, overallScore)}`}
                      style={{ width: `${metric.score}%` }}
                    />
                  </div>
                </div>
              ))}

              {matchedSkills.length > 0 ? (
                <>
                  <div className="cda-skills-label">Matched Skills</div>
                  <div className="cda-skills" data-testid="application-matched-skills">
                    {matchedSkills.map((skill) => (
                      <span key={skill} className="cda-skill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <div className="cda-no-fit">Fit score is not available for this application yet.</div>
          )}

          <div className="cda-timeline" data-testid="application-hiring-timeline">
            <h3>{chartTitleCase('Hiring timeline')}</h3>
            {historyLoading ? (
              <p className="cda-timeline-loading">Loading hiring timeline…</p>
            ) : timelineRows.length ? (
              timelineRows.map((row, idx) => (
                <div key={`${row.title}-${idx}`} className="cda-timeline-row">
                  <div className="cda-dot" aria-hidden />
                  <div>
                    <b>{row.title.toUpperCase()}</b>
                    <span>{row.subtitle}</span>
                  </div>
                  {row.daysInStage != null ? (
                    <div className="cda-time-pill">{row.daysInStage}d</div>
                  ) : (
                    <div />
                  )}
                </div>
              ))
            ) : (
              <p className="cda-timeline-loading">No stage history recorded for this application yet.</p>
            )}
          </div>
        </div>

        <aside className="cda-side-card" data-testid="application-intelligence">
          <h3>Application Intelligence</h3>
          <div className="cda-side-row">
            <span>Stage</span>
            <b>{formatStageLabel(app.stage)}</b>
          </div>
          <div className="cda-side-row">
            <span>SLA Status</span>
            <b className={`cda-sla-${sla.tone}`}>{sla.label}</b>
          </div>
          <div className="cda-side-row">
            <span>Days in stage</span>
            <b>{daysInStage != null ? `${daysInStage}d` : '—'}</b>
          </div>
          <div className="cda-side-row">
            <span>Source</span>
            <b>{sourceLabel}</b>
          </div>
          <div className="cda-side-row">
            <span>Next action</span>
            <b>{getNextAction(app)}</b>
          </div>
          <div className="cda-recommend" data-testid="application-ai-recommendation">
            <b>AI Recommendation</b>
            <p>{recommendation}</p>
          </div>
        </aside>
      </div>

      <div className="cda-next-actions" data-testid="application-action-steps">
        {actionSteps.map((step) => (
          <div key={step.step} className="cda-next">
            <b>
              {step.step}. {step.title}
            </b>
            <p>{step.description}</p>
          </div>
        ))}
      </div>

      {pipelineStep?.next && canAdvance ? (
        <div className="cda-advance-row">
          <button
            type="button"
            className="cda-advance-btn"
            disabled={stageUpdatingId === app.id}
            onClick={() => onAdvanceStage?.(app)}
            data-testid={`advance-application-${app.id}`}
          >
            {stageUpdatingId === app.id ? (
              <Loader2 className="cda-advance-spinner" aria-hidden />
            ) : (
              `✦ ${pipelineStep.label}`
            )}
          </button>
        </div>
      ) : null}
    </article>
  );
}
