import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ChartCard from './ChartCard';
import ChartAccessibleTable from './ChartAccessibleTable';
import { cn } from '../../lib/utils';

const COLORS = ['#EF4444', '#F59E0B', '#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#3B82F6'];

export default function ConversionBottleneckChart({
  conversionBottleneck = [],
  bottleneckSlowHires = [],
}) {
  const [selectedStage, setSelectedStage] = useState(null);

  const data = conversionBottleneck.slice(0, 8).map((row) => ({
    name: row.label,
    stage: row.stage,
    median: row.median_days ?? 0,
    sample: row.sample_size,
  }));

  const primary = data[0];

  const slowForStage = useMemo(() => {
    if (!selectedStage) return [];
    return bottleneckSlowHires.filter((row) => row.stage === selectedStage).slice(0, 8);
  }, [bottleneckSlowHires, selectedStage]);

  const handleBarClick = (bar) => {
    const stage = bar?.payload?.stage;
    if (!stage) return;
    setSelectedStage((cur) => (cur === stage ? null : stage));
  };

  return (
    <ChartCard
      title="Conversion bottleneck"
      testId="conversion-bottleneck-chart"
      empty={data.length === 0}
      emptyMessage="No hire journey data in this window"
      emptyHeight={220}
    >
      <>
        {primary ? (
          <p className="text-xs text-slate-500 mb-3">
            Median dwell time by stage for hires in window
            {primary.median > 0 ? (
              <>
                {' '}
                — primary bottleneck: <span className="font-medium text-slate-700">{primary.name}</span> ({primary.median}d)
              </>
            ) : null}
            {data.length > 0 ? (
              <span className="block mt-1 text-slate-400">Click a bar to see hires that exceeded SLA in that stage.</span>
            ) : null}
          </p>
        ) : null}
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" allowDecimals={false} unit="d" />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, _n, props) => [`${v}d median (n=${props?.payload?.sample})`, 'Days']} />
            <Bar
              dataKey="median"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={handleBarClick}
            >
              {data.map((row, i) => (
                <Cell
                  key={row.stage}
                  fill={COLORS[i % COLORS.length]}
                  stroke={selectedStage === row.stage ? '#0F172A' : undefined}
                  strokeWidth={selectedStage === row.stage ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {selectedStage ? (
          <div className="mt-4 border-t border-slate-100 pt-3" data-testid="bottleneck-slow-hires">
            <p className="text-xs font-medium text-slate-700 mb-2">
              SLA breaches — {selectedStage.replace(/_/g, ' ')}
            </p>
            {slowForStage.length === 0 ? (
              <p className="text-xs text-slate-500">No hires in this window exceeded SLA for this stage.</p>
            ) : (
              <ul className="space-y-2">
                {slowForStage.map((row) => (
                  <li
                    key={`${row.application_id}-${row.stage}`}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <Link
                      to={`/candidates/${row.candidate_id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {row.candidate_name}
                    </Link>
                    <span className="text-slate-600">{row.job_title}</span>
                    <span className={cn('font-semibold text-amber-700')}>
                      {row.days}d
                      <span className="font-normal text-slate-500 ml-1">
                        (+{row.over_sla_days}d over {row.sla_days}d SLA)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        <ChartAccessibleTable
          caption="Conversion bottleneck by stage"
          columns={[
            { key: 'name', label: 'Stage' },
            { key: 'median', label: 'Median days' },
            { key: 'sample', label: 'Sample size' },
          ]}
          rows={data.map((row) => ({ id: row.stage, ...row }))}
        />
      </>
    </ChartCard>
  );
}
