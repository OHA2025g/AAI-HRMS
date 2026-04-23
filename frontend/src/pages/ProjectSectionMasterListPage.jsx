import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { projectSectionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, Plus } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';

const ProjectSectionMasterListPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    q: '',
    status: 'all',
    priority: 'all',
    include_archived: false,
  });

  const params = useMemo(() => {
    return {
      page,
      page_size: 25,
      q: filters.q || undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      priority: filters.priority !== 'all' ? filters.priority : undefined,
      include_archived: !!filters.include_archived,
    };
  }, [filters, page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await projectSectionApi.listProjects(params);
      const payload = res.data || {};
      setRows(payload.items || []);
      setTotal(payload.total || 0);
      setTotalPages(payload.total_pages || 1);
    } catch (e) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const archiveProject = async (id) => {
    if (!window.confirm('Archive project?')) return;
    try {
      await projectSectionApi.archiveProject(id);
      toast.success('Archived');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Archive failed');
    }
  };

  const cloneProject = async (id) => {
    try {
      const res = await projectSectionApi.cloneProject(id);
      toast.success('Cloned');
      const newId = res.data?.id;
      if (newId) navigate(`/resource-project-optimization/projects/master/${encodeURIComponent(newId)}`);
      else load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Clone failed');
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/resource-optimization">Resource vs Project Optimization</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/resource-project-optimization/projects/dashboard">Project Section</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Project Master</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Project Master
          </h1>
          <p className="text-slate-600">Enterprise project master management</p>
        </div>
        <Button asChild>
          <Link to="/resource-project-optimization/projects/master/new">
            <Plus className="w-4 h-4 mr-2" /> New project
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Search</Label>
            <Input
              value={filters.q}
              onChange={(e) => {
                setPage(1);
                setFilters((p) => ({ ...p, q: e.target.value }));
              }}
              placeholder="Project name / code / client…"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(v) => {
                setPage(1);
                setFilters((p) => ({ ...p, status: v }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="proposed">proposed</SelectItem>
                <SelectItem value="under_review">under_review</SelectItem>
                <SelectItem value="approved">approved</SelectItem>
                <SelectItem value="active">active</SelectItem>
                <SelectItem value="on_hold">on_hold</SelectItem>
                <SelectItem value="completed">completed</SelectItem>
                <SelectItem value="closed">closed</SelectItem>
                <SelectItem value="cancelled">cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={filters.priority}
              onValueChange={(v) => {
                setPage(1);
                setFilters((p) => ({ ...p, priority: v }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="low">low</SelectItem>
                <SelectItem value="medium">medium</SelectItem>
                <SelectItem value="high">high</SelectItem>
                <SelectItem value="critical">critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Projects <span className="text-slate-400 font-normal">({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-slate-500">No projects found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Code</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>BU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.project_code}</TableCell>
                    <TableCell>
                      <Link className="text-indigo-700 hover:underline" to={`/resource-project-optimization/projects/master/${encodeURIComponent(p.id)}`}>
                        {p.project_name}
                      </Link>
                    </TableCell>
                    <TableCell>{p.client_name || '-'}</TableCell>
                    <TableCell>{p.business_unit || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.project_status}</Badge>
                    </TableCell>
                    <TableCell>{p.project_priority}</TableCell>
                    <TableCell>{p.project_health}</TableCell>
                    <TableCell>{p.project_budget ? p.project_budget.toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" asChild>
                          <Link to={`/resource-project-optimization/projects/master/${encodeURIComponent(p.id)}/edit`}>Edit</Link>
                        </Button>
                        <Button variant="secondary" onClick={() => cloneProject(p.id)}>
                          Clone
                        </Button>
                        <Button variant="ghost" className="text-red-700" onClick={() => archiveProject(p.id)}>
                          Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-600">
              Page {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectSectionMasterListPage;

