import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { highSkillRetentionApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2 } from 'lucide-react';

const HsrTalentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState(null);
  const [tab, setTab] = useState('overview');

  const load = async () => {
    setLoading(true);
    try {
      const res = await highSkillRetentionApi.getProfileDetail(id);
      setBundle(res.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load talent detail');
      navigate('/high-skill-talent-retention/talent-master');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onArchive = async () => {
    if (!window.confirm('Archive this profile?')) return;
    try {
      await highSkillRetentionApi.archiveProfile(id);
      toast.success('Archived');
      navigate('/high-skill-talent-retention/talent-master');
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

  const p = bundle.profile || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              {p.talent_code}
            </h1>
            <Badge variant={p.current_risk_level === 'CRITICAL' ? 'destructive' : 'outline'}>{p.current_risk_level}</Badge>
            {p.successor_available_flag ? <Badge>Successor</Badge> : null}
          </div>
          <p className="text-slate-600 mt-1 text-sm">
            <span className="font-mono text-xs">{p.employee_id}</span> · {p.department || '—'} · {p.primary_skill}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/high-skill-talent-retention/talent-master">Back</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/high-skill-talent-retention/talent-master/${encodeURIComponent(id)}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={onArchive}>
            Archive
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="criticality">Criticality & Segments</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="prediction">Attrition Prediction</TabsTrigger>
          <TabsTrigger value="stay">Stay Interviews</TabsTrigger>
          <TabsTrigger value="cases">Cases & Actions</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <div>
                <span className="text-slate-500">BU:</span> {p.business_unit || '—'}
              </div>
              <div>
                <span className="text-slate-500">Manager:</span> <span className="font-mono text-xs">{p.manager_id || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500">Skill depth:</span> {p.skill_depth_score}
              </div>
              <div>
                <span className="text-slate-500">Sensitivity:</span> {p.retention_sensitivity_index}
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-500">Secondary skills:</span> {(p.secondary_skills || []).join(', ') || '—'}
              </div>
              {p.notes ? (
                <div className="md:col-span-2">
                  <div className="text-slate-500 mb-1">Notes</div>
                  <p className="whitespace-pre-wrap">{p.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criticality">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Criticality tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(bundle.criticality_tags || []).length === 0 ? (
                  <p className="text-slate-500">No tags.</p>
                ) : (
                  (bundle.criticality_tags || []).map((t) => (
                    <div key={t.id} className="border rounded-lg p-3">
                      <div className="font-medium">{t.tag_type}</div>
                      <div className="text-slate-600 text-xs mt-1">{t.tag_value}</div>
                      {t.reason ? <div className="text-slate-500 text-xs mt-1">{t.reason}</div> : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Segments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(bundle.segments || []).length === 0 ? (
                  <p className="text-slate-500">No segments.</p>
                ) : (
                  (bundle.segments || []).map((s) => (
                    <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="font-medium">{s.segment_type}</div>
                      <Badge variant="outline">{s.priority_score}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk">
          <Card className="border-slate-200">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Overall</TableHead>
                    <TableHead>Comp</TableHead>
                    <TableHead>Workload</TableHead>
                    <TableHead>Growth</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Assessed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bundle.risk_assessments || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.overall_risk_score}</TableCell>
                      <TableCell>{r.compensation_risk_score}</TableCell>
                      <TableCell>{r.workload_risk_score}</TableCell>
                      <TableCell>{r.growth_stagnation_risk_score}</TableCell>
                      <TableCell>{r.engagement_risk_score}</TableCell>
                      <TableCell>{r.risk_level}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.assessed_on}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(bundle.risk_assessments || []).length === 0 ? <p className="text-sm text-slate-500 py-4">No assessments.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prediction">
          <Card className="border-slate-200">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exit probability</TableHead>
                    <TableHead>Time-to-exit</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Generated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bundle.attrition_predictions || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.exit_probability}</TableCell>
                      <TableCell>{r.time_to_exit_prediction}</TableCell>
                      <TableCell>{r.confidence_score}</TableCell>
                      <TableCell>{r.predicted_risk_level}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.generated_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stay">
          <Card className="border-slate-200">
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Conducted</TableHead>
                    <TableHead>Interviewer</TableHead>
                    <TableHead>Concerns</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bundle.stay_interviews || []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{r.scheduled_on}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.conducted_on || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.interviewer_id || '—'}</TableCell>
                      <TableCell className="text-xs">{(r.key_concerns || []).join(', ')}</TableCell>
                      <TableCell>{r.outcome_status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Cases</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bundle.cases || []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.case_type}</TableCell>
                        <TableCell>{c.risk_level}</TableCell>
                        <TableCell>{c.status}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{c.review_date || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">Engagement actions</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bundle.action_plans || []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="max-w-[220px] truncate">{a.action_title}</TableCell>
                        <TableCell>{a.priority}</TableCell>
                        <TableCell>{a.status}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{a.due_date || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">AI recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(bundle.ai_recommendations || []).length === 0 ? (
                  <p className="text-slate-500">No AI recommendations.</p>
                ) : (
                  (bundle.ai_recommendations || []).map((r) => (
                    <div key={r.id} className="border rounded-lg p-3">
                      <div className="font-medium">{r.recommendation_type}</div>
                      <div className="text-xs text-slate-600 mt-1">Score: {r.score} · Impact: {r.expected_impact}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">AI flight risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(bundle.ai_flight_risk || []).length === 0 ? (
                  <p className="text-slate-500">No AI flight risk rows.</p>
                ) : (
                  (bundle.ai_flight_risk || []).map((r) => (
                    <div key={r.id} className="border rounded-lg p-3">
                      <div className="font-medium">Risk: {r.flight_risk_score}</div>
                      <div className="text-xs text-slate-600 mt-1">{r.time_to_exit_prediction} · {r.severity}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HsrTalentDetailPage;

