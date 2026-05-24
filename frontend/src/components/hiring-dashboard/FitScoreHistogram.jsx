import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { candidatesPathForFitBucket } from '../../lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';

export default function FitScoreHistogram({ fitDistribution = [] }) {
  const navigate = useNavigate();
  const data = fitDistribution.map((row) => ({
    bucket: row.bucket,
    count: row.count,
    pct: row.pct,
  }));

  return (
    <ChartCard
      title="Fit score distribution"
      testId="fit-score-histogram"
      empty={data.length === 0}
      emptyMessage="No fit scores yet"
      emptyHeight={240}
    >
      <>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value, _n, props) => [`${value} (${props?.payload?.pct ?? 0}%)`, 'Candidates']} />
            <Bar
              dataKey="count"
              fill="#8B5CF6"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(row) => navigate(candidatesPathForFitBucket(row?.bucket))}
            />
          </BarChart>
        </ResponsiveContainer>
        <ChartAccessibleTable
          caption="Fit score distribution"
          columns={[
            { key: 'bucket', label: 'Bucket' },
            { key: 'count', label: 'Candidates' },
            { key: 'pct', label: 'Share %' },
          ]}
          rows={data.map((row) => ({
            id: row.bucket,
            bucket: row.bucket,
            count: row.count,
            pct: row.pct != null ? `${row.pct}%` : '—',
          }))}
        />
      </>
    </ChartCard>
  );
}
