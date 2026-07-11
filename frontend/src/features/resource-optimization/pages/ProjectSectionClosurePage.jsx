import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { Loader2, Save } from 'lucide-react';

const CHECKLIST_KEYS = [
  'client_signoff',
  'financial_closure',
  'documents_completed',
  'resources_released',
  'lessons_learned',
];

const ProjectSectionClosurePage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [form, setForm] = useState({
    closure_date: '',
    closure_reason: '',
    client_signoff_status: '',
    financial_closure_status: '',
    document_closure_status: '',
    resource_release_status: '',
    success_rating: '',
    lessons_learned: '',
    closure_summary: '',
    checklist: {},
  });

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200, status: 'completed' });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    const res = await projectSectionApi.closureGet(pid);
    const d = res.data || {};
    setForm((p) => ({
      ...p,
      closure_date: d.closure_date || '',
      closure_reason: d.closure_reason || '',
      client_signoff_status: d.client_signoff_status || '',
      financial_closure_status: d.financial_closure_status || '',
      document_closure_status: d.document_closure_status || '',
      resource_release_status: d.resource_release_status || '',
      success_rating: d.success_rating ?? '',
      lessons_learned: d.lessons_learned || '',
      closure_summary: d.closure_summary || '',
      checklist: d.checklist || {},
    }));
  };

  useEffect(() => {
    if (embedProjectId) {
      setProjectId(embedProjectId);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        await loadProjects();
      } catch (e) {
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedProjectId]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      try {
        await load(projectId);
      } catch (e) {
        toast.error('Failed to load closure');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const toggle = (k) => setForm((p) => ({ ...p, checklist: { ...(p.checklist || {}), [k]: !p.checklist?.[k] } }));

  const save = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await projectSectionApi.closureUpsert(projectId, {
        ...form,
        success_rating: form.success_rating !== '' ? Number(form.success_rating) : null,
      });
      toast.success('Saved');
      await load(projectId);
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
      {!embedProjectId && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              Project Closure
            </h1>
            <p className="text-slate-600">Closure checklist and evaluation (MVP)</p>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="min-w-[320px]">
              <Label className="text-xs">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_code} — {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Closure
          </h2>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Closure checklist</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHECKLIST_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className={`p-3 rounded border text-left ${form.checklist?.[k] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="font-semibold text-slate-900">{k.replace(/_/g, ' ')}</div>
              <div className="text-sm text-slate-600">{form.checklist?.[k] ? 'Done' : 'Pending'}</div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Closure date</Label>
            <Input value={form.closure_date} onChange={(e) => setForm((p) => ({ ...p, closure_date: e.target.value }))} placeholder="YYYY-MM-DD" />
          </div>
          <div className="space-y-2">
            <Label>Success rating (1-5)</Label>
            <Input value={form.success_rating} onChange={(e) => setForm((p) => ({ ...p, success_rating: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Closure reason</Label>
            <Input value={form.closure_reason} onChange={(e) => setForm((p) => ({ ...p, closure_reason: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Closure summary</Label>
            <Textarea value={form.closure_summary} onChange={(e) => setForm((p) => ({ ...p, closure_summary: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Lessons learned</Label>
            <Textarea value={form.lessons_learned} onChange={(e) => setForm((p) => ({ ...p, lessons_learned: e.target.value }))} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectSectionClosurePage;

