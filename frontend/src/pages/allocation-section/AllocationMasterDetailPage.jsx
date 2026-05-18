import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { allocationSectionApi, allocationsApi } from '../../lib/api';
import AllocationSectionBreadcrumbs from './AllocationSectionBreadcrumbs';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2 } from 'lucide-react';

const tabs = ['Overview', 'Conflicts', 'Roll-On / Roll-Off', 'Notes', 'AI insights'];

const AllocationMasterDetailPage = () => {
  const { id } = useParams();
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [rolls, setRolls] = useState([]);
  const [notes, setNotes] = useState([]);
  const [ai, setAi] = useState([]);

  const loadCore = async () => {
    const res = await allocationSectionApi.masterGet(id);
    setRow(res.data);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await loadCore();
      const [cc, rr, nn, aiRes] = await Promise.all([
        allocationSectionApi.capacityConflicts(),
        allocationSectionApi.rollonRolloff(),
        allocationSectionApi.documentsNotes({ allocation_id: id }),
        allocationSectionApi.aiInsights(),
      ]);
      const allC = cc.data?.conflicts || [];
      setConflicts(allC.filter((c) => c.allocation_id === id));
      const allR = rr.data?.items || [];
      setRolls(allR.filter((r) => r.allocation_id === id));
      setNotes(nn.data?.notes || []);
      const allAi = aiRes.data?.items || [];
      setAi(allAi.filter((x) => x.allocation_id === id).slice(0, 12));
    } catch {
      toast.error('Failed to load allocation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const approve = async (action) => {
    try {
      await allocationsApi.approve(id, action, action === 'reject' ? 'Not aligned' : undefined);
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      loadCore();
    } catch {
      toast.error('Approval action failed');
    }
  };

  if (loading || !row) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AllocationSectionBreadcrumbs current={`Allocation ${row.allocation_code || row.id.slice(0, 8)}`} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{row.allocation_code || 'Allocation'}</h1>
          <p className="text-slate-600 mt-1">
            {row.project_name || row.project_id} · {row.employee_name || row.employee_id}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/resource-project-optimization/allocation/master/${encodeURIComponent(id)}/edit`}>Edit</Link>
          </Button>
          <Button variant="outline" onClick={() => approve('approve')} disabled={row.approval_status === 'APPROVED'}>
            Approve
          </Button>
          <Button variant="outline" onClick={() => approve('reject')} disabled={row.approval_status === 'REJECTED'}>
            Reject
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Core</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <Badge>{row.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approval</span>
                <Badge variant="outline">{row.approval_status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Allocation %</span>
                <span>{row.allocation_percentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Window</span>
                <span>
                  {row.start_date || '—'} → {row.end_date || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billable</span>
                <span>{row.billable ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span>{row.allocation_type || '—'}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Flags & commercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Primary: {row.primary_project_flag ? 'Yes' : 'No'}</div>
              <div>Shadow: {row.shadow_flag ? 'Yes' : 'No'}</div>
              <div>Backup: {row.backup_flag ? 'Yes' : 'No'}</div>
              <div>Reserve: {row.reserve_flag ? 'Yes' : 'No'}</div>
              <div>Cost rate: {row.cost_rate ?? '—'}</div>
              <div>Billing rate: {row.billing_rate ?? '—'}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Conflicts' && (
        <Card>
          <CardHeader>
            <CardTitle>Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            {conflicts.length === 0 ? (
              <p className="text-sm text-slate-500">No conflicts for this allocation.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conflicts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.conflict_type}</TableCell>
                      <TableCell>{c.severity}</TableCell>
                      <TableCell>{c.resolution_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Roll-On / Roll-Off' && (
        <Card>
          <CardHeader>
            <CardTitle>Movement</CardTitle>
          </CardHeader>
          <CardContent>
            {rolls.length === 0 ? (
              <p className="text-sm text-slate-500">No roll-on/roll-off rows.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Planned roll-on</TableHead>
                    <TableHead>Actual roll-on</TableHead>
                    <TableHead>Planned roll-off</TableHead>
                    <TableHead>Readiness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rolls.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.planned_rollon_date || '—'}</TableCell>
                      <TableCell>{r.actual_rollon_date || '—'}</TableCell>
                      <TableCell>{r.planned_rolloff_date || '—'}</TableCell>
                      <TableCell>{r.readiness_status || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Notes' && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes.</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="border border-slate-100 rounded-md p-3 text-sm">
                  <div className="text-xs text-slate-500 mb-1">{n.created_at}</div>
                  {n.body}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'AI insights' && (
        <Card>
          <CardHeader>
            <CardTitle>AI-ready insights (mock / rule-based)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ai.length === 0 ? (
              <p className="text-sm text-slate-500">No insights for this allocation.</p>
            ) : (
              ai.map((x) => (
                <div key={x.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2 text-sm">
                  <span>{x.insight_type}</span>
                  <Badge variant="outline">score {(x.score || 0).toFixed(2)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AllocationMasterDetailPage;
