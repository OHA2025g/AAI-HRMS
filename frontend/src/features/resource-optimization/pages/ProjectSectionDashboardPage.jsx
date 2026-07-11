import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';

const ProjectSectionDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [filters, setFilters] = useState({
    q: '',
    status: 'all',
    business_unit: 'all',
    manager_id: 'all',
    client_name: 'all',
    from: '',
    to: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        q: filters.q || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        business_unit: filters.business_unit !== 'all' ? filters.business_unit : undefined,
        manager_id: filters.manager_id !== 'all' ? filters.manager_id : undefined,
        client_name: filters.client_name !== 'all' ? filters.client_name : undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      };
      const res = await projectSectionApi.dashboardSummary(params);
      setData(res.data || null);
    } catch (e) {
      toast.error('Failed to load project dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickList = useMemo(() => data?.quick_list || [], [data]);
  const statusDist = useMemo(() => data?.distributions?.by_status || [], [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const kpi = data?.kpi || {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Project Dashboard
          </h1>
          <p className="text-slate-600">Resource vs Project Optimization → Project Section</p>
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} placeholder="Project / code / client…" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters((p) => ({ ...p, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="proposed">Proposed</SelectItem>
                <SelectItem value="under_review">Under review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date range</Label>
            <div className="flex gap-2">
              <Input value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} placeholder="From (YYYY-MM-DD)" />
              <Input value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} placeholder="To (YYYY-MM-DD)" />
            </div>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={load}>Apply</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Total projects</p>
            <p className="text-2xl font-bold">{kpi.total_projects || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Active</p>
            <p className="text-2xl font-bold">{kpi.active_projects || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-2xl font-bold">{kpi.completed_projects || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">On hold</p>
            <p className="text-2xl font-bold">{kpi.on_hold_projects || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Delayed</p>
            <p className="text-2xl font-bold">{kpi.delayed_projects || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Projects by status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDist.length === 0 ? (
              <p className="text-slate-500">No data.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusDist.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="font-medium">{r.key}</TableCell>
                      <TableCell>{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick list</CardTitle>
          </CardHeader>
          <CardContent>
            {quickList.length === 0 ? (
              <p className="text-slate-500">No projects found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>End date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quickList.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.project_code}</TableCell>
                      <TableCell>{p.project_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.project_status}</Badge>
                      </TableCell>
                      <TableCell>{p.end_date || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectSectionDashboardPage;

