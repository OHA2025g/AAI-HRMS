import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { trainingDevelopmentApi } from '../lib/api';
import { getTrainingDevRouteConfig } from './routeTable';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

const previewBody = (b) => {
  try {
    const s = JSON.stringify(b ?? {});
    return s.length > 140 ? `${s.slice(0, 140)}…` : s;
  } catch {
    return '';
  }
};

const TdWorkspacePage = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const cfg = useMemo(() => getTrainingDevRouteConfig(pathname), [pathname]);
  const canWrite = ['admin', 'hr_admin'].includes(String(user?.role || ''));

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [catalogForm, setCatalogForm] = useState({
    title: '',
    catalog_type: 'INTERNAL',
    duration_hours: '4',
    mode: 'VIRTUAL',
    training_id: '',
  });

  const [extForm, setExtForm] = useState({
    title: '',
    bodyJson: '{}',
    employee_id: '',
    priority: 'MEDIUM',
    status: 'OPEN',
  });

  const load = useCallback(async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      if (cfg.kind === 'catalog') {
        const res = await trainingDevelopmentApi.listCatalog({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'extended') {
        const res = await trainingDevelopmentApi.listExtended(cfg.recordType, { limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: res.data?.total ?? 0 });
      } else if (cfg.kind === 'batches') {
        const res = await trainingDevelopmentApi.listBatches({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'attendance') {
        const [sess, enr] = await Promise.all([
          trainingDevelopmentApi.listSessions({ limit: 80 }),
          trainingDevelopmentApi.listEnrollments({ limit: 80 }),
        ]);
        setRows({
          sessions: sess.data?.items || [],
          enrollments: enr.data?.items || [],
        });
        setMeta({});
      } else if (cfg.kind === 'approvals') {
        const res = await trainingDevelopmentApi.listApprovals({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: res.data?.total ?? 0 });
      } else if (cfg.kind === 'forecast') {
        const res = await trainingDevelopmentApi.forecastsSummary();
        setRows(res.data?.items || []);
        setMeta({});
      } else if (cfg.kind === 'ai-gap') {
        const res = await trainingDevelopmentApi.aiSkillGapPredictions();
        setRows(res.data?.items || []);
        setMeta({});
      } else if (cfg.kind === 'ai-learn') {
        const res = await trainingDevelopmentApi.aiLearningRecommendations();
        setRows(res.data?.items || []);
        setMeta({});
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load workspace');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cfg]);

  useEffect(() => {
    load();
  }, [load]);

  const submitCatalog = async (e) => {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    try {
      const tid = catalogForm.training_id.trim();
      const payload = {
        title: catalogForm.title.trim(),
        catalog_type: catalogForm.catalog_type,
        duration_hours: parseFloat(catalogForm.duration_hours) || 0,
        mode: catalogForm.mode,
        description: null,
        skill_tags: [],
        role_tags: [],
        source_type: 'INTERNAL',
        provider_name: null,
        mandatory_flag: false,
        status: 'ACTIVE',
        visibility: 'ORG',
      };
      if (tid) payload.training_id = tid;
      await trainingDevelopmentApi.createCatalogItem(payload);
      toast.success('Catalog item created');
      setOpen(false);
      setCatalogForm((f) => ({ ...f, title: '', training_id: '' }));
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const submitExtended = async (e) => {
    e.preventDefault();
    if (!canWrite || !cfg || cfg.kind !== 'extended') return;
    let body = {};
    try {
      body = JSON.parse(extForm.bodyJson || '{}');
    } catch {
      toast.error('Body must be valid JSON');
      return;
    }
    setSaving(true);
    try {
      await trainingDevelopmentApi.createExtended({
        record_type: cfg.recordType,
        title: extForm.title.trim(),
        body,
        employee_id: extForm.employee_id.trim() || null,
        priority: extForm.priority,
        status: extForm.status,
      });
      toast.success('Record created');
      setOpen(false);
      setExtForm({ title: '', bodyJson: '{}', employee_id: '', priority: 'MEDIUM', status: 'OPEN' });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Unknown training workspace path.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/training-development/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {cfg.title}
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Workspace · {cfg.kind}
            {cfg.recordType ? ` · ${cfg.recordType}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          {canWrite && (cfg.kind === 'catalog' || cfg.kind === 'extended') ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{cfg.kind === 'catalog' ? 'New catalog item' : 'New record'}</DialogTitle>
                </DialogHeader>
                {cfg.kind === 'catalog' ? (
                  <form onSubmit={submitCatalog} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        required
                        value={catalogForm.title}
                        onChange={(e) => setCatalogForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Catalog type</Label>
                      <Input
                        value={catalogForm.catalog_type}
                        onChange={(e) => setCatalogForm((f) => ({ ...f, catalog_type: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Duration (h)</Label>
                        <Input
                          value={catalogForm.duration_hours}
                          onChange={(e) => setCatalogForm((f) => ({ ...f, duration_hours: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mode</Label>
                        <Input value={catalogForm.mode} onChange={(e) => setCatalogForm((f) => ({ ...f, mode: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Training program ID (optional)</Label>
                      <Input
                        placeholder="UUID of program"
                        value={catalogForm.training_id}
                        onChange={(e) => setCatalogForm((f) => ({ ...f, training_id: e.target.value }))}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                ) : (
                  <form onSubmit={submitExtended} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input
                        required
                        value={extForm.title}
                        onChange={(e) => setExtForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Body (JSON)</Label>
                      <Textarea
                        rows={5}
                        className="font-mono text-xs"
                        value={extForm.bodyJson}
                        onChange={(e) => setExtForm((f) => ({ ...f, bodyJson: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employee ID (optional)</Label>
                      <Input value={extForm.employee_id} onChange={(e) => setExtForm((f) => ({ ...f, employee_id: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input value={extForm.priority} onChange={(e) => setExtForm((f) => ({ ...f, priority: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Input value={extForm.status} onChange={(e) => setExtForm((f) => ({ ...f, status: e.target.value }))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      {cfg.kind === 'catalog' ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Training</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[240px] truncate">{r.title}</TableCell>
                    <TableCell>{r.catalog_type}</TableCell>
                    <TableCell>{r.mode}</TableCell>
                    <TableCell>{r.duration_hours}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.training_id || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No catalog items.</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {cfg.kind === 'extended' ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Body</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-[200px] truncate">{r.title}</TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="font-mono text-xs">{r.employee_id || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-[320px] truncate">{previewBody(r.body)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No records.</p> : null}
            <p className="text-xs text-slate-500 mt-2">Total: {meta.total}</p>
          </CardContent>
        </Card>
      ) : null}

      {cfg.kind === 'batches' ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Training ID</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="font-medium">{r.batch_name}</span>
                      <div className="text-xs text-slate-500 font-mono">{r.batch_code}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.training_id}</TableCell>
                    <TableCell>{r.capacity}</TableCell>
                    <TableCell>{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {cfg.kind === 'attendance' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Scheduled sessions (context)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows.sessions || []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="max-w-[200px] truncate">{s.session_title}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{s.start_datetime}</TableCell>
                      <TableCell>{s.session_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(rows.sessions || []).length === 0 ? <p className="text-slate-500 py-4">No sessions loaded.</p> : null}
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Recent enrollments</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto text-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Training</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Approval</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows.enrollments || []).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.employee_id}</TableCell>
                      <TableCell className="font-mono text-xs">{e.training_id}</TableCell>
                      <TableCell>{e.enrollment_status}</TableCell>
                      <TableCell>{e.approval_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {cfg.kind === 'approvals' ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Training</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.request_type}</TableCell>
                    <TableCell className="font-mono text-xs">{r.training_id}</TableCell>
                    <TableCell className="font-mono text-xs">{r.employee_id}</TableCell>
                    <TableCell>{r.current_stage}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{r.submitted_at}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {(cfg.kind === 'forecast' || cfg.kind === 'ai-gap' || cfg.kind === 'ai-learn') && (
        <Card className="border-slate-200">
          <CardContent className="pt-6 space-y-3">
            {rows.length === 0 ? (
              <p className="text-slate-500 text-sm">No rows returned.</p>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 text-sm">
                  <div className="font-medium text-slate-900">{r.title || r.id}</div>
                  <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap overflow-x-auto">{previewBody(r.body)}</pre>
                  {r.severity_score != null ? (
                    <div className="text-xs mt-2 text-slate-500">Severity: {r.severity_score}</div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TdWorkspacePage;
