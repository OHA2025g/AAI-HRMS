import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { highSkillRetentionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2 } from 'lucide-react';

const emptyForm = {
  employee_id: '',
  talent_code: '',
  business_unit: '',
  department: '',
  manager_id: '',
  primary_skill: '',
  secondary_skills: '',
  skill_depth_score: '7.5',
  certifications_summary: '',
  role_criticality: 'MEDIUM',
  project_criticality: 'MEDIUM',
  client_criticality: 'MEDIUM',
  retention_sensitivity_index: '0.5',
  current_risk_level: 'LOW',
  successor_available_flag: false,
  mobility_preference: 'HYBRID',
  work_preference: 'STABLE',
  notes: '',
};

const HsrTalentMasterFormPage = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const title = useMemo(() => (isEdit ? 'Edit talent profile' : 'New talent profile'), [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await highSkillRetentionApi.getProfile(id);
        const p = res.data || {};
        if (cancelled) return;
        setForm({
          employee_id: p.employee_id || '',
          talent_code: p.talent_code || '',
          business_unit: p.business_unit || '',
          department: p.department || '',
          manager_id: p.manager_id || '',
          primary_skill: p.primary_skill || '',
          secondary_skills: (p.secondary_skills || []).join(', '),
          skill_depth_score: String(p.skill_depth_score ?? '0'),
          certifications_summary: p.certifications_summary || '',
          role_criticality: p.role_criticality || 'MEDIUM',
          project_criticality: p.project_criticality || 'MEDIUM',
          client_criticality: p.client_criticality || 'MEDIUM',
          retention_sensitivity_index: String(p.retention_sensitivity_index ?? '0.5'),
          current_risk_level: p.current_risk_level || 'LOW',
          successor_available_flag: !!p.successor_available_flag,
          mobility_preference: p.mobility_preference || 'HYBRID',
          work_preference: p.work_preference || 'STABLE',
          notes: p.notes || '',
        });
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to load profile');
        navigate('/high-skill-talent-retention/talent-master');
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
        employee_id: form.employee_id.trim(),
        talent_code: form.talent_code.trim(),
        business_unit: form.business_unit.trim() || null,
        department: form.department.trim() || null,
        manager_id: form.manager_id.trim() || null,
        primary_skill: form.primary_skill.trim(),
        secondary_skills: parseList(form.secondary_skills),
        skill_depth_score: parseFloat(form.skill_depth_score) || 0,
        certifications_summary: form.certifications_summary || null,
        role_criticality: form.role_criticality,
        project_criticality: form.project_criticality,
        client_criticality: form.client_criticality,
        retention_sensitivity_index: parseFloat(form.retention_sensitivity_index) || 0,
        current_risk_level: form.current_risk_level,
        successor_available_flag: !!form.successor_available_flag,
        mobility_preference: form.mobility_preference || null,
        work_preference: form.work_preference || null,
        notes: form.notes || null,
      };

      if (isEdit) {
        const { employee_id: _e, talent_code: _t, ...patch } = payload;
        await highSkillRetentionApi.updateProfile(id, patch);
        toast.success('Profile updated');
        navigate(`/high-skill-talent-retention/talent-master/${encodeURIComponent(id)}`);
      } else {
        const res = await highSkillRetentionApi.createProfile(payload);
        const newId = res.data?.id;
        toast.success('Profile created');
        if (newId) navigate(`/high-skill-talent-retention/talent-master/${encodeURIComponent(newId)}`);
        else navigate('/high-skill-talent-retention/talent-master');
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
          <Link to="/high-skill-talent-retention/talent-master">Back to list</Link>
        </Button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Identity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee ID *</Label>
              <Input required disabled={isEdit} value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Talent code *</Label>
              <Input required disabled={isEdit} value={form.talent_code} onChange={(e) => setForm((f) => ({ ...f, talent_code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Business unit</Label>
              <Input value={form.business_unit} onChange={(e) => setForm((f) => ({ ...f, business_unit: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Manager ID</Label>
              <Input value={form.manager_id} onChange={(e) => setForm((f) => ({ ...f, manager_id: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Skills & criticality</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Primary skill *</Label>
              <Input required value={form.primary_skill} onChange={(e) => setForm((f) => ({ ...f, primary_skill: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Secondary skills (comma-separated)</Label>
              <Input value={form.secondary_skills} onChange={(e) => setForm((f) => ({ ...f, secondary_skills: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Skill depth score (0–10)</Label>
              <Input type="number" min="0" max="10" step="0.1" value={form.skill_depth_score} onChange={(e) => setForm((f) => ({ ...f, skill_depth_score: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Certifications summary</Label>
              <Input value={form.certifications_summary} onChange={(e) => setForm((f) => ({ ...f, certifications_summary: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Role criticality</Label>
              <Select value={form.role_criticality} onValueChange={(v) => setForm((f) => ({ ...f, role_criticality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project criticality</Label>
              <Select value={form.project_criticality} onValueChange={(v) => setForm((f) => ({ ...f, project_criticality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client criticality</Label>
              <Select value={form.client_criticality} onValueChange={(v) => setForm((f) => ({ ...f, client_criticality: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Risk & preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Retention sensitivity (0–1)</Label>
              <Input type="number" min="0" max="1" step="0.01" value={form.retention_sensitivity_index} onChange={(e) => setForm((f) => ({ ...f, retention_sensitivity_index: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Current risk level</Label>
              <Select value={form.current_risk_level} onValueChange={(v) => setForm((f) => ({ ...f, current_risk_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mobility preference</Label>
              <Input value={form.mobility_preference} onChange={(e) => setForm((f) => ({ ...f, mobility_preference: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Work preference</Label>
              <Input value={form.work_preference} onChange={(e) => setForm((f) => ({ ...f, work_preference: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.successor_available_flag} onChange={(e) => setForm((f) => ({ ...f, successor_available_flag: e.target.checked }))} />
              Successor available
            </label>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/high-skill-talent-retention/talent-master">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HsrTalentMasterFormPage;

