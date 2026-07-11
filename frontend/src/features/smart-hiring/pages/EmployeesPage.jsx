import React, { useEffect, useState } from 'react';
import { employeeApi, trainingRecommendationsApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Loader2, Plus, Trash2, Pencil, Upload, LayoutGrid, TableProperties, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/shared/ui/switch';

/** Optional M8 / HRIS columns on employee CSV import */
function applyOptionalCsvFields(cells, col, payload) {
  const g = (name) => {
    const i = col(name);
    if (i < 0) return undefined;
    const v = cells[i];
    const s = v !== undefined && v !== null ? String(v).trim() : '';
    return s;
  };
  const b = (name) => {
    const s = (g(name) || '').toLowerCase();
    if (!s) return undefined;
    return s === 'true' || s === '1' || s === 'yes';
  };
  const band = g('compensation_band');
  if (band) payload.compensation_band = band.toUpperCase();
  const lp = g('last_promotion_at');
  if (lp) payload.last_promotion_at = lp;
  const hp = b('high_performer');
  if (hp !== undefined) payload.high_performer = hp;
  const cr = b('critical_role');
  if (cr !== undefined) payload.critical_role = cr;
  const cmp = g('comp_market_percentile');
  if (cmp !== undefined && cmp !== '' && !Number.isNaN(parseFloat(cmp))) {
    payload.comp_market_percentile = parseFloat(cmp);
  }
  const hs = g('hris_last_sync_at');
  if (hs) payload.hris_last_sync_at = hs;
  const src = g('hris_comp_source');
  if (src) payload.hris_comp_source = src;
}

const EmployeesPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewMode, setViewMode] = useState('cards');
  const [importMode, setImportMode] = useState('skip');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewSummary, setPreviewSummary] = useState({ create: 0, update: 0, failed: 0 });
  const [previewCsvLines, setPreviewCsvLines] = useState([]);
  const [importingPreview, setImportingPreview] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [certRows, setCertRows] = useState([]);
  const [certLoading, setCertLoading] = useState(false);
  const [form, setForm] = useState({
    employee_code: '',
    full_name: '',
    email: '',
    department: '',
    role_title: '',
    location: '',
    status: 'ACTIVE',
    skills: '',
    join_date: '',
    compensation_band: '',
    last_promotion_at: '',
    high_performer: false,
    critical_role: false,
    comp_market_percentile: '',
    hris_last_sync_at: '',
    hris_comp_source: '',
  });

  const fetchRows = async (pageOverride = null) => {
    try {
      setLoading(true);
      const activePage = pageOverride ?? page;
      const params = {
        page: activePage,
        page_size: pageSize,
        sort_by: 'created_at',
        sort_dir: 'desc',
      };
      if (q) params.q = q;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (departmentFilter !== 'all') params.department = departmentFilter;

      const res = await employeeApi.listPaged(params);
      const payload = res.data || {};
      setRows(payload.items || []);
      setTotalItems(payload.total || 0);
      setTotalPages(payload.total_pages || 1);
    } catch (e) {
      const d = e?.response?.data?.detail;
      const hint =
        typeof d === 'string'
          ? d
          : e?.response?.status === 401
            ? 'Not signed in or session expired — please log in again.'
            : e?.response?.status === 502
              ? 'API unavailable (try refreshing in a moment if the stack just started).'
              : e?.message || 'Request failed';
      toast.error(`Failed to load employees: ${hint}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!editOpen || !form.employee_code?.trim()) {
      setCertRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setCertLoading(true);
        const res = await trainingRecommendationsApi.listCertifications({ employee_code: form.employee_code.trim() });
        if (!cancelled) setCertRows(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setCertRows([]);
      } finally {
        if (!cancelled) setCertLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editOpen, form.employee_code]);

  useEffect(() => {
    (async () => {
      try {
        const res = await employeeApi.list();
        const all = res.data || [];
        setDepartments(Array.from(new Set(all.map((r) => r?.department).filter(Boolean))).sort());
      } catch (e) {
        // Not critical for the page to load; dropdown will fall back to only "All Departments".
        setDepartments([]);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, departmentFilter]);

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, departmentFilter]);

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        employee_code: form.employee_code.trim(),
        full_name: form.full_name.trim(),
        email: form.email?.trim() || null,
        department: form.department.trim(),
        role_title: form.role_title.trim(),
        location: form.location?.trim() || null,
        status: form.status,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        join_date: form.join_date?.trim() || null,
        last_promotion_at: form.last_promotion_at?.trim() || null,
        hris_last_sync_at: form.hris_last_sync_at?.trim() || null,
        hris_comp_source: form.hris_comp_source?.trim() || null,
        high_performer: !!form.high_performer,
        critical_role: !!form.critical_role,
      };
      if (form.compensation_band) payload.compensation_band = form.compensation_band;
      if (form.comp_market_percentile !== '' && form.comp_market_percentile != null) {
        const p = parseFloat(form.comp_market_percentile);
        if (!Number.isNaN(p)) payload.comp_market_percentile = p;
      }
      ['join_date', 'last_promotion_at', 'hris_last_sync_at', 'hris_comp_source', 'email', 'location'].forEach((k) => {
        if (payload[k] === '' || payload[k] === null) delete payload[k];
      });
      await employeeApi.create(payload);
      toast.success('Employee created');
      setOpen(false);
      setForm({
        employee_code: '',
        full_name: '',
        email: '',
        department: '',
        role_title: '',
        location: '',
        status: 'ACTIVE',
        skills: '',
        join_date: '',
        compensation_band: '',
        last_promotion_at: '',
        high_performer: false,
        critical_role: false,
        comp_market_percentile: '',
        hris_last_sync_at: '',
        hris_comp_source: '',
      });
      fetchRows();
    } catch (e2) {
      toast.error(e2.response?.data?.detail || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this employee?')) return;
    try {
      await employeeApi.remove(id);
      toast.success('Employee deleted');
      fetchRows();
    } catch (e) {
      toast.error('Failed to delete employee');
    }
  };

  const startEdit = (row) => {
    setSelectedId(row.id);
    setForm({
      employee_code: row.employee_code || '',
      full_name: row.full_name || '',
      email: row.email || '',
      department: row.department || '',
      role_title: row.role_title || '',
      location: row.location || '',
      status: row.status || 'ACTIVE',
      skills: (row.skills || []).join(', '),
      join_date: row.join_date || '',
      compensation_band: row.compensation_band || '',
      last_promotion_at: row.last_promotion_at || '',
      high_performer: !!row.high_performer,
      critical_role: !!row.critical_role,
      comp_market_percentile: row.comp_market_percentile != null ? String(row.comp_market_percentile) : '',
      hris_last_sync_at: row.hris_last_sync_at || '',
      hris_comp_source: row.hris_comp_source || '',
    });
    setEditOpen(true);
  };

  const onUpdate = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setEditing(true);
    try {
      const up = {
        full_name: form.full_name,
        email: form.email || null,
        department: form.department,
        role_title: form.role_title,
        location: form.location || null,
        status: form.status,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        join_date: form.join_date?.trim() || null,
        compensation_band: form.compensation_band || null,
        last_promotion_at: form.last_promotion_at?.trim() || null,
        high_performer: !!form.high_performer,
        critical_role: !!form.critical_role,
        hris_last_sync_at: form.hris_last_sync_at?.trim() || null,
        hris_comp_source: form.hris_comp_source?.trim() || null,
      };
      if (form.comp_market_percentile !== '' && form.comp_market_percentile != null) {
        const p = parseFloat(form.comp_market_percentile);
        if (!Number.isNaN(p)) up.comp_market_percentile = p;
      } else {
        up.comp_market_percentile = null;
      }
      await employeeApi.update(selectedId, up);
      toast.success('Employee updated');
      setEditOpen(false);
      setSelectedId(null);
      fetchRows();
    } catch (e2) {
      toast.error(e2.response?.data?.detail || 'Failed to update employee');
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
      const required = ['employee_code', 'full_name', 'department', 'role_title'];
      for (const r of required) {
        if (col(r) < 0) {
          toast.error(`Missing required CSV column: ${r}`);
          return;
        }
      }

      const payloadRows = [];
      const rawByRowNumber = {};
      for (let i = 1; i < lines.length; i += 1) {
        const cells = lines[i].split(',').map((c) => c.trim());
        const payload = {
          employee_code: cells[col('employee_code')] || '',
          full_name: cells[col('full_name')] || '',
          department: cells[col('department')] || '',
          role_title: cells[col('role_title')] || '',
          email: col('email') >= 0 ? (cells[col('email')] || null) : null,
          location: col('location') >= 0 ? (cells[col('location')] || null) : null,
          status: col('status') >= 0 ? (cells[col('status')] || 'ACTIVE') : 'ACTIVE',
          skills:
            col('skills') >= 0
              ? (cells[col('skills')] || '').split('|').map((s) => s.trim()).filter(Boolean)
              : [],
          join_date: col('join_date') >= 0 ? (cells[col('join_date')] || null) : null,
        };
        applyOptionalCsvFields(cells, col, payload);
        // Backend returns `row_number` as the payload row index starting from 1,
        // and since our loop starts at the first data row (i=1), `i` matches that.
        const rowNumber = i;
        rawByRowNumber[rowNumber] = lines[i];
        payloadRows.push(payload);
      }

      const res = await employeeApi.bulkImport({
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
        a.download = 'employee_import_failures.csv';
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
      const required = ['employee_code', 'full_name', 'department', 'role_title'];
      for (const r of required) {
        if (col(r) < 0) {
          toast.error(`Missing required CSV column: ${r}`);
          return;
        }
      }
      const payloadRows = [];
      for (let i = 1; i < lines.length; i += 1) {
        const cells = lines[i].split(',').map((c) => c.trim());
        const payload = {
          employee_code: cells[col('employee_code')] || '',
          full_name: cells[col('full_name')] || '',
          department: cells[col('department')] || '',
          role_title: cells[col('role_title')] || '',
          email: col('email') >= 0 ? (cells[col('email')] || null) : null,
          location: col('location') >= 0 ? (cells[col('location')] || null) : null,
          status: col('status') >= 0 ? (cells[col('status')] || 'ACTIVE') : 'ACTIVE',
          skills:
            col('skills') >= 0
              ? (cells[col('skills')] || '').split('|').map((s) => s.trim()).filter(Boolean)
              : [],
          join_date: col('join_date') >= 0 ? (cells[col('join_date')] || null) : null,
        };
        applyOptionalCsvFields(cells, col, payload);
        payloadRows.push(payload);
      }

      const res = await employeeApi.bulkImport({
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
      'employee_code,full_name,department,role_title,email,location,status,skills,join_date,compensation_band,last_promotion_at,high_performer,critical_role,comp_market_percentile,hris_last_sync_at,hris_comp_source',
      'E1001,Anita Sharma,Data,Senior Analyst,anita@example.com,Pune,ACTIVE,Python|SQL|Power BI,2023-04-01T00:00:00Z,MID,,false,false,72.5,2026-01-15T00:00:00Z,workday_comp',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_master_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pageRows = rows;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:flex-nowrap gap-3">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Employee Master</h1>
          <p className="text-slate-600">{totalItems || rows.length} employees</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <Input placeholder="Search by code/name/email/role" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setPage(1);
              fetchRows(1);
            }}
            className="w-full sm:w-auto shrink-0"
          >
            Search
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[170px] shrink-0"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ONBOARDING">Onboarding</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="EXITED">Exited</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[190px] shrink-0"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0 flex lg:justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input required value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></div>
                <div><Label>Name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Department</Label><Input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Role Title</Label><Input required value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <div><Label>Skills (comma separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
              <div><Label>Join date (ISO, optional)</Label><Input value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} placeholder="2023-04-01T00:00:00Z" /></div>
              <p className="text-xs font-medium text-slate-700 pt-2">Retention / HRIS (M8)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Comp band</Label>
                  <Select
                    value={form.compensation_band || '__none__'}
                    onValueChange={(v) => setForm({ ...form, compensation_band: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="LOW">LOW</SelectItem>
                      <SelectItem value="MID">MID</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                      <SelectItem value="LEAD">LEAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Last promotion (ISO)</Label><Input value={form.last_promotion_at} onChange={(e) => setForm({ ...form, last_promotion_at: e.target.value })} placeholder="optional" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label className="mb-0">High performer</Label>
                  <Switch checked={!!form.high_performer} onCheckedChange={(c) => setForm({ ...form, high_performer: c })} />
                </div>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label className="mb-0">Critical role</Label>
                  <Switch checked={!!form.critical_role} onCheckedChange={(c) => setForm({ ...form, critical_role: c })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Comp market %ile (0–100)</Label><Input value={form.comp_market_percentile} onChange={(e) => setForm({ ...form, comp_market_percentile: e.target.value })} placeholder="HRIS / survey" /></div>
                <div><Label>HRIS sync at (ISO)</Label><Input value={form.hris_last_sync_at} onChange={(e) => setForm({ ...form, hris_last_sync_at: e.target.value })} /></div>
              </div>
              <div><Label>HRIS comp source</Label><Input value={form.hris_comp_source} onChange={(e) => setForm({ ...form, hris_comp_source: e.target.value })} placeholder="e.g. workday_comp" /></div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'cards' ? 'default' : 'outline'} onClick={() => setViewMode('cards')}>
            <LayoutGrid className="w-4 h-4 mr-2" />Cards
          </Button>
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} onClick={() => setViewMode('table')}>
            <TableProperties className="w-4 h-4 mr-2" />Table
          </Button>
        </div>
        <Select value={importMode} onValueChange={setImportMode}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Import mode" /></SelectTrigger>
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
          <DialogHeader><DialogTitle>Dry-Run Import Preview (Employees)</DialogTitle></DialogHeader>
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
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.slice(0, 300).map((r) => (
                  <TableRow key={`${r.row_number}-${r.employee_code}`}>
                    <TableCell>{r.row_number}</TableCell>
                    <TableCell>{r.employee_code}</TableCell>
                    <TableCell>{r.full_name}</TableCell>
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
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          <form onSubmit={onUpdate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={form.employee_code} disabled /></div>
              <div><Label>Name</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Department</Label><Input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Role Title</Label><Input required value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            </div>
            <div><Label>Status</Label><Input value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value.toUpperCase() })} /></div>
            <div><Label>Skills (comma separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
            <div><Label>Join date (ISO)</Label><Input value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} /></div>
            <p className="text-xs font-medium text-slate-700 pt-2">Retention / HRIS (M8)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Comp band</Label>
                <Select
                  value={form.compensation_band || '__none__'}
                  onValueChange={(v) => setForm({ ...form, compensation_band: v === '__none__' ? '' : v })}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    <SelectItem value="LOW">LOW</SelectItem>
                    <SelectItem value="MID">MID</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                    <SelectItem value="LEAD">LEAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Last promotion (ISO)</Label><Input value={form.last_promotion_at} onChange={(e) => setForm({ ...form, last_promotion_at: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="mb-0">High performer</Label>
                <Switch checked={!!form.high_performer} onCheckedChange={(c) => setForm({ ...form, high_performer: c })} />
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label className="mb-0">Critical role</Label>
                <Switch checked={!!form.critical_role} onCheckedChange={(c) => setForm({ ...form, critical_role: c })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Comp market %ile</Label><Input value={form.comp_market_percentile} onChange={(e) => setForm({ ...form, comp_market_percentile: e.target.value })} /></div>
              <div><Label>HRIS sync at</Label><Input value={form.hris_last_sync_at} onChange={(e) => setForm({ ...form, hris_last_sync_at: e.target.value })} /></div>
            </div>
            <div><Label>HRIS comp source</Label><Input value={form.hris_comp_source} onChange={(e) => setForm({ ...form, hris_comp_source: e.target.value })} /></div>
            <p className="text-xs font-medium text-slate-700 pt-2">Certifications (M5)</p>
            {certLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
            ) : certRows.length === 0 ? (
              <p className="text-sm text-slate-500">No certifications on file for this employee code.</p>
            ) : (
              <div className="rounded-md border max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certRows.map((c) => (
                      <TableRow key={c.id || `${c.title}-${c.issued_at}`}>
                        <TableCell className="font-medium">{c.title || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-600">{c.issued_at || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-600">{c.expires_at || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={editing}>
              {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-slate-500">No employees found</CardContent></Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.employee_code}</TableCell>
                    <TableCell>{r.full_name}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.role_title}</TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(r.id)}><Trash2 className="w-4 h-4" /></Button>
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
            <Card key={r.id}>
              <CardHeader className="pb-3"><CardTitle className="text-lg">{r.full_name}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="text-slate-500">Code:</span> {r.employee_code}</p>
                <p><span className="text-slate-500">Department:</span> {r.department}</p>
                <p><span className="text-slate-500">Role:</span> {r.role_title}</p>
                <div><Badge variant="secondary">{r.status}</Badge></div>
                <div className="flex flex-wrap gap-1">{(r.skills || []).slice(0, 5).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>
                <Button variant="outline" className="w-full" onClick={() => startEdit(r)}>
                  <Pencil className="w-4 h-4 mr-2" />Edit
                </Button>
                <Button variant="outline" className="w-full text-red-600" onClick={() => onDelete(r.id)}>
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

export default EmployeesPage;
