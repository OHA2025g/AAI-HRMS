import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { projectSectionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Loader2 } from 'lucide-react';

const ProjectSectionAIRecommendationsPage = ({ embedProjectId = null }) => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(embedProjectId || '');
  const [data, setData] = useState(null);

  const loadProjects = async () => {
    const res = await projectSectionApi.listProjects({ page: 1, page_size: 200 });
    const items = res.data?.items || [];
    setProjects(items);
    if (!projectId && items.length > 0) setProjectId(items[0].id);
  };

  const load = async (pid) => {
    const res = await projectSectionApi.aiRecommendations(pid);
    setData(res.data || null);
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
        toast.error('Failed to load AI recommendations');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
              AI Recommendations
            </h1>
            <p className="text-slate-600">AI-ready contract (currently mocked)</p>
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
            <Button variant="outline" onClick={() => load(projectId)} disabled={!projectId}>
              Refresh
            </Button>
          </div>
        </div>
      )}

      {embedProjectId && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            AI recommendations
          </h2>
          <Button variant="outline" size="sm" onClick={() => load(projectId)} disabled={!projectId}>
            Refresh
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Delay risk</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{data?.predicted_delay_risk?.risk_level || 'unknown'}</Badge>
            <ul className="mt-2 text-sm text-slate-600 list-disc pl-5">
              {(data?.predicted_delay_risk?.reasons || []).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget overrun warning</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{data?.budget_overrun_warning?.risk_level || 'unknown'}</Badge>
            <ul className="mt-2 text-sm text-slate-600 list-disc pl-5">
              {(data?.budget_overrun_warning?.reasons || []).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            {data?.generated_at ? data.generated_at.replace('T', ' ').slice(0, 19) : '-'}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming staffing gaps</CardTitle>
        </CardHeader>
        <CardContent>
          {((data?.upcoming_staffing_gaps || [])?.length || 0) === 0 ? (
            <p className="text-slate-500">No gaps detected (or not enough data).</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.upcoming_staffing_gaps || []).map((r, idx) => (
                  <TableRow key={`${r.role_name}-${r.skill_name}-${idx}`}>
                    <TableCell className="font-medium">{r.role_name}</TableCell>
                    <TableCell>{r.skill_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.open_count}</Badge>
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

export default ProjectSectionAIRecommendationsPage;

