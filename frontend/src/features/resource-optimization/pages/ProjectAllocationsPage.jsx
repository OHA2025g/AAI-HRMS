import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { projectsApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Loader2, Plus, Trash2, Upload, Download, TableProperties } from 'lucide-react';

const DEFAULT_ROW = { skill_name: '', allocated_count: 0 };

const ProjectAllocationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [rows, setRows] = useState([{ ...DEFAULT_ROW }]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const [importMode, setImportMode] = useState('skip');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewSummary, setPreviewSummary] = useState({ create: 0, update: 0, failed: 0 });
  const [previewCsvLines, setPreviewCsvLines] = useState([]);
  const [importingPreview, setImportingPreview] = useState(false);

  const canRender = useMemo(() => true, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await projectsApi.list();
      const list = res.data || [];
      setProjects(list);
      if (!selectedProjectId && list.length > 0) {
        setSelectedProjectId(list[0].id);
      }
    } catch (e) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadSkillAllocations = async (projectId) => {
    if (!projectId) return;
    setRowsLoading(true);
    try {
      const res = await projectsApi.listSkillAllocations(projectId);
      const list = res.data || [];
      if (list.length === 0) setRows([{ ...DEFAULT_ROW }]);
      else
        setRows(
          list.map((r) => ({
            skill_name: r.skill_name || '',
            allocated_count: r.allocated_count || 0,
          })),
        );
    } catch (e) {
      toast.error('Failed to load skill allocations');
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProjectId) loadSkillAllocations(selectedProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const addRow = () => setRows((prev) => [ ...prev, { ...DEFAULT_ROW } ]);
  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const downloadTemplate = () => {
    const csv = ['skill_name,allocated_count', 'Python,20'].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project_skill_allocations_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseAllocationsFromLines = (lines) => {
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const col = (name) => headers.indexOf(name);
    const required = ['skill_name', 'allocated_count'];
    for (const r of required) {
      if (col(r) < 0) throw new Error(`Missing required CSV column: ${r}`);
    }

    const payloadRows = [];
    const rawByRowNumber = {};
    for (let i = 1; i < lines.length; i += 1) {
      const cells = lines[i].split(',').map((c) => c.trim());
      const rowNumber = i;
      rawByRowNumber[rowNumber] = lines[i];
      payloadRows.push({
        skill_name: cells[col('skill_name')] || '',
        allocated_count: Number(cells[col('allocated_count')]) || 0,
      });
    }
    return { payloadRows, rawByRowNumber };
  };

  const executeImportFromLines = async (lines, dryRun) => {
    if (!selectedProjectId) throw new Error('Select a project first');
    const { payloadRows, rawByRowNumber } = parseAllocationsFromLines(lines);
    const res = await projectsApi.bulkImportSkillAllocations(selectedProjectId, {
      mode: importMode,
      dry_run: dryRun,
      rows: payloadRows,
    });
    return { summary: res.data?.summary || {}, rows: res.data?.rows || [], rawByRowNumber };
  };

  const handleImportFile = async (event, isPreview) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast.error('CSV has no data rows');
        return;
      }

      if (isPreview) {
        const res = await executeImportFromLines(lines, true);
        setPreviewRows(res.rows || []);
        const s = res.summary || {};
        setPreviewSummary({ create: s.created || 0, update: s.updated || 0, failed: s.failed || 0 });
        setPreviewCsvLines(lines);
        setPreviewOpen(true);
      } else {
        const res = await executeImportFromLines(lines, false);
        const s = res.summary || {};
        toast.success(
          `CSV import complete: ${s.created || 0} created, ${s.updated || 0} updated, ${s.failed || 0} failed`,
        );

        const failures = res.rows || [];
        const failedOnly = failures.filter((r) => r?.action === 'FAILED');
        if (failedOnly.length > 0) {
          const reportRows = [
            'row_number,reason,raw_row',
            ...failedOnly.map(
              (f) =>
                `${f.row_number},"${String(f.reason || '-').replace(/"/g, '""')}","${String(res.rawByRowNumber[f.row_number] || '').replace(/"/g, '""')}"`,
            ),
          ];
          const blob = new Blob([reportRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'project_skill_allocation_import_failures.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        await loadSkillAllocations(selectedProjectId);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Failed to process CSV');
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveManual = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      const cleaned = rows
        .map((r) => ({
          skill_name: (r.skill_name || '').trim(),
          allocated_count: Number(r.allocated_count || 0),
        }))
        .filter((r) => r.skill_name.length > 0);

      if (cleaned.length === 0) {
        toast.error('Add at least one skill row');
        return;
      }

      await projectsApi.bulkImportSkillAllocations(selectedProjectId, {
        mode: 'upsert',
        dry_run: false,
        rows: cleaned,
      });
      toast.success('Allocations saved');
      await loadSkillAllocations(selectedProjectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save allocations');
    } finally {
      setSaving(false);
    }
  };

  if (!canRender) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>
            Project Skill Allocations (M4)
          </CardTitle>
          <CardDescription>
            Assign allocated capacity per project and skill. Select a project, edit rows, save or import CSV. Create
            projects from Project Demands if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <Label className="text-base font-semibold text-slate-900">Active project</Label>
            {projects.length === 0 ? (
              <div className="text-slate-500">No projects yet. Create one from Project Demands.</div>
            ) : (
              <Select value={selectedProjectId} onValueChange={(v) => setSelectedProjectId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-8">
            <p className="text-sm text-slate-500">{rowsLoading ? 'Loading allocation rows…' : 'Upsert allocated count per skill, then save or import CSV.'}</p>
          {projects.length === 0 ? (
            <div className="text-slate-500">Create a project to edit allocations.</div>
          ) : (
            <>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Allocated Count</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="min-w-[220px]">
                          <Input
                            value={r.skill_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, skill_name: val } : x)));
                            }}
                            placeholder="e.g., Python"
                          />
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <Input
                            type="number"
                            value={r.allocated_count}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, allocated_count: isNaN(val) ? 0 : val } : x)));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(idx)}
                            disabled={rows.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Button variant="outline" onClick={addRow} disabled={saving}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSaveManual} disabled={saving || rowsLoading}>
                  {saving ? 'Saving...' : 'Save Allocations'}
                </Button>
                <Badge variant="secondary">Tip: Refresh M3/M4 dashboards after updates</Badge>
              </div>

              {/* CSV Bulk Import */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Select value={importMode} onValueChange={setImportMode}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Import mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Import: Skip duplicates</SelectItem>
                    <SelectItem value="upsert">Import: Upsert duplicates</SelectItem>
                  </SelectContent>
                </Select>

                <label className="inline-flex items-center">
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportFile(e, false)} />
                  <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />Import CSV
                  </span>
                </label>

                <label className="inline-flex items-center">
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImportFile(e, true)} />
                  <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer">
                    <TableProperties className="w-4 h-4 mr-2" />Preview CSV
                  </span>
                </label>

                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />Template
                </Button>
              </div>
            </>
          )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Dry-Run Import Preview (Project Skill Allocations)</DialogTitle>
          </DialogHeader>
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
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={async () => {
                if (!previewCsvLines?.length) return;
                setImportingPreview(true);
                try {
                  const res = await executeImportFromLines(previewCsvLines, false);
                  const s = res.summary || {};
                  toast.success(
                    `CSV import complete: ${s.created || 0} created, ${s.updated || 0} updated, ${s.failed || 0} failed`,
                  );
                  const failures = (res.rows || []).filter((r) => r?.action === 'FAILED');
                  if (failures.length > 0) {
                    const reportRows = [
                      'row_number,reason,raw_row',
                      ...failures.map(
                        (f) =>
                          `${f.row_number},"${String(f.reason || '-').replace(/"/g, '""')}","${String(res.rawByRowNumber[f.row_number] || '').replace(/"/g, '""')}"`,
                      ),
                    ];
                    const blob = new Blob([reportRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'project_skill_allocation_import_failures.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                  await loadSkillAllocations(selectedProjectId);
                  setPreviewOpen(false);
                } catch (e) {
                  toast.error(e?.response?.data?.detail || e?.message || 'Import failed');
                } finally {
                  setImportingPreview(false);
                }
              }}
              disabled={importingPreview}
            >
              {importingPreview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Import This Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectAllocationsPage;

