import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { jobsOpenPath } from '@/shared/lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';
import {
  DASHBOARD_CHART_CURSOR,
  DASHBOARD_CHART_TOOLTIP_PROPS,
  DashboardChartTooltipContent,
} from './DashboardChartTooltip';

export default function ReqAgingChart({ reqAging = [], embedded = false }) {
  const navigate = useNavigate();
  const data = reqAging.map((row) => ({
    label: row.label,
    count: row.count,
  }));

  const chartBody =
    data.length === 0 || !data.some((row) => row.count > 0) ? (
      <p className="muted analytics-empty">No requisition ageing data available.</p>
    ) : (
      <>
        {!embedded ? (
          <p className="text-xs text-slate-500 mb-3">Open jobs by days since posting (not offer pending time)</p>
        ) : null}
        <ResponsiveContainer width="100%" height={embedded ? 220 : 220}>
          <BarChart data={data}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip
              {...DASHBOARD_CHART_TOOLTIP_PROPS}
              cursor={DASHBOARD_CHART_CURSOR}
              content={
                <DashboardChartTooltipContent formatter={(value) => [value, 'Open reqs']} />
              }
            />
            <Bar
              dataKey="count"
              fill="#F59E0B"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={() => navigate(jobsOpenPath())}
            />
          </BarChart>
        </ResponsiveContainer>
        {!embedded ? (
          <ChartAccessibleTable
            caption={chartTitleCase('Requisition aging buckets')}
            columns={[
              { key: 'label', label: 'Age bucket' },
              { key: 'count', label: 'Open reqs' },
            ]}
            rows={data.map((row) => ({ id: row.label, ...row }))}
          />
        ) : null}
      </>
    );

  if (embedded) {
    return (
      <div className="analytics-embedded-chart analytics-req-aging-embedded" data-testid="req-aging-chart">
        {chartBody}
      </div>
    );
  }

  return (
    <ChartCard
      title="Requisition aging"
      testId="req-aging-chart"
      empty={data.length === 0}
      emptyMessage="No open requisitions"
      emptyHeight={220}
    >
      {chartBody}
    </ChartCard>
  );
}
