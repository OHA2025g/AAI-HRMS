import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { resourceSectionApi } from '@/shared/lib/api';
import ResourceSectionBreadcrumbs from './ResourceSectionBreadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Loader2 } from 'lucide-react';

const emptyForm = {
  employment_type: '',
  resource_category: '',
  sub_department: '',
  designation: '',
  grade: '',
  band: '',
  dotted_manager_id: '',
  geography: '',
  work_mode: '',
  cost_center: '',
  profile_summary: '',
  billable_classification: '',
  current_primary_skill: '',
  current_secondary_skills: '',
};

const ResourceMasterFormPage = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let alive = true;
    (async () => {
      try {
        const res = await resourceSectionApi.masterGet(id);
        const p = res.data?.profile || {};
        const skills = (p.current_secondary_skills || []).join(', ');
        if (alive) {
          setForm({
            employment_type: p.employment_type || '',
            resource_category: p.resource_category || '',
            sub_department: p.sub_department || '',
            designation: p.designation || '',
            grade: p.grade || '',
            band: p.band || '',
            dotted_manager_id: p.dotted_manager_id || '',
            geography: p.geography || '',
            work_mode: p.work_mode || '',
            cost_center: p.cost_center || '',
            profile_summary: p.profile_summary || '',
            billable_classification: p.billable_classification || '',
            current_primary_skill: p.current_primary_skill || '',
            current_secondary_skills: skills,
          });
        }
      } catch {
        if (alive) toast.error('Failed to load resource');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, id]);

  if (mode === 'new') {
    return (
      <div className="space-y-6 max-w-2xl">
        <ResourceSectionBreadcrumbs current="Add resource" />
        <h1 className="text-2xl font-bold text-slate-900">Add resource</h1>
        <Card>
          <CardHeader>
            <CardTitle>Employee master</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700 text-sm">
            <p>
              Core hire/employee records are created in <strong>Employees</strong>. After an employee exists, return here
              to enrich deployability overlays (billability, work mode, skills inventory, bench context).
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/employees">Go to Employees</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/resource-project-optimization/resource/master">Back to Resource Master</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSave = async () => {
    setSaving(true);
    try {
      const secondary = form.current_secondary_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        employment_type: form.employment_type || undefined,
        resource_category: form.resource_category || undefined,
        sub_department: form.sub_department || undefined,
        designation: form.designation || undefined,
        grade: form.grade || undefined,
        band: form.band || undefined,
        dotted_manager_id: form.dotted_manager_id || undefined,
        geography: form.geography || undefined,
        work_mode: form.work_mode || undefined,
        cost_center: form.cost_center || undefined,
        profile_summary: form.profile_summary || undefined,
        billable_classification: form.billable_classification || undefined,
        current_primary_skill: form.current_primary_skill || undefined,
        current_secondary_skills: secondary.length ? secondary : undefined,
      };
      await resourceSectionApi.patchProfile(id, payload);
      toast.success('Resource profile updated');
      navigate(`/resource-project-optimization/resource/master/${encodeURIComponent(id)}`);
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <ResourceSectionBreadcrumbs
        trail={[
          { label: 'Resource Master', path: '/resource-project-optimization/resource/master' },
          { label: 'Resource', path: `/resource-project-optimization/resource/master/${encodeURIComponent(id)}` },
        ]}
        current="Edit overlay"
      />
      <h1 className="text-2xl font-bold text-slate-900">Edit resource overlay</h1>
      <p className="text-slate-600 text-sm">Updates workforce intelligence fields stored on the resource profile overlay.</p>

      <Card>
        <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Employment type</Label>
            <Input className="mt-1" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} />
          </div>
          <div>
            <Label>Resource category</Label>
            <Input className="mt-1" value={form.resource_category} onChange={(e) => setForm({ ...form, resource_category: e.target.value })} />
          </div>
          <div>
            <Label>Sub department</Label>
            <Input className="mt-1" value={form.sub_department} onChange={(e) => setForm({ ...form, sub_department: e.target.value })} />
          </div>
          <div>
            <Label>Designation (overlay)</Label>
            <Input className="mt-1" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </div>
          <div>
            <Label>Grade</Label>
            <Input className="mt-1" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </div>
          <div>
            <Label>Band</Label>
            <Input className="mt-1" value={form.band} onChange={(e) => setForm({ ...form, band: e.target.value })} />
          </div>
          <div>
            <Label>Dotted manager id</Label>
            <Input className="mt-1" value={form.dotted_manager_id} onChange={(e) => setForm({ ...form, dotted_manager_id: e.target.value })} />
          </div>
          <div>
            <Label>Geography</Label>
            <Input className="mt-1" value={form.geography} onChange={(e) => setForm({ ...form, geography: e.target.value })} />
          </div>
          <div>
            <Label>Work mode</Label>
            <Input className="mt-1" value={form.work_mode} onChange={(e) => setForm({ ...form, work_mode: e.target.value })} placeholder="REMOTE / HYBRID / ONSITE" />
          </div>
          <div>
            <Label>Cost center</Label>
            <Input className="mt-1" value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} />
          </div>
          <div>
            <Label>Billable classification</Label>
            <Input
              className="mt-1"
              value={form.billable_classification}
              onChange={(e) => setForm({ ...form, billable_classification: e.target.value })}
              placeholder="BILLABLE / NON_BILLABLE / MIXED"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Primary skill (display)</Label>
            <Input className="mt-1" value={form.current_primary_skill} onChange={(e) => setForm({ ...form, current_primary_skill: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Secondary skills (comma-separated)</Label>
            <Input className="mt-1" value={form.current_secondary_skills} onChange={(e) => setForm({ ...form, current_secondary_skills: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Profile summary</Label>
            <Input className="mt-1" value={form.profile_summary} onChange={(e) => setForm({ ...form, profile_summary: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/resource-project-optimization/resource/master/${encodeURIComponent(id)}`}>Cancel</Link>
        </Button>
      </div>
    </div>
  );
};

export default ResourceMasterFormPage;
