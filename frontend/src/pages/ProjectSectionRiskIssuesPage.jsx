import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Loader2, Plus } from 'lucide-react';

const ProjectSectionRiskIssuesPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');

  const [risks, setRisks] = useState([]);
  const [issues, setIssues] = useState([]);

  const [riskOpen, setRiskOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);

  const [riskForm, setRiskForm] = useState({ title: '', category: '', severity: 'high', status: 'open', mitigation_plan: '' });
  const [issueForm, setIssueForm] = useState({ title: '', category: '', severity: 'medium', status: 'open', due_date: '' });

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    if (!pid) return;
    const [rRes, iRes] = await Promise.all([projectSectionApi.listRisks(pid), projectSectionApi.listIssues(pid)]);
    setRisks(rRes.data || []);
    setIssues(iRes.data || []);
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
    (async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        await load(projectId);
      } catch (e) {
        toast.error('Failed to load risks/issues');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const createRisk = async () => {
    if (!riskForm.title.trim()) return toast.error('Title required');
    try {
      await projectSectionApi.createRisk(projectId, { ...riskForm, title: riskForm.title.trim() });
      toast.success('Risk created');
      setRiskOpen(false);
      setRiskForm({ title: '', category: '', severity: 'high', status: 'open', mitigation_plan: '' });
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Create failed');
    }
  };

  const createIssue = async () => {
    if (!issueForm.title.trim()) return toast.error('Title required');
    try {
      await projectSectionApi.createIssue(projectId, { ...issueForm, title: issueForm.title.trim() });
      toast.success('Issue created');
      setIssueOpen(false);
      setIssueForm({ title: '', category: '', severity: 'medium', status: 'open', due_date: '' });
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Create failed');
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
              Risk / Issue / Compliance
            </h1>
            <p className="text-slate-600">Risk register + issue register (MVP)</p>
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="min-w-[280px]">
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
            <Button variant="outline" onClick={() => setRiskOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New risk
            </Button>
            <Button onClick={() => setIssueOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> New issue
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Risks & Issues
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRiskOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Risk
            </Button>
            <Button size="sm" onClick={() => setIssueOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Issue
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Risks</CardTitle>
          </CardHeader>
          <CardContent>
            {risks.length === 0 ? (
              <p className="text-slate-500">No risks.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((r) => (
                    <TableRow key={r.risk_id}>
                      <TableCell className="font-medium">{r.risk_id}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.severity || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.status || 'open'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues</CardTitle>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <p className="text-slate-500">No issues.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((r) => (
                    <TableRow key={r.issue_id}>
                      <TableCell className="font-medium">{r.issue_id}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell>{r.severity || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.status || 'open'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={riskOpen} onOpenChange={setRiskOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create risk</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={riskForm.title} onChange={(e) => setRiskForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={riskForm.category} onChange={(e) => setRiskForm((p) => ({ ...p, category: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mitigation plan</Label>
              <Textarea value={riskForm.mitigation_plan} onChange={(e) => setRiskForm((p) => ({ ...p, mitigation_plan: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRiskOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createRisk}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create issue</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={issueForm.title} onChange={(e) => setIssueForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={issueForm.category} onChange={(e) => setIssueForm((p) => ({ ...p, category: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input value={issueForm.due_date} onChange={(e) => setIssueForm((p) => ({ ...p, due_date: e.target.value }))} placeholder="YYYY-MM-DD" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIssueOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createIssue}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSectionRiskIssuesPage;

