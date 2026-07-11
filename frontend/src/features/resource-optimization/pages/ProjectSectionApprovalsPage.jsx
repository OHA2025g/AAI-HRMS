import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';

const ProjectSectionApprovalsPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await projectSectionApi.listApprovals({
        status: status !== 'all' ? status : undefined,
        project_id: embedProjectId || undefined,
        limit: 100,
      });
      setRows(res.data || []);
    } catch (e) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, embedProjectId]);

  const act = async (id, action) => {
    const reason = action === 'reject' ? window.prompt('Reason (optional)') || '' : undefined;
    try {
      await projectSectionApi.approve(id, action, reason);
      toast.success(action === 'approve' ? 'Approved' : 'Rejected');
      load();
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

  return (
    <div className="space-y-6">
      {!embedProjectId && (
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              Governance & Approvals
            </h1>
            <p className="text-slate-600">Pending approvals queue + history (MVP)</p>
          </div>
          <div className="min-w-[220px]">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="submitted">submitted</SelectItem>
                <SelectItem value="approved">approved</SelectItem>
                <SelectItem value="rejected">rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Approvals (this project)
          </h2>
          <div className="min-w-[180px]">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">pending</SelectItem>
                <SelectItem value="submitted">submitted</SelectItem>
                <SelectItem value="approved">approved</SelectItem>
                <SelectItem value="rejected">rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-slate-500">No approvals.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.type}</TableCell>
                    <TableCell>{r.project_id}</TableCell>
                    <TableCell>{(r.requested_at || '').slice(0, 19).replace('T', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === 'approved' ? 'default' : 'secondary'}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' || r.status === 'submitted' ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={() => act(r.id, 'approve')}>
                            Approve
                          </Button>
                          <Button variant="outline" onClick={() => act(r.id, 'reject')}>
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

export default ProjectSectionApprovalsPage;

