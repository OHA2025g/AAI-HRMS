import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { employeeApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2 } from 'lucide-react';

const empty = {
  employee_code: '',
  full_name: '',
  email: '',
  department: '',
  role_title: '',
  location: '',
  status: 'ACTIVE',
  skills: '',
  join_date: '',
};

export default function ElmEmployeeMasterFormPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!isEdit) return;
    const run = async () => {
      setLoading(true);
      try {
        const res = await employeeApi.get(id);
        const r = res.data || {};
        setForm({
          employee_code: r.employee_code || '',
          full_name: r.full_name || '',
          email: r.email || r.official_email || '',
          department: r.department || '',
          role_title: r.role_title || '',
          location: r.location || '',
          status: r.status || 'ACTIVE',
          skills: Array.isArray(r.skills) ? r.skills.join(', ') : (r.skills || ''),
          join_date: r.join_date || r.joining_date || '',
        });
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load employee');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id, isEdit]);

  const title = useMemo(() => (isEdit ? 'Edit employee' : 'New employee'), [isEdit]);

  const onSave = async () => {
    if (!form.employee_code.trim()) return toast.error('Employee code is required');
    if (!form.full_name.trim()) return toast.error('Full name is required');
    if (!form.email.trim()) return toast.error('Email is required');
    setSaving(true);
    try {
      const payload = {
        employee_code: form.employee_code.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        role_title: form.role_title.trim(),
        location: form.location.trim(),
        status: form.status,
        skills: (form.skills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        join_date: form.join_date || undefined,
      };
      if (isEdit) {
        await employeeApi.update(id, payload);
        toast.success('Employee updated');
        nav(`/employee-lifecycle-management/employee-master/${encodeURIComponent(id)}`);
      } else {
        const res = await employeeApi.create(payload);
        toast.success('Employee created');
        const newId = res?.data?.id;
        nav(newId ? `/employee-lifecycle-management/employee-master/${encodeURIComponent(newId)}` : '/employee-lifecycle-management/employee-master');
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground">Employee master record for lifecycle orchestration</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav(-1)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Core fields (you can enrich via other lifecycle modules)</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : null}

          <div className="space-y-1">
            <Label>Employee code</Label>
            <Input value={form.employee_code} onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Role title</Label>
            <Input value={form.role_title} onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="ONBOARDING">ONBOARDING</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                <SelectItem value="EXITED">EXITED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Join date</Label>
            <Input type="date" value={form.join_date} onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Skills (comma-separated)</Label>
            <Input value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

