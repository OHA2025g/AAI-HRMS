import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { trainingRecommendationsApi } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const WorkforceTrainingRecommendationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [managerId, setManagerId] = useState('');
  const [managerSummary, setManagerSummary] = useState(null);
  const [catalog, setCatalog] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await trainingRecommendationsApi.getRecommendations({ q: q || undefined, page, page_size: pageSize, max_skills_per_employee: 3 });
      setData(res.data || null);
    } catch (e) {
      toast.error('Failed to load training recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    (async () => {
      try {
        const res = await trainingRecommendationsApi.listCatalog({ limit: 8 });
        setCatalog(res.data || []);
      } catch {
        setCatalog([]);
      }
    })();
  }, []);

  const onSearch = () => {
    setPage(1);
    load();
  };

  const loadManagerSummary = async () => {
    const id = (managerId || '').trim();
    if (!id) {
      toast.error('Enter manager employee UUID (from Employees)');
      return;
    }
    try {
      const res = await trainingRecommendationsApi.getManagerSummary(id);
      setManagerSummary(res.data || null);
    } catch (e) {
      toast.error('Could not load manager summary');
      setManagerSummary(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const recs = data?.recommendations || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:flex-nowrap justify-between gap-3">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Training Recommendations</h1>
          <p className="text-slate-600">Phase-3 Employee Training & Skill Development (M5 MVP)</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0 justify-end">
          <div className="flex-1 min-w-0 max-w-xl">
            <Input placeholder="Search employee code/name" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button variant="outline" onClick={onSearch} className="w-full sm:w-auto shrink-0">Search</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manager team snapshot (M5-3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Use the employee <strong>id</strong> (UUID) of the manager — same as in org / direct-reports APIs.
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <Input
              className="max-w-md"
              placeholder="manager_employee_id (UUID)"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={loadManagerSummary}>
              Load summary
            </Button>
          </div>
          {managerSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500">Direct reports</p>
                <p className="text-2xl font-semibold">{managerSummary.direct_reports}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500">Assignments in progress</p>
                <p className="text-2xl font-semibold">{managerSummary.assignments_in_progress}</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500">Assignments completed</p>
                <p className="text-2xl font-semibold">{managerSummary.assignments_completed}</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-xs text-amber-800">Certs expiring (60d)</p>
                <p className="text-2xl font-semibold text-amber-900">
                  {managerSummary.certifications_expiring_60d}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {catalog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>LMS catalog (latest sync)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {catalog.map((c) => (
                <Badge key={c.id} variant="outline" className="text-xs">
                  {c.title_norm || c.external_id}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Admin: POST /api/admin/training/lms/sync to populate.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personalized Learning Paths</CardTitle>
        </CardHeader>
        <CardContent>
          {recs.length === 0 ? (
            <p className="text-slate-500">No training recommendations available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Missing Skills</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recs.map((r) => (
                  <TableRow key={r.employee_code}>
                    <TableCell>
                      <div className="font-medium">{r.full_name || '-'}</div>
                      <div className="text-xs text-slate-500">{r.employee_code}</div>
                    </TableCell>
                    <TableCell>
                      {r.recommended_skills && r.recommended_skills.length > 0 ? (
                        <div className="space-y-4">
                          {r.recommended_skills.map((s) => (
                            <div key={s.skill_name} className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary">{s.skill_name}</Badge>
                                <Badge variant="outline">{s.priority}</Badge>
                              </div>
                              <div className="text-sm text-slate-600">{s.reason}</div>
                              <div className="text-xs text-slate-500 space-y-1">
                                {s.path_steps?.map((step, idx) => (
                                  <div key={`${s.skill_name}-${idx}`}>
                                    <span className="font-medium text-slate-700">{idx + 1}. </span>
                                    {step.step_title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">No gaps detected for top skills.</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {data && data.total_pages > 1 ? (
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-sm text-slate-600">Page {page} of {data.total_pages}</span>
              <Button variant="outline" disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkforceTrainingRecommendationsPage;

