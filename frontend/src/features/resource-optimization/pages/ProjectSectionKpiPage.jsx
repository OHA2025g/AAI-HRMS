import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Loader2 } from 'lucide-react';

const ProjectSectionKpiPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [demands, setDemands] = useState([]);
  const [allocSummary, setAllocSummary] = useState(null);
  const [risks, setRisks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [fin, setFin] = useState(null);

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    const [dRes, aRes, rRes, iRes, fRes] = await Promise.all([
      projectSectionApi.listDemands(pid),
      projectSectionApi.allocationSummary(pid),
      projectSectionApi.listRisks(pid),
      projectSectionApi.listIssues(pid),
      projectSectionApi.financeGet(pid).catch(() => ({ data: null })),
    ]);
    setDemands(dRes.data || []);
    setAllocSummary(aRes.data || null);
    setRisks(rRes.data || []);
    setIssues(iRes.data || []);
    setFin(fRes.data || null);
  };

  useEffect(() => {
    if (embedProjectId) {
      setProjectId(embedProjectId);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        await loadProjects();
      } catch (e) {
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedProjectId]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      try {
        await load(projectId);
      } catch (e) {
        toast.error('Failed to load KPIs');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const kpi = useMemo(() => {
    const demand = demands.reduce((s, r) => s + (r.demand_count || 0), 0);
    const fulfilled = demands.reduce((s, r) => s + (r.fulfilled_count || 0), 0);
    const open = Math.max(0, demand - fulfilled);
    const fulfillmentPct = demand > 0 ? Math.round((fulfilled / demand) * 100) : 0;
    const openRisks = risks.filter((r) => (r.status || 'open') === 'open').length;
    const openIssues = issues.filter((r) => (r.status || 'open') === 'open').length;
    const pendingAlloc = allocSummary?.pending_allocations ?? 0;
    const budgetVar = fin?.budget_variance ?? null;
    const marginPct = fin?.margin_percentage ?? null;
    return { demand, fulfilled, open, fulfillmentPct, openRisks, openIssues, pendingAlloc, budgetVar, marginPct };
  }, [allocSummary, demands, fin, issues, risks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedProjectId && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              KPI & Performance
            </h1>
            <p className="text-slate-600">Project KPI hooks (computed from live module data)</p>
          </div>
          <div className="min-w-[320px]">
            <Label className="text-xs">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_code} — {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {embedProjectId && (
        <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
          KPIs
        </h2>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Fulfillment %</p>
            <p className="text-2xl font-bold">{kpi.fulfillmentPct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Staffing gap</p>
            <p className="text-2xl font-bold">{kpi.open}</p>
            <p className="text-xs text-slate-500">Open seats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Open risks</p>
            <p className="text-2xl font-bold">{kpi.openRisks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Open issues</p>
            <p className="text-2xl font-bold">{kpi.openIssues}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Pending allocations</p>
            <p className="text-2xl font-bold">{kpi.pendingAlloc}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Demand snapshot</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap items-center">
            <Badge variant="secondary">Demand: {kpi.demand}</Badge>
            <Badge variant="secondary">Fulfilled: {kpi.fulfilled}</Badge>
            <Badge variant="outline">Open: {kpi.open}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Finance hooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Budget variance</span>
              <span className="font-medium">{kpi.budgetVar != null ? kpi.budgetVar.toLocaleString() : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Margin %</span>
              <span className="font-medium">{kpi.marginPct != null ? `${Number(kpi.marginPct).toFixed(1)}%` : '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectSectionKpiPage;

