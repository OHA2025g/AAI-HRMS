import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { resourceOptimizationApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'under', label: 'Under-allocated' },
  { value: 'over', label: 'Over-allocated' },
];

const WorkforceResourceOptimizationPage = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const canPlan = role === 'admin' || role === 'hr_admin';
  const canApprove = canPlan;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');

  const [solveResult, setSolveResult] = useState(null);
  const [solveBusy, setSolveBusy] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [comparison, setComparison] = useState(null);

  const load = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const res = await resourceOptimizationApi.getMetrics(forceRefresh);
      setData(res.data || null);
    } catch (e) {
      toast.error('Failed to load resource optimization');
    } finally {
      setLoading(false);
    }
  };

  const loadScenarios = async () => {
    try {
      const res = await resourceOptimizationApi.listScenarios(50);
      setScenarios(res.data || []);
    } catch (e) {
      toast.error('Failed to load scenarios');
    }
  };

  useEffect(() => {
    load(false);
    loadScenarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSolve = async () => {
    setSolveBusy(true);
    try {
      const res = await resourceOptimizationApi.solve();
      setSolveResult(res.data);
      toast.success('Allocation solve completed');
    } catch (e) {
      toast.error('Solve failed');
    } finally {
      setSolveBusy(false);
    }
  };

  const saveScenario = async () => {
    if (!solveResult) {
      toast.message('Run solve first');
      return;
    }
    const name = (scenarioName || '').trim() || `Scenario ${new Date().toISOString().slice(0, 19)}`;
    try {
      await resourceOptimizationApi.createScenario({
        name,
        description: '',
        demand_overrides: [],
        constraint_overrides: {},
        result: solveResult,
      });
      toast.success('Scenario saved');
      setScenarioName('');
      loadScenarios();
    } catch (e) {
      toast.error('Save scenario failed');
    }
  };

  const runCompare = async () => {
    if (!compareA || !compareB || compareA === compareB) {
      toast.error('Pick two different scenarios');
      return;
    }
    try {
      const res = await resourceOptimizationApi.compareScenarios(compareA, compareB);
      setComparison(res.data);
    } catch (e) {
      toast.error('Compare failed');
    }
  };

  const submitScenario = async (id) => {
    try {
      await resourceOptimizationApi.submitScenario(id);
      toast.success('Submitted for approval');
      loadScenarios();
    } catch (e) {
      toast.error('Submit failed');
    }
  };

  const approveScenario = async (id) => {
    try {
      await resourceOptimizationApi.approveScenario(id);
      toast.success('Scenario approved');
      loadScenarios();
    } catch (e) {
      toast.error('Approve failed');
    }
  };

  const rejectScenario = async (id) => {
    const reason = window.prompt('Rejection reason (optional)') || '';
    try {
      await resourceOptimizationApi.rejectScenario(id, reason);
      toast.success('Scenario rejected');
      loadScenarios();
    } catch (e) {
      toast.error('Reject failed');
    }
  };

  const applyScenario = async (id, dryRun) => {
    try {
      const res = await resourceOptimizationApi.applyScenario(id, dryRun);
      toast.success(dryRun ? 'Dry run OK' : 'Allocations applied');
      if (!dryRun) load(true);
      // eslint-disable-next-line no-console
      console.log(res.data);
    } catch (e) {
      toast.error('Apply failed');
    }
  };

  const rows =
    data && filter === 'under'
      ? data.under_allocated || []
      : data && filter === 'over'
        ? data.over_allocated || []
        : data && [...(data.under_allocated || []), ...(data.over_allocated || [])];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const metrics = comparison?.comparison?.metrics || {};
  const obj = comparison?.comparison?.objective_score || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Resource Optimization
          </h1>
          <p className="text-slate-600">Phase-3 M4 — capacity, solver, scenarios & approvals</p>
        </div>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario lab</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Allocation filter" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => load(true)}>
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Skills tracked</p>
                <p className="text-2xl font-bold">{data?.skills_total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Total Shortage</p>
                <p className="text-2xl font-bold">{data?.total_shortage || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Total Bench</p>
                <p className="text-2xl font-bold">{data?.total_bench || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-slate-500">Demand / Supply</p>
                <p className="text-2xl font-bold">
                  {data?.total_demand || 0} / {data?.total_supply || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Allocation Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-slate-500">No allocation alerts for this filter.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Demand</TableHead>
                      <TableHead>Supply</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Allocation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.skill_name}>
                        <TableCell className="font-medium">{r.skill_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.priority}</Badge>
                        </TableCell>
                        <TableCell>{r.demand_count}</TableCell>
                        <TableCell>{r.supply_count}</TableCell>
                        <TableCell>{r.utilization_pct}%</TableCell>
                        <TableCell>
                          {r.allocation_status === 'UNDER_ALLOCATED' ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              Shortage: {r.shortage_count}
                            </Badge>
                          ) : r.allocation_status === 'OVER_ALLOCATED' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                              Bench: {r.bench_count}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Balanced</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Run solver (read-only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">
                Deterministic greedy allocation from `project_skill_demands` and employee skills. See API for
                `/simulate` with overrides.
              </p>
              <Button onClick={runSolve} disabled={solveBusy}>
                {solveBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
                Run solve
              </Button>
              {solveResult?.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div className="p-2 rounded bg-slate-50">
                    Filled: <strong>{solveResult.metrics.filled_seats}</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    Unfilled hard: <strong>{solveResult.metrics.unfilled_hard_seats}</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    Util %: <strong>{solveResult.metrics.utilization_pct}</strong>
                  </div>
                  <div className="p-2 rounded bg-slate-50">
                    Objective: <strong>{solveResult.score_breakdown?.objective_score}</strong>
                  </div>
                </div>
              )}
              {canPlan && (
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                  <div className="flex-1 w-full">
                    <Label className="text-xs">Scenario name</Label>
                    <Input
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      placeholder="e.g. Q1 stretch demand"
                    />
                  </div>
                  <Button variant="secondary" onClick={saveScenario}>
                    Save scenario
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compare scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Scenario A</Label>
                  <Select value={compareA} onValueChange={setCompareA}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scenario A" />
                    </SelectTrigger>
                    <SelectContent>
                      {scenarios.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Scenario B</Label>
                  <Select value={compareB} onValueChange={setCompareB}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scenario B" />
                    </SelectTrigger>
                    <SelectContent>
                      {scenarios.map((s) => (
                        <SelectItem key={`b-${s.id}`} value={s.id}>
                          {s.name} ({s.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" onClick={runCompare}>
                Compare
              </Button>
              {comparison && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {comparison.scenario_a?.name} vs {comparison.scenario_b?.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Objective A: {obj.a}</div>
                    <div>Objective B: {obj.b}</div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>A</TableHead>
                        <TableHead>B</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(metrics).map((k) => (
                        <TableRow key={k}>
                          <TableCell>{k}</TableCell>
                          <TableCell>{JSON.stringify(metrics[k]?.a)}</TableCell>
                          <TableCell>{JSON.stringify(metrics[k]?.b)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              {scenarios.length === 0 ? (
                <p className="text-slate-500 text-sm">No scenarios yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarios.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{s.status}</Badge>
                        </TableCell>
                        <TableCell className="space-x-2 flex flex-wrap gap-2">
                          {canPlan && (s.status === 'DRAFT' || s.status === 'REJECTED') && (
                            <Button size="sm" variant="outline" onClick={() => submitScenario(s.id)}>
                              Submit
                            </Button>
                          )}
                          {canApprove && s.status === 'PENDING_APPROVAL' && (
                            <>
                              <Button size="sm" onClick={() => approveScenario(s.id)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => rejectScenario(s.id)}>
                                Reject
                              </Button>
                            </>
                          )}
                          {canApprove && s.status === 'APPROVED' && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => applyScenario(s.id, true)}>
                                Dry-run apply
                              </Button>
                              <Button size="sm" onClick={() => applyScenario(s.id, false)}>
                                Apply allocations
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkforceResourceOptimizationPage;
