import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { allocationSectionApi, projectsApi } from '../../lib/api';
import AllocationSectionBreadcrumbs from './AllocationSectionBreadcrumbs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Loader2 } from 'lucide-react';

const AllocationRequestsPage = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [convertId, setConvertId] = useState(null);
  const [convertEmp, setConvertEmp] = useState('');
  const [convertPct, setConvertPct] = useState(100);
  const [form, setForm] = useState({
    project_id: '',
    request_title: '',
    required_role: '',
    required_skill: '',
    requested_count: 1,
    needed_from_date: '',
    needed_till_date: '',
    urgency: 'medium',
    priority: 'medium',
    billable_flag: true,
    justification: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([allocationSectionApi.requestsList(), projectsApi.list()]);
      setRows(r.data?.items || []);
      setProjects(Array.isArray(p.data) ? p.data : []);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await allocationSectionApi.requestsCreate({
        ...form,
        requested_count: Number(form.requested_count) || 1,
      });
      toast.success('Request created');
      setOpen(false);
      setForm({
        project_id: '',
        request_title: '',
        required_role: '',
        required_skill: '',
        requested_count: 1,
        needed_from_date: '',
        needed_till_date: '',
        urgency: 'medium',
        priority: 'medium',
        billable_flag: true,
        justification: '',
      });
      load();
    } catch {
      toast.error('Create failed');
    }
  };

  const convert = async () => {
    if (!convertId || !convertEmp) return;
    try {
      await allocationSectionApi.requestsConvert(convertId, {
        employee_id: convertEmp,
        allocation_percentage: Number(convertPct) || 100,
      });
      toast.success('Converted to allocation');
      setConvertId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail?.message || err?.response?.data?.detail || 'Convert failed');
    }
  };

  return (
    <div className="space-y-6">
      <AllocationSectionBreadcrumbs current="Allocation Requests" />
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Allocation Requests</h1>
          <p className="text-slate-600 mt-1">Staffing demand intake, prioritization, and traceable conversion to allocations.</p>
        </div>
        <Button onClick={() => setOpen((o) => !o)}>{open ? 'Close form' : 'New request'}</Button>
      </div>

      {open && (
        <Card>
          <CardHeader>
            <CardTitle>Create staffing request</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2 max-w-4xl" onSubmit={create}>
              <div className="sm:col-span-2">
                <Label>Project</Label>
                <select
                  className="mt-1 w-full border rounded-md h-10 px-3 text-sm"
                  required
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                >
                  <option value="">Select</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input
                  className="mt-1"
                  required
                  value={form.request_title}
                  onChange={(e) => setForm({ ...form, request_title: e.target.value })}
                />
              </div>
              <div>
                <Label>Required role</Label>
                <Input className="mt-1" value={form.required_role} onChange={(e) => setForm({ ...form, required_role: e.target.value })} />
              </div>
              <div>
                <Label>Required skill</Label>
                <Input className="mt-1" value={form.required_skill} onChange={(e) => setForm({ ...form, required_skill: e.target.value })} />
              </div>
              <div>
                <Label>Requested count</Label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1"
                  value={form.requested_count}
                  onChange={(e) => setForm({ ...form, requested_count: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.billable_flag}
                  onChange={(e) => setForm({ ...form, billable_flag: e.target.checked })}
                  id="bf"
                />
                <Label htmlFor="bf">Billable</Label>
              </div>
              <div>
                <Label>Needed from</Label>
                <Input type="date" className="mt-1" value={form.needed_from_date} onChange={(e) => setForm({ ...form, needed_from_date: e.target.value })} />
              </div>
              <div>
                <Label>Needed till</Label>
                <Input type="date" className="mt-1" value={form.needed_till_date} onChange={(e) => setForm({ ...form, needed_till_date: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Justification</Label>
                <Input className="mt-1" value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Submit request</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Role / Skill</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.request_title}</TableCell>
                    <TableCell className="text-xs font-mono">{r.project_id}</TableCell>
                    <TableCell>
                      {r.required_role} / {r.required_skill}
                    </TableCell>
                    <TableCell>{r.requested_count}</TableCell>
                    <TableCell className="text-xs">
                      {r.needed_from_date} → {r.needed_till_date}
                    </TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.request_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setConvertId(r.id)}>
                        Convert…
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {convertId && (
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle>Convert request to allocation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div>
              <Label>Employee ID</Label>
              <Input className="mt-1 w-56" value={convertEmp} onChange={(e) => setConvertEmp(e.target.value)} placeholder="UUID from Employees" />
            </div>
            <div>
              <Label>Allocation %</Label>
              <Input
                type="number"
                className="mt-1 w-24"
                min={1}
                max={100}
                value={convertPct}
                onChange={(e) => setConvertPct(e.target.value)}
              />
            </div>
            <Button onClick={convert}>Convert</Button>
            <Button variant="ghost" onClick={() => setConvertId(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AllocationRequestsPage;
