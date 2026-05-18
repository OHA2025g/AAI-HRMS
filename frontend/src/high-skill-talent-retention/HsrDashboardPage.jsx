import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { highSkillRetentionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';
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

const HsrDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await highSkillRetentionApi.dashboardSummary();
        if (!cancelled) setData(res.data || null);
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load retention dashboard');
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
      { name: 'Critical', v: k.total_critical_talent || 0 },
      { name: 'High', v: k.high_risk_talent || 0 },
      { name: 'Medium', v: k.medium_risk_talent || 0 },
      { name: 'Low', v: k.low_risk_talent || 0 },
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
            Retention Dashboard
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Strategic retention intelligence · updated {data?.generated_at ? new Date(data.generated_at).toLocaleString() : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/high-skill-talent-retention/talent-master">Talent master</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/high-skill-talent-retention/cases">
              Open cases <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="Total critical talent" value={k.total_critical_talent} />
        <Kpi label="High risk talent" value={k.high_risk_talent} />
        <Kpi label="Successor coverage %" value={k.successor_coverage_pct != null ? `${k.successor_coverage_pct}%` : '—'} />
        <Kpi label="Engagement health score" value={k.engagement_health_score} />
        <Kpi label="Compensation risk count" value={k.compensation_risk_count} />
        <Kpi label="Burnout risk count" value={k.burnout_risk_count} />
        <Kpi label="Project-critical talent" value={k.project_critical_talent_count} />
        <Kpi label="Client-critical talent" value={k.client_critical_talent_count} />
        <Kpi label="Pending actions" value={k.pending_retention_actions} />
        <Kpi label="Open cases" value={k.open_retention_cases} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Risk distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="v" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Recent attrition alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm max-h-[320px] overflow-y-auto">
            {(data?.recent_attrition_alerts || []).length === 0 ? (
              <p className="text-slate-500">No high-severity alerts.</p>
            ) : (
              (data?.recent_attrition_alerts || []).map((a) => (
                <div key={a.id} className="border border-amber-100 bg-amber-50/60 rounded-lg p-3">
                  <div className="font-medium text-slate-900">{a.trigger_type}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {a.employee_id} · {a.severity}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Top risk talent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm max-h-[320px] overflow-y-auto">
          {(data?.top_risk_talent || []).length === 0 ? (
            <p className="text-slate-500">No high risk profiles yet.</p>
          ) : (
            (data?.top_risk_talent || []).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="truncate">
                  <Link className="text-indigo-600 hover:underline" to={`/high-skill-talent-retention/talent-master/${encodeURIComponent(t.id)}`}>
                    {t.talent_code}
                  </Link>
                  <span className="text-slate-500 ml-2 font-mono text-xs">{t.employee_id}</span>
                </div>
                <span className="text-slate-600 shrink-0">{t.current_risk_level}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HsrDashboardPage;

