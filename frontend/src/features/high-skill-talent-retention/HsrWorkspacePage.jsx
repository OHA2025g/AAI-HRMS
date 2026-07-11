import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { highSkillRetentionApi } from '@/shared/lib/api';
import { getHsrRouteConfig } from './routeTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Loader2, Plus, RefreshCw } from 'lucide-react';

const preview = (obj) => {
  try {
    const s = JSON.stringify(obj ?? {});
    return s.length > 160 ? `${s.slice(0, 160)}…` : s;
  } catch {
    return '';
  }
};

const HsrWorkspacePage = () => {
  const { pathname } = useLocation();
  const cfg = useMemo(() => getHsrRouteConfig(pathname), [pathname]);
  const { user } = useAuth();
  const canWrite = ['admin', 'hr_admin'].includes(String(user?.role || ''));

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [simpleForm, setSimpleForm] = useState({ employee_id: '', payloadJson: '{}' });
  const [nlQuery, setNlQuery] = useState('');
  const [nlResults, setNlResults] = useState(null);

  const load = useCallback(async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      if (cfg.kind === 'segments') {
        const res = await highSkillRetentionApi.listSegments({ limit: 500 });
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'sentiment') {
        const res = await highSkillRetentionApi.sentimentEngagement({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: res.data?.total ?? (res.data?.items || []).length });
      } else if (cfg.kind === 'stays') {
        const res = await highSkillRetentionApi.listStayInterviews({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'risk') {
        const res = await highSkillRetentionApi.listRiskAssessments({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'pred') {
        const res = await highSkillRetentionApi.listAttritionPredictions({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'cases') {
        const res = await highSkillRetentionApi.listCases({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'actions') {
        const res = await highSkillRetentionApi.listEngagementActions({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'ai-recs') {
        const res = await highSkillRetentionApi.aiRecommendations();
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'ai-risk') {
        const res = await highSkillRetentionApi.aiFlightRisk();
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'forecast') {
        const res = await highSkillRetentionApi.forecastingSummary();
        setRows(res.data?.items || []);
        setMeta({ total: (res.data?.items || []).length });
      } else if (cfg.kind === 'analytics') {
        const res = await highSkillRetentionApi.analytics();
        setRows([{ id: 'analytics', payload: res.data || {} }]);
        setMeta({ total: 1 });
      } else if (cfg.kind === 'simple') {
        const fn = highSkillRetentionApi[cfg.api];
        if (typeof fn !== 'function') throw new Error('Unknown API mapping');
        const res = await fn({ limit: 200 });
        setRows(res.data?.items || []);
        setMeta({ total: res.data?.total ?? (res.data?.items || []).length });
      } else if (cfg.kind === 'nl-search') {
        setRows([]);
        setMeta({ total: 0 });
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load workspace');
      setRows([]);
      setMeta({ total: 0 });
    } finally {
      setLoading(false);
    }
  }, [cfg]);

  useEffect(() => {
    load();
  }, [load]);

  const submitSimpleCreate = async (e) => {
    e.preventDefault();
    if (!canWrite || !cfg) return;
    let payload = {};
    try {
      payload = JSON.parse(simpleForm.payloadJson || '{}');
    } catch {
      toast.error('Payload must be valid JSON');
      return;
    }
    setSaving(true);
    try {
      if (cfg.kind === 'stays') {
        await highSkillRetentionApi.createStayInterview({
          employee_id: simpleForm.employee_id.trim(),
          scheduled_on: new Date().toISOString(),
          questionnaire_template: 'DEFAULT',
          key_concerns: [],
          risk_flags: [],
          follow_up_actions: [],
          outcome_status: 'PLANNED',
          ...payload,
        });
      } else if (cfg.kind === 'risk') {
        await highSkillRetentionApi.createRiskAssessment({
          employee_id: simpleForm.employee_id.trim(),
          overall_risk_score: 0.5,
          ...payload,
        });
      } else if (cfg.kind === 'pred') {
        await highSkillRetentionApi.createAttritionPrediction({
          employee_id: simpleForm.employee_id.trim(),
          exit_probability: 0.4,
          ...payload,
        });
      } else if (cfg.kind === 'cases') {
        await highSkillRetentionApi.createCase({
          employee_id: simpleForm.employee_id.trim(),
          case_type: 'RETENTION',
          ...payload,
        });
      } else if (cfg.kind === 'actions') {
        await highSkillRetentionApi.createEngagementAction({
          employee_id: simpleForm.employee_id.trim(),
          action_title: 'Action',
          ...payload,
        });
      } else {
        toast.error('Create not supported for this workspace yet');
        return;
      }
      toast.success('Created');
      setOpen(false);
      setSimpleForm({ employee_id: '', payloadJson: '{}' });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const submitNl = async (e) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    try {
      const res = await highSkillRetentionApi.naturalLanguageSearch({ query: nlQuery.trim(), filters: {} });
      setNlResults(res.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Search failed');
    }
  };

  if (!cfg) {
    return <p className="text-slate-600">Unknown retention workspace path.</p>;
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
          <p className="text-slate-600 mt-1 text-sm">Workspace · {cfg.kind}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          {canWrite && ['stays', 'risk', 'pred', 'cases', 'actions'].includes(cfg.kind) ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>New record</DialogTitle>
                </DialogHeader>
                <form onSubmit={submitSimpleCreate} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Employee ID *</Label>
                    <Input
                      required
                      value={simpleForm.employee_id}
                      onChange={(e) => setSimpleForm((f) => ({ ...f, employee_id: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Override payload (JSON)</Label>
                    <Textarea
                      rows={6}
                      className="font-mono text-xs"
                      value={simpleForm.payloadJson}
                      onChange={(e) => setSimpleForm((f) => ({ ...f, payloadJson: e.target.value }))}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      {cfg.kind === 'nl-search' ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Ask retention search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={submitNl} className="flex flex-wrap gap-2">
              <Input
                placeholder="e.g. show high risk GenAI talent in Engineering"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
              />
              <Button type="submit">Search</Button>
            </form>
            {nlResults ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Results: {nlResults.total}</p>
                <div className="space-y-2">
                  {(nlResults.results || []).map((r) => (
                    <div key={r.id} className="border rounded-lg p-3 text-sm">
                      <div className="font-medium">{r.talent_code}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        {r.employee_id} · {r.primary_skill} · {r.current_risk_level}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {cfg.kind !== 'nl-search' ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows || []).map((r) => (
                  <TableRow key={r.id || r.employee_id || JSON.stringify(r).slice(0, 20)}>
                    <TableCell className="font-mono text-xs">{r.id || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.employee_id || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {r.segment_type ||
                          r.tag_type ||
                          r.risk_level ||
                          r.predicted_risk_level ||
                          r.recommendation_type ||
                          r.trigger_type ||
                          r.forecast_type ||
                          r.case_type ||
                          r.status ||
                          'ROW'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-[520px] truncate">{preview(r)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No rows.</p> : null}
            {meta?.total != null ? <p className="text-xs text-slate-500 mt-2">Total: {meta.total}</p> : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default HsrWorkspacePage;

