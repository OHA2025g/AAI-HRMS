import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Loader2, Plus } from 'lucide-react';

const CATEGORIES = [
  'SOW',
  'Proposal',
  'Contract',
  'BRD',
  'SRS',
  'Design Docs',
  'Change Requests',
  'Sign-off Docs',
  'Closure Docs',
  'Other',
];

const ProjectSectionDocumentsPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [docs, setDocs] = useState([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ doc_name: '', category: 'SOW', url: '', version: 'v1', tags: '' });

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    const res = await projectSectionApi.listDocuments(pid);
    setDocs(res.data || []);
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
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const add = async () => {
    if (!form.doc_name.trim()) return toast.error('Document name required');
    try {
      await projectSectionApi.addDocument(projectId, {
        doc_name: form.doc_name.trim(),
        category: form.category,
        url: form.url.trim() || null,
        version: form.version.trim() || null,
        tags: (form.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
      });
      toast.success('Added');
      setOpen(false);
      setForm({ doc_name: '', category: 'SOW', url: '', version: 'v1', tags: '' });
      await load(projectId);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Add failed');
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
              Documents & Knowledge
            </h1>
            <p className="text-slate-600">Metadata + links (upload integration-ready)</p>
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
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add document
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Documents
          </h2>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-slate-500">No documents.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.doc_name}</TableCell>
                    <TableCell>{d.category}</TableCell>
                    <TableCell>{d.version || '-'}</TableCell>
                    <TableCell>
                      {d.url ? (
                        <a className="text-indigo-700 hover:underline" href={d.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{(d.created_at || '').slice(0, 10) || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add document</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Document name</Label>
              <Input value={form.doc_name} onChange={(e) => setForm((p) => ({ ...p, doc_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL / link</Label>
              <Input value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={add}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectSectionDocumentsPage;

