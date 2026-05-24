import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { candidatesPathForChannel } from '../../lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';

const COLORS = ['#6366F1', '#10B981', '#0EA5E9', '#F59E0B', '#94A3B8'];

export default function SourceMixChart({ sourceMix = [] }) {
  const navigate = useNavigate();
  const data = sourceMix.map((row) => ({
    name: row.label,
    value: row.count,
    pct: row.pct,
    channel: row.channel,
  }));

  const handleSlice = (entry) => {
    if (entry?.channel) navigate(candidatesPathForChannel(entry.channel));
  };

  return (
    <ChartCard
      title="Candidate source mix"
      testId="source-mix-chart"
      empty={data.length === 0}
      emptyMessage="No source data"
      emptyHeight={260}
    >
      <>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ pct }) => `${pct}%`}
              cursor="pointer"
              onClick={handleSlice}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name, props) => [`${value} (${props?.payload?.pct ?? 0}%)`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <ChartAccessibleTable
          caption="Candidate source mix"
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
    </ChartCard>
  );
}
