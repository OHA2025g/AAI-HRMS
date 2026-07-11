import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { candidatesPathForFitBucket } from '@/shared/lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';
import {
  DASHBOARD_CHART_CURSOR,
  DASHBOARD_CHART_TOOLTIP_PROPS,
  DashboardChartTooltipContent,
} from './DashboardChartTooltip';

function fitTooltipFormatter(value, _name, entry) {
  const pct = entry?.payload?.pct;
  return pct != null ? [`${value} (${pct}%)`, 'Candidates'] : [value, 'Candidates'];
}

export default function FitScoreHistogram({ fitDistribution = [], embedded = false }) {
  const navigate = useNavigate();
  const data = fitDistribution.map((row) => ({
    bucket: row.bucket,
    count: row.count,
    pct: row.pct,
  }));

  const chartBody =
    data.length === 0 || !data.some((row) => row.count > 0) ? (
      <p className="muted analytics-empty">No fit score distribution data available.</p>
    ) : (
      <>
        <ResponsiveContainer width="100%" height={embedded ? 220 : 240}>
          <BarChart data={data}>
            <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip
              {...DASHBOARD_CHART_TOOLTIP_PROPS}
              cursor={DASHBOARD_CHART_CURSOR}
              content={<DashboardChartTooltipContent formatter={fitTooltipFormatter} />}
            />
            <Bar
              dataKey="count"
              fill="#8B5CF6"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(row) => navigate(candidatesPathForFitBucket(row?.bucket))}
            />
          </BarChart>
        </ResponsiveContainer>
        {!embedded ? (
          <ChartAccessibleTable
            caption={chartTitleCase('Fit score distribution')}
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
        ) : null}
      </>
    );

  if (embedded) {
    return (
      <div className="analytics-embedded-chart analytics-fit-dist-embedded" data-testid="fit-score-histogram">
        {chartBody}
      </div>
    );
  }

  return (
    <ChartCard
      title="Fit score distribution"
      testId="fit-score-histogram"
      empty={data.length === 0}
      emptyMessage="No fit scores yet"
      emptyHeight={240}
    >
      {chartBody}
    </ChartCard>
  );
}
