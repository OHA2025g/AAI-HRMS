import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { shortenInsightActionLabel } from '@/shared/lib/insightActionLabel';
import { buildAllAiInsightsFromPack } from '@/shared/lib/hiringDashboardInsights';
import AiInsightsModal from '../AiInsightsModal';
import OverviewHiringFunnel from '../OverviewHiringFunnel';
import DepartmentRiskHeatmap from '../DepartmentRiskHeatmap';
import HiringVelocityChart from '../HiringVelocityChart';
import TimeToFillTrendChart from '../TimeToFillTrendChart';
import ChartHoverTip from '../ChartHoverTip';

function fmtNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function formatDeltaPct(pct, windowDays) {
  if (pct == null) return null;
  const arrow = pct >= 0 ? '↑' : '↓';
  const abs = Math.abs(Number(pct));
  const period =
    windowDays === 7 ? 'last 7 days' : windowDays === 90 ? 'last 90 days' : 'last 30 days';
  return `${arrow} ${abs}% from ${period}`;
}

function healthLabel(status) {
  if (status === 'ok') return 'Healthy';
  if (status === 'critical') return 'Critical';
  return 'Moderate Risk';
}

function healthClass(status) {
  if (status === 'ok') return 'kpi-health--ok';
  if (status === 'critical') return 'kpi-health--critical';
  return 'kpi-health--watch';
}

function EmptySection({ message }) {
  return <p className="muted">{message}</p>;
}

