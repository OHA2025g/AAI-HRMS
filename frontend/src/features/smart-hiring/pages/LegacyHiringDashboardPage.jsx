import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Briefcase, GitBranch, Plus, Users } from 'lucide-react';
import { dashboardApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

/** Legacy v1 dashboard using GET /dashboard/stats. Also available at /dashboard/legacy. */
export default function LegacyHiringDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    dashboardApi
      .getStats()
      .then((res) => setStats(res.data))
      .catch((e) => setError(e?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-500">Loading dashboard…</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  const tiles = [
    { label: 'Open jobs', value: stats?.open_jobs, icon: Briefcase, href: '/jobs?status=OPEN' },
    { label: 'Total candidates', value: stats?.total_candidates, icon: Users, href: '/candidates' },
    { label: 'Applications', value: stats?.total_applications, icon: GitBranch, href: '/pipeline' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/80" data-testid="legacy-dashboard-banner">
        <CardContent className="p-4 flex flex-wrap items-start gap-3 text-sm text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Classic hiring dashboard (deprecated)</p>
            <p className="mt-1 text-amber-800/90">
              The Smart Hiring Dashboard v2 is the recommended experience. This legacy view uses{' '}
              <code className="text-xs bg-amber-100/80 px-1 rounded">GET /api/dashboard/stats</code> and will be
              removed in Sep 2026.
            </p>
          </div>
          <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
            <Link to="/dashboard">Open Smart Hiring Dashboard</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Hiring Dashboard (classic)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Permalink: <code className="text-xs bg-slate-100 px-1 rounded">/dashboard/legacy</code>
          </p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
          <Link to="/jobs/new">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tiles.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} to={href}>
            <Card className="card-hover">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {stats?.recent_activities?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats.recent_activities.slice(0, 6).map((a, i) => (
              <div key={i} className="flex justify-between border-b border-slate-100 py-2 last:border-0">
                <span>{a.candidate_name}</span>
                <span className="text-slate-500">{a.job_title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
