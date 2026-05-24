import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { pipelinePathForStage } from '../../lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';

const COLORS = {
  OFFER_SENT: '#3B82F6',
  OFFER_NEGOTIATION: '#F59E0B',
  OFFER_ACCEPTED: '#10B981',
  OFFER_DECLINED: '#EF4444',
};

export default function OfferFunnelChart({ offerFunnel = [] }) {
  const navigate = useNavigate();
  const data = offerFunnel
    .filter((row) => row.count > 0)
    .map((row) => ({
      name: row.label,
      count: row.count,
      stage: row.stage,
    }));

  return (
    <ChartCard
      title="Offer lifecycle funnel"
      testId="offer-funnel-chart"
      empty={data.length === 0}
      emptyMessage="No pending offers by status"
      emptyHeight={160}
    >
      <>
        <p className="text-xs text-slate-500 mb-3">
          Pending offers split by status — click a bar to open Pipeline Salary tab filtered by status.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [value, 'Count']} />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(bar) => bar?.payload?.stage && navigate(pipelinePathForStage(bar.payload.stage))}
            >
              {data.map((row) => (
                <Cell key={row.stage} fill={COLORS[row.stage] || '#64748B'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <ChartAccessibleTable
          caption="Offer lifecycle by status"
          columns={[
            { key: 'name', label: 'Status' },
            { key: 'count', label: 'Count' },
          ]}
          rows={data.map((row) => ({ id: row.stage, ...row }))}
        />
      </>
    </ChartCard>
  );
}