export default function OverviewTabContent({ pack, trends, windowDays = 30 }) {
  const navigate = useNavigate();
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const headline = pack?.headline || {};
  const ttf = headline.time_to_fill_days;
  const offerAcc = headline.offer_acceptance_pct;
  const trendPoints = trends?.points || pack?.trends?.points || [];

  const insights = pack?.ai_insights || [];
  const allInsights = useMemo(() => buildAllAiInsightsFromPack(pack), [pack]);
  const funnel = pack?.funnel || [];
  const departmentRisk = pack?.department_risk || [];
  const talentIntel = pack?.talent_intelligence || [];
  const recruiters = pack?.recruiter_performance || [];
  const smartActions = pack?.smart_actions || [];

  const quality = pack?.talent_quality || {
    high_fit_count: 0,
    good_fit_count: 0,
    ai_recommended_count: 0,
  };

  return (
    <div data-testid="dash-overview">
      <section className="kpis">
        <div className="card kpi">
          <h3>Open Positions</h3>
          <div className="num">{fmtNum(headline.open_jobs?.value)}</div>
          {formatDeltaPct(headline.open_jobs?.delta_pct, 7) ? (
            <p className="up">{formatDeltaPct(headline.open_jobs?.delta_pct, 7)}</p>
          ) : null}
        </div>
        <div className="card kpi">
          <h3>Expected Hires</h3>
          <div className="num">{fmtNum(headline.expected_hires?.value)}</div>
          {formatDeltaPct(headline.expected_hires?.delta_pct, windowDays) ? (
            <p className="up">{formatDeltaPct(headline.expected_hires?.delta_pct, windowDays)}</p>
          ) : null}
        </div>
        <div className="card kpi">
          <h3>Time to Fill</h3>
          <div className="num">
            {ttf?.value != null ? (
              <>
                {ttf.value} <small>days</small>
              </>
            ) : (
              '—'
            )}
          </div>
          {ttf?.delta_pct != null ? (
            <p className="down">↑ {Math.abs(ttf.delta_pct)} days from target</p>
          ) : null}
        </div>
        <div className="card kpi">
          <h3>Offer Acceptance</h3>
          <div className="num">{offerAcc?.value != null ? `${offerAcc.value}%` : '—'}</div>
          {formatDeltaPct(offerAcc?.delta_pct, windowDays) ? (
            <p className="up">{formatDeltaPct(offerAcc?.delta_pct, windowDays)}</p>
          ) : null}
        </div>
        <div className="card kpi">
          <h3>Hiring Health</h3>
          <div className="num">
            {pack?.health_score ?? '—'}
            <small>/100</small>
          </div>
          <p className={healthClass(pack?.health_status)}>{healthLabel(pack?.health_status)}</p>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>✦ AI Insights &amp; Recommendations</h2>
          <button
            type="button"
            className="hd-insights-view-all"
            onClick={() => setInsightsModalOpen(true)}
            data-testid="view-all-insights"
          >
            View all insights →
          </button>
        </div>
        {insights.length ? (
          <div className="insights">
            {insights.map((ins, i) => (
              <div key={ins.title || i} className={cn('insight', ins.severity || 'blue')}>
                <h4>{ins.title}</h4>
                <p>{ins.message}</p>
                <button
                  type="button"
                  className="mini"
                  onClick={() => ins.action_path && navigate(ins.action_path)}
                >
                  {shortenInsightActionLabel(ins.action_label || ins.actionLabel || 'View Details')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptySection message="No AI insights for the current filters." />
        )}
      </section>

      <AiInsightsModal
        open={insightsModalOpen}
        onOpenChange={setInsightsModalOpen}
        insights={allInsights}
        source={pack?.ai_insights_source}
      />

      <section className="grid3">
        <div className="card" data-testid="hiring-funnel-card">
          <h3>Hiring Funnel</h3>
          {funnel.length ? (
            <OverviewHiringFunnel funnel={funnel} />
          ) : (
            <EmptySection message="No funnel data for the current filters." />
          )}
        </div>

        <div className="card" data-testid="hiring-velocity-chart">
          <h3>
            Hiring Velocity <small>(Last 12 Weeks)</small>
          </h3>
          <HiringVelocityChart
            embedded
            points={trendPoints}
            headline={headline}
            pipelineByStage={pack?.pipeline_by_stage}
          />
        </div>

        <div className="card" data-testid="time-to-fill-trend-chart">
          <h3>Time to Fill Trend</h3>
          <TimeToFillTrendChart embedded points={trendPoints} avgDays={ttf?.value} />
        </div>
      </section>

      <section className="grid3b">
        <div className="card" data-testid="department-risk-card">
          <h3>Department Risk Heatmap</h3>
          {departmentRisk.length ? (
            <DepartmentRiskHeatmap rows={departmentRisk} />
          ) : (
            <EmptySection message="No department risk data for open roles." />
          )}
        </div>

        <div className="card">
          <h3>Talent Intelligence</h3>
          {talentIntel.length ? (
            <div className="bars">
              {talentIntel.map((item) => (
                <ChartHoverTip
                  key={item.skill}
                  as="div"
                  tip={`${item.skill}: ${item.pct}% of in-demand skills`}
                >
                  {item.skill}{' '}
                  <div className="bar">
                    <i style={{ width: `${item.pct}%` }} />
                  </div>
                </ChartHoverTip>
              ))}
            </div>
          ) : (
            <EmptySection message="No skill intelligence available yet." />
          )}
        </div>

        <div className="card">
          <h3>Recruiter Performance</h3>
          {recruiters.length ? (
            <table className="table">
              <tr>
                <th>Recruiter</th>
                <th>Reqs</th>
                <th>Fill Rate</th>
                <th>Health</th>
              </tr>
              {recruiters.map((r) => (
                <tr key={r.recruiter_id}>
                  <td>{r.recruiter_name}</td>
                  <td>{r.reqs}</td>
                  <td>{r.fill_rate_pct != null ? `${r.fill_rate_pct}%` : '—'}</td>
                  <td>
                    <span className={cn('status', r.health_score < 85 && 'warn')}>{r.health_score}</span>
                  </td>
                </tr>
              ))}
            </table>
          ) : (
            <EmptySection message="No recruiter performance data available." />
          )}
        </div>
      </section>

      <section className="bottom">
        <div className="card">
          <h3>Talent Quality Overview</h3>
          <div className="quality">
            <div className="q">
              <h4>High Fit (90%+)</h4>
              <div className="num">{fmtNum(quality.high_fit_count)}</div>
              <small>Candidates</small>
            </div>
            <div className="q">
              <h4>Good Fit (70%-90%)</h4>
              <div className="num">{fmtNum(quality.good_fit_count)}</div>
              <small>Candidates</small>
            </div>
            <div className="q">
              <h4>AI Recommended</h4>
              <div className="num">{fmtNum(quality.ai_recommended_count)}</div>
              <small>Ready for interview</small>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Smart Action Center</h3>
            <Link to="/pipeline">View All →</Link>
          </div>
          {smartActions.length ? (
            <div className="actions-center">
              {smartActions.map((a) => (
                <div key={a.id} className="task">
                  {a.label}
                  <b>{a.count}</b>
                  <span className="pending">Pending</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptySection message="No pending smart actions." />
          )}
        </div>
      </section>
    </div>
  );
}
