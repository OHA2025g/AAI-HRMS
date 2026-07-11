import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { getTypeColor } from '@/shared/hooks/useAssessmentsWorkspace';
import { chartTitleCase } from '@/shared/lib/chartTitleCase';

function cellColor(intensity, count) {
  if (count === 0) return 'bg-slate-50 text-slate-400';
  if (intensity >= 0.75) return 'bg-emerald-500 text-white';
  if (intensity >= 0.5) return 'bg-emerald-300 text-emerald-950';
  if (intensity >= 0.25) return 'bg-amber-200 text-amber-950';
  return 'bg-indigo-100 text-indigo-800';
}

export default function AssessmentCoverageHeatmap({ matrix }) {
  const { jobs = [], types = [], cells = [] } = matrix || {};

  const cellMap = useMemo(() => {
    const map = new Map();
    for (const cell of cells) {
      map.set(`${cell.job_id}:${cell.assessment_type}`, cell);
    }
    return map;
  }, [cells]);

  if (!jobs.length || !types.length) {
    return (
      <Card data-testid="assessment-coverage-heatmap">
        <CardHeader>
          <CardTitle>{chartTitleCase('Coverage heatmap')}</CardTitle>
          <CardDescription>Open jobs × assessment type — darker cells mean more tests and activity</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-500 py-6 text-center">
          No open jobs in scope for heatmap
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="assessment-coverage-heatmap">
      <CardHeader>
        <CardTitle>{chartTitleCase('Coverage heatmap')}</CardTitle>
        <CardDescription>
          Matrix of assessments per job and type. Cell shows test count; color reflects invites and completions in the
          selected window.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <thead>
            <tr>
              <th className="text-left p-2 text-slate-500 font-medium sticky left-0 bg-white">Job</th>
              {types.map((type) => (
                <th key={type} className="p-2 text-center font-medium">
                  <span className={`inline-block px-1.5 py-0.5 rounded ${getTypeColor(type)}`}>{type.replace('_', ' ')}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.job_id} className="border-t border-slate-100">
                <td className="p-2 font-medium text-slate-800 sticky left-0 bg-white max-w-[180px] truncate">
                  <Link to={`/jobs/${job.job_id}`} className="hover:text-indigo-600">
                    {job.title}
                  </Link>
                  {job.pipeline_active ? (
                    <span className="ml-1 text-amber-600" title="Pipeline activity">•</span>
                  ) : null}
                </td>
                {types.map((type) => {
                  const cell = cellMap.get(`${job.job_id}:${type}`) || {
                    assessment_count: 0,
                    invited: 0,
                    completed: 0,
                    intensity: 0,
                  };
                  const title = `${cell.assessment_count} test(s), ${cell.invited} invited, ${cell.completed} completed`;
                  return (
                    <td key={type} className="p-1">
                      <div
                        className={`rounded-md text-center py-2 px-1 font-semibold ${cellColor(cell.intensity, cell.assessment_count)}`}
                        title={title}
                        data-testid={`heatmap-${job.job_id}-${type}`}
                      >
                        {cell.assessment_count || '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
