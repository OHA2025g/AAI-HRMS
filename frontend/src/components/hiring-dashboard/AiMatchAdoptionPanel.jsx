import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { jobMatchesPath } from '../../lib/hiringDashboardDrill';

export default function AiMatchAdoptionPanel({ aiMatchAdoption = {} }) {
  const pct = aiMatchAdoption?.adoption_pct;
  const openJobs = aiMatchAdoption?.open_jobs ?? 0;
  const withMatches = aiMatchAdoption?.jobs_with_matches ?? 0;
  const without = aiMatchAdoption?.jobs_without_matches || [];
  const withoutCount = aiMatchAdoption?.jobs_without_matches_count ?? without.length;

  if (openJobs === 0 && withoutCount === 0 && pct == null) {
    return null;
  }

  return (
    <Card className="border-violet-100 bg-violet-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
          <Sparkles className="w-4 h-4 text-violet-600" />
          AI Matches adoption
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-6">
          {pct != null ? (
            <div>
              <p className="text-xs text-slate-500">Open jobs with fit scores</p>
              <p className="text-2xl font-bold text-slate-900">{pct}%</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {withMatches} of {openJobs} open roles
              </p>
            </div>
          ) : null}
          {withoutCount > 0 ? (
            <div className="min-w-[220px] flex-1">
              <p className="text-xs text-slate-500 mb-1">Run Find Matches on these roles</p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {without.slice(0, 8).map((job) => (
                  <li key={job.job_id}>
                    <Link
                      to={jobMatchesPath(job.job_id)}
                      className="text-indigo-600 hover:underline font-medium truncate block"
                    >
                      {job.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {withoutCount > 8 ? (
                <Button asChild variant="link" size="sm" className="h-auto p-0 mt-1 text-indigo-600">
                  <Link to="/jobs?status=OPEN&without_matches=1">View all {withoutCount} jobs</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-slate-600 text-xs">All open roles have AI fit scores.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
