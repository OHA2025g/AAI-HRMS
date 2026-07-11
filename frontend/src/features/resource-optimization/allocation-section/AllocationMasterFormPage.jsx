import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { allocationSectionApi, employeeApi, projectsApi } from '@/shared/lib/api';
import AllocationSectionBreadcrumbs from './AllocationSectionBreadcrumbs';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Loader2 } from 'lucide-react';

const AllocationMasterFormPage = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    project_id: '',
    employee_id: '',
    role: '',
    allocation_percentage: 50,
    start_date: '',
    end_date: '',
    billable: true,
    allocation_type: 'FULL_TIME',
    billing_category: '',
    status: 'PENDING',
    primary_project_flag: false,
    shadow_flag: false,
    backup_flag: false,
    reserve_flag: false,
    cost_rate: '',
    billing_rate: '',
    manager_id: '',
    remarks: '',
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pr, em] = await Promise.all([projectsApi.list(), employeeApi.list({})]);
        if (!alive) return;
        setProjects(Array.isArray(pr.data) ? pr.data : []);
        setEmployees(Array.isArray(em.data) ? em.data : []);
        if (mode === 'edit' && id) {
          const res = await allocationSectionApi.masterGet(id);
          if (!alive) return;
          const r = res.data || {};
          setForm((f) => ({
            ...f,
            project_id: r.project_id || '',
            employee_id: r.employee_id || '',
            role: r.role || '',
            allocation_percentage: r.allocation_percentage ?? 50,
            start_date: r.start_date || '',
            end_date: r.end_date || '',
            billable: !!r.billable,
            allocation_type: r.allocation_type || 'FULL_TIME',
            billing_category: r.billing_category || '',
            status: r.status || 'PENDING',
            primary_project_flag: !!r.primary_project_flag,
            shadow_flag: !!r.shadow_flag,
            backup_flag: !!r.backup_flag,
            reserve_flag: !!r.reserve_flag,
            cost_rate: r.cost_rate != null ? String(r.cost_rate) : '',
            billing_rate: r.billing_rate != null ? String(r.billing_rate) : '',
            manager_id: r.manager_id || '',
            remarks: r.remarks || '',
          }));
        }
      } catch {
        if (alive) toast.error('Failed to load form data');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, id]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const base = {
        allocation_percentage: Number(form.allocation_percentage),
        cost_rate: form.cost_rate === '' ? null : Number(form.cost_rate),
        billing_rate: form.billing_rate === '' ? null : Number(form.billing_rate),
      };
      if (mode === 'edit' && id) {
        await allocationSectionApi.masterUpdate(id, {
          role: form.role || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          billable: form.billable,
          allocation_type: form.allocation_type || null,
          billing_category: form.billing_category || null,
          status: form.status || null,
          primary_project_flag: form.primary_project_flag,
          shadow_flag: form.shadow_flag,
          backup_flag: form.backup_flag,
          reserve_flag: form.reserve_flag,
          manager_id: form.manager_id || null,
          remarks: form.remarks || null,
          ...base,
        });
        toast.success('Allocation updated');
        navigate(`/resource-project-optimization/allocation/master/${encodeURIComponent(id)}`);
      } else {
        const res = await allocationSectionApi.masterCreate({
          project_id: form.project_id,
          employee_id: form.employee_id,
          role: form.role || undefined,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
          billable: form.billable,
          allocation_type: form.allocation_type || undefined,
          billing_category: form.billing_category || undefined,
          status: form.status || undefined,
          primary_project_flag: form.primary_project_flag,
          shadow_flag: form.shadow_flag,
          backup_flag: form.backup_flag,
          reserve_flag: form.reserve_flag,
          manager_id: form.manager_id || undefined,
          remarks: form.remarks || undefined,
          ...base,
        });
        toast.success('Allocation created');
        const nid = res.data?.id;
        if (nid) navigate(`/resource-project-optimization/allocation/master/${encodeURIComponent(nid)}`);
        else navigate('/resource-project-optimization/allocation/master');
      }
    } catch (err) {
      const d = err?.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : d?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <AllocationSectionBreadcrumbs current={mode === 'edit' ? 'Edit allocation' : 'New allocation'} />
      <h1 className="text-2xl font-bold text-slate-900">{mode === 'edit' ? 'Edit allocation' : 'Create allocation'}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Project</Label>
                <select
                  className="mt-1 w-full border rounded-md h-10 px-3 text-sm bg-white"
                  required
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Employee</Label>
                <select
                  className="mt-1 w-full border rounded-md h-10 px-3 text-sm bg-white"
                  required
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                >
                  <option value="">Select resource</option>
                  {employees.map((em) => (
                    <option key={em.id} value={em.id}>
                      {em.full_name} ({em.employee_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Role</Label>
                <Input className="mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
              <div>
                <Label>Allocation %</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  className="mt-1"
                  value={form.allocation_percentage}
                  onChange={(e) => setForm({ ...form, allocation_percentage: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Start date</Label>
                <Input type="date" className="mt-1" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" className="mt-1" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Allocation type</Label>
                <Input className="mt-1" value={form.allocation_type} onChange={(e) => setForm({ ...form, allocation_type: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.billable}
                  onChange={(e) => setForm({ ...form, billable: e.target.checked })}
                  id="billable"
                />
                <Label htmlFor="billable">Billable</Label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Cost rate</Label>
                <Input className="mt-1" value={form.cost_rate} onChange={(e) => setForm({ ...form, cost_rate: e.target.value })} />
              </div>
              <div>
                <Label>Billing rate</Label>
                <Input className="mt-1" value={form.billing_rate} onChange={(e) => setForm({ ...form, billing_rate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Remarks</Label>
              <Input className="mt-1" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/resource-project-optimization/allocation/master">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllocationMasterFormPage;
