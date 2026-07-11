import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { allocationSectionApi } from '@/shared/lib/api';
import AllocationSectionBreadcrumbs from './AllocationSectionBreadcrumbs';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { Loader2, Plus } from 'lucide-react';

const AllocationMasterListPage = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 25;
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await allocationSectionApi.masterList({ skip, limit, q: q || undefined, status: status || undefined });
      setRows(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch {
      toast.error('Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, status]);

  const onSearch = (e) => {
    e.preventDefault();
    setSkip(0);
    load();
  };

  const clone = async (id) => {
    try {
      await allocationSectionApi.masterClone(id);
      toast.success('Cloned allocation');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail?.message || err?.response?.data?.detail || 'Clone failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Soft-delete this allocation?')) return;
    try {
      await allocationSectionApi.masterDelete(id);
      toast.success('Allocation removed');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <AllocationSectionBreadcrumbs current="Allocation Master" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocation Master</h1>
          <p className="text-slate-600 mt-1">CRUD for staffing allocations with governance fields and drill-down.</p>
        </div>
        <Button asChild>
          <Link to="/resource-project-optimization/allocation/master/new">
            <Plus className="w-4 h-4 mr-2" />
            New allocation
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3 items-end" onSubmit={onSearch}>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Search</label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, role, remarks…" className="w-56" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Status</label>
              <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ACTIVE / PENDING…" className="w-36" />
            </div>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Allocation</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Billable</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Conflict</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.allocation_code || r.id.slice(0, 8)}</TableCell>
                    <TableCell>{r.project_name || r.project_id}</TableCell>
                    <TableCell>{r.employee_name || r.employee_id}</TableCell>
                    <TableCell>{r.role || '—'}</TableCell>
                    <TableCell>{r.allocation_type || '—'}</TableCell>
                    <TableCell>{r.billable ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{r.allocation_percentage}%</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.approval_status}</Badge>
                    </TableCell>
                    <TableCell>{r.conflict_flag ? <Badge variant="destructive">Yes</Badge> : '—'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/resource-project-optimization/allocation/master/${encodeURIComponent(r.id)}`}>View</Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => clone(r.id)}>
                        Clone
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4 text-sm text-slate-600">
              <span>
                {total} total — showing {skip + 1}-{Math.min(skip + limit, total)}
              </span>
              <div className="space-x-2">
                <Button variant="outline" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AllocationMasterListPage;
