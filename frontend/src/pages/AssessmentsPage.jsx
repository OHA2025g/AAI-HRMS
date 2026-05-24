import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { assessmentsApi, jobsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAssessmentsWorkspace } from '../hooks/useAssessmentsWorkspace';
import AssessmentsKpiStrip from '../components/assessments/AssessmentsKpiStrip';
import AssessmentsLibraryMetrics from '../components/assessments/AssessmentsLibraryMetrics';
import AssessmentFilterBar, { AssessmentLibraryGrid } from '../components/assessments/AssessmentLibrary';
import AssessmentJobCoverageTable from '../components/assessments/AssessmentJobCoverageTable';
import AssessmentPreviewDialog from '../components/assessments/AssessmentPreviewDialog';
import AssessmentGradeDialog from '../components/assessments/AssessmentGradeDialog';
import AssessmentGeneratorReviewDialog from '../components/assessments/AssessmentGeneratorReviewDialog';
import AssessmentInviteDialog from '../components/assessments/AssessmentInviteDialog';
import AssessmentCalibrationPanel from '../components/assessments/AssessmentCalibrationPanel';
import AssessmentPlacementFilterBar from '../components/assessments/AssessmentPlacementFilterBar';
import AssessmentAuditLogPanel from '../components/assessments/AssessmentAuditLogPanel';
import AssessmentOutcomePanel from '../components/assessments/AssessmentOutcomePanel';
import AssessmentCoverageHeatmap from '../components/assessments/AssessmentCoverageHeatmap';
import AssessmentMetricGlossary from '../components/assessments/AssessmentMetricGlossary';
import { useAssessmentFeatureFlags } from '../hooks/useAssessmentFeatureFlags';
import AssessmentResultRow from '../components/assessments/AssessmentResultRow';
import AssessmentAdminEmailOps from '../components/assessments/AssessmentAdminEmailOps';
import AssessmentsWorkspaceSkeleton, { ChartSkeleton } from '../components/assessments/AssessmentsWorkspaceSkeleton';
import CopyTakeLinkButton from '../components/assessments/CopyTakeLinkButton';
import SmartHiringPageHeader from '../components/hiring/SmartHiringPageHeader';
import {
  AssessmentFunnelChart,
  AssessmentPassRateChart,
  AssessmentScoreHistogram,
  AssessmentTrendsChart,
  AssessmentSkillChart,
  FitVsScoreScatterChart,
  TimeVsScoreScatterChart,
} from '../components/assessments/AssessmentCharts';
import { downloadAssessmentResultsCsv } from '../lib/assessmentExport';
import PeriodToggle from '../components/hiring-dashboard/PeriodToggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Sparkles, Loader2, ClipboardCheck, AlertTriangle, Download, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

function emailStatusBadge(status) {
  switch (status) {
    case 'sent':
      return <Badge className="bg-emerald-100 text-emerald-700">Email sent</Badge>;
    case 'queued':
      return <Badge className="bg-amber-100 text-amber-800">Queued</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-700">Email failed</Badge>;
    default:
      return <Badge variant="secondary">No email</Badge>;
  }
}

const AssessmentsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const ws = useAssessmentsWorkspace();
  const { flags: assessmentFlags } = useAssessmentFeatureFlags();
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState(null);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradingSub, setGradingSub] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteAssessment, setInviteAssessment] = useState(null);
  const [publishAfterReview, setPublishAfterReview] = useState(true);
  const [formData, setFormData] = useState({
    job_id: '',
    assessment_type: 'CORE_SKILL',
    title: '',
    duration_minutes: 60,
    publish: true,
  });

  useEffect(() => {
    jobsApi.list('OPEN').then((r) => setJobs(r.data || [])).catch(() => {});
  }, []);

  const openJobs = jobs || [];
  const jobSelectValue = openJobs.some((j) => j.id === formData.job_id) ? formData.job_id : undefined;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.job_id || !formData.title) return;
    setGenerating(true);
    try {
      setPublishAfterReview(formData.publish !== false);
      const res = await assessmentsApi.generate(
        formData.job_id,
        {
          assessment_type: formData.assessment_type,
          title: formData.title,
          duration_minutes: formData.duration_minutes,
        },
        false
      );
      setShowModal(false);
      setFormData({ job_id: '', assessment_type: 'CORE_SKILL', title: '', duration_minutes: 60, publish: true });
      setReviewDraft(res.data);
      setReviewOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate assessment');
    } finally {
      setGenerating(false);
    }
  };

  const openPreview = (assessmentId) => {
    if (!assessmentId) return;
    setPreviewId(assessmentId);
    setPreviewOpen(true);
  };

  const openGrade = (sub) => {
    setGradingSub(sub);
    setGradeOpen(true);
  };

  const openInvite = (assessment) => {
    setInviteAssessment(assessment);
    setInviteOpen(true);
  };

  const handleDuplicate = async (assessment) => {
    try {
      await assessmentsApi.duplicate(assessment.id);
      toast.success('Assessment duplicated');
      ws.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to duplicate assessment');
    }
  };

  const handlePublish = async (assessment) => {
    try {
      await assessmentsApi.publish(assessment.id);
      toast.success('Assessment published');
      ws.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to publish assessment');
    }
  };

  const handleArchive = async (assessment) => {
    if (!window.confirm(`Archive "${assessment.title}"? It will be hidden from the library.`)) return;
    try {
      await assessmentsApi.archive(assessment.id);
      toast.success('Assessment archived');
      ws.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to archive assessment');
    }
  };

  const handleSetPrimary = async (assessment) => {
    try {
      await assessmentsApi.setPrimary(assessment.id);
      toast.success('Set as primary assessment for this job');
      ws.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to set primary assessment');
    }
  };

  const handleResendEmail = async (submission) => {
    try {
      await assessmentsApi.resendSubmissionEmail(submission.id);
      toast.success('Invite email resent or queued');
      ws.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend email');
    }
  };

  const handleCancelSubmission = async (submission) => {
    if (!window.confirm(`Cancel assessment invite for ${submission.candidate_name || 'this candidate'}?`)) return;
    try {
      await assessmentsApi.cancelSubmission(submission.id);
      toast.success('Submission cancelled');
      ws.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel submission');
    }
  };

  const exportResultsCsv = () => {
    if (!results.length) return;
    downloadAssessmentResultsCsv(results);
    toast.success('Results exported');
  };

  const handleScoreBucketClick = (payload) => {
    if (!payload || payload.count === 0) return;
    ws.setScoreRange({
      min: payload.min ?? payload.min_score,
      max: payload.max ?? payload.max_score,
      bucket: payload.name,
    });
  };

  const inProgress = (ws.submissions || []).filter((s) => ['INVITED', 'IN_PROGRESS', 'SUBMITTED'].includes(s.status));
  const results = (ws.submissions || []).filter((s) => s.status === 'SCORED');
  const passThresholdPct =
    ws.scoreDist?.pass_threshold_pct ?? ws.summary?.headline?.pass_threshold_pct ?? 70;
  const scoreBuckets = Array.isArray(ws.scoreDist) ? ws.scoreDist : ws.scoreDist?.buckets || [];
  const missingJobRows = (ws.summary?.by_job || []).filter(
    (row) => !row.has_assessment && (row.sent > 0 || row.cleared > 0)
  );
  const isMissingUsageView = ws.usageFilter === 'missing';

  if (ws.loading && !ws.summary) {
    return <AssessmentsWorkspaceSkeleton />;
  }

  const chartRefreshing = ws.refetching;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <SmartHiringPageHeader
        title="Assessments"
        description="AI tests, pipeline outcomes, and hire-quality signals"
        testId="assessments-heading"
        actions={
          <>
            <AssessmentMetricGlossary featureFlags={assessmentFlags} />
            <PeriodToggle value={ws.windowDays} onChange={ws.setWindowDays} />
            <Dialog open={showModal} onOpenChange={setShowModal}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-assessment-btn">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Assessment
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                  <Sparkles className="w-5 h-5 text-indigo-600" /> AI Assessment Generator
                </DialogTitle>
                <DialogDescription>Select a job — AI generates questions for your review before publish</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleGenerate} className="space-y-5 mt-2">
                <div className="space-y-2">
                  <Label>Select Job *</Label>
                  <Select
                    value={jobSelectValue}
                    onValueChange={(v) => setFormData({ ...formData, job_id: v })}
                  >
                    <SelectTrigger className="w-full bg-white" data-testid="assessment-job-select">
                      <SelectValue placeholder="Select a job to base the assessment on" />
                    </SelectTrigger>
                    <SelectContent className="z-[120] max-h-[min(60vh,360px)]">
                      {openJobs.length === 0 ? (
                        <SelectItem value="__no_jobs__" disabled>
                          No open jobs available
                        </SelectItem>
                      ) : (
                        openJobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {openJobs.length === 0 && (
                    <p className="text-sm text-amber-700">
                      No open jobs found. Create or reopen a job from the Jobs page first.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Assessment Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Data Analyst Technical Assessment"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="assessment-title-input"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Assessment Type</Label>
                    <Select value={formData.assessment_type} onValueChange={(v) => setFormData({ ...formData, assessment_type: v })}>
                      <SelectTrigger className="w-full bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCREENING">Screening (Quick)</SelectItem>
                        <SelectItem value="CORE_SKILL">Core Skill Test</SelectItem>
                        <SelectItem value="WORK_SIMULATION">Work Simulation</SelectItem>
                        <SelectItem value="BEHAVIORAL">Behavioral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value, 10) || 60 })}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <input
                    type="checkbox"
                    id="publish"
                    checked={formData.publish}
                    onChange={(e) => setFormData({ ...formData, publish: e.target.checked })}
                    className="mt-1 rounded border-slate-300"
                  />
                  <Label htmlFor="publish" className="font-normal cursor-pointer leading-snug">
                    Publish after review (recruiters can invite from pipeline)
                  </Label>
                </div>
                <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={generating || !formData.job_id || !formData.title}
                    data-testid="generate-assessment-btn"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate & review
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </>
        }
      />

      {ws.error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-700">{ws.error}</CardContent>
        </Card>
      ) : null}

      <AssessmentsKpiStrip headline={ws.summary?.headline} refetching={chartRefreshing && !!ws.summary} />
      <AssessmentsLibraryMetrics headline={ws.summary?.headline} refetching={chartRefreshing && !!ws.summary} />

      <AssessmentPlacementFilterBar jobs={jobs} />

      <Tabs value={ws.tab} onValueChange={ws.setTab}>
        <TabsList className="w-full flex flex-nowrap overflow-x-auto justify-start h-auto gap-1 pb-1 scrollbar-thin">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="in-progress">In progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {(ws.summary?.alerts || []).length > 0 && (
            <div className="space-y-2">
              {ws.summary.alerts.map((a) => (
                <Card key={a.id} className={a.severity === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">{a.title}</p>
                        <p className="text-sm text-slate-600">{a.message}</p>
                      </div>
                    </div>
                    {a.action_path ? (
                      <Link to={a.action_path} data-testid="assessment-alert-link">
                        <Button variant="outline" size="sm">View details</Button>
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {chartRefreshing ? (
              <>
                <div className="lg:col-span-2"><ChartSkeleton /></div>
                <ChartSkeleton />
              </>
            ) : (
              <>
                <div className="lg:col-span-2"><AssessmentFunnelChart funnel={ws.funnel} /></div>
                <AssessmentPassRateChart data={ws.passRate} />
              </>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chartRefreshing ? (
              <>
                <ChartSkeleton />
                <ChartSkeleton />
              </>
            ) : (
              <>
                <AssessmentScoreHistogram
                  buckets={scoreBuckets}
                  passThresholdPct={passThresholdPct}
                  onBucketClick={handleScoreBucketClick}
                  selectedBucket={ws.scoreBucket || undefined}
                />
                <AssessmentTrendsChart trends={ws.trends} />
              </>
            )}
          </div>
          {chartRefreshing ? <ChartSkeleton height={220} /> : <AssessmentSkillChart skills={ws.skillBreakdown} />}
          {assessmentFlags.coverage_heatmap !== false ? (
            <AssessmentCoverageHeatmap matrix={ws.coverageMatrix} />
          ) : null}
          <AssessmentJobCoverageTable rows={ws.summary?.by_job || []} />
          {isAdmin ? <AssessmentAdminEmailOps /> : null}
          <AssessmentAuditLogPanel />
        </TabsContent>

        <TabsContent value="library" className="space-y-4 mt-4">
          <AssessmentFilterBar
            jobs={jobs}
            jobFilter={ws.jobFilter}
            typeFilter={ws.typeFilter}
            usageFilter={ws.usageFilter}
            sortFilter={ws.sortFilter}
            searchQ={ws.searchQ}
            setFilter={ws.setFilter}
          />
          {isMissingUsageView ? (
            <AssessmentJobCoverageTable rows={ws.summary?.by_job || []} missingOnly />
          ) : ws.assessments.length > 0 ? (
            <AssessmentLibraryGrid
              assessments={ws.assessments}
              jobs={jobs}
              onPreview={openPreview}
              onInvite={openInvite}
              onDuplicate={handleDuplicate}
              onPublish={handlePublish}
              onArchive={handleArchive}
              onSetPrimary={handleSetPrimary}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardCheck className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Outfit' }}>
                  {isMissingUsageView ? 'No missing job gaps' : 'No assessments yet'}
                </h3>
                <p className="text-slate-500 mb-4">
                  {isMissingUsageView
                    ? 'All jobs with assessment-stage candidates have tests configured.'
                    : 'Generate your first AI-powered assessment'}
                </p>
                {!isMissingUsageView ? (
                  <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Sparkles className="w-4 h-4 mr-2" /> Generate Assessment
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )}
          {!isMissingUsageView && missingJobRows.length > 0 ? (
            <AssessmentJobCoverageTable rows={missingJobRows} missingOnly />
          ) : null}
        </TabsContent>

        <TabsContent value="in-progress" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>In progress</CardTitle>
              <CardDescription>Invited candidates not yet fully scored</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="pb-2">Candidate</th>
                    <th>Assessment</th>
                    <th>Status</th>
                    <th>Invited</th>
                    <th>Email</th>
                    <th>Link</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {inProgress.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100">
                      <td className="py-3">{s.candidate_name || s.candidate_id}</td>
                      <td>{s.assessment_title}</td>
                      <td><Badge variant="secondary">{s.status}</Badge></td>
                      <td>{s.invited_at ? new Date(s.invited_at).toLocaleDateString() : '—'}</td>
                      <td>{emailStatusBadge(s.email_status)}</td>
                      <td>{s.take_url ? <CopyTakeLinkButton takeUrl={s.take_url} /> : '—'}</td>
                      <td className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Resend invite email"
                          aria-label={`Resend invite email to ${s.candidate_name || 'candidate'}`}
                          onClick={() => handleResendEmail(s)}
                          data-testid={`resend-email-${s.id}`}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Cancel invite"
                          aria-label={`Cancel assessment invite for ${s.candidate_name || 'candidate'}`}
                          onClick={() => handleCancelSubmission(s)}
                          data-testid={`cancel-submission-${s.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openGrade(s)} data-testid={`grade-submission-${s.id}`}>
                          Grade
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!inProgress.length && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">No active submissions</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>Scored assessment submissions</CardDescription>
                {(ws.scoreMin || ws.scoreMax) ? (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="secondary" data-testid="results-score-filter-badge">
                      Score {ws.scoreMin || '0'}–{ws.scoreMax || '100'}%
                      {ws.scoreBucket ? ` (${ws.scoreBucket})` : ''}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-slate-600"
                      onClick={ws.clearScoreRange}
                      data-testid="results-clear-score-filter"
                    >
                      <X className="w-3 h-3 mr-1" /> Clear filter
                    </Button>
                  </div>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportResultsCsv}
                disabled={!results.length}
                data-testid="export-results-csv"
              >
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="pb-2">Candidate</th>
                    <th>Assessment</th>
                    <th>Score</th>
                    <th>Pass</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((s) => (
                    <AssessmentResultRow key={s.id} submission={s} />
                  ))}
                  {!results.length && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">No scored results yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-4">
          {chartRefreshing ? (
            <>
              <ChartSkeleton height={200} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
              <ChartSkeleton height={220} />
            </>
          ) : (
            <>
              {assessmentFlags.outcome_analytics !== false ? (
                <AssessmentOutcomePanel outcome={ws.outcomeCorrelation} />
              ) : null}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FitVsScoreScatterChart points={ws.fitVsScore} threshold={passThresholdPct} />
                <TimeVsScoreScatterChart points={ws.timeVsScore} />
              </div>
              <AssessmentCalibrationPanel calibration={ws.calibration} />
            </>
          )}
        </TabsContent>
      </Tabs>

      <AssessmentPreviewDialog
        open={previewOpen}
        assessmentId={previewId}
        onOpenChange={(o) => {
          setPreviewOpen(o);
          if (!o) setPreviewId(null);
        }}
      />

      <AssessmentGeneratorReviewDialog
        open={reviewOpen}
        draft={reviewDraft}
        publishOnSave={publishAfterReview}
        onOpenChange={setReviewOpen}
        onPublished={() => {
          setReviewDraft(null);
          ws.reload();
        }}
      />

      <AssessmentGradeDialog
        open={gradeOpen}
        submission={gradingSub}
        onOpenChange={setGradeOpen}
        onSaved={() => ws.reload()}
      />

      <AssessmentInviteDialog
        open={inviteOpen}
        assessment={inviteAssessment}
        onOpenChange={setInviteOpen}
        onInvited={() => ws.reload()}
      />
    </motion.div>
  );
};

export default AssessmentsPage;
