import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { trainingDevelopmentApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Loader2, ArrowRight, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Kpi = ({ label, value, sub }) => (
  <Card className="border-slate-200">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
        {value ?? '—'}
      </div>
      {sub ? <p className="text-xs text-slate-500 mt-1">{sub}</p> : null}
    </CardContent>
  </Card>
);

const TdDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await trainingDevelopmentApi.dashboardSummary();
        if (!cancelled) setData(res.data || null);
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load training dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(() => {
    const k = data?.kpis || {};
    return [
      { name: 'Programs', v: k.total_programs || 0 },
      { name: 'Active', v: k.active_programs || 0 },
      { name: 'Enroll', v: k.enrollments || 0 },
      { name: 'Complete', v: k.completions || 0 },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const k = data?.kpis || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Training Dashboard
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Capability-building snapshot · updated {data?.generated_at ? new Date(data.generated_at).toLocaleString() : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/training-development/training-master">Training Master</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/training-development/nominations">
              Nominations <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="Total programs" value={k.total_programs} />
        <Kpi label="Active programs" value={k.active_programs} />
        <Kpi label="Upcoming sessions" value={k.upcoming_sessions} />
        <Kpi label="Enrollments" value={k.enrollments} sub={`${k.completions || 0} completed`} />
        <Kpi label="Pending nominations" value={k.pending_nominations} />
        <Kpi label="Pending approvals (enrollment)" value={k.pending_enrollment_approvals} />
        <Kpi label="Workflow approvals" value={k.pending_workflow_approvals} />
        <Kpi label="Attendance %" value={k.attendance_pct != null ? `${k.attendance_pct}%` : '—'} />
        <Kpi label="Assessment pass %" value={k.assessment_pass_pct != null ? `${k.assessment_pass_pct}%` : '—'} />
        <Kpi label="Cert. expiry alerts" value={k.certification_expiry_alerts} />
        <Kpi label="Compliance completion %" value={k.mandatory_compliance_completion_pct != null ? `${k.mandatory_compliance_completion_pct}%` : '—'} />
        <Kpi label="Budget utilization %" value={k.budget_utilization_pct != null ? `${k.budget_utilization_pct}%` : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Program & enrollment mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="v" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base">Calendar snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(data?.calendar_snapshot || []).length === 0 ? (
              <p className="text-slate-500">No upcoming sessions.</p>
            ) : (
              (data?.calendar_snapshot || []).map((s) => (
                <div key={s.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="font-medium text-slate-900">{s.session_title}</div>
                  <div className="text-slate-500 text-xs mt-1">
                    {s.start_datetime} · {s.delivery_mode}
                  </div>
                  <Button asChild variant="link" className="h-auto p-0 mt-2 text-indigo-600">
                    <Link to="/training-development/calendar">Open calendar</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Recent enrollments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm max-h-[320px] overflow-y-auto">
            {(data?.recent_enrollments || []).length === 0 ? (
              <p className="text-slate-500">No recent activity.</p>
            ) : (
              (data?.recent_enrollments || []).map((r) => (
                <div key={r.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="text-slate-700 truncate">{r.employee_id}</span>
                  <span className="text-slate-500 shrink-0">{r.enrollment_status}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Recent alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm max-h-[320px] overflow-y-auto">
            {(data?.recent_alerts || []).length === 0 ? (
              <p className="text-slate-500">No high-severity alerts.</p>
            ) : (
              (data?.recent_alerts || []).map((a) => (
                <div key={a.id} className="border border-amber-100 bg-amber-50/60 rounded-lg p-3">
                  <div className="font-medium text-slate-900">{a.title}</div>
                  <div className="text-xs text-slate-600 mt-1">{a.record_type}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TdDashboardPage;
