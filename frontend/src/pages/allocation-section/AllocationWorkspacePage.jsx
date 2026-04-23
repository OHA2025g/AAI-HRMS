import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { allocationSectionApi, projectsApi } from '../../lib/api';
import AllocationSectionBreadcrumbs from './AllocationSectionBreadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2 } from 'lucide-react';

const TITLES = {
  assignment: 'Assignment & best-fit',
  scheduling: 'Planning & scheduling',
  'capacity-conflicts': 'Capacity & conflicts',
  'billability-commercials': 'Billability & commercials',
  'rollon-rolloff': 'Roll-on / roll-off',
  'demand-supply': 'Demand vs supply',
  'fulfillment-bench': 'Fulfillment & bench',
  'replacement-backup': 'Replacement & backup',
  'changes-release': 'Changes & release',
  'calendar-heatmap': 'Calendar / heatmap',
  'documents-notes': 'Documents & notes',
  'alerts-communication': 'Alerts & communication',
  analytics: 'Analytics',
  forecasting: 'Forecasting',
  'ai-insights': 'AI allocation insights',
  approvals: 'Approvals queue',
};

const AllocationWorkspacePage = ({ slug }) => {
  const title = TITLES[slug] || slug;
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [projectId, setProjectId] = useState('');
  const [skill, setSkill] = useState('');
  const [projects, setProjects] = useState([]);
  const [noteBody, setNoteBody] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      let res;
      switch (slug) {
        case 'assignment':
          if (!projectId) {
            setPayload({ items: [] });
            setLoading(false);
            return;
          }
          res = await allocationSectionApi.assignmentSuggestions({ project_id: projectId, skill: skill || undefined });
          break;
        case 'scheduling':
          res = await allocationSectionApi.scheduling();
          break;
        case 'capacity-conflicts':
          res = await allocationSectionApi.capacityConflicts();
          break;
        case 'billability-commercials':
          res = await allocationSectionApi.billability();
          break;
        case 'rollon-rolloff':
          res = await allocationSectionApi.rollonRolloff();
          break;
        case 'demand-supply':
          res = await allocationSectionApi.demandSupply();
          break;
        case 'fulfillment-bench':
          res = await allocationSectionApi.fulfillmentBench();
          break;
        case 'replacement-backup':
          res = await allocationSectionApi.replacementBackup();
          break;
        case 'changes-release':
          res = await allocationSectionApi.changesRelease();
          break;
        case 'calendar-heatmap':
          res = await allocationSectionApi.calendarHeatmap();
          break;
        case 'documents-notes':
          res = await allocationSectionApi.documentsNotes();
          break;
        case 'alerts-communication':
          res = await allocationSectionApi.alerts();
          break;
        case 'analytics':
          res = await allocationSectionApi.analyticsSummary();
          break;
        case 'forecasting':
          res = await allocationSectionApi.forecasting();
          break;
        case 'ai-insights':
          res = await allocationSectionApi.aiInsights();
          break;
        case 'approvals':
          res = await allocationSectionApi.approvals();
          break;
        default:
          res = { data: {} };
      }
      setPayload(res.data);
    } catch {
      toast.error('Failed to load module data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    projectsApi.list().then((r) => setProjects(Array.isArray(r.data) ? r.data : []));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, projectId, skill]);

  const ack = async (id) => {
    try {
      await allocationSectionApi.ackAlert(id);
      toast.success('Acknowledged');
      load();
    } catch {
      toast.error('Ack failed');
    }
  };

  const resolveConflict = async (id) => {
    try {
      await allocationSectionApi.resolveConflict(id, { resolution_status: 'RESOLVED', remarks: 'Cleared in UI demo' });
      toast.success('Conflict resolved');
      load();
    } catch {
      toast.error('Resolve failed');
    }
  };

  const approvalAct = async (id, action) => {
    try {
      await allocationSectionApi.approvalAction(id, { action, reason: action === 'reject' ? 'Not approved' : undefined });
      toast.success('Updated');
      load();
    } catch {
      toast.error('Action failed (approver role may be required)');
    }
  };

  const saveNote = async () => {
    if (!noteBody.trim()) return;
    try {
      await allocationSectionApi.createNote({ body: noteBody, note_type: 'general' });
      toast.success('Note saved');
      setNoteBody('');
      load();
    } catch {
      toast.error('Note save failed');
    }
  };

  return (
    <div className="space-y-6">
      <AllocationSectionBreadcrumbs current={title} />
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>

      {slug === 'assignment' && (
        <Card>
          <CardHeader>
            <CardTitle>Best-fit suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <Label>Project</Label>
                <select className="mt-1 w-64 border rounded-md h-10 px-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Skill filter (optional)</Label>
                <Input className="mt-1 w-48" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. react" />
              </div>
              <Button type="button" onClick={load} disabled={!projectId}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {slug === 'assignment' && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Fit score</TableHead>
                      <TableHead>Rationale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.items || []).map((r) => (
                      <TableRow key={r.employee_id}>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell>{r.fit_score}</TableCell>
                        <TableCell className="text-slate-600">{r.rationale}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {slug === 'scheduling' && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Allocation</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Dates</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.items || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.id?.slice(0, 8)}</TableCell>
                        <TableCell>{r.project_id}</TableCell>
                        <TableCell>{r.employee_id}</TableCell>
                        <TableCell>{r.allocation_percentage}</TableCell>
                        <TableCell className="text-xs">
                          {r.start_date} → {r.end_date}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {slug === 'capacity-conflicts' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Conflicts</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(payload?.conflicts || []).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.conflict_type}</TableCell>
                          <TableCell>{c.severity}</TableCell>
                          <TableCell className="text-xs">{c.resource_id}</TableCell>
                          <TableCell>{c.resolution_status}</TableCell>
                          <TableCell className="text-right">
                            {String(c.resolution_status || '').toUpperCase() !== 'RESOLVED' &&
                            String(c.resolution_status || '').toUpperCase() !== 'DISMISSED' ? (
                              <Button size="sm" variant="outline" onClick={() => resolveConflict(c.id)}>
                                Resolve
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Capacity rows</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Allocation</TableHead>
                        <TableHead>%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(payload?.capacity_rows || []).slice(0, 40).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.id}</TableCell>
                          <TableCell>{r.allocation_percentage}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {slug === 'billability-commercials' && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Billable</TableHead>
                      <TableHead>Rev est.</TableHead>
                      <TableHead>Cost est.</TableHead>
                      <TableHead>Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.items || []).slice(0, 60).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.project_name || r.project_id}</TableCell>
                        <TableCell>{r.employee_name || r.employee_id}</TableCell>
                        <TableCell>{r.billable ? 'Y' : 'N'}</TableCell>
                        <TableCell>{r.revenue_estimate}</TableCell>
                        <TableCell>{r.cost_estimate}</TableCell>
                        <TableCell>{r.margin_estimate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {slug === 'rollon-rolloff' && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Planned roll-off</TableHead>
                      <TableHead>Readiness</TableHead>
                      <TableHead>Replacement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.items || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.resource_id}</TableCell>
                        <TableCell className="text-xs">{r.project_id}</TableCell>
                        <TableCell>{r.planned_rolloff_date}</TableCell>
                        <TableCell>{r.readiness_status}</TableCell>
                        <TableCell>{r.replacement_required_flag ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {slug === 'demand-supply' && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                <p className="text-sm text-slate-600">
                  Open demands vs best-fit pool (uses `project_demands` + employee skills). Rows: {(payload?.rows || []).length}
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Demand skill</TableHead>
                      <TableHead>Best fit</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.rows || []).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.demand?.skill_name || r.demand?.skill_name_lc}</TableCell>
                        <TableCell>{r.best_fit_employee?.full_name || '—'}</TableCell>
                        <TableCell>{r.best_fit_score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {slug === 'fulfillment-bench' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-sm text-slate-700">
                  Bench signal (employees with no skills array): <strong>{payload?.bench_without_skills_count ?? 0}</strong>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Match score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.bench_matches || []).map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="text-xs">{b.employee_id}</TableCell>
                        <TableCell className="text-xs">{b.project_id}</TableCell>
                        <TableCell>{b.match_score}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{b.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {slug === 'replacement-backup' && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Allocation</TableHead>
                      <TableHead>Shadow / backup</TableHead>
                      <TableHead>%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.items || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.id}</TableCell>
                        <TableCell>
                          {r.shadow_flag ? 'Shadow ' : ''}
                          {r.backup_flag ? 'Backup' : ''}
                        </TableCell>
                        <TableCell>{r.allocation_percentage}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {slug === 'changes-release' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Changes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {(payload?.changes || []).map((c) => (
                    <div key={c.id} className="border-b border-slate-100 pb-2">
                      <div className="font-medium">{c.change_type}</div>
                      <div className="text-xs text-slate-500">{c.changed_on}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Releases</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {(payload?.releases || []).map((c) => (
                    <div key={c.id} className="border-b border-slate-100 pb-2">
                      <div className="font-medium">{c.release_type}</div>
                      <div className="text-xs text-slate-500">{c.release_date}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {slug === 'calendar-heatmap' && (
            <Card>
              <CardHeader>
                <CardTitle>Heatmap (allocation load)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {(payload?.cells || []).slice(0, 48).map((c, i) => (
                    <div
                      key={i}
                      title={`${c.employee_id} @ ${c.project_id}`}
                      className="rounded-md p-3 text-center text-xs text-white"
                      style={{
                        background: `rgba(79, 70, 229, ${Math.min(0.95, 0.25 + (Number(c.pct) || 0) / 200)})`,
                      }}
                    >
                      {c.pct}%
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {slug === 'documents-notes' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(payload?.notes || []).map((n) => (
                    <div key={n.id} className="border rounded-md p-2 text-sm">
                      <div className="text-xs text-slate-500">{n.created_at}</div>
                      {n.body}
                    </div>
                  ))}
                  <div>
                    <Label>Add note</Label>
                    <Input className="mt-1" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
                    <Button className="mt-2" type="button" onClick={saveNote}>
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Document metadata</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {(payload?.documents || []).map((d) => (
                    <div key={d.id} className="border-b border-slate-100 pb-2">
                      {d.file_name} <Badge variant="outline">{d.mime_type}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {slug === 'alerts-communication' && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Ack</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.items || []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.title}</TableCell>
                        <TableCell>{a.severity}</TableCell>
                        <TableCell>{a.acknowledged ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-right">
                          {!a.acknowledged ? (
                            <Button size="sm" variant="outline" onClick={() => ack(a.id)}>
                              Acknowledge
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {slug === 'analytics' && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-slate-500">Total</div>
                    <div className="text-2xl font-semibold">{payload?.total_allocations}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-slate-500">Billable</div>
                    <div className="text-2xl font-semibold">{payload?.billable_count}</div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-slate-500">Non-billable</div>
                    <div className="text-2xl font-semibold">{payload?.non_billable_count}</div>
                  </div>
                </div>
                <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-auto">{JSON.stringify(payload?.by_type || {}, null, 2)}</pre>
              </CardContent>
            </Card>
          )}

          {slug === 'forecasting' && (
            <Card>
              <CardContent className="pt-6 space-y-2 text-sm">
                <div>Horizon (months): {payload?.horizon_months}</div>
                <div>Projected utilization %: {payload?.projected_utilization_pct}</div>
                <div>Capacity gap FTE: {payload?.capacity_gap_fte}</div>
                <div>Bench FTE forecast: {payload?.bench_fte_forecast}</div>
                <pre className="text-xs bg-slate-50 p-3 rounded-md overflow-auto">{JSON.stringify(payload?.scenarios || [], null, 2)}</pre>
              </CardContent>
            </Card>
          )}

          {slug === 'ai-insights' && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                {(payload?.items || []).map((x) => (
                  <div key={x.id} className="flex justify-between border-b border-slate-100 pb-2 text-sm">
                    <div>
                      <div className="font-medium">{x.insight_type}</div>
                      <div className="text-xs text-slate-500">{x.is_mock ? 'Mock / AI-ready' : 'Live'}</div>
                    </div>
                    <Badge variant="outline">{(x.score || 0).toFixed(2)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {slug === 'approvals' && (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payload?.items || []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.request_type}</TableCell>
                        <TableCell>{a.current_stage}</TableCell>
                        <TableCell>{a.status}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => approvalAct(a.id, 'approve')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => approvalAct(a.id, 'reject')}>
                            Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AllocationWorkspacePage;
