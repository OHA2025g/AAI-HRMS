import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { pipelinePathForStage } from '../../lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';
import { chartTitleCase } from '../../lib/chartTitleCase';

export default function OfferAgingChart({ offerAgingBuckets = [] }) {
  const navigate = useNavigate();
  const data = offerAgingBuckets.map((row) => ({
    label: row.label,
    count: row.count,
  }));

  return (
    <ChartCard
      title="Offer aging buckets"
      testId="offer-aging-chart"
      empty={data.every((d) => !d.count)}
      emptyMessage="No pending offers"
      emptyHeight={220}
    >
      <>
        <p className="text-xs text-slate-500 mb-3">Applications in salary discussion by days pending</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar
              dataKey="count"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={() => navigate(pipelinePathForStage('OFFER'))}
            />
          </BarChart>
        </ResponsiveContainer>
        <ChartAccessibleTable
          caption={chartTitleCase('Offer aging buckets')}
          columns={[
            { key: 'label', label: 'Age bucket' },
            { key: 'count', label: 'Pending offers' },
          ]}
          rows={data.map((row) => ({ id: row.label, ...row }))}
        />
      </>
    </ChartCard>
  );
}
