import React, { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { assessmentsApi, jobsApi } from '@/shared/lib/api';
import { useAuth } from '@/shared/context/AuthContext';
import { useHiringPermissions } from '@/shared/hooks/useHiringPermissions';
import { useAssessmentsWorkspace } from '@/shared/hooks/useAssessmentsWorkspace';
import { useAssessmentFeatureFlags } from '@/shared/hooks/useAssessmentFeatureFlags';
import { downloadAssessmentResultsCsv } from '@/shared/lib/assessmentExport';
import { getTabCounts } from '@/shared/lib/assessmentsCommandUtils';
import AssessmentsCommandHero from '@/features/smart-hiring/components/assessments/command/AssessmentsCommandHero';
import AssessmentsKpiStrip from '@/features/smart-hiring/components/assessments/command/AssessmentsKpiStrip';
import AssessmentsInsightStrip from '@/features/smart-hiring/components/assessments/command/AssessmentsInsightStrip';
import AssessmentsHealthRow from '@/features/smart-hiring/components/assessments/command/AssessmentsHealthRow';
import AssessmentsCommandTabs from '@/features/smart-hiring/components/assessments/command/AssessmentsCommandTabs';
import AssessmentsOrgFilterBar from '@/features/smart-hiring/components/assessments/command/AssessmentsOrgFilterBar';
import AssessmentsOverviewTab from '@/features/smart-hiring/components/assessments/command/AssessmentsOverviewTab';
import AssessmentsLibraryTab from '@/features/smart-hiring/components/assessments/command/AssessmentsLibraryTab';
import AssessmentsInProgressTab from '@/features/smart-hiring/components/assessments/command/AssessmentsInProgressTab';
import AssessmentsResultsTab from '@/features/smart-hiring/components/assessments/command/AssessmentsResultsTab';
import AssessmentsInsightsTab from '@/features/smart-hiring/components/assessments/command/AssessmentsInsightsTab';
import AssessmentPreviewDialog from '@/features/smart-hiring/components/assessments/AssessmentPreviewDialog';
import AssessmentGradeDialog from '@/features/smart-hiring/components/assessments/AssessmentGradeDialog';
import AssessmentGeneratorReviewDialog from '@/features/smart-hiring/components/assessments/AssessmentGeneratorReviewDialog';
import AssessmentGeneratorDialog from '@/features/smart-hiring/components/assessments/AssessmentGeneratorDialog';
import AssessmentInviteDialog from '@/features/smart-hiring/components/assessments/AssessmentInviteDialog';
import { toast } from 'sonner';

const AssessmentsPage = () => {
  const { user } = useAuth();
  const perms = useHiringPermissions(user);
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
    jobsApi.list({ status: 'OPEN' }).then((r) => setJobs(r.data || [])).catch(() => {});
  }, []);

  const openJobs = jobs || [];

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

  const results = (ws.submissions || []).filter((s) => s.status === 'SCORED');
  const tabCounts = useMemo(() => getTabCounts(ws.submissions || []), [ws.submissions]);

  const passThresholdPct =
    ws.scoreDist?.pass_threshold_pct ?? ws.summary?.headline?.pass_threshold_pct ?? 70;
  const scoreBuckets = Array.isArray(ws.scoreDist) ? ws.scoreDist : ws.scoreDist?.buckets || [];

  const handleScoreBucketClick = (payload) => {
    if (!payload || payload.count === 0) return;
    ws.setScoreRange({
      min: payload.min ?? payload.min_score,
      max: payload.max ?? payload.max_score,
      bucket: payload.name ?? payload.bucket,
    });
  };

  const exportResultsCsv = () => {
    if (!results.length) return;
    downloadAssessmentResultsCsv(results);
    toast.success('Results exported');
  };

  const libraryHandlers = {
    onPreview: openPreview,
    onInvite: perms.canPublishAssessment ? openInvite : undefined,
    onDuplicate: perms.canGenerateAssessment ? handleDuplicate : undefined,
    onPublish: perms.canPublishAssessment ? handlePublish : undefined,
    onArchive: perms.canPublishAssessment ? handleArchive : undefined,
    onSetPrimary: perms.canPublishAssessment ? handleSetPrimary : undefined,
  };

  const permissionProps = {
    canGenerate: perms.canGenerateAssessment,
    canPublish: perms.canPublishAssessment,
    canGrade: perms.canGradeAssessment,
  };

  const chartRefreshing = ws.refetching;

  if (ws.loading && !ws.summary) {
    return (
      <div className="hiring-dashboard-root top-operational" data-testid="assessments-command-root">
        <div className="as-loading">
          <Loader2 className="as-spinner" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="hiring-dashboard-root top-operational" data-testid="assessments-command-root">
      <AssessmentsCommandHero
        tab={ws.tab}
        windowDays={ws.windowDays}
        onWindowChange={ws.setWindowDays}
        canGenerate={perms.canGenerateAssessment}
        onGenerateClick={() => setShowModal(true)}
        featureFlags={assessmentFlags}
      />

      {ws.error ? (
        <div className="as-error-banner" role="alert">
          {ws.error}
        </div>
      ) : null}

      <AssessmentsKpiStrip headline={ws.summary?.headline} refetching={chartRefreshing && !!ws.summary} />
      <AssessmentsInsightStrip headline={ws.summary?.headline} refetching={chartRefreshing && !!ws.summary} />
      <AssessmentsOrgFilterBar jobs={jobs} />

      {ws.tab === 'overview' ? (
        <AssessmentsHealthRow
          headline={ws.summary?.headline}
          summary={ws.summary}
          skillBreakdown={ws.skillBreakdown}
          refetching={chartRefreshing}
        />
      ) : null}

      <AssessmentsCommandTabs activeTab={ws.tab} onTabChange={ws.setTab} counts={tabCounts} />

      {ws.tab === 'overview' ? (
        <AssessmentsOverviewTab
          ws={ws}
          isAdmin={isAdmin}
          passThresholdPct={passThresholdPct}
          scoreBuckets={scoreBuckets}
          onScoreBucketClick={handleScoreBucketClick}
          refetching={chartRefreshing}
        />
      ) : null}

      {ws.tab === 'library' ? (
        <AssessmentsLibraryTab
          ws={ws}
          jobs={jobs}
          perms={permissionProps}
          handlers={libraryHandlers}
          onGenerateClick={() => setShowModal(true)}
          results={results}
        />
      ) : null}

      {ws.tab === 'in-progress' ? (
        <AssessmentsInProgressTab
          submissions={ws.submissions}
          headline={ws.summary?.headline}
          perms={permissionProps}
          onGrade={openGrade}
          onResendEmail={handleResendEmail}
          onCancelSubmission={handleCancelSubmission}
          onTabChange={ws.setTab}
        />
      ) : null}

      {ws.tab === 'results' ? (
        <AssessmentsResultsTab
          results={results}
          headline={ws.summary}
          scoreBuckets={scoreBuckets}
          trends={ws.trends}
          ws={ws}
          onExportCsv={exportResultsCsv}
          onClearScoreFilter={ws.clearScoreRange}
        />
      ) : null}

      {ws.tab === 'insights' ? (
        <AssessmentsInsightsTab
          outcome={ws.outcomeCorrelation}
          calibration={ws.calibration}
          fitVsScore={ws.fitVsScore}
          timeVsScore={ws.timeVsScore}
          submissions={ws.submissions}
          results={results}
          headline={ws.summary?.headline}
          passThresholdPct={passThresholdPct}
          refetching={chartRefreshing}
        />
      ) : null}

      <AssessmentGeneratorDialog
        open={showModal}
        onOpenChange={setShowModal}
        openJobs={openJobs}
        formData={formData}
        onFormChange={setFormData}
        generating={generating}
        onSubmit={handleGenerate}
      />

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
    </div>
  );
};

export default AssessmentsPage;
