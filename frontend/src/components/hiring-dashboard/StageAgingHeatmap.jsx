import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { pipelinePathForStage } from '../../lib/hiringDashboardDrill';
import ChartAccessibleTable from './ChartAccessibleTable';
import ChartCard from './ChartCard';
import ChartHoverTip from './ChartHoverTip';
import { chartTitleCase } from '../../lib/chartTitleCase';

const BUCKETS = ['0-7d', '8-14d', '15-30d', '31+d'];
const MOCK_BUCKETS = ['0-7d', '8-14d', '15-30d'];

function cellColor(count, max) {
  if (!count) return 'bg-slate-50 text-slate-400';
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.66) return 'bg-red-100 text-red-800';
  if (ratio > 0.33) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-50 text-emerald-800';
}

function heatboxClass(count, maxCount) {
  if (!count) return '';
  const ratio = count / Math.max(maxCount, 1);
  if (ratio > 0.66) return 'hot';
  if (ratio > 0.33) return 'mild';
  return '';
}

function formatAvgDays(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return Number.isInteger(n) ? `${n}d` : `${n}d`;
}

function EmbeddedHeatTable({ stageAging, stageAgingSummary }) {
  const navigate = useNavigate();
  const { rows, maxCount } = useMemo(() => {
    const matrix = {};
    let max = 0;
    (stageAging || []).forEach((cell) => {
      if (!MOCK_BUCKETS.includes(cell.bucket)) return;
      matrix[`${cell.stage}|${cell.bucket}`] = cell.count ?? 0;
      max = Math.max(max, cell.count ?? 0);
    });

    const heatRows = (stageAgingSummary || []).map((summary) => ({
      label: summary.label || summary.stage,
      stage: summary.stage,
      cells: MOCK_BUCKETS.map((bucket) => matrix[`${summary.stage}|${bucket}`] ?? null),
      avg_days: summary.avg_days,
    }));

    return { rows: heatRows, maxCount: Math.max(max, 1) };
  }, [stageAging, stageAgingSummary]);

  if (!rows.length) {
    return <p className="muted analytics-empty">No stage ageing data available.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Stage</th>
          <th>0–7d</th>
          <th>8–14d</th>
          <th>15–30d</th>
          <th>Avg</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.stage}>
            <td>{row.label}</td>
            {row.cells.map((count, i) => (
              <td key={`${row.stage}-${i}`}>
                {count == null || count === 0 ? (
                  '—'
                ) : (
                  <ChartHoverTip
                    as="span"
                    className={`heatbox ${heatboxClass(count, maxCount)}`.trim()}
                    tip={`${row.label} · ${MOCK_BUCKETS[i]}: ${count} candidate${count === 1 ? '' : 's'}`}
                    onClick={() => navigate(pipelinePathForStage(row.stage))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(pipelinePathForStage(row.stage));
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {count}
                  </ChartHoverTip>
                )}
              </td>
            ))}
            <td>{formatAvgDays(row.avg_days)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function StageAgingHeatmap({
  stageAging = [],
  stageAgingSummary = [],
  embedded = false,
}) {
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

  if (embedded) {
    return (
      <div
        className="analytics-embedded-chart analytics-stage-heat-embedded"
        data-testid="stage-aging-heatmap"
      >
        <EmbeddedHeatTable stageAging={stageAging} stageAgingSummary={stageAgingSummary} />
      </div>
    );
  }

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
                        <ChartHoverTip
                          as="button"
                          type="button"
                          className={cn(
                            'w-full rounded-md py-2 text-center font-medium transition-colors chart-hover-tip--cell',
                            cellColor(count, maxCount),
                            count ? 'hover:ring-2 hover:ring-indigo-300' : 'cursor-default'
                          )}
                          tip={
                            count
                              ? `${label} · ${bucket}: ${count} candidate${count === 1 ? '' : 's'}`
                              : undefined
                          }
                          onClick={() => count && navigate(pipelinePathForStage(stage))}
                          disabled={!count}
                        >
                          {count || '—'}
                        </ChartHoverTip>
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
          caption={chartTitleCase('Time in stage heatmap data')}
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
