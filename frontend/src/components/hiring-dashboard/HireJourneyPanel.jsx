import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import ChartCard from './ChartCard';
import { cn } from '../../lib/utils';

export default function HireJourneyPanel({ hireJourneys = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  const rows = useMemo(
    () => [...hireJourneys].sort((a, b) => (b.total_days ?? 0) - (a.total_days ?? 0)),
    [hireJourneys]
  );

  const toggle = (id) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <ChartCard
      title="Recent hire journeys"
      testId="hire-journey-panel"
      empty={rows.length === 0}
      emptyMessage="No hires in this window with stage history"
      emptyHeight={160}
    >
      <>
        <p className="text-xs text-slate-500 mb-3">
          Per-hire time to join and longest stage — answers &ldquo;why did this take 40 days?&rdquo;
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Recent hire journeys">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-2 w-8" aria-hidden />
                <th className="pb-2 font-medium">Candidate</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Total</th>
                <th className="pb-2 font-medium">Bottleneck</th>
                <th className="pb-2 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const open = expandedId === row.application_id;
                return (
                  <React.Fragment key={row.application_id}>
                    <tr className="border-b border-slate-50">
                      <td className="py-2.5 pr-1">
                        <button
                          type="button"
                          onClick={() => toggle(row.application_id)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500"
                          aria-expanded={open}
                          aria-label={open ? 'Collapse stage breakdown' : 'Expand stage breakdown'}
                        >
                          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-2.5 pr-2">
                        <Link
                          to={`/candidates/${row.candidate_id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {row.candidate_name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-2 text-slate-700">{row.job_title}</td>
                      <td className="py-2.5 pr-2 font-semibold text-slate-900">{row.total_days}d</td>
                      <td className="py-2.5 pr-2">
                        {row.bottleneck_label ? (
                          <span className="text-amber-700 font-medium">
                            {row.bottleneck_label}
                            {row.bottleneck_days != null ? ` (${row.bottleneck_days}d)` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-500 text-xs">
                        {row.joined_at ? new Date(row.joined_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                    {open && row.stage_breakdown?.length > 0 ? (
                      <tr className="bg-slate-50/80">
                        <td colSpan={6} className="px-3 py-2">
                          <ul className="flex flex-wrap gap-2">
                            {row.stage_breakdown.map((st) => (
                              <li
                                key={`${row.application_id}-${st.stage}`}
                                className={cn(
                                  'rounded-md px-2 py-1 text-xs border',
                                  st.stage === row.bottleneck_stage
                                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                                    : 'border-slate-200 bg-white text-slate-700'
                                )}
                              >
                                <span className="font-medium">{st.label}</span>
                                <span className="text-slate-500 ml-1">{st.days}d</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    </ChartCard>
  );
}
