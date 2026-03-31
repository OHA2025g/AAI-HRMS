import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { retentionApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, RefreshCw, PlayCircle } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';

const formatTopFactors = (r) => {
  const t = r.top_factors || [];
  return t
    .slice(0, 3)
    .map((f) => `${f.feature}:${f.contribution ?? f.delta_probability ?? ''}`)
    .join(' · ');
};

const formatShapLinear = (r) => {
  const t = r.shap_linear || [];
  return t
    .slice(0, 3)
    .map((s) => `${s.feature}:${s.shap_value}`)
    .join(' · ');
};

const SEGMENT_FILTERS = [
  { value: '', label: 'Any segment' },
  { value: 'HIGH_PERFORMER', label: 'High performer' },
  { value: 'CRITICAL_ROLE', label: 'Critical role' },
  { value: 'HIGH_ATTRITION_RISK', label: 'High attrition risk' },
  { value: 'ELEVATED_ATTRITION_RISK', label: 'Elevated attrition risk' },
];

const EmployeeRetentionPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [scores, setScores] = useState([]);
  const [segmentFilter, setSegmentFilter] = useState('');
  const [bandFilter, setBandFilter] = useState('');
  const [scoring, setScoring] = useState(false);
  const [playbooks, setPlaybooks] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [assignEmp, setAssignEmp] = useState('');
  const [assignPb, setAssignPb] = useState('');
  const [modelCfg, setModelCfg] = useState(null);
  const [modelSaving, setModelSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    const res = await retentionApi.getDashboard();
    setData(res.data || null);
  }, []);

  const loadScores = useCallback(async () => {
    const params = { limit: 200 };
    if (segmentFilter) params.segment = segmentFilter;
    if (bandFilter) params.band = bandFilter;
    const res = await retentionApi.listScores(params);
    setScores(res.data || []);
  }, [segmentFilter, bandFilter]);

  const loadPlaybooksInterventions = useCallback(async () => {
    const [pb, inv, met] = await Promise.all([
      retentionApi.listPlaybooks(),
      retentionApi.listInterventions({ limit: 80 }),
      retentionApi.getMetrics(),
    ]);
    setPlaybooks(pb.data || []);
    setInterventions(inv.data || []);
    setMetrics(met.data || null);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDashboard(), loadPlaybooksInterventions(), loadScores()]);
    } catch (e) {
      toast.error('Failed to load retention data');
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, loadScores, loadPlaybooksInterventions]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (loading) return;
    loadScores().catch(() => toast.error('Failed to load scores'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch scores when filters change
  }, [segmentFilter, bandFilter]);

  useEffect(() => {
    if (!isAdmin) {
      setModelCfg(null);
      return;
    }
    retentionApi
      .getModel()
      .then((r) => setModelCfg(r.data || null))
      .catch(() => setModelCfg(null));
  }, [isAdmin, loading]);

  const saveModelRuntime = async (patch) => {
    if (!isAdmin) return;
    setModelSaving(true);
    try {
      const res = await retentionApi.patchModel(patch);
      setModelCfg(res.data || null);
      toast.success('Model settings updated — run score batch to refresh all employee scores');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Update failed');
    } finally {
      setModelSaving(false);
    }
  };

  const onScoreRun = async () => {
    setScoring(true);
    try {
      const res = await retentionApi.scoreRun();
      toast.success(`Scored ${res.data?.scored_employees ?? 0} employees`);
      await refreshAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Score run failed');
    } finally {
      setScoring(false);
    }
  };

  const onAssign = async () => {
    if (!assignEmp.trim() || !assignPb) {
      toast.error('Employee id and playbook required');
      return;
    }
    try {
      await retentionApi.createIntervention({
        employee_id: assignEmp.trim(),
        playbook_id: assignPb,
        notes: '',
      });
      toast.success('Intervention assigned');
      setAssignEmp('');
      await loadPlaybooksInterventions();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Assign failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const critical = data?.critical_skills || [];
  const topEmployees = data?.top_risk_employees || [];
  const v1 = data?.attrition_v1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            High-Skill Talent Retention
          </h1>
          <p className="text-slate-600 mt-1">M8 — heuristic skill risk + attrition model v1, segments, interventions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="default" className="bg-indigo-600" disabled={scoring} onClick={onScoreRun}>
            {scoring ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <PlayCircle className="w-4 h-4 mr-1" />}
            Run attrition score batch
          </Button>
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {metrics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Open interventions</p>
              <p className="text-2xl font-bold">{metrics.interventions_open ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Closed — retained</p>
              <p className="text-2xl font-bold">{metrics.interventions_closed_retained ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Closed — exited</p>
              <p className="text-2xl font-bold">{metrics.interventions_closed_exited ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Risk-to-save rate</p>
              <p className="text-2xl font-bold">
                {metrics.risk_to_save_rate != null ? `${(metrics.risk_to_save_rate * 100).toFixed(1)}%` : '—'}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="model">Attrition model v1</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Critical Skills</p>
                <p className="text-2xl font-bold">{critical.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">High-skill Employees</p>
                <p className="text-2xl font-bold">{data?.total_high_skill_employees || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Avg heuristic risk</p>
                <p className="text-2xl font-bold">{data?.avg_risk_score || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Scored (v1)</p>
                <p className="text-2xl font-bold">{v1?.scored_employee_count ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Critical Skill Risk (shortage-based)</CardTitle>
              <CardDescription>Legacy heuristic — risk from workforce inventory shortage ratio.</CardDescription>
            </CardHeader>
            <CardContent>
              {critical.length === 0 ? (
                <p className="text-slate-500">No critical skills found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Demand</TableHead>
                      <TableHead>Supply</TableHead>
                      <TableHead>Shortage</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {critical.slice(0, 12).map((s) => (
                      <TableRow key={s.skill_name}>
                        <TableCell className="font-medium">{s.skill_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{s.priority}</Badge>
                        </TableCell>
                        <TableCell>{s.demand_count}</TableCell>
                        <TableCell>{s.supply_count}</TableCell>
                        <TableCell>{s.shortage_count}</TableCell>
                        <TableCell>
                          <Badge
                            variant={s.risk_score >= 0.7 ? 'destructive' : s.risk_score >= 0.4 ? 'outline' : 'secondary'}
                          >
                            {s.risk_score}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top risk employees (heuristic)</CardTitle>
              <CardDescription>Employees holding critical skills × shortage risk.</CardDescription>
            </CardHeader>
            <CardContent>
              {topEmployees.length === 0 ? (
                <p className="text-slate-500">No high-skill employees found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Critical Skills</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topEmployees.map((e) => (
                      <TableRow key={e.employee_code}>
                        <TableCell>
                          <div className="font-medium">{e.full_name}</div>
                          <div className="text-xs text-slate-500">{e.employee_code}</div>
                        </TableCell>
                        <TableCell>{e.critical_skills_matched}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              e.risk_label === 'HIGH' ? 'destructive' : e.risk_label === 'MEDIUM' ? 'outline' : 'secondary'
                            }
                          >
                            {e.risk_label}
                          </Badge>
                        </TableCell>
                        <TableCell>{e.risk_score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attrition model v1</CardTitle>
              <CardDescription>
                Features: tenure, critical-skill exposure, engagement pulse, compensation proxy (incl. HRIS percentile),
                training activity. <strong>SHAP (linear)</strong> = contribution vs training reference means. Use{' '}
                <strong>Run attrition score batch</strong> to populate scores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdmin && modelCfg ? (
                <Card className="border-indigo-200 bg-indigo-50/40">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Admin — scoring runtime</CardTitle>
                    <CardDescription className="text-xs">
                      Ensemble uses GB only if a classifier was trained. After changes, run score batch again.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-4 items-end pt-0">
                    <div className="min-w-[160px]">
                      <Label className="text-xs">ensemble_mode</Label>
                      <Select
                        value={modelCfg.ensemble_mode || 'linear'}
                        onValueChange={(v) => saveModelRuntime({ ensemble_mode: v })}
                        disabled={modelSaving}
                      >
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="linear">linear</SelectItem>
                          <SelectItem value="gb">gb</SelectItem>
                          <SelectItem value="avg">avg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
                      <Label className="text-xs mb-0">Interaction features</Label>
                      <Switch
                        checked={!!modelCfg.interaction_features_enabled}
                        disabled={modelSaving}
                        onCheckedChange={(c) => saveModelRuntime({ interaction_features_enabled: c })}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              {v1 ? (
                <p className="text-sm text-slate-600">
                  Model <code className="text-xs bg-slate-100 px-1 rounded">{v1.model_version}</code> — last run{' '}
                  <span className="font-mono text-xs">{v1.last_computed_at || '—'}</span> — avg risk{' '}
                  <strong>{v1.avg_attrition_risk}</strong> across <strong>{v1.scored_employee_count}</strong> employees.
                </p>
              ) : (
                <p className="text-amber-700 text-sm">No v1 scores yet — run the score batch above.</p>
              )}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="min-w-[180px]">
                  <Label>Segment</Label>
                  <Select value={segmentFilter || '__any__'} onValueChange={(v) => setSegmentFilter(v === '__any__' ? '' : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Segment" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEGMENT_FILTERS.map((s) => (
                        <SelectItem key={s.value || 'any'} value={s.value || '__any__'}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[140px]">
                  <Label>Risk band</Label>
                  <Select value={bandFilter || '__any__'} onValueChange={(v) => setBandFilter(v === '__any__' ? '' : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="LOW">LOW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Band</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Segments</TableHead>
                    <TableHead>Top factors</TableHead>
                    <TableHead>SHAP vs ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(scores.length ? scores : v1?.top_at_risk || []).map((r) => (
                    <TableRow key={r.employee_id || r.employee_code}>
                      <TableCell>
                        <div className="font-medium">{r.full_name}</div>
                        <div className="text-xs text-slate-500">{r.employee_code}</div>
                      </TableCell>
                      <TableCell>{r.attrition_risk}</TableCell>
                      <TableCell>{r.confidence}</TableCell>
                      <TableCell>
                        <Badge variant={r.risk_band === 'HIGH' ? 'destructive' : 'secondary'}>{r.risk_band}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.model_kind ? <Badge variant="outline">{r.model_kind}</Badge> : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {(r.segments || []).map((s) => (
                          <Badge key={s} variant="outline" className="mr-1 mb-1">
                            {s}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-xs max-w-[220px]">{formatTopFactors(r) || '—'}</TableCell>
                      <TableCell className="text-xs max-w-[220px] text-slate-700">
                        {formatShapLinear(r) || (scores.length ? '—' : 'Run full listScores after batch')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {scores.length === 0 && !v1?.top_at_risk?.length ? (
                <p className="text-slate-500 text-sm">No rows — run score batch or widen filters.</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assign playbook</CardTitle>
              <CardDescription>Requires employees_write. Use employee UUID from Employee Master.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[220px] flex-1">
                <Label>Employee id</Label>
                <Input className="mt-1" value={assignEmp} onChange={(e) => setAssignEmp(e.target.value)} placeholder="uuid" />
              </div>
              <div className="min-w-[220px] flex-1">
                <Label>Playbook</Label>
                <Select value={assignPb || undefined} onValueChange={setAssignPb}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select playbook…" />
                  </SelectTrigger>
                  <SelectContent>
                    {playbooks.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-indigo-600" onClick={onAssign}>
                Assign
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active & recent interventions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Playbook</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interventions.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell className="text-xs">{x.employee_code || x.employee_id}</TableCell>
                      <TableCell className="text-xs">{x.playbook_title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{x.status}</Badge>
                      </TableCell>
                      <TableCell>{x.outcome || '—'}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{String(x.updated_at || '').slice(0, 16)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {interventions.length === 0 ? <p className="text-slate-500 text-sm">No interventions yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeRetentionPage;
