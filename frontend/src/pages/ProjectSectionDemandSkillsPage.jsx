import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, Plus, Save } from 'lucide-react';

const EMPTY = {
  role_name: '',
  skill_name: '',
  competency_level: '',
  mandatory_or_optional: 'mandatory',
  demand_count: 0,
  fulfilled_count: 0,
  planned_start_date: '',
  planned_end_date: '',
  demand_priority: '',
  hiring_required_flag: false,
  remarks: '',
};

const ProjectSectionDemandSkillsPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [rows, setRows] = useState([{ ...EMPTY }]);

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const loadDemands = async (pid) => {
    if (!pid) return;
    const res = await projectSectionApi.listDemands(pid);
    const list = res.data || [];
    if (list.length === 0) setRows([{ ...EMPTY }]);
    else
      setRows(
        list.map((r) => ({
          role_name: r.role_name || '',
          skill_name: r.skill_name || '',
          competency_level: r.competency_level || '',
          mandatory_or_optional: r.mandatory_or_optional || 'mandatory',
          demand_count: r.demand_count || 0,
          fulfilled_count: r.fulfilled_count || 0,
          planned_start_date: r.planned_start_date || '',
          planned_end_date: r.planned_end_date || '',
          demand_priority: r.demand_priority || '',
          hiring_required_flag: !!r.hiring_required_flag,
          remarks: r.remarks || '',
          open_count: r.open_count ?? Math.max(0, (r.demand_count || 0) - (r.fulfilled_count || 0)),
        })),
      );
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
        await loadDemands(projectId);
      } catch (e) {
        toast.error('Failed to load demands');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const addRow = () => setRows((p) => [...p, { ...EMPTY }]);
  const removeRow = (idx) => setRows((p) => p.filter((_, i) => i !== idx));

  const save = async () => {
    if (!projectId) return;
    const cleaned = rows
      .map((r) => ({
        ...r,
        role_name: (r.role_name || '').trim(),
        skill_name: (r.skill_name || '').trim(),
        demand_count: Number(r.demand_count) || 0,
        fulfilled_count: Number(r.fulfilled_count) || 0,
        planned_start_date: r.planned_start_date || null,
        planned_end_date: r.planned_end_date || null,
      }))
      .filter((r) => r.role_name && r.skill_name);
    if (cleaned.length === 0) {
      toast.error('Add at least one demand row');
      return;
    }
    setSaving(true);
    try {
      await projectSectionApi.upsertDemands(projectId, { rows: cleaned, mode: 'upsert' });
      toast.success('Demands saved');
      await loadDemands(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + (Number(r.demand_count) || 0), 0);
    const fulfilled = rows.reduce((s, r) => s + (Number(r.fulfilled_count) || 0), 0);
    return { total, fulfilled, open: Math.max(0, total - fulfilled) };
  }, [rows]);

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
              Resource Demand & Skills
            </h1>
            <p className="text-slate-600">Define demand rows per project (role/skill/seat counts)</p>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="min-w-[280px]">
              <Label className="text-xs">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
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
            <Button variant="outline" onClick={addRow}>
              <Plus className="w-4 h-4 mr-2" /> Add row
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Demand & Skills
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-4 h-4 mr-2" /> Row
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-5 flex gap-3 flex-wrap items-center">
          <Badge variant="secondary">Demand: {summary.total}</Badge>
          <Badge variant="secondary">Fulfilled: {summary.fulfilled}</Badge>
          <Badge variant="outline">Open: {summary.open}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demand rows</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Skill</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Fulfilled</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Hiring</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={`${idx}-${r.role_name}-${r.skill_name}`}>
                  <TableCell className="min-w-[180px]">
                    <Input value={r.role_name} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, role_name: e.target.value } : x)))} />
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    <Input value={r.skill_name} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, skill_name: e.target.value } : x)))} />
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <Input value={r.competency_level} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, competency_level: e.target.value } : x)))} placeholder="e.g. Advanced" />
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <Select
                      value={r.mandatory_or_optional || 'mandatory'}
                      onValueChange={(v) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, mandatory_or_optional: v } : x)))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mandatory">mandatory</SelectItem>
                        <SelectItem value="optional">optional</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="min-w-[90px]">
                    <Input value={r.demand_count} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, demand_count: e.target.value } : x)))} />
                  </TableCell>
                  <TableCell className="min-w-[90px]">
                    <Input value={r.fulfilled_count} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, fulfilled_count: e.target.value } : x)))} />
                  </TableCell>
                  <TableCell className="min-w-[70px]">
                    <Badge variant="outline">{Math.max(0, (Number(r.demand_count) || 0) - (Number(r.fulfilled_count) || 0))}</Badge>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <div className="flex gap-2">
                      <Input value={r.planned_start_date} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, planned_start_date: e.target.value } : x)))} placeholder="Start" />
                      <Input value={r.planned_end_date} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, planned_end_date: e.target.value } : x)))} placeholder="End" />
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <Input value={r.demand_priority} onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, demand_priority: e.target.value } : x)))} placeholder="HIGH/MED" />
                  </TableCell>
                  <TableCell className="min-w-[90px]">
                    <Select
                      value={r.hiring_required_flag ? 'yes' : 'no'}
                      onValueChange={(v) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, hiring_required_flag: v === 'yes' } : x)))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" className="text-red-700" onClick={() => removeRow(idx)} disabled={rows.length <= 1}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectSectionDemandSkillsPage;

