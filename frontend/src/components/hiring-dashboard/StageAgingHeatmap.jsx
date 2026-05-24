import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { pipelinePathForStage } from '../../lib/hiringDashboardDrill';
import ChartAccessibleTable from './ChartAccessibleTable';
import ChartCard from './ChartCard';

const BUCKETS = ['0-7d', '8-14d', '15-30d', '31+d'];

function cellColor(count, max) {
  if (!count) return 'bg-slate-50 text-slate-400';
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.66) return 'bg-red-100 text-red-800';
  if (ratio > 0.33) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-50 text-emerald-800';
}

export default function StageAgingHeatmap({ stageAging = [], stageAgingSummary = [] }) {
  const navigate = useNavigate();
  const { stages, matrix, maxCount } = useMemo(() => {
    const stageSet = [...new Set(stageAging.map((c) => c.stage))];
    const m = {};
    let max = 0;
    stageAging.forEach((c) => {
      m[`${c.stage}|${c.bucket}`] = c.count;
      max = Math.max(max, c.count);
    });
    return { stages: stageSet, matrix: m, maxCount: max };
  }, [stageAging]);

  const summaryByStage = useMemo(() => {
    const map = {};
    (stageAgingSummary || []).forEach((s) => {
      map[s.stage] = s;
    });
    return map;
  }, [stageAgingSummary]);

  const tableRows = useMemo(
    () =>
      stages.flatMap((stage) => {
        const label = summaryByStage[stage]?.label || stage.replace(/_/g, ' ');
        const avg = summaryByStage[stage]?.avg_days;
        return BUCKETS.map((bucket) => ({
          stage: label,
          bucket,
          count: matrix[`${stage}|${bucket}`] || 0,
          avg_days: avg != null ? `${avg}d` : '—',
        }));
      }),
    [stages, matrix, summaryByStage]
  );

  return (
    <ChartCard
      title="Time in stage (heatmap)"
      testId="stage-aging-heatmap"
      empty={stages.length === 0}
      emptyMessage="No active pipeline aging data"
      emptyHeight={200}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" aria-label="Time in stage heatmap">
          <thead>
            <tr>
              <th className="text-left p-2 text-slate-500 font-medium">Stage</th>
              {BUCKETS.map((b) => (
                <th key={b} className="p-2 text-slate-500 font-medium text-center">
                  {b}
                </th>
              ))}
              <th className="p-2 text-slate-500 font-medium text-right">Avg days</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage) => {
              const label = summaryByStage[stage]?.label || stage.replace(/_/g, ' ');
              const avg = summaryByStage[stage]?.avg_days;
              return (
                <tr key={stage} className="border-t border-slate-100">
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-left font-medium text-indigo-600 hover:underline"
                      onClick={() => navigate(pipelinePathForStage(stage))}
                    >
                      {label}
                    </button>
                  </td>
                  {BUCKETS.map((bucket) => {
                    const count = matrix[`${stage}|${bucket}`] || 0;
                    return (
                      <td key={bucket} className="p-1">
                        <button
                          type="button"
                          className={cn(
                            'w-full rounded-md py-2 text-center font-medium transition-colors',
                            cellColor(count, maxCount),
                            count ? 'hover:ring-2 hover:ring-indigo-300' : 'cursor-default'
                          )}
                          onClick={() => count && navigate(pipelinePathForStage(stage))}
                          disabled={!count}
                        >
                          {count || '—'}
                        </button>
                      </td>
                    );
                  })}
                  <td className="p-2 text-right text-slate-600">{avg != null ? `${avg}d` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ChartAccessibleTable
          caption="Time in stage heatmap data"
          columns={[
            { key: 'stage', label: 'Stage' },
            { key: 'bucket', label: 'Days in stage' },
            { key: 'count', label: 'Candidates' },
            { key: 'avg_days', label: 'Avg days' },
          ]}
          rows={tableRows}
          className="sr-only"
        />
      </div>
    </ChartCard>
  );
}
