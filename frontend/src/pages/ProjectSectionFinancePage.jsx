import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, Save } from 'lucide-react';

const ProjectSectionFinancePage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [fin, setFin] = useState({});
  const [snapshots, setSnapshots] = useState([]);

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    const [fRes, sRes] = await Promise.all([projectSectionApi.financeGet(pid), projectSectionApi.financeSnapshots(pid)]);
    setFin(fRes.data || {});
    setSnapshots(sRes.data || []);
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
        toast.error('Failed to load finance');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    try {
      await projectSectionApi.financeUpsert(projectId, {
        planned_budget: fin.planned_budget !== '' ? Number(fin.planned_budget) : null,
        approved_budget: fin.approved_budget !== '' ? Number(fin.approved_budget) : null,
        revised_budget: fin.revised_budget !== '' ? Number(fin.revised_budget) : null,
        planned_cost: fin.planned_cost !== '' ? Number(fin.planned_cost) : null,
        actual_cost: fin.actual_cost !== '' ? Number(fin.actual_cost) : null,
        committed_cost: fin.committed_cost !== '' ? Number(fin.committed_cost) : null,
        planned_revenue: fin.planned_revenue !== '' ? Number(fin.planned_revenue) : null,
        actual_revenue: fin.actual_revenue !== '' ? Number(fin.actual_revenue) : null,
        currency: fin.currency || 'INR',
        period_month: fin.period_month || null,
      });
      toast.success('Saved');
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

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
              Financial Management
            </h1>
            <p className="text-slate-600">Budget/cost/revenue + variance + snapshots</p>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
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
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Finance
          </h2>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Gross margin</p>
            <p className="text-2xl font-bold">{fin.gross_margin != null ? fin.gross_margin.toLocaleString() : '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Margin %</p>
            <p className="text-2xl font-bold">{fin.margin_percentage != null ? `${Number(fin.margin_percentage).toFixed(1)}%` : '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Budget variance</p>
            <p className="text-2xl font-bold">{fin.budget_variance != null ? fin.budget_variance.toLocaleString() : '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Cost variance</p>
            <p className="text-2xl font-bold">{fin.cost_variance != null ? fin.cost_variance.toLocaleString() : '-'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finance inputs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['planned_budget', 'Planned budget'],
            ['approved_budget', 'Approved budget'],
            ['revised_budget', 'Revised budget'],
            ['planned_cost', 'Planned cost'],
            ['actual_cost', 'Actual cost'],
            ['committed_cost', 'Committed cost'],
            ['planned_revenue', 'Planned revenue'],
            ['actual_revenue', 'Actual revenue'],
          ].map(([k, label]) => (
            <div key={k} className="space-y-2">
              <Label>{label}</Label>
              <Input value={fin[k] ?? ''} onChange={(e) => setFin((p) => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={fin.currency ?? 'INR'} onChange={(e) => setFin((p) => ({ ...p, currency: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Snapshot period (YYYY-MM, optional)</Label>
            <Input value={fin.period_month ?? ''} onChange={(e) => setFin((p) => ({ ...p, period_month: e.target.value }))} placeholder="2026-04" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-slate-500">No snapshots yet. Set period and Save to create one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Snapshot at</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Actual cost</TableHead>
                  <TableHead>Actual revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.period_month || '-'}</TableCell>
                    <TableCell>{(s.snapshot_at || '').replace('T', ' ').slice(0, 19)}</TableCell>
                    <TableCell>{s.payload?.revised_budget ?? s.payload?.approved_budget ?? s.payload?.planned_budget ?? '-'}</TableCell>
                    <TableCell>{s.payload?.actual_cost ?? '-'}</TableCell>
                    <TableCell>{s.payload?.actual_revenue ?? '-'}</TableCell>
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

export default ProjectSectionFinancePage;

