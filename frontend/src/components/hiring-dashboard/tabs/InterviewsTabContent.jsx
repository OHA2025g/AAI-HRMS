import React from 'react';
import { Link } from 'react-router-dom';
import InterviewRoundsPanel from '../InterviewRoundsPanel';
import ConversionBottleneckChart from '../ConversionBottleneckChart';
import { shortenInsightActionLabel } from '../../../lib/insightActionLabel';

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function firstActiveRoundLabel(metrics) {
  const row = (metrics || []).find((m) => (m.active_count || 0) > 0);
  return row?.label ? `Across ${row.label}` : 'Across interview rounds';
}

function conversionSubtitle(pct) {
  if (pct == null || pct === 0) {
    return { text: 'No candidates moved ahead', className: 'down' };
  }
  return { text: 'Candidates progressing', className: 'up' };
}

function readyForOfferSubtitle(count) {
  if (count > 0) {
    return { text: 'High fit candidate', className: 'up' };
  }
  return { text: 'None ready yet', className: '' };
}

function interviewAgeSubtitle(avgDays) {
  if (avgDays == null) return { text: 'No ageing data', className: '' };
  if (avgDays >= 7) return { text: 'Needs faster closure', className: 'warn' };
  return { text: 'Within target', className: 'up' };
}

function journeySubtitle(journey) {
  const parts = [journey.job_title, journey.stage_label];
  if (journey.fit_label) parts.push(journey.fit_label);
  return parts.filter(Boolean).join(' · ');
}

export default function InterviewsTabContent({ pack }) {
  const kpis = pack?.tab_kpis?.interviews || {};
  const interviewRoundMetrics = pack?.interview_round_metrics || [];
  const conversionSub = conversionSubtitle(kpis.next_stage_conversion_pct);
  const readySub = readyForOfferSubtitle(kpis.ready_for_offer ?? 0);
  const ageSub = interviewAgeSubtitle(kpis.avg_age_days);
  const interviewActions = pack?.interview_action_queue || [];
  const interviewJourneys = pack?.interview_journeys || [];
  const interviewInsights = (pack?.ai_insights || []).slice(0, 3);
  const actionQueueCount = interviewActions.length;

  return (
    <div data-testid="dash-interviews">
      <section className="interviews-kpis" data-testid="interviews-kpi-row">
        <div className="card kpi">
          <div className="icon" aria-hidden>
            ▤
          </div>
          <h3>Active interviews</h3>
          <div className="num">{kpis.active ?? 0}</div>
          <div className="sub">{firstActiveRoundLabel(interviewRoundMetrics)}</div>
        </div>
        <div className="card kpi">
          <div className="icon" aria-hidden>
            ⏱
          </div>
          <h3>Avg interview age</h3>
          <div className="num">{kpis.avg_age_days != null ? `${kpis.avg_age_days}d` : '—'}</div>
          <div className={`sub ${ageSub.className}`.trim()}>{ageSub.text}</div>
        </div>
        <div className="card kpi">
          <div className="icon" aria-hidden>
            ↗
          </div>
          <h3>Next-stage conversion</h3>
          <div className="num">
            {kpis.next_stage_conversion_pct != null ? `${kpis.next_stage_conversion_pct}%` : '0%'}
          </div>
          <div className={`sub ${conversionSub.className}`.trim()}>{conversionSub.text}</div>
        </div>
        <div className="card kpi">
          <div className="icon" aria-hidden>
            ✓
          </div>
          <h3>Ready for offer</h3>
          <div className="num">{kpis.ready_for_offer ?? 0}</div>
          <div className={`sub ${readySub.className}`.trim()}>{readySub.text}</div>
        </div>
      </section>

      <section className="interviews-grid-row" data-testid="interviews-grid-row">
        <InterviewRoundsPanel interviewRoundMetrics={interviewRoundMetrics} />
        <ConversionBottleneckChart
          funnel={pack?.funnel || []}
          interviewRoundMetrics={interviewRoundMetrics}
          conversionBottleneck={pack?.conversion_bottleneck || []}
        />
      </section>

      {pack?.ai_insights_source === 'llm' ? (
        <div className="interviews-insights-llm-badge">
          <span
            className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700"
            data-testid="interviews-llm-insights-badge"
          >
            LLM insights
          </span>
        </div>
      ) : null}

      {interviewInsights.length ? (
        <section className="insights interviews-insights" data-testid="interviews-insights-row">
          {interviewInsights.map((insight) => (
            <div
              key={insight.title}
              className={`insight ${insight.severity === 'red' ? 'orange' : insight.severity}`}
            >
              <h4>{insight.title}</h4>
              <p>{insight.message}</p>
              {insight.action_path ? (
                <Link to={insight.action_path} className="outline interviews-insight-cta">
                  {shortenInsightActionLabel(insight.action_label)}
                </Link>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="bottom-grid interviews-bottom-row" data-testid="interviews-bottom-row">
        <div className="card interviews-journeys-card" data-testid="interview-journeys-panel">
          <div className="section-title interviews-journeys-title">
            <h2>Recent interview journeys</h2>
            <Link to="/pipeline?stage=INTERVIEW_1" className="interviews-journeys-link">
              View all →
            </Link>
          </div>
          {interviewJourneys.length ? (
            <div className="interviews-journeys-list">
              {interviewJourneys.map((journey) => (
                <div key={journey.application_id || journey.candidate_id} className="journey interviews-journey-item">
                  <div className="face">{initialsFromName(journey.candidate_name)}</div>
                  <div className="journey-copy">
                    {journey.candidate_id ? (
                      <Link to={`/candidates/${journey.candidate_id}`} className="journey-name-link">
                        <b>{journey.candidate_name}</b>
                      </Link>
                    ) : (
                      <b>{journey.candidate_name}</b>
                    )}
                    <small className="journey-meta">{journeySubtitle(journey)}</small>
                    <div className="stage">
                      <span aria-hidden />
                      <small className="journey-path">{journey.path || '—'}</small>
                    </div>
                  </div>
                  <span className={`pill journey-status ${journey.status_tone || 'orange'}`.trim()}>
                    {journey.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No active interview journeys in scope.</p>
          )}
        </div>

        <div className="card interviews-actions-card" data-testid="interview-action-queue">
          <div className="section-title interviews-actions-title">
            <h2>AI action queue</h2>
            <span className="pill">{actionQueueCount} actions</span>
          </div>
          {interviewActions.length ? (
            <div className="interviews-actions-list">
              {interviewActions.map((action, index) => (
                <div key={action.id} className="journey interviews-action-item">
                  <div className="face">{index + 1}</div>
                  <div className="journey-copy">
                    <b>{action.label}</b>
                    <small className="journey-meta">{action.subtitle}</small>
                  </div>
                  {action.action_path ? (
                    <Link
                      to={action.action_path}
                      className={
                        action.primary
                          ? 'btn primary interviews-action-btn interviews-action-btn-primary'
                          : 'btn interviews-action-btn interviews-action-btn-outline'
                      }
                    >
                      {action.action_label}
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No interview actions queued.</p>
          )}
        </div>
      </section>
    </div>
  );
}
