import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { trainingDevelopmentApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2 } from 'lucide-react';

const emptyForm = {
  training_code: '',
  training_name: '',
  training_category: 'GENERAL',
  training_type: 'COURSE',
  level: 'ALL',
  delivery_mode: 'VIRTUAL',
  duration_hours: '8',
  credits: '0',
  description: '',
  objectives: '',
  learning_outcomes: '',
  target_audience: '',
  linked_skills: '',
  linked_roles: '',
  compliance_flag: false,
  certification_flag: false,
  mandatory_flag: false,
  active_flag: true,
  status: 'DRAFT',
};

const TdTrainingMasterFormPage = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const title = useMemo(() => (isEdit ? 'Edit training program' : 'New training program'), [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await trainingDevelopmentApi.getProgram(id);
        const p = res.data || {};
        if (cancelled) return;
        setForm({
          training_code: p.training_code || '',
          training_name: p.training_name || '',
          training_category: p.training_category || 'GENERAL',
          training_type: p.training_type || 'COURSE',
          level: p.level || 'ALL',
          delivery_mode: p.delivery_mode || 'VIRTUAL',
          duration_hours: String(p.duration_hours ?? '0'),
          credits: String(p.credits ?? '0'),
          description: p.description || '',
          objectives: p.objectives || '',
          learning_outcomes: p.learning_outcomes || '',
          target_audience: p.target_audience || '',
          linked_skills: (p.linked_skills || []).join(', '),
          linked_roles: (p.linked_roles || []).join(', '),
          compliance_flag: !!p.compliance_flag,
          certification_flag: !!p.certification_flag,
          mandatory_flag: !!p.mandatory_flag,
          active_flag: p.active_flag !== false,
          status: p.status || 'DRAFT',
        });
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load program');
        navigate('/training-development/training-master');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, id, navigate]);

  const parseList = (s) =>
    String(s || '')
      .split(/[,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        training_code: form.training_code.trim(),
        training_name: form.training_name.trim(),
        training_category: form.training_category,
        training_type: form.training_type,
        level: form.level,
        delivery_mode: form.delivery_mode,
        duration_hours: parseFloat(form.duration_hours) || 0,
        credits: parseFloat(form.credits) || 0,
        description: form.description || null,
        objectives: form.objectives || null,
        learning_outcomes: form.learning_outcomes || null,
        target_audience: form.target_audience || null,
        linked_skills: parseList(form.linked_skills),
        linked_roles: parseList(form.linked_roles),
        compliance_flag: !!form.compliance_flag,
        certification_flag: !!form.certification_flag,
        mandatory_flag: !!form.mandatory_flag,
        active_flag: !!form.active_flag,
        status: form.status,
      };
      if (isEdit) {
        const { training_code: _c, ...patch } = payload;
        await trainingDevelopmentApi.updateProgram(id, patch);
        toast.success('Program updated');
        navigate(`/training-development/training-master/${encodeURIComponent(id)}`);
      } else {
        const res = await trainingDevelopmentApi.createProgram(payload);
        const newId = res.data?.id;
        toast.success('Program created');
        if (newId) navigate(`/training-development/training-master/${encodeURIComponent(newId)}`);
        else navigate('/training-development/training-master');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Save failed');
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
          {title}
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/training-development/training-master">Back to list</Link>
        </Button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Core</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Training code {!isEdit ? '*' : '(read-only)'}</Label>
              <Input
                required={!isEdit}
                disabled={isEdit}
                value={form.training_code}
                onChange={(e) => setForm((f) => ({ ...f, training_code: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Training name *</Label>
              <Input
                required
                value={form.training_name}
                onChange={(e) => setForm((f) => ({ ...f, training_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.training_category} onValueChange={(v) => setForm((f) => ({ ...f, training_category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">GENERAL</SelectItem>
                  <SelectItem value="TECHNICAL">TECHNICAL</SelectItem>
                  <SelectItem value="COMPLIANCE">COMPLIANCE</SelectItem>
                  <SelectItem value="LEADERSHIP">LEADERSHIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input value={form.training_type} onChange={(e) => setForm((f) => ({ ...f, training_type: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Input value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Delivery mode</Label>
              <Select value={form.delivery_mode} onValueChange={(v) => setForm((f) => ({ ...f, delivery_mode: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIRTUAL">VIRTUAL</SelectItem>
                  <SelectItem value="CLASSROOM">CLASSROOM</SelectItem>
                  <SelectItem value="HYBRID">HYBRID</SelectItem>
                  <SelectItem value="SELF_PACED">SELF_PACED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.duration_hours}
                onChange={(e) => setForm((f) => ({ ...f, duration_hours: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Credits</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.credits}
                onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="RETIRED">RETIRED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Content & audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Objectives</Label>
              <Textarea rows={3} value={form.objectives} onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Learning outcomes</Label>
              <Textarea
                rows={3}
                value={form.learning_outcomes}
                onChange={(e) => setForm((f) => ({ ...f, learning_outcomes: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Target audience</Label>
              <Textarea rows={2} value={form.target_audience} onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Linked skills (comma-separated)</Label>
              <Input value={form.linked_skills} onChange={(e) => setForm((f) => ({ ...f, linked_skills: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Linked roles (comma-separated)</Label>
              <Input value={form.linked_roles} onChange={(e) => setForm((f) => ({ ...f, linked_roles: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Flags</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.compliance_flag}
                onChange={(e) => setForm((f) => ({ ...f, compliance_flag: e.target.checked }))}
              />
              Compliance
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.certification_flag}
                onChange={(e) => setForm((f) => ({ ...f, certification_flag: e.target.checked }))}
              />
              Certification
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.mandatory_flag}
                onChange={(e) => setForm((f) => ({ ...f, mandatory_flag: e.target.checked }))}
              />
              Mandatory
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.active_flag}
                onChange={(e) => setForm((f) => ({ ...f, active_flag: e.target.checked }))}
              />
              Active
            </label>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/training-development/training-master">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TdTrainingMasterFormPage;
