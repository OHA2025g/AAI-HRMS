import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function AssessmentOutcomePanel({ outcome }) {
  if (!outcome) return null;

  const rows = [
    { label: 'Scored submissions', value: outcome.scored },
    { label: 'Passed', value: outcome.passed },
    { label: 'Reached interview+', value: outcome.reached_interview },
    { label: 'Hired', value: outcome.hired },
    {
      label: 'Pass → interview',
      value: outcome.pass_to_interview_pct != null ? `${outcome.pass_to_interview_pct}%` : '—',
    },
    {
      label: 'Scored → interview',
      value: outcome.scored_to_interview_pct != null ? `${outcome.scored_to_interview_pct}%` : '—',
    },
    {
      label: 'Pass → hire',
      value: outcome.pass_to_hire_pct != null ? `${outcome.pass_to_hire_pct}%` : '—',
    },
  ];

  const chartData = useMemo(
    () => [
      { name: 'Scored', count: outcome.scored || 0 },
      { name: 'Passed', count: outcome.passed || 0 },
      { name: 'Interview+', count: outcome.reached_interview || 0 },
      { name: 'Hired', count: outcome.hired || 0 },
    ],
    [outcome]
  );

  return (
    <Card data-testid="assessment-outcome-panel">
      <CardHeader>
        <CardTitle>Assessment → interview & hire</CardTitle>
        <CardDescription>Pipeline outcomes for scored submissions in org scope</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-48 w-full" data-testid="assessment-outcome-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rows.map((r) => (
            <div key={r.label} className="rounded-lg border border-slate-100 p-3">
              <p className="text-xs text-slate-500">{r.label}</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">{r.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
