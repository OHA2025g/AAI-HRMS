import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { executiveApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const ExecutiveKpiPage = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState(null);
  const [drill, setDrill] = useState(null);
  const [horizonMonths, setHorizonMonths] = useState(3);
  const [windowDays, setWindowDays] = useState(30);
  const [department, setDepartment] = useState('');
  const [managerRootId, setManagerRootId] = useState('');
  const [roleContains, setRoleContains] = useState('');
  const [drillOpts, setDrillOpts] = useState(null);
  const [freshness, setFreshness] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [periodYm, setPeriodYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [exportBusy, setExportBusy] = useState(false);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await executiveApi.listM9ExportPacks(24);
      setSnapshots(res.data?.items || []);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await executiveApi.getM9DrillOptions();
        setDrillOpts(res.data);
      } catch {
        setDrillOpts(null);
      }
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [res1, res2, res3] = await Promise.all([
          executiveApi.getKpis(),
          executiveApi.getStrategicDrill({
            horizon_months: horizonMonths,
            window_days: windowDays,
            department: department || undefined,
            manager_root_id: managerRootId || undefined,
            role_title_contains: roleContains.trim() || undefined,
          }),
          executiveApi.getM9Freshness(),
        ]);
        setKpi(res1.data);
        setDrill(res2.data);
        setFreshness(res3.data);
      } catch (e) {
        toast.error('Failed to load executive KPIs');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [horizonMonths, windowDays, department, managerRootId, roleContains]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const downloadPack = async (snapshotId, format) => {
    try {
      const res = await executiveApi.downloadM9ExportPack(snapshotId, format);
      const blob = new Blob([res.data], {
        type: format === 'json' ? 'application/json' : format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `m9-snapshot-${snapshotId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const createSnapshot = async () => {
    setExportBusy(true);
    try {
      const res = await executiveApi.createM9MonthlySnapshot({
        period: periodYm,
        horizon_months: horizonMonths,
        window_days: windowDays,
      });
      toast.success(`Snapshot ${res.data?.id?.slice(0, 8)}… created`);
      if (res.data?.delivery_hook && !res.data.delivery_hook.ok) {
        toast.message('Webhook not delivered (check M9_LEADERSHIP_WEBHOOK_URL)');
      }
      await loadSnapshots();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Snapshot failed');
    } finally {
      setExportBusy(false);
    }
  };

  const downloadFullLeadershipPack = async () => {
    setExportBusy(true);
    try {
      const res = await executiveApi.downloadM9FullLeadershipPack({
        period: periodYm,
        horizon_months: horizonMonths,
        window_days: windowDays,
      });
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `m9-full-leadership-pack-${periodYm}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Leadership pack downloaded');
      await loadSnapshots();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'ZIP export failed');
    } finally {
      setExportBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const strategic = drill?.dashboard || {};
  const winDays = strategic?.analytics_window_days ?? windowDays;
  const gaps = strategic?.top_skill_gaps || kpi?.top_skill_gaps || [];
  const forecastGapTotal = strategic?.forecast_gap_total || 0;
  const shortageTotal = strategic?.resource_total_shortage || 0;
  const benchTotal = strategic?.resource_total_bench || 0;
  const engagementAvg = strategic?.engagement_avg_rating ?? 0;
  const retentionAvgRisk = strategic?.retention_avg_risk_score ?? 0;
  const topRiskEmployees = strategic?.retention_top_risk_employees || [];
  const m7RunsOk = strategic?.automation_runs_succeeded_30d ?? 0;
  const m7RunsFail = strategic?.automation_runs_failed_30d ?? 0;
  const m7MinSaved = strategic?.estimated_manual_minutes_saved_30d ?? 0;
  const m7UsdSaved = strategic?.estimated_cost_saved_usd_30d ?? 0;
  const m7Baselines = strategic?.cost_optimization_baselines_count ?? 0;
  const ta = kpi?.talent_acquisition || {};
  const scopeHint =
    drill?.scope_employee_count != null ? `${drill.scope_employee_count} employees in scope` : 'Full organization';

  const depts = drillOpts?.departments || [];
  const managers = drillOpts?.manager_roots || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
          Executive KPI Dashboard
        </h1>
        <p className="text-slate-600">M9 — semantic KPI layer, drill-down, freshness, leadership exports</p>
      </div>

      <Card className="border-indigo-100 bg-indigo-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Related executive views</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Button asChild variant="secondary" size="sm">
            <Link to="/dashboard">
              Hiring dashboard <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/workforce-intelligence/executive-intelligence">WFI executive intelligence</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/employee-satisfaction-engagement/executive-decision-support">ESE executive support</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/cost-optimization-automation/executive-decision-support">COA executive decision support</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/high-skill-talent-retention/dashboard">High-skill retention</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>M9 — Drill &amp; time window (linked filters)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-xs text-slate-500 mb-1">Horizon (forecast)</p>
              <Select value={String(horizonMonths)} onValueChange={(v) => setHorizonMonths(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 month</SelectItem>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Analytics window</p>
              <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px] flex-1">
              <p className="text-xs text-slate-500 mb-1">Department</p>
              <Select value={department || '__all'} onValueChange={(v) => setDepartment(v === '__all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All departments</SelectItem>
                  {depts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[220px] flex-1">
              <p className="text-xs text-slate-500 mb-1">Team root (manager subtree)</p>
              <Select value={managerRootId || '__all'} onValueChange={(v) => setManagerRootId(v === '__all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All teams</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {(m.full_name || m.id) + (m.department ? ` — ${m.department}` : '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="text-xs text-slate-500 mb-1">Role contains</p>
              <Input
                placeholder="e.g. Engineer"
                value={roleContains}
                onChange={(e) => setRoleContains(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <Badge variant="secondary">{scopeHint}</Badge>
            {drill?.cache?.hit != null && (
              <Badge variant="outline">Drill cache {drill.cache.hit ? 'hit' : 'miss'}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {freshness?.checks?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data freshness (SLA)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {freshness.checks.map((c) => (
              <Badge key={c.source} variant={c.sla_ok ? 'outline' : 'destructive'}>
                {c.source}: {c.sla_ok ? 'OK' : 'STALE'}
                {c.age_hours != null ? ` (${c.age_hours}h)` : ''}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Employees</p>
            <p className="text-2xl font-bold">{strategic?.employee_count ?? kpi?.employee_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Active Employees</p>
            <p className="text-2xl font-bold">{strategic?.active_employee_count ?? kpi?.active_employee_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Attrition Rate</p>
            <p className="text-2xl font-bold">{strategic?.attrition_rate_pct ?? kpi?.attrition_rate_pct ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Skill Coverage</p>
            <p className="text-2xl font-bold">{kpi?.skill_coverage_pct || 0}%</p>
            {(department || managerRootId || roleContains.trim()) && (
              <p className="text-xs text-slate-400 mt-1">Org-wide (see skill gaps chart for scoped supply)</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>M7 — Automation &amp; estimated savings ({winDays}d window)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-slate-500">Runs OK</p>
            <p className="text-2xl font-bold">{m7RunsOk}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Runs failed</p>
            <p className="text-2xl font-bold">{m7RunsFail}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Baselines</p>
            <p className="text-2xl font-bold">{m7Baselines}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Est. minutes saved</p>
            <p className="text-2xl font-bold">{m7MinSaved}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Est. USD saved</p>
            <p className="text-2xl font-bold">{m7UsdSaved}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strategic horizon</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Forecast Gap Total: {forecastGapTotal}</Badge>
            <Badge variant="outline">Resource Shortage: {shortageTotal}</Badge>
            <Badge variant="outline">Resource Bench: {benchTotal}</Badge>
            <Badge variant="outline">Engagement Avg: {engagementAvg}</Badge>
            <Badge variant="outline">Retention Avg Risk: {retentionAvgRisk}</Badge>
            <Badge variant="outline">Pulse responses ({winDays}d): {strategic?.engagement_last_30_days_responses ?? 0}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Talent acquisition — executive KPIs (30d window)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-500">Dedup audit events</p>
            <p className="text-2xl font-bold">{ta.dedup_audit_events_in_window ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Candidates in window</p>
            <p className="text-2xl font-bold">{ta.candidates_created_in_window ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Top-match precision proxy</p>
            <p className="text-2xl font-bold">
              {ta.top_match_precision_proxy_pct != null ? `${ta.top_match_precision_proxy_pct}%` : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Primary source concentration</p>
            <p className="text-2xl font-bold">
              {ta.primary_source_concentration_pct != null ? `${ta.primary_source_concentration_pct}%` : '—'}
            </p>
          </div>
          <div className="col-span-full text-xs text-slate-500">
            Source mix:{' '}
            {ta.source_mix_by_channel && Object.keys(ta.source_mix_by_channel).length
              ? Object.entries(ta.source_mix_by_channel)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')
              : '—'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>M9 — Leadership export packs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <p className="text-xs text-slate-500 mb-1">Period (YYYY-MM)</p>
              <Input className="w-[140px]" value={periodYm} onChange={(e) => setPeriodYm(e.target.value)} />
            </div>
            <Button onClick={createSnapshot} disabled={exportBusy}>
              {exportBusy ? 'Working…' : 'Generate monthly snapshot'}
            </Button>
            <Button variant="secondary" onClick={downloadFullLeadershipPack} disabled={exportBusy}>
              Download full leadership pack (ZIP)
            </Button>
          </div>
          {snapshots.length === 0 ? (
            <p className="text-slate-500 text-sm">No snapshots yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.period}</TableCell>
                    <TableCell className="text-xs text-slate-600">{s.created_at}</TableCell>
                    <TableCell className="space-x-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadPack(s.id, 'csv')}>
                        CSV
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadPack(s.id, 'pdf')}>
                        PDF
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => downloadPack(s.id, 'json')}>
                        JSON
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Skill Gaps</CardTitle>
        </CardHeader>
        <CardContent>
          {gaps.length === 0 ? (
            <p className="text-slate-500">No skill gap data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gaps.slice(0, 8)}>
                <XAxis dataKey="skill_name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="gap" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top At-Risk Employees (Retention)</CardTitle>
        </CardHeader>
        <CardContent>
          {topRiskEmployees.length === 0 ? (
            <p className="text-slate-500">No retention risk data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Critical Skills Matched</TableHead>
                  <TableHead>Risk Label</TableHead>
                  <TableHead>Risk Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRiskEmployees.slice(0, 10).map((e) => (
                  <TableRow key={e.employee_code}>
                    <TableCell>
                      <div className="font-medium">{e.full_name || '-'}</div>
                      <div className="text-xs text-slate-500">{e.employee_code}</div>
                    </TableCell>
                    <TableCell>{e.critical_skills_matched}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.risk_label === 'HIGH' ? 'destructive' : e.risk_label === 'MEDIUM' ? 'outline' : 'secondary'
                        }
                      >
                        {e.risk_label}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.risk_score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExecutiveKpiPage;
