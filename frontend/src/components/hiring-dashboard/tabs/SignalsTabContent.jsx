import React from 'react';
import { Link } from 'react-router-dom';
import { chartTitleCase } from '../../../lib/chartTitleCase';
import DashboardActionStrip from '../DashboardActionStrip';
import ChartHoverTip from '../ChartHoverTip';

function formatCoveragePct(value) {
  if (value == null || Number.isNaN(Number(value))) return '0%';
  const n = Number(value);
  if (n > 0 && n < 1) return `${n}%`;
  if (Number.isInteger(n)) return `${n}%`;
  return `${n}%`;
}

function buildAdoptionCopy(adoption) {
  const openJobs = adoption?.open_jobs ?? 0;
  const jobsWithMatches = adoption?.jobs_with_matches ?? 0;
  if (openJobs <= 0) {
    return {
      body: 'Open jobs with fit scores. Enable AI fit scoring and ranking on open roles.',
      footer: `${jobsWithMatches} open roles covered`,
    };
  }
  return {
    body: `Open jobs with fit scores. All ${openJobs} open roles have active AI fit scoring and ranking enabled.`,
    footer: `${jobsWithMatches} of ${openJobs} open roles covered`,
  };
}

function qualityStatus(medianFit) {
  if (medianFit == null) return { label: 'Healthy', className: '' };
  if (medianFit >= 70) return { label: 'Healthy', className: '' };
  if (medianFit >= 50) return { label: 'Watch', className: 'warn' };
  return { label: 'Needs attention', className: 'warn' };
}

function trajectoryStatus(coveragePct) {
  if (coveragePct == null || coveragePct < 5) {
    return { label: 'Needs enrichment', className: 'warn' };
  }
  return { label: 'Healthy', className: '' };
}

function formatSignalPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '0%';
  const n = Number(value);
  if (Number.isInteger(n)) return `${n}%`;
  return `${n}%`;
}

function barWidthPct(value) {
  const n = Number(value) || 0;
  if (n > 0 && n < 2) return 2;
  return Math.min(100, Math.max(0, n));
}

function funnelStepValue(step) {
  const value = step?.pct ?? step?.conversion_from_prev_pct ?? step?.count ?? 0;
  return formatSignalPct(value);
}

function funnelBarWidth(step) {
  const value = step?.pct ?? step?.conversion_from_prev_pct ?? step?.count ?? 0;
  return barWidthPct(value);
}

