import React from 'react';
import { Link } from 'react-router-dom';
import { chartTitleCase } from '../../../lib/chartTitleCase';
import AnalyticsTrendChart from '../AnalyticsTrendChart';
import RecentActivityFeed from '../RecentActivityFeed';
import SourceMixChart from '../SourceMixChart';
import QualityBySourceChart from '../QualityBySourceChart';
import FitScoreHistogram from '../FitScoreHistogram';
import StageAgingHeatmap from '../StageAgingHeatmap';
import ReqAgingChart from '../ReqAgingChart';

const ICON_MAP = { warning: '⚠️', clock: '⏳', target: '🎯', check: '✅' };

const TRENDS_SOURCE_LABELS = {
  snapshots: 'Daily snapshots',
  seeded: 'Backfilled weekly estimates',
  mixed: 'Daily snapshots + backfill',
  synthetic: 'Live weekly estimate',
};

const TREND_LEGEND = ['Applications', 'Avg fit %', 'Pending offers', 'Time to fill', 'Hire target'];

function EmptySection({ message }) {
  return <p className="muted analytics-empty">{message}</p>;
}

function formatApplicationsDelta(deltaPct) {
  if (deltaPct == null || Number.isNaN(Number(deltaPct))) return null;
  const abs = Math.abs(Number(deltaPct));
  const arrow = Number(deltaPct) >= 0 ? '↑' : '↓';
  return `${arrow} ${abs}% last 30d`;
}

function normalizeTopJobs(items) {
  return (items || []).slice(0, 4).map((row) => ({
    title: row.title,
    open_days: row.open_days,
    pipeline_count: row.pipeline_count,
    avg_fit_score: row.avg_fit_score,
  }));
}

function fitScoreFooter(avgFit) {
  if (avgFit == null) return { text: 'No fit data', className: '' };
  if (avgFit >= 70) return { text: 'Stable quality', className: 'up' };
  return { text: 'Quality needs attention', className: 'down' };
}

function offerConversionFooter(pct) {
  if (pct == null) return { text: 'No offer data', className: '' };
  if (pct >= 5) return { text: 'Healthy conversion', className: 'up' };
  return { text: 'Needs action', className: 'down' };
}

function stageAgeFooter(days, sourcedCount) {
  if (days == null) return { text: 'No stage ageing data', className: '' };
  if (sourcedCount > 0 && days >= 15) return { text: 'Sourced bottleneck', className: 'down' };
  if (days >= 10) return { text: 'Ageing risk', className: 'down' };
  return { text: 'Within target', className: 'up' };
}

function highFitFooter(pct) {
  if (pct == null) return { text: 'No high-fit data', className: '' };
  if (pct >= 8) return { text: 'Ready shortlist', className: 'up' };
  return { text: 'Expand sourcing', className: 'down' };
}

