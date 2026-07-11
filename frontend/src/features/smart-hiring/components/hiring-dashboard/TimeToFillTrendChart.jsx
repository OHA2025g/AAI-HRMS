import React, { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ReferenceLine,
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

const TARGET_DAYS = 30;

function TtfChartBody({ data, embedded, fillId, targetDays }) {
  if (embedded) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 18 }}>
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
          <ReferenceLine y={targetDays} stroke="#f59e0b" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="timeToFill"
            name="Time to fill (d)"
            stroke="#6d4cff"
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
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
        <ReferenceLine y={targetDays} stroke="#f59e0b" strokeDasharray="4 4" label="Target" />
        <Line
          type="monotone"
          dataKey="timeToFill"
          name="Time to fill (d)"
          stroke="#6d4cff"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Compact time-to-fill trend for Overview tab. */
export default function TimeToFillTrendChart({
  points = [],
  avgDays,
  targetDays = TARGET_DAYS,
  mockStyle = false,
  embedded = false,
}) {
  const fillId = useId().replace(/:/g, '');
  const data = useMemo(
    () =>
      (points || [])
        .filter((p) => p.time_to_fill_days != null)
        .slice(-12)
        .map((p) => ({
          label: p.label,
          timeToFill: p.time_to_fill_days,
        })),
    [points]
  );
  const empty = data.length === 0;
  const displayAvg = avgDays ?? (data.length ? data[data.length - 1].timeToFill : null);

  const chartNode =
    empty && !mockStyle ? (
      <p className="overview-trend-empty">Time to fill trend unavailable</p>
    ) : empty && mockStyle ? (
      <div className="hd-chart-mock" aria-hidden>
        <div className="hd-chart-mock-line" />
      </div>
    ) : mockStyle ? (
      <div className="hd-chart-mock" aria-hidden>
        <div className="hd-chart-mock-line" />
      </div>
    ) : (
      <TtfChartBody data={data} embedded={embedded} fillId={fillId} targetDays={targetDays} />
    );

  const footer = (
    <p className={embedded ? undefined : 'text-sm text-slate-600 mt-2'}>
      <b>{displayAvg != null ? `${displayAvg} days` : '—'}</b> Average TTF &nbsp;
      <b>{targetDays} days</b> Target
    </p>
  );

  if (embedded) {
    return (
      <>
        <div className="chart overview-trend-chart">{chartNode}</div>
        {footer}
        {!empty && !mockStyle ? (
          <ChartAccessibleTable
            caption={chartTitleCase('Time to fill by period')}
            columns={[
              { key: 'label', label: 'Period' },
              { key: 'timeToFill', label: 'Days' },
            ]}
            rows={data}
          />
        ) : null}
      </>
    );
  }

  return (
    <DashboardGlassCard className="hd-kpi-card" data-testid="time-to-fill-trend-chart">
      <h3 className="hd-card-title">Time to Fill Trend</h3>
      {chartNode}
      {footer}
      {!empty && !mockStyle ? (
        <ChartAccessibleTable
          caption={chartTitleCase('Time to fill by period')}
          columns={[
            { key: 'label', label: 'Period' },
            { key: 'timeToFill', label: 'Days' },
          ]}
          rows={data}
        />
      ) : null}
    </DashboardGlassCard>
  );
}
