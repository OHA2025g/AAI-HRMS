import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { engagementApi } from '@/shared/lib/api';
import { useAuth } from '@/shared/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Loader2, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

const EmployeeEngagementPage = () => {
  const { user } = useAuth();

  const canWrite = useMemo(() => user?.role === 'admin' || user?.role === 'hr_admin', [user]);
  const canViewRaw = useMemo(() => user?.role === 'admin' || user?.role === 'hr_admin', [user]);
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [selectedSurveyId, setSelectedSurveyId] = useState('');

  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyQuestion, setSurveyQuestion] = useState('');
  const [ratingMin, setRatingMin] = useState(1);
  const [ratingMax, setRatingMax] = useState(5);
  const [surveyActive, setSurveyActive] = useState(true);

  const [tplName, setTplName] = useState('');
  const [tplDefaultTitle, setTplDefaultTitle] = useState('');
  const [tplDefaultQuestion, setTplDefaultQuestion] = useState('');

  const [schedTemplateId, setSchedTemplateId] = useState('');
  const [schedCadence, setSchedCadence] = useState('MONTHLY');

  const [responseEmployeeCode, setResponseEmployeeCode] = useState('');
  const [responseRating, setResponseRating] = useState(5);
  const [responseText, setResponseText] = useState('');

  const [responses, setResponses] = useState([]);
  const [respPage, setRespPage] = useState(1);
  const [respTotalPages, setRespTotalPages] = useState(1);

  const loadDashboard = useCallback(async (surveyId) => {
    try {
      const params = surveyId ? { survey_id: surveyId } : {};
      const dRes = await engagementApi.getDashboard(params);
      setDashboard(dRes.data || null);
    } catch (e) {
      toast.error('Failed to load engagement dashboard');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const sRes = await engagementApi.listSurveys(true);
      const list = sRes.data || [];
      setSurveys(list);
      const still = selectedSurveyId && list.some((s) => s.id === selectedSurveyId);
      const nextSid = still ? selectedSurveyId : list[0]?.id || '';
      setSelectedSurveyId(nextSid);
      await loadDashboard(nextSid);

      if (canWrite) {
        try {
          const [tRes, schRes] = await Promise.all([
            engagementApi.listTemplates(),
            engagementApi.listSchedules(),
          ]);
          const tlist = tRes.data || [];
          setTemplates(tlist);
          setSchedules(schRes.data || []);
          setSchedTemplateId((prev) => prev || tlist[0]?.id || '');
        } catch {
          setTemplates([]);
          setSchedules([]);
        }
      }
    } catch (e) {
      toast.error('Failed to load engagement data');
    } finally {
      setLoading(false);
    }
  }, [canWrite, loadDashboard, selectedSurveyId]);

  const loadResponses = async () => {
    if (!canViewRaw || !selectedSurveyId) return;
    try {
      const res = await engagementApi.listResponses({
        survey_id: selectedSurveyId,
        page: respPage,
        page_size: 10,
        sort_by: 'created_at',
        sort_dir: 'desc',
      });
      const payload = res.data || {};
      setResponses(payload.items || []);
      setRespTotalPages(payload.total_pages || 1);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load responses');
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSurveyId || !canViewRaw) return;
    setRespPage(1);
  }, [selectedSurveyId, canViewRaw]);

  useEffect(() => {
    if (!selectedSurveyId || !canViewRaw) return;
    loadResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSurveyId, respPage, canViewRaw]);

  const onSurveySelect = (v) => {
    setSelectedSurveyId(v);
    loadDashboard(v);
  };

  const onCreateSurvey = async () => {
    if (!canWrite) return;
    if (!surveyTitle.trim() || !surveyQuestion.trim()) {
      toast.error('Survey title and question are required');
      return;
    }
    try {
      await engagementApi.createSurvey({
        title: surveyTitle.trim(),
        question: surveyQuestion.trim(),
        rating_min: Number(ratingMin),
        rating_max: Number(ratingMax),
        active: !!surveyActive,
      });
      toast.success('Survey created');
      setSurveyTitle('');
      setSurveyQuestion('');
      await refreshAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create survey');
    }
  };

  const onCreateTemplate = async () => {
    if (!canWrite) return;
    if (!tplName.trim() || !tplDefaultTitle.trim() || !tplDefaultQuestion.trim()) {
      toast.error('Template name, default title, and question are required');
      return;
    }
    try {
      await engagementApi.createTemplate({
        name: tplName.trim(),
        default_title: tplDefaultTitle.trim(),
        default_question: tplDefaultQuestion.trim(),
        target_all: true,
        target_departments: [],
      });
      toast.success('Template saved');
      setTplName('');
      setTplDefaultTitle('');
      setTplDefaultQuestion('');
      const tRes = await engagementApi.listTemplates();
      setTemplates(tRes.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create template');
    }
  };

  const onCreateSchedule = async () => {
    if (!canWrite || !schedTemplateId) {
      toast.error('Select a template for the schedule');
      return;
    }
    try {
      await engagementApi.createSchedule({
        template_id: schedTemplateId,
        cadence: schedCadence,
        enabled: true,
      });
      toast.success('Schedule created');
      const schRes = await engagementApi.listSchedules();
      setSchedules(schRes.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create schedule');
    }
  };

  const onDispatchSchedules = async () => {
    if (!isAdmin) return;
    try {
      const res = await engagementApi.adminDispatchDueSchedules();
      toast.success(`Dispatch: ${res.data?.surveys_created ?? 0} survey(s) created`);
      await refreshAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Dispatch failed');
    }
  };

  const onRemind = async () => {
    if (!isAdmin || !selectedSurveyId) return;
    try {
      const res = await engagementApi.adminRemindParticipation(selectedSurveyId);
      toast.success(`User notifications: ${res.data?.notifications_to_users ?? 0}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Remind failed');
    }
  };

  const onSubmitResponse = async () => {
    if (!canWrite) return;
    if (!selectedSurveyId) {
      toast.error('Select a survey first');
      return;
    }
    if (!responseEmployeeCode.trim()) {
      toast.error('employee_code is required');
      return;
    }
    try {
      await engagementApi.submitResponse({
        survey_id: selectedSurveyId,
        employee_code: responseEmployeeCode.trim(),
        rating: Number(responseRating),
        response_text: responseText.trim() || null,
      });
      toast.success('Pulse response submitted');
      setResponseEmployeeCode('');
      setResponseText('');
      await loadDashboard(selectedSurveyId);
      if (canViewRaw) await loadResponses();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to submit response');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const sentiments = dashboard?.sentiment_counts || {};
  const topicCounts = dashboard?.topic_counts || {};
  const weeklyTrend = dashboard?.weekly_trend || [];
  const conf = dashboard?.display_confidence || 'MEDIUM';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Employee Engagement</h1>
        <p className="text-slate-600 mt-1">M6 — pulse surveys, sentiment/topics, privacy-aware dashboard</p>
      </div>

      <Alert className="border-slate-300 bg-slate-50">
        <AlertTitle>Legacy pulse workspace</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-slate-700">
          <span>
            New engagement monitoring, programs, and intelligence live under{' '}
            <strong>Employee Satisfaction &amp; Engagement (M17)</strong>. This page remains for backward-compatible pulse API workflows.
          </span>
          <Button asChild size="sm" variant="secondary" className="shrink-0">
            <Link to="/employee-satisfaction-engagement/dashboard">
              Open ESE dashboard <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Total (slice)</p><p className="text-2xl font-bold">{dashboard?.total_responses ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Avg Rating</p><p className="text-2xl font-bold">{dashboard?.avg_rating ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Last 30 Days</p><p className="text-2xl font-bold">{dashboard?.last_30_days_responses ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Positive</p><p className="text-2xl font-bold">{sentiments.POSITIVE ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-slate-500">Negative</p><p className="text-2xl font-bold">{sentiments.NEGATIVE ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-sm text-slate-500">Confidence</p>
          <p className="text-lg font-bold mt-1">
            <Badge variant={conf === 'HIGH' ? 'default' : conf === 'LOW' ? 'destructive' : 'secondary'}>{conf}</Badge>
          </p>
          {dashboard?.confidence_rationale ? (
            <p className="text-xs text-slate-500 mt-2 leading-snug">{dashboard.confidence_rationale}</p>
          ) : null}
        </CardContent></Card>
      </div>

      {dashboard?.anonymity_note ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3">
          {dashboard.anonymity_note}
        </div>
      ) : null}

      {Object.keys(topicCounts).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topic mix (v1)</CardTitle>
            <CardDescription>Keyword buckets from comments + stored primary topic</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(topicCounts).map(([k, v]) => (
              <Badge key={k} variant="outline">{k}: {v}</Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {weeklyTrend.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly rating trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-slate-700 space-y-1">
              {weeklyTrend.map((w) => (
                <li key={w.week}>
                  <span className="font-medium">{w.week}</span>
                  {' — '}
                  avg {w.avg_rating} ({w.count} resp.)
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pulse Surveys</CardTitle>
            <CardDescription>Dashboard metrics filter to the selected survey (per-survey anonymity rules apply).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Active Survey</Label>
              <Select value={selectedSurveyId || undefined} onValueChange={onSurveySelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a survey" />
                </SelectTrigger>
                <SelectContent>
                  {surveys.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={onDispatchSchedules}>Run due schedules</Button>
                <Button variant="outline" size="sm" onClick={onRemind} disabled={!selectedSurveyId}>Remind participation</Button>
              </div>
            ) : null}

            <div className="border rounded-md p-3">
              <div className="text-sm font-medium mb-2">Create Survey</div>
              {!canWrite ? <div className="text-xs text-slate-500 mb-3">Read-only (requires hr_admin).</div> : null}
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} disabled={!canWrite} />
                </div>
                <div>
                  <Label>Question</Label>
                  <Textarea rows={3} value={surveyQuestion} onChange={(e) => setSurveyQuestion(e.target.value)} disabled={!canWrite} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Rating Min</Label>
                    <Input type="number" min={1} value={ratingMin} onChange={(e) => setRatingMin(e.target.value)} disabled={!canWrite} />
                  </div>
                  <div>
                    <Label>Rating Max</Label>
                    <Input type="number" min={1} value={ratingMax} onChange={(e) => setRatingMax(e.target.value)} disabled={!canWrite} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={surveyActive} disabled={!canWrite} onChange={(e) => setSurveyActive(e.target.checked)} />
                  <span className="text-sm text-slate-700">Active</span>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={onCreateSurvey} disabled={!canWrite}>
                  Create Survey
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit Pulse Response</CardTitle>
            <CardDescription>Submit rating and optional comment for the selected survey.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canWrite ? <div className="text-sm text-slate-500">You do not have write permissions.</div> : null}
            <div>
              <Label>Employee Code</Label>
              <Input value={responseEmployeeCode} onChange={(e) => setResponseEmployeeCode(e.target.value)} disabled={!canWrite} placeholder="E1234" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rating</Label>
                <Input type="number" min={1} value={responseRating} onChange={(e) => setResponseRating(e.target.value)} disabled={!canWrite} />
              </div>
              <div />
            </div>
            <div>
              <Label>Response (optional)</Label>
              <Textarea rows={4} value={responseText} onChange={(e) => setResponseText(e.target.value)} disabled={!canWrite} placeholder="What went well / what needs improvement?" />
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={onSubmitResponse} disabled={!canWrite}>
              Submit Response
            </Button>

            <div className="pt-2">
              <div className="text-sm font-medium mb-2">Raw responses</div>
              {!canViewRaw ? (
                <p className="text-xs text-slate-500">Restricted to admin / hr_admin (privacy).</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Sentiment</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.employee_code}</TableCell>
                          <TableCell>{r.rating}</TableCell>
                          <TableCell>
                            <Badge variant={r.sentiment_label === 'NEGATIVE' ? 'destructive' : 'secondary'}>
                              {r.sentiment_label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{r.topic_primary || '—'}</TableCell>
                          <TableCell className="text-xs text-slate-500">{r.created_at ? String(r.created_at).slice(0, 10) : '-'}</TableCell>
                        </TableRow>
                      ))}
                      {responses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan="5" className="text-center text-slate-500">No responses yet</TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>

                  {respTotalPages > 1 ? (
                    <div className="flex items-center justify-end gap-2 pt-3">
                      <Button variant="outline" disabled={respPage <= 1} onClick={() => setRespPage((p) => p - 1)}>Prev</Button>
                      <span className="text-sm text-slate-600">Page {respPage} of {respTotalPages}</span>
                      <Button variant="outline" disabled={respPage >= respTotalPages} onClick={() => setRespPage((p) => p + 1)}>Next</Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {canWrite ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Survey templates</CardTitle>
              <CardDescription>Reusable defaults for scheduled pulses.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Quarterly check-in" />
              </div>
              <div className="space-y-2">
                <Label>Default title</Label>
                <Input value={tplDefaultTitle} onChange={(e) => setTplDefaultTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Default question</Label>
                <Textarea rows={2} value={tplDefaultQuestion} onChange={(e) => setTplDefaultQuestion(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={onCreateTemplate}>Save template</Button>
              <div className="text-xs text-slate-500 pt-2">
                {templates.length} template(s) on server
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedules</CardTitle>
              <CardDescription>Cadence + template; use &quot;Run due schedules&quot; (admin) to materialize.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={schedTemplateId || undefined} onValueChange={setSchedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Pick template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name || t.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cadence</Label>
                <Select value={schedCadence} onValueChange={setSchedCadence}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="secondary" onClick={onCreateSchedule} disabled={!schedTemplateId}>Add schedule</Button>
              <div className="text-xs text-slate-500">
                {schedules.length} schedule(s); next runs shown in API / DB.
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default EmployeeEngagementPage;
