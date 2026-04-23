import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { resourceSectionApi } from '../../lib/api';
import ResourceSectionBreadcrumbs from './ResourceSectionBreadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2 } from 'lucide-react';

const ResourceMasterDetailPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await resourceSectionApi.masterGet(id);
        if (alive) setD(res.data);
      } catch {
        if (alive) toast.error('Failed to load resource');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const e = d?.employee || {};
  const name = e.full_name || e.email || 'Resource';

  return (
    <div className="space-y-6">
      <ResourceSectionBreadcrumbs
        trail={[{ label: 'Resource Master', path: '/resource-project-optimization/resource/master' }]}
        current={name}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
          <p className="text-slate-600 mt-1">
            {e.role_title || '—'} · {e.department || '—'} · Avail {d?.availability_pct ?? '—'}% · Alloc {d?.allocation_pct ?? '—'}%
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/employees`}>Employees</Link>
          </Button>
          <Button asChild>
            <Link to={`/resource-project-optimization/resource/master/${encodeURIComponent(id)}/edit`}>Edit overlay</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="avail">Availability &amp; Utilization</TabsTrigger>
          <TabsTrigger value="bench">Bench</TabsTrigger>
          <TabsTrigger value="readiness">Deployment Readiness</TabsTrigger>
          <TabsTrigger value="demand">Demand Match</TabsTrigger>
          <TabsTrigger value="mobility">Mobility &amp; Career</TabsTrigger>
          <TabsTrigger value="learning">Learning &amp; Certs</TabsTrigger>
          <TabsTrigger value="cost">Cost &amp; Commercial</TabsTrigger>
          <TabsTrigger value="attend">Attendance &amp; Leave</TabsTrigger>
          <TabsTrigger value="docs">Documents &amp; Compliance</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Identity</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-slate-700">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Email</span>
                  <span>{e.email || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Code</span>
                  <span>{e.employee_code || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Location</span>
                  <span>{e.location || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Billable class</span>
                  <span>{d?.profile?.billable_classification || '—'}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Profile overlay</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 whitespace-pre-wrap">
                {d?.profile?.profile_summary || 'No overlay summary yet.'}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Extended skill records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Years</TableHead>
                    <TableHead>Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.skills_extended || []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.skill_name}</TableCell>
                      <TableCell>{s.skill_type}</TableCell>
                      <TableCell>{s.proficiency_level || s.competency_level || '—'}</TableCell>
                      <TableCell>{s.experience_years ?? '—'}</TableCell>
                      <TableCell>{s.verified_flag ? <Badge>Yes</Badge> : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avail">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Availability record</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                <pre className="text-xs overflow-auto bg-slate-50 p-3 rounded-md">
                  {JSON.stringify(d?.availability || {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Utilization snapshots</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Overall</TableHead>
                      <TableHead>Billable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(d?.utilization_history || []).map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.snapshot_period}</TableCell>
                        <TableCell>{u.overall_utilization}</TableCell>
                        <TableCell>{u.billable_utilization}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bench">
          <Card>
            <CardContent className="pt-6 text-sm">
              {d?.bench ? <pre className="text-xs overflow-auto">{JSON.stringify(d.bench, null, 2)}</pre> : <p>Not on bench.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness">
          <Card>
            <CardContent className="pt-6 text-sm">
              {d?.readiness ? <pre className="text-xs overflow-auto">{JSON.stringify(d.readiness, null, 2)}</pre> : <p>No scorecard.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demand">
          <Card>
            <CardHeader>
              <CardTitle>Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Demand</TableHead>
                    <TableHead>Fit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.demand_matches || []).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.demand_id}</TableCell>
                      <TableCell>{m.fit_score}</TableCell>
                      <TableCell>{m.match_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobility">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mobility history</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>From → To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(d?.mobility || []).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.event_type}</TableCell>
                        <TableCell>{m.event_date}</TableCell>
                        <TableCell>
                          {m.from_value} → {m.to_value}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Career preferences</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <pre className="text-xs overflow-auto">{JSON.stringify(d?.career || {}, null, 2)}</pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="learning">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(d?.learning || []).map((x) => (
                      <TableRow key={x.id}>
                        <TableCell>{x.program_name}</TableCell>
                        <TableCell>{x.status}</TableCell>
                        <TableCell>{x.hours}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Mandatory</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(d?.certifications || []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.certification_name}</TableCell>
                        <TableCell>{c.expiry_date}</TableCell>
                        <TableCell>{c.mandatory_flag ? 'Yes' : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cost">
          <Card>
            <CardContent className="pt-6 text-sm">
              <pre className="text-xs overflow-auto">{JSON.stringify(d?.cost || {}, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attend">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Attendance %</TableHead>
                    <TableHead>Planned leave</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.attendance_impact || []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.period}</TableCell>
                      <TableCell>{a.attendance_pct}</TableCell>
                      <TableCell>{a.planned_leave_days}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(d?.documents || []).map((x) => (
                      <TableRow key={x.id}>
                        <TableCell>{x.title}</TableCell>
                        <TableCell>{x.document_category}</TableCell>
                        <TableCell>{x.compliance_status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Compliance checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(d?.compliance || []).map((x) => (
                      <TableRow key={x.id}>
                        <TableCell>{x.checklist_item}</TableCell>
                        <TableCell>{x.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6 space-y-3">
              {(d?.notes || []).map((n) => (
                <div key={n.id} className="border-b border-slate-100 pb-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{n.title || n.note_type}</span>
                    <Badge variant="outline">{n.created_at}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{n.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(d?.approvals || []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.approval_type}</TableCell>
                      <TableCell>{a.status}</TableCell>
                      <TableCell>{a.submitted_on}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-slate-500 mt-3">
                Approve or reject from Approvals &amp; Governance (admin / hr_admin).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardContent className="pt-6 space-y-3">
              {(d?.ai_insights || []).map((x) => (
                <div key={x.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{x.insight_type}</span>
                    {x.is_mock ? <Badge variant="secondary">Mock</Badge> : null}
                  </div>
                  <pre className="text-xs mt-2 text-slate-600 overflow-auto">{JSON.stringify(x.insight_payload, null, 2)}</pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResourceMasterDetailPage;
