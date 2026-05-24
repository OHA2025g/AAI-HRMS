import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { candidatesPathForChannel } from '../../lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';

const COLORS = ['#6366F1', '#10B981', '#0EA5E9', '#F59E0B'];

export default function QualityBySourceChart({ qualityBySource = [] }) {
  const navigate = useNavigate();
  const data = qualityBySource.map((row) => ({
    name: row.label,
    avgFit: row.avg_fit_score,
    count: row.count,
    channel: row.channel,
  }));

  return (
    <ChartCard
      title="Avg fit by source"
      testId="quality-by-source-chart"
      empty={data.length === 0}
      emptyMessage="No fit scores by source yet"
      emptyHeight={240}
    >
      <>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, _n, props) => [`${v}% (${props?.payload?.count} scored)`, 'Avg fit']} />
            <Bar
              dataKey="avgFit"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(bar) => bar?.payload?.channel && navigate(candidatesPathForChannel(bar.payload.channel))}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartAccessibleTable
          caption="Average fit score by candidate source"
          columns={[
            { key: 'name', label: 'Source' },
            { key: 'avgFit', label: 'Avg fit %' },
            { key: 'count', label: 'Scored' },
          ]}
          rows={data.map((row) => ({
            id: row.channel || row.name,
            name: row.name,
            avgFit: row.avgFit != null ? `${row.avgFit}%` : '—',
            count: row.count,
          }))}
        />
      </>
    </ChartCard>
  );
}
