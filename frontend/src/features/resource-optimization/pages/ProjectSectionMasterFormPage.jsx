import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { projectSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Loader2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/ui/breadcrumb';

const ProjectSectionMasterFormPage = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    project_name: '',
    project_code: '',
    client_name: '',
    project_type: 'external',
    business_unit: '',
    department: '',
    cost_center: '',
    project_priority: 'medium',
    project_health: 'green',
    project_status: 'draft',
    start_date: '',
    end_date: '',
    billing_type: '',
    currency: 'INR',
    project_budget: '',
    expected_revenue: '',
    location: '',
    geography: '',
    work_mode: '',
    description: '',
    objectives: '',
    tags: '',
    remarks: '',
  });

  const title = useMemo(() => (isEdit ? 'Edit Project' : 'New Project'), [isEdit]);

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return;
      setLoading(true);
      try {
        const res = await projectSectionApi.getProject(id);
        const p = res.data || {};
        setForm((prev) => ({
          ...prev,
          project_name: p.project_name || '',
          project_code: p.project_code || '',
          client_name: p.client_name || '',
          project_type: p.project_type || 'external',
          business_unit: p.business_unit || '',
          department: p.department || '',
          cost_center: p.cost_center || '',
          project_priority: p.project_priority || 'medium',
          project_health: p.project_health || 'green',
          project_status: p.project_status || 'draft',
          start_date: p.start_date || '',
          end_date: p.end_date || '',
          billing_type: p.billing_type || '',
          currency: p.currency || 'INR',
          project_budget: p.project_budget ?? '',
          expected_revenue: p.expected_revenue ?? '',
          location: p.location || '',
          geography: p.geography || '',
          work_mode: p.work_mode || '',
          description: p.description || '',
          objectives: p.objectives || '',
          tags: (p.tags || []).join(', '),
          remarks: p.remarks || '',
        }));
      } catch (e) {
        toast.error('Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const save = async () => {
    if (!form.project_name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        project_name: form.project_name.trim(),
        project_code: form.project_code.trim() || undefined,
        client_name: form.client_name.trim() || undefined,
        business_unit: form.business_unit.trim() || undefined,
        department: form.department.trim() || undefined,
        cost_center: form.cost_center.trim() || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        billing_type: form.billing_type.trim() || undefined,
        currency: form.currency || 'INR',
        project_budget: form.project_budget !== '' ? Number(form.project_budget) : undefined,
        expected_revenue: form.expected_revenue !== '' ? Number(form.expected_revenue) : undefined,
        location: form.location.trim() || undefined,
        geography: form.geography.trim() || undefined,
        work_mode: form.work_mode.trim() || undefined,
        description: form.description.trim() || undefined,
        objectives: form.objectives.trim() || undefined,
        tags: (form.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
        remarks: form.remarks.trim() || undefined,
      };
      if (isEdit) {
        await projectSectionApi.updateProject(id, payload);
        toast.success('Project updated');
        navigate(`/resource-project-optimization/projects/master/${encodeURIComponent(id)}`);
      } else {
        const res = await projectSectionApi.createProject(payload);
        toast.success('Project created');
        const newId = res.data?.id;
        navigate(`/resource-project-optimization/projects/master/${encodeURIComponent(newId)}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/resource-project-optimization/projects/dashboard">Project Section</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/resource-project-optimization/projects/master">Project Master</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {title}
          </h1>
          <p className="text-slate-600">Project master details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/resource-project-optimization/projects/master">Back</Link>
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Core</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Project name *</Label>
            <Input value={form.project_name} onChange={(e) => setForm((p) => ({ ...p, project_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Project code</Label>
            <Input value={form.project_code} onChange={(e) => setForm((p) => ({ ...p, project_code: e.target.value }))} placeholder="Auto if empty" />
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <Input value={form.client_name} onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Business unit</Label>
            <Input value={form.business_unit} onChange={(e) => setForm((p) => ({ ...p, business_unit: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Cost center</Label>
            <Input value={form.cost_center} onChange={(e) => setForm((p) => ({ ...p, cost_center: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.project_type} onValueChange={(v) => setForm((p) => ({ ...p, project_type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">internal</SelectItem>
                <SelectItem value="external">external</SelectItem>
                <SelectItem value="r&d">r&amp;d</SelectItem>
                <SelectItem value="support">support</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.project_status} onValueChange={(v) => setForm((p) => ({ ...p, project_status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="proposed">proposed</SelectItem>
                <SelectItem value="under_review">under_review</SelectItem>
                <SelectItem value="approved">approved</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="on_hold">on_hold</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
                <SelectItem value="closed">closed</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={form.project_priority} onValueChange={(v) => setForm((p) => ({ ...p, project_priority: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="medium">medium</SelectItem>
                <SelectItem value="high">high</SelectItem>
                <SelectItem value="critical">critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Health</Label>
            <Select value={form.project_health} onValueChange={(v) => setForm((p) => ({ ...p, project_health: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="green">green</SelectItem>
                <SelectItem value="amber">amber</SelectItem>
                <SelectItem value="red">red</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} placeholder="YYYY-MM-DD" />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} placeholder="YYYY-MM-DD" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Finance</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Budget</Label>
            <Input value={form.project_budget} onChange={(e) => setForm((p) => ({ ...p, project_budget: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Expected revenue</Label>
            <Input value={form.expected_revenue} onChange={(e) => setForm((p) => ({ ...p, expected_revenue: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Billing type</Label>
            <Input value={form.billing_type} onChange={(e) => setForm((p) => ({ ...p, billing_type: e.target.value }))} placeholder="FIXED / TIME_MATERIAL / etc." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Objectives</Label>
            <Textarea value={form.objectives} onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Tags (comma separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Remarks</Label>
            <Textarea value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectSectionMasterFormPage;

