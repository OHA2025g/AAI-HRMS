import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { allocationsApi, projectsApi, resourceOptimizationApi, resourcesApi } from '../lib/api';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'under', label: 'Under-allocated' },
  { value: 'over', label: 'Over-allocated' },
];

const WorkforceResourceOptimizationPage = ({ initialTab = 'metrics', showTopTabs = false }) => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const canPlan = role === 'admin' || role === 'hr_admin';
  const canApprove = canPlan;

  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all');

  // Project / Resource / Allocation module state (M6)
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectCreateOpen, setProjectCreateOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    client_name: '',
    business_unit: '',
    project_type: 'EXTERNAL',
    status: 'ACTIVE',
    start_date: '',
    end_date: '',
    budget: '',
    billing_type: 'TIME_MATERIAL',
  });

  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceQ, setResourceQ] = useState('');
  const [resources, setResources] = useState([]);
  const [resourcePage, setResourcePage] = useState(1);
  const [resourceTotalPages, setResourceTotalPages] = useState(1);

  const [allocProjectId, setAllocProjectId] = useState('');
  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [allocations, setAllocations] = useState([]);
  const [allocationCreateOpen, setAllocationCreateOpen] = useState(false);
  const [allocationForm, setAllocationForm] = useState({
    project_id: '',
    employee_id: '',
    role: '',
    allocation_percentage: 50,
    start_date: '',
    end_date: '',
    billable: true,
    allocation_type: 'PARTIAL',
  });

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

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await projectsApi.list();
      const list = res.data || [];
      setProjects(list);
      if (!allocProjectId && list.length > 0) {
        setAllocProjectId(list[0].id);
      }
    } catch (e) {
      toast.error('Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadResources = async (page = resourcePage) => {
    setResourceLoading(true);
    try {
      const res = await resourcesApi.search({ page, page_size: 20, q: resourceQ || undefined });
      const payload = res.data || {};
      setResources(payload.items || []);
      setResourceTotalPages(payload.total_pages || 1);
      setResourcePage(payload.page || page);
    } catch (e) {
      toast.error('Failed to load resources');
    } finally {
      setResourceLoading(false);
    }
  };

  const loadAllocations = async (projectId = allocProjectId) => {
    if (!projectId) {
      setAllocations([]);
      return;
    }
    setAllocationsLoading(true);
    try {
      const res = await allocationsApi.listByProject(projectId);
      setAllocations(res.data || []);
    } catch (e) {
      toast.error('Failed to load allocations');
    } finally {
      setAllocationsLoading(false);
    }
  };

  // Lazy-load section data only when that section is active
  useEffect(() => {
    if (tab === 'projects') {
      loadProjects();
    }
    if (tab === 'resources') {
      loadResources(1);
    }
    if (tab === 'allocations') {
      loadProjects();
      // allocations load is triggered once a project is selected
      if (allocProjectId) loadAllocations(allocProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== 'allocations') return;
    loadAllocations(allocProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, allocProjectId]);

  useEffect(() => {
    if (tab !== 'resources') return;
    loadResources(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, resourceQ]);

  const createProject = async () => {
    if (!projectForm.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    try {
      await projectsApi.create({
        ...projectForm,
        name: projectForm.name.trim(),
        description: projectForm.description.trim() || null,
        client_name: projectForm.client_name.trim() || null,
        business_unit: projectForm.business_unit.trim() || null,
        start_date: projectForm.start_date || null,
        end_date: projectForm.end_date || null,
        budget: projectForm.budget !== '' ? Number(projectForm.budget) : null,
      });
      toast.success('Project created');
      setProjectCreateOpen(false);
      setProjectForm((p) => ({ ...p, name: '', description: '' }));
      loadProjects();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Create project failed');
    }
  };

  const removeProject = async (projectId) => {
    if (!window.confirm('Delete project? This also deletes its demands/allocations.')) return;
    try {
      await projectsApi.remove(projectId);
      toast.success('Project deleted');
      loadProjects();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Delete failed');
    }
  };

  const createAllocation = async () => {
    const payload = {
      ...allocationForm,
      project_id: allocProjectId,
      employee_id: allocationForm.employee_id.trim(),
      role: allocationForm.role.trim() || null,
      allocation_percentage: Number(allocationForm.allocation_percentage) || 0,
      start_date: allocationForm.start_date || null,
      end_date: allocationForm.end_date || null,
      allocation_type: allocationForm.allocation_type || null,
    };
    if (!payload.employee_id) {
      toast.error('Employee ID is required');
      return;
    }
    try {
      await allocationsApi.create(payload);
      toast.success('Allocation created (pending approval)');
      setAllocationCreateOpen(false);
      setAllocationForm((p) => ({ ...p, employee_id: '', role: '' }));
      loadAllocations(allocProjectId);
    } catch (e) {
      const d = e?.response?.data?.detail;
      if (e?.response?.status === 409 && d?.message) {
        toast.error(`${d.message}: total ${d.overlapping_total_pct}%`);
      } else {
        toast.error(d || 'Create allocation failed');
      }
    }
  };

  const approveAllocation = async (allocationId, action) => {
    const reason = action === 'reject' ? window.prompt('Rejection reason (optional)') || '' : undefined;
    try {
      await allocationsApi.approve(allocationId, action, reason);
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      loadAllocations(allocProjectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Update failed');
    }
  };

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
          <p className="text-slate-600">Capacity signals, solver, scenarios, and approvals</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {showTopTabs ? (
          <TabsList>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="scenarios">Scenario lab</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
          </TabsList>
        ) : null}

        <TabsContent value="metrics" className="space-y-6 mt-4">
          <Card>
            <CardContent className="space-y-6 pt-6">
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
                {[
                  { label: 'Skills tracked', value: data?.skills_total || 0 },
                  { label: 'Total Shortage', value: data?.total_shortage || 0 },
                  { label: 'Total Bench', value: data?.total_bench || 0 },
                  {
                    label: 'Demand / Supply',
                    value: `${data?.total_demand || 0} / ${data?.total_supply || 0}`,
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
                  >
                    <p className="text-sm text-slate-500">{kpi.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Allocation alerts</h3>
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
              </div>
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

        <TabsContent value="projects" className="space-y-6 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
              <p className="text-sm text-slate-600">Create projects and manage high-level project metadata.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadProjects} disabled={projectsLoading}>
                Refresh
              </Button>
              {canPlan && <Button onClick={() => setProjectCreateOpen(true)}>Create project</Button>}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project list</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : projects.length === 0 ? (
                <p className="text-slate-500">No projects yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.status}</Badge>
                        </TableCell>
                        <TableCell>{p.client_name || '-'}</TableCell>
                        <TableCell>{p.project_type || '-'}</TableCell>
                        <TableCell>
                          {(p.start_date || '-') + ' → ' + (p.end_date || '-')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            className="text-red-700"
                            onClick={() => removeProject(p.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={projectCreateOpen} onOpenChange={setProjectCreateOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project name</Label>
                  <Input
                    value={projectForm.name}
                    onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client name</Label>
                  <Input
                    value={projectForm.client_name}
                    onChange={(e) => setProjectForm((p) => ({ ...p, client_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business unit</Label>
                  <Input
                    value={projectForm.business_unit}
                    onChange={(e) => setProjectForm((p) => ({ ...p, business_unit: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={projectForm.status}
                    onValueChange={(v) => setProjectForm((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="PAUSED">PAUSED</SelectItem>
                      <SelectItem value="CLOSED">CLOSED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project type</Label>
                  <Select
                    value={projectForm.project_type}
                    onValueChange={(v) => setProjectForm((p) => ({ ...p, project_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">INTERNAL</SelectItem>
                      <SelectItem value="EXTERNAL">EXTERNAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Billing type</Label>
                  <Select
                    value={projectForm.billing_type}
                    onValueChange={(v) => setProjectForm((p) => ({ ...p, billing_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">FIXED</SelectItem>
                      <SelectItem value="TIME_MATERIAL">TIME_MATERIAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={projectForm.start_date}
                    onChange={(e) => setProjectForm((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={projectForm.end_date}
                    onChange={(e) => setProjectForm((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget</Label>
                  <Input
                    placeholder="e.g. 1000000"
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm((p) => ({ ...p, budget: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={projectForm.description}
                    onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setProjectCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createProject}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Resources</h2>
              <p className="text-sm text-slate-600">Resource directory powered by Employees.</p>
            </div>
            <Button variant="outline" onClick={() => loadResources(resourcePage)} disabled={resourceLoading}>
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[240px]">
                <Label className="text-xs">Name / code / email</Label>
                <Input value={resourceQ} onChange={(e) => setResourceQ(e.target.value)} placeholder="Search…" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => loadResources(1)} disabled={resourceLoading}>
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Directory</CardTitle>
            </CardHeader>
            <CardContent>
              {resourceLoading ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : resources.length === 0 ? (
                <p className="text-slate-500">No resources found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Employee code</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Skills</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.employee_code}</TableCell>
                        <TableCell>{r.department}</TableCell>
                        <TableCell>{r.role_title}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(r.skills || []).slice(0, 6).map((s) => (
                              <Badge key={s} variant="secondary">
                                {s}
                              </Badge>
                            ))}
                            {(r.skills || []).length > 6 ? (
                              <Badge variant="outline">+{(r.skills || []).length - 6}</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-slate-600">
                  Page {resourcePage} / {resourceTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={resourcePage <= 1 || resourceLoading}
                    onClick={() => loadResources(resourcePage - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    disabled={resourcePage >= resourceTotalPages || resourceLoading}
                    onClick={() => loadResources(resourcePage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations" className="space-y-6 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Project vs Resource allocations</h2>
              <p className="text-sm text-slate-600">Create allocations, approve/reject, and detect overallocations.</p>
            </div>
            <div className="flex gap-2 items-end flex-wrap">
              <div className="min-w-[280px]">
                <Label className="text-xs">Project</Label>
                <Select value={allocProjectId} onValueChange={setAllocProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => loadAllocations(allocProjectId)} disabled={allocationsLoading}>
                Refresh
              </Button>
              {canPlan && (
                <Button
                  onClick={() => {
                    setAllocationForm((f) => ({ ...f, project_id: allocProjectId }));
                    setAllocationCreateOpen(true);
                  }}
                  disabled={!allocProjectId}
                >
                  Create allocation
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Allocations</CardTitle>
            </CardHeader>
            <CardContent>
              {allocationsLoading ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              ) : allocations.length === 0 ? (
                <p className="text-slate-500">No allocations for this project.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.employee_id}</TableCell>
                        <TableCell>{a.role || '-'}</TableCell>
                        <TableCell>{a.allocation_percentage}%</TableCell>
                        <TableCell>
                          {(a.start_date || '-') + ' → ' + (a.end_date || '-')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{a.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={a.approval_status === 'APPROVED' ? 'default' : 'outline'}>
                            {a.approval_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {a.approval_status === 'PENDING' && canApprove ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" onClick={() => approveAllocation(a.id, 'approve')}>
                                Approve
                              </Button>
                              <Button variant="outline" onClick={() => approveAllocation(a.id, 'reject')}>
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={allocationCreateOpen} onOpenChange={setAllocationCreateOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create allocation</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Employee ID</Label>
                  <Input
                    value={allocationForm.employee_id}
                    onChange={(e) => setAllocationForm((p) => ({ ...p, employee_id: e.target.value }))}
                    placeholder="Paste employee UUID from Resources/Employees"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Role</Label>
                  <Input value={allocationForm.role} onChange={(e) => setAllocationForm((p) => ({ ...p, role: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Allocation %</Label>
                  <Input
                    value={allocationForm.allocation_percentage}
                    onChange={(e) => setAllocationForm((p) => ({ ...p, allocation_percentage: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={allocationForm.allocation_type}
                    onValueChange={(v) => setAllocationForm((p) => ({ ...p, allocation_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL">FULL</SelectItem>
                      <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                      <SelectItem value="SHADOW">SHADOW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={allocationForm.start_date}
                    onChange={(e) => setAllocationForm((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    placeholder="YYYY-MM-DD"
                    value={allocationForm.end_date}
                    onChange={(e) => setAllocationForm((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setAllocationCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createAllocation}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkforceResourceOptimizationPage;
