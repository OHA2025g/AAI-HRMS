import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { allocationsApi, projectSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';

const ProjectSectionAllocationIntegrationPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [summary, setSummary] = useState(null);

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    const res = await projectSectionApi.allocationSummary(pid);
    setSummary(res.data || null);
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
        toast.error('Failed to load allocations');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const approve = async (allocationId, action) => {
    const reason = action === 'reject' ? window.prompt('Reason (optional)') || '' : undefined;
    try {
      await allocationsApi.approve(allocationId, action, reason);
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Action failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const items = summary?.items || [];

  return (
    <div className="space-y-6">
      {!embedProjectId && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              Allocation Integration
            </h1>
            <p className="text-slate-600">Project-wise allocations summary + approval actions</p>
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
            <Button variant="outline" onClick={() => load(projectId)} disabled={!projectId}>
              Refresh
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Allocations
          </h2>
          <Button variant="outline" size="sm" onClick={() => load(projectId)} disabled={!projectId}>
            Refresh
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total allocations</p>
            <p className="text-2xl font-bold">{summary?.total_allocations ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Active</p>
            <p className="text-2xl font-bold">{summary?.active_allocations ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="text-2xl font-bold">{summary?.pending_allocations ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-slate-500">No allocations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.employee_id}</TableCell>
                    <TableCell>{a.role || '-'}</TableCell>
                    <TableCell>{a.allocation_percentage}%</TableCell>
                    <TableCell>{(a.start_date || '-') + ' → ' + (a.end_date || '-')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{a.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.approval_status === 'APPROVED' ? 'default' : 'outline'}>{a.approval_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {a.approval_status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => approve(a.id, 'approve')}>
                            Approve
                          </Button>
                          <Button variant="outline" onClick={() => approve(a.id, 'reject')}>
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
    </div>
  );
};

export default ProjectSectionAllocationIntegrationPage;