export default function AnalyticsTabContent({ pack, trends, trendsHealth }) {
  const kpis = pack?.tab_kpis?.analytics || {};
  const trendsForChart = trends || pack?.trends;
  const applicationsDelta = pack?.headline?.new_applications?.delta_pct;
  const applicationsValue = kpis.applications ?? pack?.headline?.new_applications?.value ?? '—';
  const applicationsFooter = formatApplicationsDelta(applicationsDelta) ?? 'Last window';
  const trendsSource = trendsForChart?.data_source || 'mixed';
  const trendsSourceLabel = TRENDS_SOURCE_LABELS[trendsSource] || TRENDS_SOURCE_LABELS.mixed;
  const analyticsSummary = pack?.analytics_summary || [];
  const topJobs = normalizeTopJobs(pack?.top_jobs);
  const sourcedCount = pack?.pipeline_by_stage?.SOURCED ?? 0;

  const fitFooter = fitScoreFooter(kpis.avg_fit_pct);
  const offerFooter = offerConversionFooter(kpis.offer_conversion_pct);
  const stageFooter = stageAgeFooter(kpis.avg_stage_age_days, sourcedCount);
  const highFitFooterMeta = highFitFooter(kpis.high_fit_pct);

  return (
    <div className="space-y-6" data-testid="dash-charts">
      <section className="kpi-row analytics-kpi-row" data-testid="analytics-kpi-row">
        <div className="card metric analytics-applications-card">
          <div className="label">Applications</div>
          <div className="num">{applicationsValue}</div>
          <div className={applicationsDelta != null && applicationsDelta < 0 ? 'down' : 'up'}>{applicationsFooter}</div>
        </div>
        <div className="card metric analytics-fit-card">
          <div className="label">Avg Fit Score</div>
          <div className="num">{kpis.avg_fit_pct != null ? `${Math.round(kpis.avg_fit_pct)}%` : '—'}</div>
          <div className={fitFooter.className}>{fitFooter.text}</div>
        </div>
        <div className="card metric analytics-offer-card">
          <div className="label">Offer Conversion</div>
          <div className="num">{kpis.offer_conversion_pct != null ? `${kpis.offer_conversion_pct}%` : '—'}</div>
          <div className={offerFooter.className}>{offerFooter.text}</div>
        </div>
        <div className="card metric analytics-stage-age-card">
          <div className="label">Avg Stage Age</div>
          <div className="num">{kpis.avg_stage_age_days != null ? `${kpis.avg_stage_age_days}d` : '—'}</div>
          <div className={stageFooter.className}>{stageFooter.text}</div>
        </div>
        <div className="card metric analytics-high-fit-card">
          <div className="label">High Fit Talent</div>
          <div className="num">{kpis.high_fit_pct != null ? `${kpis.high_fit_pct}%` : '—'}</div>
          <div className={highFitFooterMeta.className}>{highFitFooterMeta.text}</div>
        </div>
      </section>

      <section className="grid2 analytics-grid2-row" data-testid="analytics-grid2-row">
        <div className="card analytics-trend-card">
          <div className="section-head">
            <div>
              <h2>{chartTitleCase('6-month hiring trend')}</h2>
              <p className="analytics-trend-sub">
                Applications, fit score, hires and pending offers in one executive view.
              </p>
            </div>
            <button type="button" className="btn analytics-trend-btn">
              {trendsSourceLabel}
            </button>
          </div>
          <div className="chart analytics-trend-chart">
            <AnalyticsTrendChart points={trendsForChart?.points || []} />
          </div>
          <div className="legend analytics-trend-legend">
            {TREND_LEGEND.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="card insight-panel analytics-summary-card">
          <div className="section-head">
            <h3>AI analytics summary</h3>
            <span className="tag">Priority</span>
          </div>
          {analyticsSummary.length ? (
            <div className="insight-list">
              {analyticsSummary.map((item, i) => (
                <div key={item.title || i} className="insight-item">
                  <span className="insight-icon">{ICON_MAP[item.icon] || '•'}</span>
                  <div className="insight-copy">
                    <b>{item.title}</b>
                    <small>{item.message}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptySection message="No analytics summary available for the current window." />
          )}
        </div>
      </section>

      <section className="grid22 analytics-source-row" data-testid="analytics-source-row">
        <div className="card analytics-source-mix-card">
          <h3>{chartTitleCase('Candidate source mix')}</h3>
          <SourceMixChart embedded sourceMix={pack?.source_mix || []} />
        </div>
        <div className="card analytics-fit-source-card">
          <h3>{chartTitleCase('Average fit by source')}</h3>
          <QualityBySourceChart embedded qualityBySource={pack?.quality_by_source || []} />
        </div>
      </section>

      <section className="grid22 analytics-fit-aging-row" data-testid="analytics-fit-aging-row">
        <div className="card analytics-fit-dist-card">
          <h3>{chartTitleCase('Fit score distribution')}</h3>
          <FitScoreHistogram embedded fitDistribution={pack?.fit_distribution || []} />
        </div>
        <div className="card heat analytics-stage-heat-card">
          <h3>{chartTitleCase('Time in stage heatmap')}</h3>
          <StageAgingHeatmap
            embedded
            stageAging={pack?.stage_aging || []}
            stageAgingSummary={pack?.stage_aging_summary || []}
          />
        </div>
      </section>

      <section className="grid22 analytics-req-row" data-testid="analytics-req-row">
        <div className="card analytics-req-aging-card">
          <h3>{chartTitleCase('Requisition ageing')}</h3>
          <ReqAgingChart embedded reqAging={pack?.req_aging || []} />
        </div>
        <div className="card analytics-top-jobs-card">
          <div className="section-head">
            <h3>Top open roles</h3>
            <Link to="/jobs" className="analytics-all-jobs-link">
              All jobs
            </Link>
          </div>
          {topJobs.length ? (
            <table className="table analytics-top-jobs-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Open</th>
                  <th>Pipeline</th>
                  <th>Avg fit</th>
                </tr>
              </thead>
              <tbody>
                {topJobs.map((job) => (
                  <tr key={job.title}>
                    <td>
                      <b>{job.title}</b>
                    </td>
                    <td>{job.open_days != null ? `${job.open_days}d` : '—'}</td>
                    <td>{job.pipeline_count ?? '—'}</td>
                    <td>{job.avg_fit_score != null ? `${Math.round(job.avg_fit_score)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptySection message="No open roles in scope." />
          )}
        </div>
      </section>

      <RecentActivityFeed activities={pack?.recent_activities || []} />
    </div>
  );
}
