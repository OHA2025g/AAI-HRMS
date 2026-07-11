import React, { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardGlassCard from './DashboardGlassCard';
import ChartAccessibleTable from './ChartAccessibleTable';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';
import {
  DASHBOARD_CHART_CURSOR,
  DASHBOARD_CHART_TOOLTIP_PROPS,
  DashboardChartTooltipContent,
} from './DashboardChartTooltip';

function fmtNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '0';
  return Number(value).toLocaleString();
}

function sliceLastWeeks(points, weeks = 12) {
  return (points || []).slice(-weeks).map((p) => ({
    label: p.label,
    applications: p.new_applications ?? 0,
    interviews: p.median_interview_dwell_days != null ? Math.round(p.median_interview_dwell_days) : null,
    hires: p.hires ?? 0,
  }));
}

function VelocityChartBody({ data, embedded, fillId }) {
  const chartMargin = { top: 8, right: 12, left: 4, bottom: embedded ? 18 : 8 };

  if (embedded) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickMargin={8}
            interval="preserveStartEnd"
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tick={{ fontSize: 10, fill: '#64748b' }}
            domain={[0, 'auto']}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            {...DASHBOARD_CHART_TOOLTIP_PROPS}
            cursor={DASHBOARD_CHART_CURSOR}
            content={<DashboardChartTooltipContent />}
          />
          <Area
            type="monotone"
            dataKey="applications"
            name="Applications"
            stroke="#6d4cff"
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          />
          <Line
            type="monotone"
            dataKey="hires"
            name="Hires"
            stroke="#11b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={210}>
      <LineChart data={data}>
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} width={32} tick={{ fontSize: 10 }} />
        <Tooltip
          {...DASHBOARD_CHART_TOOLTIP_PROPS}
          cursor={DASHBOARD_CHART_CURSOR}
          content={<DashboardChartTooltipContent />}
        />
        <Line
          type="monotone"
          dataKey="applications"
          name="Applications"
          stroke="#6d4cff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
        />
        <Line
          type="monotone"
          dataKey="hires"
          name="Hires"
          stroke="#11b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Compact hiring velocity chart for Overview tab (applications + hires). */
export default function HiringVelocityChart({
  points = [],
  headline = {},
  pipelineByStage = {},
  mockStyle = false,
  embedded = false,
}) {
  const fillId = useId().replace(/:/g, '');
  const data = useMemo(() => sliceLastWeeks(points, 12), [points]);
  const empty = data.length === 0;

  const summaryApps = data.reduce((s, d) => s + d.applications, 0);
  const summaryInterviews = pipelineByStage?.INTERVIEW_1 ?? 0;
  const summaryHires = data.reduce((s, d) => s + d.hires, 0);

  const chartNode =
    empty && !mockStyle ? (
      <p className="overview-trend-empty">Trend data unavailable</p>
    ) : empty && mockStyle ? (
      <div className="hd-chart-mock" aria-hidden>
        <div className="hd-chart-mock-line" />
      </div>
    ) : mockStyle ? (
      <div className="hd-chart-mock" aria-hidden>
        <div className="hd-chart-mock-line" />
      </div>
    ) : (
      <VelocityChartBody data={data} embedded={embedded} fillId={fillId} />
    );

  const footer = (
    <p className={embedded ? undefined : 'text-sm text-slate-600 mt-2'}>
      <b>Applications:</b> {fmtNum(summaryApps)} &nbsp;
      <b>Interviews:</b> {fmtNum(summaryInterviews)} &nbsp;
      <b>Hires:</b> {fmtNum(summaryHires)}
    </p>
  );

  if (embedded) {
    return (
      <>
        <div className="chart overview-trend-chart">{chartNode}</div>
        {footer}
        {!empty && !mockStyle ? (
          <ChartAccessibleTable
            caption={chartTitleCase('Hiring velocity by period')}
            columns={[
              { key: 'label', label: 'Period' },
              { key: 'applications', label: 'Applications' },
              { key: 'hires', label: 'Hires' },
            ]}
            rows={data}
          />
        ) : null}
      </>
    );
  }

  return (
    <DashboardGlassCard className="hd-kpi-card" data-testid="hiring-velocity-chart">
      <h3 className="hd-card-title">
        Hiring Velocity <small className="text-slate-500 font-normal">(Last 12 Weeks)</small>
      </h3>
      {chartNode}
      {footer}
      {!empty && !mockStyle ? (
        <ChartAccessibleTable
          caption={chartTitleCase('Hiring velocity by period')}
          columns={[
            { key: 'label', label: 'Period' },
            { key: 'applications', label: 'Applications' },
            { key: 'hires', label: 'Hires' },
          ]}
          rows={data}
        />
      ) : null}
    </DashboardGlassCard>
  );
}
