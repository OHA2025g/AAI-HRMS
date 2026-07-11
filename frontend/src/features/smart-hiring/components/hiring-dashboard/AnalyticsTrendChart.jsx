import React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DASHBOARD_CHART_CURSOR,
  DASHBOARD_CHART_TOOLTIP_PROPS,
  DashboardChartTooltipContent,
} from './DashboardChartTooltip';

export function mapTrendChartData(points = []) {
  return points.map((point) => ({
    label: point.label,
    applications: point.new_applications ?? 0,
    fit: point.avg_fit_score ?? null,
    pendingOffers: point.pending_offers ?? 0,
    timeToFill: point.time_to_fill_days ?? null,
    hireTarget: point.hire_target ?? null,
  }));
}

export default function AnalyticsTrendChart({ points = [] }) {
  const data = mapTrendChartData(points);

  if (!data.length) {
    return (
      <div className="analytics-trend-empty" data-testid="analytics-trend-chart">
        Trend data unavailable
      </div>
    );
  }

  return (
    <div className="analytics-trend-chart-inner" data-testid="analytics-trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="#e2e8f0" vertical horizontal />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={{ stroke: '#94a3b8' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#94a3b8' }}
            tickLine={false}
            width={34}
            allowDecimals={false}
          />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} hide />
          <Tooltip
            {...DASHBOARD_CHART_TOOLTIP_PROPS}
            cursor={DASHBOARD_CHART_CURSOR}
            content={<DashboardChartTooltipContent />}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="applications"
            name="Applications"
            stroke="#6d4cff"
            fill="rgba(109, 76, 255, 0.18)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="fit"
            name="Avg fit %"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pendingOffers"
            name="Pending offers"
            stroke="#059669"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="timeToFill"
            name="Time to fill"
            stroke="#64748B"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="hireTarget"
            name="Hire target"
            stroke="#EF4444"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
