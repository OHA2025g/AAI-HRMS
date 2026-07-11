import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { Checkbox } from '@/shared/ui/checkbox';
import { Loader2, Plus, ArrowUp, ArrowDown, Pencil, ShieldCheck } from 'lucide-react';

const TYPES = ['phase', 'milestone', 'deliverable', 'task', 'subtask'];

function buildDepthMap(items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const depth = new Map();
  const calc = (id) => {
    if (depth.has(id)) return depth.get(id);
    const node = byId.get(id);
    if (!node || !node.parent_id) {
      depth.set(id, 0);
      return 0;
    }
    const d = calc(node.parent_id) + 1;
    depth.set(id, d);
    return d;
  };
  items.forEach((i) => calc(i.id));
  return depth;
}

const ProjectSectionPlanningPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [items, setItems] = useState([]);
  const [graphOk, setGraphOk] = useState(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'task',
    parent_id: '',
    name: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    percent_complete: 0,
    depends_on_ids: [],
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    type: 'task',
    parent_id: '',
    name: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    percent_complete: 0,
    depends_on_ids: [],
  });

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const list = res.data?.items || [];
    setProjects(list);
    if (!projectId && list.length > 0) setProjectId(list[0].id);
  };

  const refreshGraph = async (pid) => {
    try {
      const res = await projectSectionApi.wbsValidateGraph(pid);
      setGraphOk(!!res.data?.acyclic);
    } catch {
      setGraphOk(null);
    }
  };

  const load = async (pid) => {
    const res = await projectSectionApi.wbsList(pid);
    const rows = res.data || [];
    rows.sort((a, b) => (a.order || 0) - (b.order || 0));
    setItems(rows);
    await refreshGraph(pid);
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
        toast.error('Failed to load WBS');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const depth = useMemo(() => buildDepthMap(items), [items]);

  const otherItemsForDeps = (excludeId) => items.filter((i) => i.id !== excludeId);

  const toggleDep = (setter, id) => {
    setter((p) => {
      const cur = p.depends_on_ids || [];
      const s = new Set(cur);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return { ...p, depends_on_ids: Array.from(s) };
    });
  };

  const create = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    try {
      await projectSectionApi.wbsCreate(projectId, {
        type: form.type,
        parent_id: form.parent_id || null,
        name: form.name.trim(),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status || 'pending',
        percent_complete: Number(form.percent_complete) || 0,
        depends_on_ids: form.depends_on_ids,
      });
      toast.success('Created');
      setOpen(false);
      setForm({
        type: 'task',
        parent_id: '',
        name: '',
        start_date: '',
        end_date: '',
        status: 'pending',
        percent_complete: 0,
        depends_on_ids: [],
      });
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Create failed');
    }
  };

  const openEdit = (it) => {
    setEditId(it.id);
    setEditForm({
      type: it.type || 'task',
      parent_id: it.parent_id || '',
      name: it.name || '',
      start_date: it.start_date || '',
      end_date: it.end_date || '',
      status: it.status || 'pending',
      percent_complete: it.percent_complete ?? 0,
      depends_on_ids: [...(it.depends_on_ids || [])],
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editId || !editForm.name.trim()) return toast.error('Name required');
    try {
      await projectSectionApi.wbsUpdate(projectId, editId, {
        type: editForm.type,
        parent_id: editForm.parent_id || null,
        name: editForm.name.trim(),
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        status: editForm.status,
        percent_complete: Number(editForm.percent_complete) || 0,
        depends_on_ids: editForm.depends_on_ids,
      });
      toast.success('Updated');
      setEditOpen(false);
      setEditId(null);
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Update failed');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await projectSectionApi.wbsDelete(projectId, id);
      toast.success('Deleted');
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const move = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    try {
      await projectSectionApi.wbsReorder(projectId, { ordered_ids: next.map((i) => i.id) });
      toast.success('Order saved');
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Reorder failed');
      await load(projectId);
    }
  };

  const validateGraph = async () => {
    try {
      const res = await projectSectionApi.wbsValidateGraph(projectId);
      const ok = !!res.data?.acyclic;
      setGraphOk(ok);
      toast[ok ? 'success' : 'error'](ok ? 'Dependency graph is acyclic (valid)' : 'Graph reports a cycle — fix dependencies');
    } catch (e) {
      toast.error('Validation failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
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
              Planning & Structuring
            </h1>
            <p className="text-slate-600">WBS with dependencies, reorder, and cycle validation</p>
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
            <Button variant="outline" onClick={validateGraph}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Validate graph
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add WBS item
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Planning & WBS
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={validateGraph}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Validate graph
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add item
            </Button>
          </div>
        </div>
      )}

      {graphOk !== null && (
        <div className="flex items-center gap-2">
          <Badge variant={graphOk ? 'default' : 'destructive'}>{graphOk ? 'DAG OK' : 'Cycle risk'}</Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>WBS items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-slate-500">No WBS items yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deps</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">
                      <span style={{ paddingLeft: `${(depth.get(it.id) || 0) * 16}px` }} className="inline-block">
                        {it.name}
                      </span>
                    </TableCell>
                    <TableCell>{it.type}</TableCell>
                    <TableCell>{(it.start_date || '-') + ' → ' + (it.end_date || '-')}</TableCell>
                    <TableCell>{it.status || '-'}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs text-slate-600">
                      {(it.depends_on_ids || []).length
                        ? (it.depends_on_ids || [])
                            .map((did) => items.find((x) => x.id === did)?.name || did)
                            .join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell>{it.percent_complete ?? 0}%</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(idx, -1)} disabled={idx === 0}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(it)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" className="text-red-700" size="sm" onClick={() => del(it.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add WBS item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent (optional)</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm((p) => ({ ...p, parent_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No parent</SelectItem>
                  {items.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} placeholder="YYYY-MM-DD" />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} placeholder="YYYY-MM-DD" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} placeholder="pending" />
              </div>
              <div className="space-y-2">
                <Label>% complete</Label>
                <Input value={form.percent_complete} onChange={(e) => setForm((p) => ({ ...p, percent_complete: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Depends on (finish-to-start)</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-slate-500">No other items yet</p>
                ) : (
                  items.map((it) => (
                    <label key={it.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.depends_on_ids.includes(it.id)}
                        onCheckedChange={() => toggleDep(setForm, it.id)}
                      />
                      <span className="truncate">{it.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit WBS item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent (optional)</Label>
              <Select value={editForm.parent_id} onValueChange={(v) => setEditForm((p) => ({ ...p, parent_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No parent</SelectItem>
                  {items
                    .filter((it) => it.id !== editId)
                    .map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Start</Label>
                <Input value={editForm.start_date} onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input value={editForm.end_date} onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>% complete</Label>
                <Input value={editForm.percent_complete} onChange={(e) => setEditForm((p) => ({ ...p, percent_complete: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Depends on</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {otherItemsForDeps(editId).map((it) => (
                  <label key={it.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={editForm.depends_on_ids.includes(it.id)}
                      onCheckedChange={() => toggleDep(setEditForm, it.id)}
                    />
                    <span className="truncate">{it.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSectionPlanningPage;
