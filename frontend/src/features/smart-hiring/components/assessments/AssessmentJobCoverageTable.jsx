import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

export default function AssessmentJobCoverageTable({ rows = [], missingOnly = false }) {
  const filtered = missingOnly
    ? rows.filter((row) => !row.has_assessment && (row.sent > 0 || row.cleared > 0))
    : rows;

  if (!filtered.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{missingOnly ? 'Jobs missing assessments' : 'Job coverage'}</CardTitle>
          <CardDescription>
            {missingOnly
              ? 'Open jobs with candidates in assessment stages but no test created'
              : 'Open jobs and assessment pipeline activity'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-500 py-6 text-center">
          {missingOnly ? 'No jobs missing assessments in scope' : 'No open jobs in scope'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={missingOnly ? 'assessment-missing-jobs' : 'assessment-job-coverage'}>
      <CardHeader>
        <CardTitle>{missingOnly ? 'Jobs missing assessments' : 'Job coverage'}</CardTitle>
        <CardDescription>
          {missingOnly
            ? 'These jobs need an assessment before candidates can be evaluated'
            : 'Which open jobs have assessments and how candidates are progressing'}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="pb-2 pr-4">Job</th>
              <th className="pb-2">Tests</th>
              <th className="pb-2">Invited</th>
              <th className="pb-2">Completed</th>
              <th className="pb-2">Pass rate</th>
              <th className="pb-2">In pipeline</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.job_id} className="border-b border-slate-100">
                <td className="py-3 pr-4 font-medium text-slate-900">{row.title}</td>
                <td>
                  {row.has_assessment ? (
                    <Badge variant="secondary">{row.assessment_count}</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">Missing</Badge>
                  )}
                </td>
                <td>{row.invited}</td>
                <td>{row.completed}</td>
                <td>{row.pass_rate_pct != null ? `${row.pass_rate_pct}%` : '—'}</td>
                <td>
                  {row.sent} sent · {row.cleared} cleared
                </td>
                <td>
                  <Link to={`/pipeline?job=${row.job_id}&stage=ASSESSMENT`}>
                    <Button variant="ghost" size="sm">
                      Pipeline
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
