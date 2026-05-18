import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2 } from 'lucide-react';

const STATES = [
  'draft',
  'proposed',
  'under_review',
  'approved',
  'active',
  'on_hold',
  'completed',
  'closed',
  'cancelled',
];

const ProjectSectionLifecyclePage = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [toState, setToState] = useState('proposed');

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    const [pRes, hRes] = await Promise.all([projectSectionApi.getProject(pid), projectSectionApi.lifecycleHistory(pid)]);
    setProject(pRes.data || null);
    setHistory(hRes.data || []);
    setToState(pRes.data?.project_status === 'draft' ? 'proposed' : pRes.data?.project_status || 'proposed');
  };

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      try {
        await load(projectId);
      } catch (e) {
        toast.error('Failed to load lifecycle');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const transition = async () => {
    if (!projectId) return;
    try {
      const res = await projectSectionApi.transitionLifecycle(projectId, {
        to_state: toState,
        reason: '',
      });
      const msg = res?.data?.message;
      if (msg === 'Approval required') toast.message('Approval required. Check Governance & Approvals.');
      else toast.success('Transition applied');
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Transition failed');
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Project Lifecycle
          </h1>
          <p className="text-slate-600">State transitions + audit timeline</p>
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
          <div className="min-w-[200px]">
            <Label className="text-xs">To state</Label>
            <Select value={toState} onValueChange={setToState}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={transition} disabled={!project}>
            Apply transition
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Badge variant="secondary">{project?.project_status || '-'}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-slate-500">No lifecycle history.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.from_state || '-'}</TableCell>
                    <TableCell className="font-medium">{h.to_state}</TableCell>
                    <TableCell>{h.reason || '-'}</TableCell>
                    <TableCell>{(h.changed_at || '').replace('T', ' ').slice(0, 19)}</TableCell>
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

export default ProjectSectionLifecyclePage;

