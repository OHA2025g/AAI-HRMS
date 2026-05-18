import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Loader2, Plus } from 'lucide-react';

const ProjectSectionExecutionPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ period: '', summary: '', health: 'green', blockers: '', next_steps: '' });

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    const [repRes, alertRes] = await Promise.all([
      projectSectionApi.statusReportsList(pid),
      projectSectionApi.executionAlerts(pid).catch(() => ({ data: null })),
    ]);
    setReports(repRes.data || []);
    setAlerts(alertRes.data || null);
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
        toast.error('Failed to load status reports');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const create = async () => {
    if (!form.summary.trim()) return toast.error('Summary required');
    try {
      await projectSectionApi.statusReportCreate(projectId, {
        ...form,
        summary: form.summary.trim(),
        period: form.period.trim() || null,
      });
      toast.success('Status update added');
      setOpen(false);
      setForm({ period: '', summary: '', health: 'green', blockers: '', next_steps: '' });
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Create failed');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${embedProjectId ? 'py-16' : 'h-[60vh]'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!projectId) {
    return <p className="text-slate-600 py-8">No project selected or no projects available.</p>;
  }

  return (
    <div className="space-y-6">
      {!embedProjectId && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              Execution & Tracking
            </h1>
            <p className="text-slate-600">Status reports, overdue work, milestones, and dependency blockers</p>
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
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add status update
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Execution & Tracking
          </h2>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Status update
          </Button>
        </div>
      )}

      {alerts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className={alerts.counts?.overdue > 0 ? 'border-amber-400' : ''}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Overdue items</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="text-2xl font-bold">{alerts.counts?.overdue ?? 0}</p>
              <p className="text-slate-500 text-xs">Open WBS rows past end date (as of {alerts.as_of})</p>
              {(alerts.overdue_items || []).slice(0, 4).map((x) => (
                <div key={x.id} className="truncate text-xs">
                  • {x.name} <span className="text-slate-400">({x.type})</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className={alerts.counts?.milestone_breaches > 0 ? 'border-red-400' : ''}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Milestone breach</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="text-2xl font-bold">{alerts.counts?.milestone_breaches ?? 0}</p>
              <p className="text-slate-500 text-xs">Milestones overdue and not closed</p>
              {(alerts.milestone_breaches || []).slice(0, 4).map((x) => (
                <div key={x.id} className="truncate text-xs">
                  • {x.name}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className={alerts.counts?.dependency_blocked > 0 ? 'border-orange-300' : ''}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Dependency blocked</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="text-2xl font-bold">{alerts.counts?.dependency_blocked ?? 0}</p>
              <p className="text-slate-500 text-xs">Waiting on incomplete predecessors</p>
              {(alerts.dependency_blocked || []).slice(0, 4).map((x) => (
                <div key={x.id} className="truncate text-xs">
                  • {x.name} ← {x.blocked_by?.name}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Status reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-slate-500">No status reports yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.period || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.health || '-'}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[640px] truncate">{r.summary}</TableCell>
                    <TableCell>{(r.created_at || '').replace('T', ' ').slice(0, 19)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add status update</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Period</Label>
                <Input value={form.period} onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))} placeholder="e.g. 2026-W16" />
              </div>
              <div className="space-y-2">
                <Label>Health</Label>
                <Select value={form.health} onValueChange={(v) => setForm((p) => ({ ...p, health: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">green</SelectItem>
                    <SelectItem value="amber">amber</SelectItem>
                    <SelectItem value="red">red</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Blockers</Label>
              <Textarea value={form.blockers} onChange={(e) => setForm((p) => ({ ...p, blockers: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Next steps</Label>
              <Textarea value={form.next_steps} onChange={(e) => setForm((p) => ({ ...p, next_steps: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSectionExecutionPage;

