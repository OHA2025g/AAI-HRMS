import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { trainingDevelopmentApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2 } from 'lucide-react';

const TdTrainingMasterDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState(null);
  const [tab, setTab] = useState('overview');

  const load = async () => {
    setLoading(true);
    try {
      const res = await trainingDevelopmentApi.getProgramDetail(id);
      setBundle(res.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load program');
      navigate('/training-development/training-master');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onClone = async () => {
    try {
      const res = await trainingDevelopmentApi.cloneProgram(id);
      const nid = res.data?.id;
      toast.success('Cloned');
      if (nid) navigate(`/training-development/training-master/${encodeURIComponent(nid)}`);
      else load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Clone failed');
    }
  };

  const onArchive = async () => {
    if (!window.confirm('Archive this program?')) return;
    try {
      await trainingDevelopmentApi.archiveProgram(id);
      toast.success('Archived');
      navigate('/training-development/training-master');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Archive failed');
    }
  };

  if (loading || !bundle) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const p = bundle.program || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              {p.training_name}
            </h1>
            <Badge>{p.status}</Badge>
            <Badge variant="outline">v{p.version}</Badge>
          </div>
          <p className="text-slate-600 mt-1 font-mono text-sm">{p.training_code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/training-development/training-master">Back</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/training-development/training-master/${encodeURIComponent(id)}/edit`}>Edit</Link>
          </Button>
          <Button variant="secondary" size="sm" onClick={onClone}>
            Clone
          </Button>
          <Button variant="destructive" size="sm" onClick={onArchive}>
            Archive
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="more">More</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">Category:</span> {p.training_category}
              </div>
              <div>
                <span className="text-slate-500">Type:</span> {p.training_type}
              </div>
              <div>
                <span className="text-slate-500">Mode:</span> {p.delivery_mode}
              </div>
              <div>
                <span className="text-slate-500">Duration:</span> {p.duration_hours} h
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-500">Flags:</span>{' '}
                {p.mandatory_flag ? <Badge className="mr-1">Mandatory</Badge> : null}
                {p.compliance_flag ? <Badge variant="secondary">Compliance</Badge> : null}
                {p.certification_flag ? <Badge variant="outline">Certification</Badge> : null}
              </div>
              {p.description ? (
                <div className="md:col-span-2">
                  <div className="text-slate-500 mb-1">Description</div>
                  <p className="whitespace-pre-wrap">{p.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card className="border-slate-200">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bundle.sessions || []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.session_title}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{s.start_datetime}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{s.end_datetime}</TableCell>
                      <TableCell>{s.delivery_mode}</TableCell>
                      <TableCell>{s.session_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(bundle.sessions || []).length === 0 ? <p className="text-sm text-slate-500 py-4">No sessions.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches">
          <Card className="border-slate-200">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bundle.batches || []).map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.batch_code}</TableCell>
                      <TableCell>{b.batch_name}</TableCell>
                      <TableCell>{b.capacity}</TableCell>
                      <TableCell>{b.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments">
          <Card className="border-slate-200">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Waitlist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bundle.enrollments || []).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.employee_id}</TableCell>
                      <TableCell>{e.enrollment_status}</TableCell>
                      <TableCell>{e.approval_status}</TableCell>
                      <TableCell>{e.waitlist_flag ? 'Yes' : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="border-slate-200">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bundle.attendance || []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.session_id}</TableCell>
                      <TableCell className="font-mono text-xs">{a.employee_id}</TableCell>
                      <TableCell>{a.attendance_status}</TableCell>
                      <TableCell>{a.participation_score ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Assessments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(bundle.assessments || []).length === 0 ? (
                  <p className="text-slate-500">No assessments.</p>
                ) : (
                  (bundle.assessments || []).map((x) => (
                    <div key={x.id} className="border rounded-lg p-3">
                      <div className="font-medium">{x.title}</div>
                      <div className="text-slate-500 text-xs mt-1">
                        {x.assessment_type} · pass {x.passing_marks}/{x.max_marks}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Results</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Pass</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bundle.assessment_results || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.employee_id}</TableCell>
                        <TableCell>{r.score}</TableCell>
                        <TableCell>{r.pass_flag ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <Card className="border-slate-200">
            <CardContent className="pt-6 space-y-3">
              {(bundle.feedback || []).length === 0 ? (
                <p className="text-slate-500 text-sm">No feedback for this program.</p>
              ) : (
                (bundle.feedback || []).map((f) => (
                  <div key={f.id} className="border rounded-lg p-3 text-sm">
                    <div className="font-medium">{f.title}</div>
                    <div className="text-slate-600 mt-1">Rating: {f.body?.rating ?? '—'}</div>
                    <div className="text-slate-600 mt-1">{f.body?.comments}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="more">
          <Card className="border-slate-200">
            <CardContent className="pt-6 text-sm text-slate-600 space-y-2">
              <p>
                Pre/post assessments, certifications, compliance assignments, documents, budget lines, and workflow
                stages are available as extended records and linked workspaces under{' '}
                <Link className="text-indigo-600" to="/training-development/pre-post-assessment">
                  Pre/Post
                </Link>
                ,{' '}
                <Link className="text-indigo-600" to="/training-development/compliance">
                  Compliance
                </Link>
                , and{' '}
                <Link className="text-indigo-600" to="/training-development/approvals">
                  Approvals
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TdTrainingMasterDetailPage;
