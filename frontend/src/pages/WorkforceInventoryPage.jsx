import React, { useEffect, useState } from 'react';
import { workforceApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2, Plus, Trash2, Pencil, Upload, LayoutGrid, TableProperties, Download } from 'lucide-react';
import { toast } from 'sonner';

const WorkforceInventoryPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [viewMode, setViewMode] = useState('cards');
  const [importMode, setImportMode] = useState('skip');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewSummary, setPreviewSummary] = useState({ create: 0, update: 0, failed: 0 });
  const [previewCsvLines, setPreviewCsvLines] = useState([]);
  const [importingPreview, setImportingPreview] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [form, setForm] = useState({ skill_name: '', demand_count: 0, supply_count: 0, priority: 'MEDIUM' });

  const fetchRows = async (pageOverride = null) => {
    try {
      setLoading(true);
      const activePage = pageOverride ?? page;
      const res = await workforceApi.listSkillsPaged({
        page: activePage,
        page_size: pageSize,
        sort_by: 'gap',
        sort_dir: 'desc',
      });
      const payload = res.data || {};
      setRows(payload.items || []);
      setTotalItems(payload.total || 0);
      setTotalPages(payload.total_pages || 1);
    } catch (e) {
      toast.error('Failed to load skill inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [page]);

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await workforceApi.createSkill({
        ...form,
        demand_count: Number(form.demand_count || 0),
        supply_count: Number(form.supply_count || 0),
      });
      toast.success('Skill added');
      setOpen(false);
      setForm({ skill_name: '', demand_count: 0, supply_count: 0, priority: 'MEDIUM' });
      fetchRows();
    } catch (e2) {
      toast.error(e2.response?.data?.detail || 'Failed to add skill');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await workforceApi.deleteSkill(name);
      toast.success('Skill deleted');
      fetchRows();
    } catch (e) {
      toast.error('Failed to delete skill');
    }
  };

  const startEdit = (row) => {
    setSelectedSkill(row.skill_name);
    setForm({
      skill_name: row.skill_name || '',
      demand_count: row.demand_count || 0,
      supply_count: row.supply_count || 0,
      priority: row.priority || 'MEDIUM',
    });
    setEditOpen(true);
  };

  const onUpdate = async (e) => {
    e.preventDefault();
    if (!selectedSkill) return;
    setEditing(true);
    try {
      await workforceApi.updateSkill(selectedSkill, {
        demand_count: Number(form.demand_count || 0),
        supply_count: Number(form.supply_count || 0),
        priority: form.priority,
      });
      toast.success('Skill updated');
      setEditOpen(false);
      setSelectedSkill(null);
      fetchRows();
    } catch (e2) {
      toast.error(e2.response?.data?.detail || 'Failed to update skill');
    } finally {
      setEditing(false);
    }
  };

  const executeImportFromLines = async (lines) => {
    try {
      if (lines.length < 2) {
        toast.error('CSV has no data rows');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const col = (name) => headers.indexOf(name);
      if (col('skill_name') < 0 || col('demand_count') < 0) {
        toast.error('CSV must contain: skill_name,demand_count');
        return;
      }

      const payloadRows = [];
      const rawByRowNumber = {};
      for (let i = 1; i < lines.length; i += 1) {
        const cells = lines[i].split(',').map((c) => c.trim());
        const payload = {
          skill_name: cells[col('skill_name')] || '',
          demand_count: Number(cells[col('demand_count')] || 0),
          supply_count: col('supply_count') >= 0 ? Number(cells[col('supply_count')] || 0) : 0,
          priority: col('priority') >= 0 ? (cells[col('priority')] || 'MEDIUM') : 'MEDIUM',
        };
        // Backend returns `row_number` as the payload row index starting from 1,
        // and since our loop starts at the first data row (i=1), `i` matches that.
        const rowNumber = i;
        rawByRowNumber[rowNumber] = lines[i];
        payloadRows.push(payload);
      }

      const res = await workforceApi.bulkImport({
        mode: importMode,
        dry_run: false,
        rows: payloadRows,
      });

      const summary = res.data?.summary || {};
      toast.success(
        `CSV import complete: ${summary.created || 0} created, ${summary.updated || 0} updated, ${summary.failed || 0} failed`
      );

      const results = res.data?.rows || [];
      const failures = results.filter((r) => r?.action === 'FAILED');
      if (failures.length > 0) {
        const reportRows = [
          'row_number,reason,raw_row',
          ...failures.map(
            (f) =>
              `${f.row_number},"${String(f.reason || '-').replace(/"/g, '""')}","${String(rawByRowNumber[f.row_number] || '').replace(/"/g, '""')}"`
          ),
        ];
        const blob = new Blob([reportRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workforce_import_failures.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      fetchRows();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to import CSV');
    }
  };

  const onImportCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      await executeImportFromLines(lines);
    } finally {
      event.target.value = '';
    }
  };

  const onPreviewCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast.error('CSV has no data rows');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const col = (name) => headers.indexOf(name);
      if (col('skill_name') < 0 || col('demand_count') < 0) {
        toast.error('CSV must contain: skill_name,demand_count');
        return;
      }
      const payloadRows = [];
      for (let i = 1; i < lines.length; i += 1) {
        const cells = lines[i].split(',').map((c) => c.trim());
        payloadRows.push({
          skill_name: cells[col('skill_name')] || '',
          demand_count: Number(cells[col('demand_count')] || 0),
          supply_count: col('supply_count') >= 0 ? Number(cells[col('supply_count')] || 0) : 0,
          priority: col('priority') >= 0 ? (cells[col('priority')] || 'MEDIUM') : 'MEDIUM',
        });
      }

      const res = await workforceApi.bulkImport({
        mode: importMode,
        dry_run: true,
        rows: payloadRows,
      });

      setPreviewRows(res.data?.rows || []);
      const s = res.data?.summary || {};
      setPreviewSummary({
        create: s.created || 0,
        update: s.updated || 0,
        failed: s.failed || 0,
      });
      setPreviewCsvLines(lines);
      setPreviewOpen(true);
    } catch (e) {
      toast.error('Failed to preview CSV');
    } finally {
      event.target.value = '';
    }
  };

  const onImportPreview = async () => {
    if (!previewCsvLines.length) return;
    setImportingPreview(true);
    try {
      await executeImportFromLines(previewCsvLines);
      setPreviewOpen(false);
    } finally {
      setImportingPreview(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      'skill_name,demand_count,supply_count,priority',
      'Python,25,10,HIGH',
      'Machine Learning,18,6,HIGH',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workforce_skills_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pageRows = rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Workforce Skill Inventory</h1>
          <p className="text-slate-600">{totalItems || rows.length} tracked skills</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Add Skill</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Skill Inventory</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div><Label>Skill Name</Label><Input required value={form.skill_name} onChange={(e) => setForm({ ...form, skill_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Demand</Label><Input type="number" min={0} value={form.demand_count} onChange={(e) => setForm({ ...form, demand_count: e.target.value })} /></div>
                <div><Label>Manual Supply</Label><Input type="number" min={0} value={form.supply_count} onChange={(e) => setForm({ ...form, supply_count: e.target.value })} /></div>
              </div>
              <div><Label>Priority</Label><Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value.toUpperCase() })} /></div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'cards' ? 'default' : 'outline'} onClick={() => setViewMode('cards')}>
            <LayoutGrid className="w-4 h-4 mr-2" />Cards
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} onClick={() => setViewMode('table')}>
            <TableProperties className="w-4 h-4 mr-2" />Table
          </Button>
        </div>
        <Select value={importMode} onValueChange={setImportMode}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Import mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="skip">Import: Skip duplicates</SelectItem>
            <SelectItem value="upsert">Import: Upsert duplicates</SelectItem>
          </SelectContent>
        </Select>
        <label className="inline-flex items-center">
          <input type="file" accept=".csv" className="hidden" onChange={onImportCsv} />
          <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />Import CSV
          </span>
        </label>
        <label className="inline-flex items-center">
          <input type="file" accept=".csv" className="hidden" onChange={onPreviewCsv} />
          <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer">
            <TableProperties className="w-4 h-4 mr-2" />Preview CSV
          </span>
        </label>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />Template
        </Button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Dry-Run Import Preview (Workforce Skills)</DialogTitle></DialogHeader>
          <div className="flex gap-2 text-sm">
            <Badge variant="outline">Create: {previewSummary.create}</Badge>
            <Badge variant="outline">Update: {previewSummary.update}</Badge>
            <Badge variant="outline">Failed: {previewSummary.failed}</Badge>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.slice(0, 300).map((r) => (
                  <TableRow key={`${r.row_number}-${r.skill_name}`}>
                    <TableCell>{r.row_number}</TableCell>
                    <TableCell>{r.skill_name}</TableCell>
                    <TableCell>{r.action}</TableCell>
                    <TableCell>{r.reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button onClick={onImportPreview} className="bg-indigo-600 hover:bg-indigo-700" disabled={importingPreview}>
              {importingPreview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Import This Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Skill Inventory</DialogTitle></DialogHeader>
          <form onSubmit={onUpdate} className="space-y-3">
            <div><Label>Skill Name</Label><Input value={form.skill_name} disabled /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Demand</Label><Input type="number" min={0} value={form.demand_count} onChange={(e) => setForm({ ...form, demand_count: e.target.value })} /></div>
              <div><Label>Supply</Label><Input type="number" min={0} value={form.supply_count} onChange={(e) => setForm({ ...form, supply_count: e.target.value })} /></div>
            </div>
            <div><Label>Priority</Label><Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value.toUpperCase() })} /></div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={editing}>
              {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-slate-500">No skill inventory yet</CardContent></Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Demand</TableHead>
                  <TableHead>Supply</TableHead>
                  <TableHead>Gap</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => (
                  <TableRow key={r.skill_name}>
                    <TableCell>{r.skill_name}</TableCell>
                    <TableCell>{r.demand_count}</TableCell>
                    <TableCell>{r.supply_count}</TableCell>
                    <TableCell>
                      <Badge className={r.gap > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>{r.gap}</Badge>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{r.priority}</Badge></TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(r.skill_name)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pageRows.map((r) => (
            <Card key={r.skill_name}>
              <CardHeader className="pb-3"><CardTitle className="text-lg">{r.skill_name}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">Demand: {r.demand_count}</Badge>
                  <Badge variant="outline">Supply: {r.supply_count}</Badge>
                  <Badge className={r.gap > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>Gap: {r.gap}</Badge>
                </div>
                <div><Badge variant="secondary">{r.priority}</Badge></div>
                <Button variant="outline" className="w-full" onClick={() => startEdit(r)}>
                  <Pencil className="w-4 h-4 mr-2" />Edit
                </Button>
                <Button variant="outline" className="w-full text-red-600" onClick={() => onDelete(r.skill_name)}>
                  <Trash2 className="w-4 h-4 mr-2" />Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
};

export default WorkforceInventoryPage;
