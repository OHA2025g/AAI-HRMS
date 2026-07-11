import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { employeeLifecycleApi, automationApi, adminApi } from '@/shared/lib/api';
import { useAuth } from '@/shared/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';

const EVENT_TYPES = [
  { value: 'ONBOARDED', label: 'ONBOARDED' },
  { value: 'ACTIVATED', label: 'ACTIVATED' },
  { value: 'ROLE_CHANGED', label: 'ROLE_CHANGED' },
  { value: 'DOCUMENT_ADDED', label: 'DOCUMENT_ADDED' },
  { value: 'EXITED', label: 'EXITED' },
];

const safeParseDetails = (text) => {
  const t = (text || '').trim();
  if (!t) return {};
  try {
    return JSON.parse(t);
  } catch (e) {
    return { notes: t };
  }
};

const EmployeeLifecyclePage = () => {
  const { user } = useAuth();
  const canWrite = useMemo(() => user?.role === 'admin' || user?.role === 'hr_admin', [user]);
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  const canApproveEvent = (ev) => {
    const r = user?.role;
    if (!r) return false;
    if (r === 'admin' || r === 'hr_admin') return true;
    if (r === 'recruiter' && ev.event_type === 'ROLE_CHANGED') return true;
    return false;
  };
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [automationStatus, setAutomationStatus] = useState(null);

  const [q, setQ] = useState('');
  const [eventType, setEventType] = useState('all');

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const defaultForm = useMemo(
    () => ({
      employee_code: '',
      event_type: 'ONBOARDED',
      effective_date: '',
      details_text: '',
    }),
    []
  );

  const [form, setForm] = useState(defaultForm);
  const [editingEvent, setEditingEvent] = useState(null);

  const fetchDashboard = async () => {
    const res = await employeeLifecycleApi.getDashboard();
    setDashboard(res.data || null);
  };

  const fetchAutomationStatus = async () => {
    try {
      const res = await automationApi.getStatus();
      setAutomationStatus(res.data || null);
    } catch (e) {
      // Non-blocking: page can still function without automation status.
      setAutomationStatus(null);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await employeeLifecycleApi.listEvents({
        q: q || undefined,
        event_type: eventType === 'all' ? undefined : eventType,
        page,
        page_size: pageSize,
        sort_by: 'created_at',
        sort_dir: 'desc',
      });
      const payload = res.data || {};
      setEvents(payload.items || []);
      setTotalItems(payload.total || 0);
      setTotalPages(payload.total_pages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load lifecycle events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard().catch(() => {});
    fetchAutomationStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, eventType]);

  const resetForm = () => setForm(defaultForm);

  const onCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const details = safeParseDetails(form.details_text);
      await employeeLifecycleApi.createEvent({
        employee_code: form.employee_code.trim(),
        event_type: form.event_type,
        effective_date: form.effective_date ? form.effective_date.trim() : null,
        details,
      });
      toast.success('Lifecycle event created');
      setCreateOpen(false);
      resetForm();
      await fetchDashboard().catch(() => {});
      await fetchEvents();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create lifecycle event');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setForm({
      employee_code: ev.employee_code || '',
      event_type: ev.event_type || 'ONBOARDED',
      effective_date: ev.effective_date || '',
      details_text: ev.details ? JSON.stringify(ev.details, null, 2) : '',
    });
    setEditOpen(true);
  };

  const onUpdate = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;
    setSaving(true);
    try {
      const detailsTextTrim = (form.details_text || '').trim();
      const payload = {
        event_type: form.event_type,
        effective_date: form.effective_date ? form.effective_date.trim() : null,
        ...(detailsTextTrim ? { details: safeParseDetails(form.details_text) } : {}),
      };
      await employeeLifecycleApi.updateEvent(editingEvent.id, payload);
      toast.success('Lifecycle event updated');
      setEditOpen(false);
      setEditingEvent(null);
      resetForm();
      await fetchDashboard().catch(() => {});
      await fetchEvents();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update lifecycle event');
    } finally {
      setSaving(false);
    }
  };

  const onApprove = async (eventId) => {
    try {
      setSaving(true);
      await employeeLifecycleApi.approveEvent(eventId);
      toast.success('Lifecycle event approved and queued for processing');
      await fetchDashboard().catch(() => {});
      await fetchEvents();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const onReject = async (eventId) => {
    const reason = window.prompt('Rejection reason (optional)') || 'Rejected';
    try {
      setSaving(true);
      await employeeLifecycleApi.rejectEvent(eventId, { reason });
      toast.success('Lifecycle event rejected');
      await fetchDashboard().catch(() => {});
      await fetchEvents();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (eventId) => {
    if (!window.confirm('Delete this lifecycle event?')) return;
    try {
      setSaving(true);
      await employeeLifecycleApi.deleteEvent(eventId);
      toast.success('Lifecycle event deleted');
      await fetchDashboard().catch(() => {});
      await fetchEvents();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete lifecycle event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:flex-nowrap gap-3">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Employee Lifecycle
          </h1>
          <p className="text-slate-600">{totalItems} events</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <Input placeholder="Search by employee code or type" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-full sm:w-[220px] shrink-0">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0 flex lg:justify-end">
          <Button className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {dashboard ? (
        <Card>
          <CardHeader>
            <CardTitle>Lifecycle Dashboard</CardTitle>
            <CardDescription>Summary of onboarding, activations, role changes, documents, and exits.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge variant="outline">Onboarded: {dashboard.onboarded_total}</Badge>
            <Badge variant="outline">Activated: {dashboard.activated_total}</Badge>
            <Badge variant="outline">Role Changes: {dashboard.role_changed_total}</Badge>
            <Badge variant="outline">Documents Added: {dashboard.document_added_total}</Badge>
            <Badge variant="outline">Exited: {dashboard.exited_total}</Badge>
            <Badge variant="secondary">Last 30 days: {dashboard.last_30_days_events}</Badge>

            {automationStatus ? (
              <>
                <Badge variant="outline">Processing: Pending {automationStatus.lifecycle_events_pending}</Badge>
                <Badge variant="outline">Processing: Failed {automationStatus.lifecycle_events_failed}</Badge>
              </>
            ) : null}

            {canWrite ? (
              <Button
                variant="outline"
                className="ml-auto"
                onClick={async () => {
                  setReprocessing(true);
                  try {
                    await automationApi.reprocessLifecycle({ limit: 50 });
                    toast.success('Reprocessing enqueued');
                    await fetchAutomationStatus();
                    await fetchDashboard();
                    await fetchEvents();
                  } catch (e) {
                    toast.error(e?.response?.data?.detail || 'Failed to reprocess lifecycle events');
                  } finally {
                    setReprocessing(false);
                  }
                }}
                disabled={reprocessing}
              >
                {reprocessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Reprocess FAILED/PENDING
              </Button>
            ) : null}

            {isAdmin ? (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const res = await adminApi.escalateLifecycleApprovals();
                    toast.success(`Escalated ${res.data?.escalated ?? 0} approval(s)`);
                    await fetchEvents();
                  } catch (e) {
                    toast.error(e?.response?.data?.detail || 'Escalation failed');
                  }
                }}
              >
                Escalate stale approvals
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : events.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-slate-500">No lifecycle events yet</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Processing</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>{ev.employee_code}</TableCell>
                    <TableCell><Badge variant="secondary">{ev.event_type}</Badge></TableCell>
                    <TableCell>{ev.effective_date || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={ev.processing_status === 'FAILED' || ev.processing_status === 'REJECTED' ? 'destructive' : 'secondary'}
                        className={
                          ev.processing_status === 'FAILED'
                            ? 'bg-red-100 text-red-700'
                            : ev.processing_status === 'REJECTED'
                              ? 'bg-amber-100 text-amber-800'
                              : ev.processing_status === 'PROCESSED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                        }
                      >
                        {ev.processing_status || 'PENDING'}
                      </Badge>
                      {ev.processing_status === 'FAILED' && ev.processing_error ? (
                        <div className="text-xs text-red-600 mt-1 truncate max-w-[260px]">
                          {ev.processing_error}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {ev.requires_approval ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs">
                            {ev.approval_status || 'PENDING'}
                          </Badge>
                          {ev.escalated_at ? (
                            <span className="text-xs text-amber-700">Escalated</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>{ev.created_at}</TableCell>
                    <TableCell className="max-w-[360px] truncate">
                      <span className="text-xs text-slate-600">
                        {ev.details?.notes
                          ? ev.details.notes
                          : ev.details
                            ? JSON.stringify(ev.details).slice(0, 120)
                            : '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2 flex-wrap">
                      {ev.requires_approval && ev.approval_status === 'PENDING' && canApproveEvent(ev) ? (
                        <>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(ev.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onReject(ev.id)}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => openEdit(ev)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(ev.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 ? (
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Lifecycle Event</DialogTitle>
            <CardDescription className="pt-1">
              EXITED and ROLE_CHANGED require approval before the employee record is updated. Recruiters may approve ROLE_CHANGED; only admin/hr_admin may approve exits.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Employee Code</Label>
                <Input required value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Effective Date (optional)</Label>
                <Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
              </div>
              <div />
            </div>

            <div className="space-y-2">
              <Label>Details (optional JSON or text)</Label>
              <Textarea
                rows={5}
                placeholder='{"notes":"Manager updated"} or just type a note'
                value={form.details_text}
                onChange={(e) => setForm({ ...form, details_text: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lifecycle Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={onUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Employee Code</Label>
                <Input disabled value={form.employee_code} />
              </div>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Effective Date (optional)</Label>
                <Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
              </div>
              <div />
            </div>

            <div className="space-y-2">
              <Label>Details (optional JSON or text)</Label>
              <Textarea
                rows={5}
                placeholder='{"notes":"Manager updated"}'
                value={form.details_text}
                onChange={(e) => setForm({ ...form, details_text: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditingEvent(null); resetForm(); }} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeLifecyclePage;