export default function SignalsTabContent({ pack }) {
  const adoption = pack?.ai_match_adoption;
  const coverage = pack?.career_trajectory_coverage;
  const referral = pack?.referral_metrics;
  const assessment = pack?.assessment;
  const topRec = (pack?.signal_recommendations || [])[0];
  const signalActions = (pack?.signal_recommendations || []).slice(0, 3);
  const adoptionPct = adoption?.adoption_pct ?? 0;
  const adoptionCopy = buildAdoptionCopy(adoption);
  const skillsMatchPct =
    (pack?.signal_strength || []).find((row) => row.category === 'Skills match')?.pct ?? null;
  const medianFit = pack?.headline?.median_fit_score ?? pack?.tab_kpis?.analytics?.avg_fit_pct ?? null;
  const quality = qualityStatus(medianFit);
  const trajectory = trajectoryStatus(coverage?.coverage_pct);

  return (
    <div data-testid="dash-signals">
      <section className="signal-hero signals-hero-row" data-testid="signals-hero-row">
        <div className="card signal-main signals-adoption-card">
          <span className="pill purple">✦ AI Matches adoption</span>
          <div className="big">{adoptionPct != null ? `${adoptionPct}%` : '—'}</div>
          <p className="sub">{adoptionCopy.body}</p>
          <ChartHoverTip
            as="div"
            className="progress"
            tip={`AI match adoption: ${adoptionPct}% · ${adoption?.jobs_with_matches ?? 0} of ${adoption?.open_jobs ?? 0} roles covered`}
          >
            <i style={{ width: `${Math.min(100, Math.max(0, adoptionPct ?? 0))}%` }} />
          </ChartHoverTip>
          <p className="sub">
            <b>{adoption?.jobs_with_matches ?? 0}</b> of <b>{adoption?.open_jobs ?? 0}</b> open roles covered
          </p>
        </div>

        <div className="card signals-quality-card">
          <div className="metric-label">Quality Signal</div>
          <div className="big">{medianFit != null ? `${medianFit}%` : '—'}</div>
          <p className="sub">Median fit score across active candidates.</p>
          <span className={`pill signals-quality-pill ${quality.className}`.trim()}>{quality.label}</span>
        </div>

        <div className="card signals-trajectory-card">
          <div className="metric-label">Career trajectory coverage</div>
          <div className="big">{formatCoveragePct(coverage?.coverage_pct)}</div>
          <p className="sub">
            {coverage?.candidates_with_report ?? 0} of {coverage?.active_pipeline_candidates ?? 0} active pipeline
            candidates has career trajectory analysis.
          </p>
          <span className={`pill signals-trajectory-pill ${trajectory.className}`.trim()}>{trajectory.label}</span>
        </div>
      </section>

      <section className="signals-kpi-row" data-testid="signals-kpi-row">
        <div className="card signals-referrals-card">
          <div className="metric-label">Referrals in window</div>
          <div className="big">{referral?.referrals_in_window ?? 0}</div>
          <p className="sub">{referral?.referral_share_pct ?? 0}% of applications</p>
        </div>
        <div className="card signals-match-precision-card">
          <div className="metric-label">Match precision proxy</div>
          <div className="big">{skillsMatchPct != null ? `${skillsMatchPct}%` : '—'}</div>
          <p className="sub">Skills match signal strength</p>
        </div>
        <div className="card signals-assessment-card">
          <div className="metric-label">Assessment in progress</div>
          <div className="big">{pack?.pipeline_by_stage?.ASSESSMENT_SENT ?? 0}</div>
          <p className="sub">Invite → submit tracking</p>
        </div>
      </section>

      <section className="grid2 signals-grid2-row" data-testid="signals-grid2-row">
        <div className="card signals-strength-card">
          <div className="metric-label">{chartTitleCase('Signal strength by category')}</div>
          {(pack?.signal_strength || []).map((row) => (
            <ChartHoverTip
              key={row.category}
              as="div"
              className="barrow"
              tip={`${row.category}: ${formatSignalPct(row.pct)} signal strength`}
            >
              <span>{row.category}</span>
              <div className="bar">
                <i style={{ width: `${barWidthPct(row.pct)}%` }} />
              </div>
              <b>{formatSignalPct(row.pct)}</b>
            </ChartHoverTip>
          ))}
        </div>
        <div className="card signals-recommendations-card">
          <div className="metric-label">AI recommendations</div>
          <div className="signal-list">
            {(pack?.signal_recommendations || []).map((rec, i) => (
              <div key={i} className="signal-item">
                <div className="signal-icon">{i + 1}</div>
                <div>
                  <h4>{rec.title}</h4>
                  <p>{rec.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="assessment signals-assessment-row" data-testid="signals-assessment-row">
        <div className="card signals-funnel-card">
          <div className="metric-label">{chartTitleCase('Assessment completion funnel')}</div>
          <p className="sub">Invite → submit → score funnel across the selected 30-day window.</p>
          <div className="funnel-bars">
            {(assessment?.funnel || []).map((step) => (
              <ChartHoverTip
                key={step.stage}
                as="div"
                className="funnel-step"
                tip={`${step.label}: ${funnelStepValue(step)}${step.count != null ? ` · ${step.count} candidates` : ''}`}
              >
                <span>{step.label}</span>
                <div className="bar">
                  <i style={{ width: `${funnelBarWidth(step)}%` }} />
                </div>
                <b>{funnelStepValue(step)}</b>
              </ChartHoverTip>
            ))}
          </div>
        </div>
        <div className="card signals-actions-card">
          <div className="metric-label">Signal actions</div>
          <div className="scorecards">
            <Link
              to={assessment?.command_center_path || '/assessments?tab=overview'}
              className="scorecard signals-action-tile"
            >
              <span className="pill purple">Command</span>
              <p className="sub">Open assessment command center</p>
            </Link>
            {(signalActions[0] || topRec) ? (
              <Link to="/candidates" className="scorecard signals-action-tile">
                <span className="pill">Review</span>
                <p className="sub">{(signalActions[0] || topRec).message}</p>
              </Link>
            ) : (
              <Link to="/candidates" className="scorecard signals-action-tile">
                <span className="pill">Review</span>
                <p className="sub">Review candidates missing trajectory data</p>
              </Link>
            )}
            {(signalActions[1] || signalActions[2]) ? (
              <Link to="/referrals" className="scorecard signals-action-tile">
                <span className="pill warn">Fix</span>
                <p className="sub">{(signalActions[1] || signalActions[2]).message}</p>
              </Link>
            ) : (
              <Link to="/referrals" className="scorecard signals-action-tile">
                <span className="pill warn">Fix</span>
                <p className="sub">Improve referral signal capture</p>
              </Link>
            )}
          </div>
        </div>
      </section>

      {topRec ? (
        <DashboardActionStrip
          title="Suggested action: improve signal coverage"
          message={topRec.message}
          actionPath="/assessments?tab=overview"
        />
      ) : null}
    </div>
  );
}
