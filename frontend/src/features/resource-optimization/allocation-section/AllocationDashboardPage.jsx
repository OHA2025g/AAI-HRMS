import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { allocationSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';
import AllocationSectionBreadcrumbs from './AllocationSectionBreadcrumbs';

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

const AllocationDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await allocationSectionApi.dashboardSummary();
        if (alive) setData(res.data);
      } catch {
        if (alive) toast.error('Failed to load allocation dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
      <AllocationSectionBreadcrumbs current="Allocation Dashboard" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocation Dashboard</h1>
          <p className="text-slate-600 mt-1 max-w-3xl">
            Operational staffing health across projects and resources — utilization, governance, conflicts, and fulfillment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/resource-project-optimization/allocation/master">Allocation Master</Link>
          </Button>
          <Button asChild>
            <Link to="/resource-project-optimization/allocation/requests">Staffing requests</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active allocations" value={t.active_allocations ?? '—'} />
        <Kpi label="Billable / Non-billable" value={`${t.billable_allocations ?? 0} / ${t.non_billable_allocations ?? 0}`} />
        <Kpi label="Full vs partial" value={`${t.full_allocations ?? 0} / ${t.partial_allocations ?? 0}`} />
        <Kpi label="Fulfillment %" value={`${t.fulfillment_pct ?? 0}%`} hint="Requests marked fulfilled" />
        <Kpi label="Over-allocated resources" value={t.over_allocated_resources ?? 0} />
        <Kpi label="Under-allocated resources" value={t.under_allocated_resources ?? 0} />
        <Kpi label="Open conflicts" value={t.conflicts_open ?? 0} />
        <Kpi label="Pending approvals" value={t.pending_approvals ?? 0} />
        <Kpi label="Open staffing demands" value={t.open_staffing_demands ?? 0} />
        <Kpi label="Upcoming roll-offs (30d)" value={t.upcoming_roll_offs_30d ?? 0} />
        <Kpi label="Bench conversions" value={t.bench_to_allocation_conversions ?? 0} />
        <Kpi label="Pending allocation approvals" value={t.pending_allocation_approvals ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent allocation changes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/resource-project-optimization/allocation/changes-release">
                View all <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recent_changes || []).length === 0 ? (
              <p className="text-sm text-slate-500">No recent changes.</p>
            ) : (
              (data?.recent_changes || []).map((c) => (
                <div key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 text-sm">
                  <span className="font-medium text-slate-800">{c.change_type || 'Change'}</span>
                  <Badge variant="outline">{c.approval_status || '—'}</Badge>
                  <span className="text-slate-500 w-full text-xs">{c.changed_on || ''}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent alerts</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/resource-project-optimization/allocation/alerts-communication">Open center</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.recent_alerts || []).length === 0 ? (
              <p className="text-sm text-slate-500">No alerts.</p>
            ) : (
              (data?.recent_alerts || []).map((a) => (
                <div key={a.id} className="flex justify-between gap-2 text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-800">{a.title || 'Alert'}</span>
                  <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'}>{a.severity || 'info'}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AllocationDashboardPage;
