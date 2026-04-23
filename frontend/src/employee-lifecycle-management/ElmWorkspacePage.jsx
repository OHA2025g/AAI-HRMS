import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { employeeLifecycleManagementApi } from '../lib/api';
import { getElmRouteConfig } from './routeTable';

const inferColumns = (rows) => {
  const r = (rows || [])[0];
  if (!r) return [];
  const keys = Object.keys(r).filter((k) => k !== '_id');
  const preferred = ['employee_id', 'status', 'created_at', 'updated_at'];
  keys.sort((a, b) => (preferred.includes(a) ? -1 : 0) - (preferred.includes(b) ? -1 : 0) || a.localeCompare(b));
  return keys.slice(0, 8);
};

export default function ElmWorkspacePage() {
  const { pathname } = useLocation();
  const cfg = useMemo(() => getElmRouteConfig(pathname), [pathname]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qEmployee, setQEmployee] = useState('');
  const [jsonText, setJsonText] = useState('');

  const apiPath = cfg?.apiPath;

  const fetchRows = async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      if (cfg.kind === 'dashboard') {
        const res = await employeeLifecycleManagementApi.getDashboardSummary();
        setRows([res.data || {}]);
      } else if (cfg.kind === 'forecasting') {
        const res = await employeeLifecycleManagementApi.listForecasts();
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'ai') {
        const res = await employeeLifecycleManagementApi.listAiInsights();
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'notes') {
        const res = await employeeLifecycleManagementApi.listNotes(qEmployee ? { employee_id: qEmployee } : {});
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'resignation') {
        const res = await employeeLifecycleManagementApi.listResignations();
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'pre-boarding') {
        const res = await employeeLifecycleManagementApi.listPreboarding();
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'onboarding') {
        const res = await employeeLifecycleManagementApi.listOnboarding();
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'probation') {
        const res = await employeeLifecycleManagementApi.listProbation();
        setRows(res.data?.items || []);
      } else if (cfg.kind === 'simple' && apiPath) {
        const res = await employeeLifecycleManagementApi.listByPath(apiPath);
        setRows(res.data?.items || res.data?.dashboard ? [res.data] : (res.data?.items || []));
      } else {
        setRows([]);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const columns = useMemo(() => inferColumns(rows), [rows]);
  const title = useMemo(() => cfg?.path?.split('/').slice(-1)[0]?.replace(/-/g, ' ') || 'Workspace', [cfg]);

  const canCreate = cfg?.kind === 'notes' || cfg?.kind === 'pre-boarding' || cfg?.kind === 'onboarding' || cfg?.kind === 'probation' || cfg?.kind === 'resignation';

  const create = async () => {
    setSaving(true);
    try {
      const payload = jsonText ? JSON.parse(jsonText) : {};
      if (cfg.kind === 'notes') await employeeLifecycleManagementApi.createNote(payload);
      if (cfg.kind === 'pre-boarding') await employeeLifecycleManagementApi.createPreboarding(payload);
      if (cfg.kind === 'onboarding') await employeeLifecycleManagementApi.createOnboarding(payload);
      if (cfg.kind === 'probation') await employeeLifecycleManagementApi.createProbation(payload);
      if (cfg.kind === 'resignation') await employeeLifecycleManagementApi.createResignation(payload);
      toast.success('Created');
      setOpen(false);
      setJsonText('');
      await fetchRows();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold capitalize">{title}</div>
          <div className="text-sm text-muted-foreground">Operational workspace (list + quick create where supported)</div>
        </div>
        {canCreate ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Records</CardTitle>
          <CardDescription>{rows.length} rows</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cfg?.kind === 'notes' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Filter by employee_id</Label>
                <Input value={qEmployee} onChange={(e) => setQEmployee(e.target.value)} placeholder="employee id (optional)" />
              </div>
              <div className="flex items-end justify-end">
                <Button variant="secondary" onClick={() => fetchRows()}>
                  Apply
                </Button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c}>{c}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows || []).slice(0, 200).map((r, idx) => (
                    <TableRow key={r.id || idx}>
                      {columns.map((c) => (
                        <TableCell key={c}>{String(r?.[c] ?? '-')}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(1, columns.length)} className="text-sm text-muted-foreground">
                        No records.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create record</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Payload (JSON)</Label>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='Example: {"employee_id":"...","title":"..."}'
              rows={10}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={create} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

