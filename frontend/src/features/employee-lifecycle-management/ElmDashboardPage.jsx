import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';
import { employeeLifecycleManagementApi } from '@/shared/lib/api';

const Kpi = ({ title, value, hint }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{title}</CardDescription>
      <CardTitle className="text-2xl">{value}</CardTitle>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </CardHeader>
  </Card>
);

export default function ElmDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await employeeLifecycleManagementApi.getDashboardSummary();
        setData(res.data || null);
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load lifecycle dashboard');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const k = data?.kpis || {};
  const alerts = useMemo(() => data?.recent_lifecycle_alerts || [], [data]);
  const activity = useMemo(() => data?.recent_employee_activities || [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Lifecycle Dashboard</div>
          <div className="text-sm text-muted-foreground">End-to-end employee journey orchestration snapshot</div>
        </div>
        <div className="text-xs text-muted-foreground">Generated: {data?.generated_at || '-'}</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard…
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Kpi title="Total employees" value={k.total_employees ?? 0} />
        <Kpi title="Active employees" value={k.active_employees ?? 0} />
        <Kpi title="Pending onboarding tasks" value={k.pending_onboarding_tasks ?? 0} />
        <Kpi title="Employees in probation" value={k.employees_in_probation ?? 0} />
        <Kpi title="Confirmations due" value={k.confirmations_due ?? 0} />
        <Kpi title="Pending document compliance" value={k.pending_document_compliance ?? 0} />
        <Kpi title="BGV pending" value={k.bgv_pending ?? 0} />
        <Kpi title="Pending provisioning tasks" value={k.pending_provisioning_tasks ?? 0} />
        <Kpi title="Payroll onboarding ready" value={k.payroll_onboarding_ready ?? 0} />
        <Kpi title="Pending approvals" value={k.pending_approvals ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent lifecycle alerts</CardTitle>
            <CardDescription>High/critical signals that need attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? <div className="text-sm text-muted-foreground">No alerts.</div> : null}
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.signal_type}</div>
                  <div className="text-xs text-muted-foreground">Employee: {a.employee_id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>{a.severity}</Badge>
                  <div className="text-xs text-muted-foreground">{a.detected_on}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Audit-friendly operational events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.length === 0 ? <div className="text-sm text-muted-foreground">No activity.</div> : null}
            {activity.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{x.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {x.entity} · {x.entity_id}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{x.ts}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

