import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { candidatesPathForChannel } from '../../lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';
import { chartTitleCase } from '../../lib/chartTitleCase';
import {
  DASHBOARD_CHART_CURSOR,
  DASHBOARD_CHART_TOOLTIP_PROPS,
  DashboardChartTooltipContent,
} from './DashboardChartTooltip';

const COLORS = ['#6366F1', '#10B981', '#0EA5E9', '#F59E0B', '#94A3B8'];
const DONUT_INNER_RADIUS = { embedded: 52, default: 58 };
const DONUT_OUTER_RADIUS = { embedded: 82, default: 92 };

function sourceMixTooltipFormatter(value, name, entry) {
  const pct = entry?.payload?.pct;
  return pct != null ? [`${value} (${pct}%)`, name] : [value, name];
}

export default function SourceMixChart({ sourceMix = [], embedded = false }) {
  const navigate = useNavigate();
  const data = sourceMix.map((row) => ({
    name: row.label,
    value: row.count ?? row.pct ?? 0,
    pct: row.pct,
    channel: row.channel,
  }));

  const handleSlice = (entry) => {
    if (entry?.channel) navigate(candidatesPathForChannel(entry.channel));
  };

  const chartBody =
    data.length === 0 ? (
      <p className="muted analytics-empty">No source mix data for the current window.</p>
    ) : (
      <>
        <ResponsiveContainer width="100%" height={embedded ? 240 : 260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={embedded ? DONUT_INNER_RADIUS.embedded : DONUT_INNER_RADIUS.default}
              outerRadius={embedded ? DONUT_OUTER_RADIUS.embedded : DONUT_OUTER_RADIUS.default}
              paddingAngle={2}
              label={({ pct }) => (pct != null ? `${pct}%` : '')}
              labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              cursor="pointer"
              onClick={handleSlice}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              {...DASHBOARD_CHART_TOOLTIP_PROPS}
              content={<DashboardChartTooltipContent formatter={sourceMixTooltipFormatter} />}
            />
            {!embedded ? <Legend /> : null}
          </PieChart>
        </ResponsiveContainer>
        {!embedded ? (
          <>
            <ChartAccessibleTable
              caption={chartTitleCase('Candidate source mix')}
              columns={[
                { key: 'name', label: 'Source' },
                { key: 'value', label: 'Count' },
                { key: 'pct', label: 'Share %' },
              ]}
              rows={data.map((row) => ({
                id: row.channel || row.name,
                name: row.name,
                value: row.value,
                pct: row.pct != null ? `${row.pct}%` : '—',
              }))}
            />
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              {data.map((row) => (
                <Link
                  key={row.channel || row.name}
                  to={candidatesPathForChannel(row.channel)}
                  className="text-xs rounded-full bg-slate-100 px-2.5 py-1 hover:bg-indigo-50 hover:text-indigo-700"
                  data-testid={`source-drill-${row.channel}`}
                >
                  {row.name} ({row.value})
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </>
    );

  if (embedded) {
    return (
      <div
        className="analytics-embedded-chart analytics-source-mix-embedded"
        data-testid="source-mix-chart"
      >
        {chartBody}
      </div>
    );
  }

  return (
    <ChartCard
      title="Candidate source mix"
      testId="source-mix-chart"
      empty={data.length === 0}
      emptyMessage="No source data"
      emptyHeight={260}
    >
      {chartBody}
    </ChartCard>
  );
}
