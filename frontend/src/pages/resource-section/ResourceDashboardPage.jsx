import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { resourceSectionApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Loader2, ArrowRight } from 'lucide-react';
import ResourceSectionBreadcrumbs from './ResourceSectionBreadcrumbs';

const Kpi = ({ label, value, hint }) => (
  <Card className="border-slate-200 shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
    </CardContent>
  </Card>
);

const ResourceDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [masterPreview, setMasterPreview] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await resourceSectionApi.dashboardSummary();
        if (alive) setData(res.data);
      } catch {
        if (alive) toast.error('Failed to load resource dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      (async () => {
        try {
          const res = await resourceSectionApi.masterList({ limit: 8, q: q.trim() || undefined });
          if (alive) setMasterPreview(res.data?.items || []);
        } catch {
          if (alive) setMasterPreview([]);
        }
      })();
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const t = data?.totals || {};

  return (
    <div className="space-y-6">
      <ResourceSectionBreadcrumbs current="Resource Dashboard" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resource Dashboard</h1>
          <p className="text-slate-600 mt-1 max-w-3xl">
            Workforce deployability — availability, utilization, bench, skills, certifications, and governance signals in one
            place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/resource-project-optimization/resource/master">Resource Master</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/resource-project-optimization/resource/demand-matching">Demand matching</Link>
          </Button>
          <Button asChild>
            <Link to="/resource-project-optimization/resource/analytics">Analytics</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total resources" value={t.total_resources ?? '—'} />
        <Kpi label="Active resources" value={t.active_resources ?? '—'} />
        <Kpi label="Available (high level)" value={t.available_high_level ?? '—'} hint="Allocation load under 80%" />
        <Kpi label="Fully allocated" value={t.allocated_full ?? '—'} />
        <Kpi label="Partially allocated" value={t.partially_allocated ?? '—'} />
        <Kpi label="Bench (open records)" value={t.bench_resources ?? '—'} />
        <Kpi label="Billable / non-billable (tagged)" value={`${t.billable_resources ?? 0} / ${t.non_billable_resources ?? 0}`} />
        <Kpi label="Avg utilization %" value={t.avg_utilization_pct ?? '—'} />
        <Kpi label="Billable util. %" value={t.billable_utilization_pct ?? '—'} />
        <Kpi label="Under-utilized (flags)" value={t.under_utilized ?? 0} />
        <Kpi label="Over-utilized (flags)" value={t.over_utilized ?? 0} />
        <Kpi label="Open demand matches" value={t.critical_skill_shortage ?? 0} />
        <Kpi label="Certs expiring (demo window)" value={t.expiring_certifications ?? 0} />
        <Kpi label="Pending approvals" value={t.pending_approvals ?? 0} />
        <Kpi label="Attrition risk signals (M8)" value={t.attrition_signals ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent resource activities</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/resource-project-optimization/resource/master">
                Directory <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recent_activities || []).length === 0 ? (
              <p className="text-sm text-slate-500">No recent activities.</p>
            ) : (
              (data?.recent_activities || []).map((c) => (
                <div key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 text-sm">
                  <span className="font-medium text-slate-800">{c.action || 'Activity'}</span>
                  <Badge variant="outline">{c.resource_id?.slice(0, 8) || '—'}</Badge>
                  <span className="text-slate-500 w-full text-xs">{c.created_at || ''}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick resource search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Name, code, email, role…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="space-y-2">
              {masterPreview.length === 0 ? (
                <p className="text-sm text-slate-500">No matches.</p>
              ) : (
                masterPreview.map((r) => (
                  <div key={r.id} className="flex justify-between gap-2 text-sm border-b border-slate-100 pb-2">
                    <Link
                      className="font-medium text-indigo-600 hover:underline"
                      to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.id)}`}
                    >
                      {r.full_name || r.email}
                    </Link>
                    <span className="text-slate-500">{r.department || '—'}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skill heatmap (inventory)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-3">
            Open analytics for department / skill distribution and drill-downs.
          </p>
          <Button variant="outline" asChild>
            <Link to="/resource-project-optimization/resource/analytics">Open workforce analytics</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourceDashboardPage;
