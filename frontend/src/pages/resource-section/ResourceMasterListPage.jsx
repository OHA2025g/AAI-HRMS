import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { resourceSectionApi } from '../../lib/api';
import ResourceSectionBreadcrumbs from './ResourceSectionBreadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2 } from 'lucide-react';

const ResourceMasterListPage = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 25;
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState({ q: '', department: '', status: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await resourceSectionApi.masterList({
        skip,
        limit,
        q: applied.q.trim() || undefined,
        department: applied.department.trim() || undefined,
        status: applied.status.trim() || undefined,
      });
      setRows(res.data?.items || []);
      setTotal(res.data?.total ?? 0);
    } catch {
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [skip, limit, applied]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <ResourceSectionBreadcrumbs current="Resource Master" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resource Master</h1>
          <p className="text-slate-600 mt-1 max-w-3xl">
            Employee-backed directory with deployability overlays (skills, utilization, bench, readiness). Core HR fields
            remain in Employees; extended workforce attributes are patched here.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/employees">Employees (HR)</Link>
          </Button>
          <Button asChild>
            <Link to="/resource-project-optimization/resource/master/new">Add resource</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input placeholder="Search name, code, email, role" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Input placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} className="max-w-xs" />
          <Input placeholder="Status (e.g. ACTIVE)" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs" />
          <Button
            variant="secondary"
            onClick={() => {
              setSkip(0);
              setApplied({ q, department, status });
            }}
          >
            Apply
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resources ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource ID</TableHead>
                    <TableHead>Employee code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Primary skill</TableHead>
                    <TableHead>Avail %</TableHead>
                    <TableHead>Util %</TableHead>
                    <TableHead>Bench</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id?.slice(0, 10)}…</TableCell>
                      <TableCell>{r.employee_code || '—'}</TableCell>
                      <TableCell className="font-medium">{r.full_name || r.email}</TableCell>
                      <TableCell>{r.department || '—'}</TableCell>
                      <TableCell>{r.role_title || r.profile_overlay?.designation || '—'}</TableCell>
                      <TableCell>{r.manager_name || '—'}</TableCell>
                      <TableCell>{r.location || '—'}</TableCell>
                      <TableCell>{r.profile_overlay?.employment_type || r.employment_type || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.status || '—'}</Badge>
                      </TableCell>
                      <TableCell>{r.primary_skill_display || '—'}</TableCell>
                      <TableCell>{r.availability_pct ?? '—'}</TableCell>
                      <TableCell>{r.utilization_pct ?? '—'}</TableCell>
                      <TableCell>{r.bench_active ? <Badge>Bench</Badge> : '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="link" className="h-auto p-0" asChild>
                          <Link to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.id)}`}>View</Link>
                        </Button>
                        <Button variant="link" className="h-auto p-0" asChild>
                          <Link to={`/resource-project-optimization/resource/master/${encodeURIComponent(r.id)}/edit`}>Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-slate-500">
              Showing {rows.length ? skip + 1 : 0}-{skip + rows.length} of {total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))}>
                Previous
              </Button>
              <Button variant="outline" disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourceMasterListPage;
