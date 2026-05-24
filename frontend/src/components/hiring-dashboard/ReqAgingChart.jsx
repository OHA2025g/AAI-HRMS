import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { jobsOpenPath } from '../../lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';

export default function ReqAgingChart({ reqAging = [] }) {
  const navigate = useNavigate();
  const data = reqAging.map((row) => ({
    label: row.label,
    count: row.count,
  }));

  return (
    <ChartCard
      title="Requisition aging"
      testId="req-aging-chart"
      empty={data.length === 0}
      emptyMessage="No open requisitions"
      emptyHeight={220}
    >
      <>
        <p className="text-xs text-slate-500 mb-3">Open jobs by days since posting (not offer pending time)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar
              dataKey="count"
              fill="#F59E0B"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={() => navigate(jobsOpenPath())}
            />
          </BarChart>
        </ResponsiveContainer>
        <ChartAccessibleTable
          caption="Requisition aging buckets"
          columns={[
            { key: 'label', label: 'Age bucket' },
            { key: 'count', label: 'Open reqs' },
          ]}
          rows={data.map((row) => ({ id: row.label, ...row }))}
        />
      </>
    </ChartCard>
  );
}
