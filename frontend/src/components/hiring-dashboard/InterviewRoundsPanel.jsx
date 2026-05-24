import React from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelinePathForStage } from '../../lib/hiringDashboardDrill';
import ChartCard from './ChartCard';

export default function InterviewRoundsPanel({ interviewRoundMetrics = [] }) {
  const navigate = useNavigate();

  return (
    <ChartCard
      title="Interview rounds"
      testId="interview-rounds-panel"
      empty={interviewRoundMetrics.length === 0}
      emptyMessage="No interview round data"
      emptyHeight={160}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Interview round metrics">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2 font-medium">Round</th>
              <th className="pb-2 font-medium text-right">Active</th>
              <th className="pb-2 font-medium text-right">Avg days</th>
              <th className="pb-2 font-medium text-right">→ Next %</th>
            </tr>
          </thead>
          <tbody>
            {interviewRoundMetrics.map((row) => (
              <tr key={row.stage} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5">
                  <button
                    type="button"
                    className="font-medium text-indigo-600 hover:underline text-left"
                    onClick={() => navigate(pipelinePathForStage(row.stage))}
                  >
                    {row.label}
                  </button>
                </td>
                <td className="py-2.5 text-right font-semibold text-slate-900">{row.active_count}</td>
                <td className="py-2.5 text-right text-slate-600">
                  {row.avg_days != null ? `${row.avg_days}d` : '—'}
                </td>
                <td className="py-2.5 text-right text-slate-600">
                  {row.conversion_to_next_pct != null ? `${row.conversion_to_next_pct}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
