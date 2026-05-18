import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { employeeApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, Plus, ArrowRight } from 'lucide-react';

export default function ElmEmployeeMasterListPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState(1);

  const fetchRows = async (pageOverride) => {
    setLoading(true);
    try {
      const p = pageOverride || page;
      const params = { page: p, page_size: pageSize, sort_by: 'created_at', sort_dir: 'desc' };
      if (q) params.q = q;
      if (status !== 'all') params.status = status;
      if (department !== 'all') params.department = department;
      const res = await employeeApi.listPaged(params);
      const payload = res.data || {};
      setRows(payload.items || []);
      setTotalPages(payload.total_pages || 1);
      const depts = Array.from(new Set((payload.items || []).map((r) => r.department).filter(Boolean))).sort();
      setDepartments(depts);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const header = useMemo(() => {
    const count = rows.length;
    return `${count} employees`;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Employee Master</div>
          <div className="text-sm text-muted-foreground">Central employee profile layer for lifecycle orchestration</div>
        </div>
        <Button onClick={() => nav('/employee-lifecycle-management/employee-master/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New employee
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{header}</CardTitle>
          <CardDescription>Search and filter by status and department</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, employee code…" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="ONBOARDING">ONBOARDING</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                <SelectItem value="EXITED">EXITED</SelectItem>
              </SelectContent>
            </Select>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => fetchRows(1)}>
              Apply
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.full_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{r.employee_code || r.id}</div>
                      </TableCell>
                      <TableCell>{r.department || '-'}</TableCell>
                      <TableCell>{r.location || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'ACTIVE' ? 'default' : 'secondary'}>{r.status || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/employee-lifecycle-management/employee-master/${encodeURIComponent(r.id)}`}>
                              View <ArrowRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              nav(`/employee-lifecycle-management/employee-master/${encodeURIComponent(r.id)}/edit`)
                            }
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

