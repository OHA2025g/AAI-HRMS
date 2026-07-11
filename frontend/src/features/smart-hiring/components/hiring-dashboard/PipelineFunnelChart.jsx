import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '@/shared/ui/button';
import { GitBranch } from 'lucide-react';
import { pipelinePathForStage, jobMatchesPath } from '@/shared/lib/hiringDashboardDrill';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';
import {
  DASHBOARD_CHART_CURSOR,
  DASHBOARD_CHART_TOOLTIP_PROPS,
  DashboardChartTooltipContent,
} from './DashboardChartTooltip';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#64748B'];

function funnelTooltipFormatter(value, _name, entry) {
  const conv = entry?.payload?.conversion;
  return conv != null ? [`${value} (${conv}% conv.)`, 'Count'] : [value, 'Count'];
}

export default function PipelineFunnelChart({ funnel = [], jobsWithoutMatches = [], embedded = false }) {
  const navigate = useNavigate();
  const data = funnel.map((row) => ({
    name: row.label || row.stage.replace(/_/g, ' '),
    count: row.count,
    stage: row.stage,
    conversion: row.conversion_from_prev_pct,
  }));

  const firstJobWithoutMatches = jobsWithoutMatches[0];

  const emptyContent = (
    <div
      className="h-[280px] flex flex-col items-center justify-center text-slate-500 gap-3 px-4 text-center"
      data-testid="funnel-empty-state"
    >
      <GitBranch className="w-12 h-12 text-slate-300" />
      <p>No funnel data yet — add candidates to open roles to see pipeline stages.</p>
      {firstJobWithoutMatches ? (
        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700">
          <Link
            to={jobMatchesPath(firstJobWithoutMatches.job_id)}
            data-testid="funnel-empty-find-matches-cta"
          >
            Run Find Matches on {firstJobWithoutMatches.title}
          </Link>
        </Button>
      ) : (
        <Button asChild size="sm" variant="outline">
          <Link to="/jobs/new" data-testid="funnel-empty-create-job-cta">
            Create a job
          </Link>
        </Button>
      )}
    </div>
  );

  const chartBody =
    data.length > 0 ? (
      <>
        <ResponsiveContainer width="100%" height={embedded ? 260 : 280}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
            <Tooltip
              {...DASHBOARD_CHART_TOOLTIP_PROPS}
              cursor={DASHBOARD_CHART_CURSOR}
              content={<DashboardChartTooltipContent formatter={funnelTooltipFormatter} />}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(bar) => bar?.payload?.stage && navigate(pipelinePathForStage(bar.payload.stage))}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {!embedded ? (
          <>
            <ChartAccessibleTable
              caption={chartTitleCase('Pipeline funnel stages')}
              columns={[
                { key: 'name', label: 'Stage' },
                { key: 'count', label: 'Count' },
                { key: 'conversion', label: 'Conversion %' },
              ]}
              rows={data.map((row) => ({
                id: row.stage,
                name: row.name,
                count: row.count,
                conversion: row.conversion != null ? `${row.conversion}%` : '—',
              }))}
            />
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              {data.map((row) => (
                <Link
                  key={row.stage}
                  to={pipelinePathForStage(row.stage)}
                  className="text-xs rounded-full bg-slate-100 px-2.5 py-1 hover:bg-indigo-50 hover:text-indigo-700"
                  data-testid={`funnel-drill-${row.stage}`}
                >
                  {row.name} ({row.count})
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </>
    ) : (
      emptyContent
    );

  if (embedded) {
    return (
      <div className="pipeline-funnel-embedded" data-testid="pipeline-funnel-chart">
        {chartBody}
      </div>
    );
  }

  return (
    <ChartCard title="Pipeline funnel" testId="pipeline-funnel-chart">
      {chartBody}
    </ChartCard>
  );
}
