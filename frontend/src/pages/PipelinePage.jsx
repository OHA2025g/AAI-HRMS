import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { applicationsApi, jobsApi, assessmentsApi } from '../lib/api';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '../data/businessOrgHierarchy';
import { useCareerTrajectorySummaries } from '../hooks/useCareerTrajectorySummaries';
import { copyTakeUrl } from '../lib/assessmentLinks';
import { pickPrimaryAssessment } from '../lib/assessmentUtils';
import { useAssessmentClearance } from '../hooks/useAssessmentClearance';
import { useAuth } from '../context/AuthContext';
import { useHiringPermissions } from '../hooks/useHiringPermissions';
import {
  canMoveToStage,
  canRequestOfferStage,
  canSendAssessmentInvite,
  canUpdateOfferStatus,
} from '../lib/hiringPipelinePermissions';
import {
  TAB_KEYS,
  INTERVIEW_ROUND_STAGE_IDS,
  TAB_SUBTITLES,
  TAB_PAGE_TITLES,
  appsForStages,
  getAllTabCounts,
} from '../lib/pipelineCommandUtils';
import PipelineCommandHero from '../components/pipeline/PipelineCommandHero';
import PipelineCommandTabs from '../components/pipeline/PipelineCommandTabs';
import PipelineJobSummaryBar, {
  PipelineSummaryInterview,
  PipelineSummarySalary,
  PipelineViewJobLink,
} from '../components/pipeline/PipelineJobSummaryBar';
import PipelineSourcedTab from '../components/pipeline/PipelineSourcedTab';
import PipelineScreeningTab from '../components/pipeline/PipelineScreeningTab';
import PipelineAssessmentTab from '../components/pipeline/PipelineAssessmentTab';
import PipelineInterviewTab from '../components/pipeline/PipelineInterviewTab';
import PipelineSalaryTab from '../components/pipeline/PipelineSalaryTab';

const PipelinePage = () => {
  const { user } = useAuth();
  const perms = useHiringPermissions(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = searchParams.get('job');
  const stageParam = searchParams.get('stage');
  const offerStatusParam = searchParams.get('offer_status');
  const placement = usePlacementFilters();
  const pillarId = placement.pillarId || '';
  const departmentId = placement.departmentId || '';
  const subDepartment = placement.subDepartment || '';
  const projectId = placement.projectId || '';

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(jobId || '');
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const valid = Object.values(TAB_KEYS);
    return valid.includes(stageParam) ? stageParam : TAB_KEYS.SOURCED;
  });
  const [jobAssessments, setJobAssessments] = useState([]);
  const [jobSubmissions, setJobSubmissions] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [offerProposals, setOfferProposals] = useState([]);
  const { runWithClearanceCheck, clearanceDialog } = useAssessmentClearance();

  const activeAssessments = useMemo(
    () => (jobAssessments || []).filter((a) => a.status === 'ACTIVE'),
    [jobAssessments]
  );

  const selectedAssessment = useMemo(() => {
    if (selectedAssessmentId) {
      const found = activeAssessments.find((a) => a.id === selectedAssessmentId);
      if (found) return found;
    }
    return pickPrimaryAssessment(jobAssessments);
  }, [selectedAssessmentId, activeAssessments, jobAssessments]);

  useEffect(() => {
    const primary = pickPrimaryAssessment(jobAssessments);
    setSelectedAssessmentId(primary?.id || '');
  }, [jobAssessments, selectedJob]);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (stageParam && Object.values(TAB_KEYS).includes(stageParam)) {
      setActiveTab(stageParam);
    }
  }, [stageParam]);

  useEffect(() => {
    if (offerStatusParam && stageParam !== TAB_KEYS.SALARY) {
      setActiveTab(TAB_KEYS.SALARY);
    }
  }, [offerStatusParam, stageParam]);

  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label || '';
  const departmentLabel =
    pillarId && departmentId
      ? getDepartmentsForPillar(pillarId).find((d) => d.id === departmentId)?.label || ''
      : '';

  const filteredJobs = (jobs || []).filter((j) => {
    if (pillarLabel && (j?.business_pillar || '') !== pillarLabel) return false;
    if (departmentLabel && (j?.business_department || '') !== departmentLabel) return false;
    if (subDepartment && (j?.business_sub_department || '') !== subDepartment) return false;
    if (projectId && (j?.project_id || '') !== projectId) return false;
    return true;
  });

  const scopeFiltersActive = Boolean(pillarId || departmentId || subDepartment || projectId);
  const jobsForSelect = filteredJobs.length > 0 ? filteredJobs : jobs;
  const scopeFiltersExcludedAllJobs = scopeFiltersActive && filteredJobs.length === 0 && jobs.length > 0;

  useEffect(() => {
    if (jobsForSelect.length === 0) {
      if (selectedJob) setSelectedJob('');
      return;
    }
    const urlJobValid = jobId && jobsForSelect.some((j) => j.id === jobId);
    if (urlJobValid && selectedJob !== jobId) {
      setSelectedJob(jobId);
      return;
    }
    const valid = selectedJob && jobsForSelect.some((j) => j.id === selectedJob);
    if (!valid) {
      setSelectedJob(jobsForSelect[0].id);
    }
  }, [jobsForSelect, jobId, selectedJob]);

  useEffect(() => {
    if (selectedJob) {
      fetchPipeline();
      fetchAssessments();
      fetchSubmissions();
      fetchOfferProposals();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('job', selectedJob);
        return next;
      });
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const response = await jobsApi.list({ status: 'OPEN' });
      setJobs(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchOfferProposals = async () => {
    if (!selectedJob) return;
    if (!perms.canApproveOfferStageProposal && !perms.canRequestOfferApproval) {
      setOfferProposals([]);
      return;
    }
    try {
      const res = await applicationsApi.listOfferStageProposals(selectedJob, 'PENDING');
      setOfferProposals(res.data || []);
    } catch {
      setOfferProposals([]);
    }
  };

  const requestOfferApproval = async (app) => {
    if (!app?.id) return;
    const reason = window.prompt('Reason for offer recommendation (optional):') ?? '';
    setUpdating(true);
    try {
      await applicationsApi.createOfferStageProposal(app.id, {
        target_stage: 'OFFER',
        reason: reason.trim() || undefined,
      });
      toast.success('Offer approval requested — Hiring Manager notified');
      await fetchOfferProposals();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to request offer approval');
    } finally {
      setUpdating(false);
    }
  };

  const approveOfferProposal = async (proposalId) => {
    setUpdating(true);
    try {
      await applicationsApi.approveOfferStageProposal(proposalId);
      toast.success('Candidate moved to offer');
      await fetchPipeline();
      await fetchOfferProposals();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to approve');
    } finally {
      setUpdating(false);
    }
  };

  const rejectOfferProposal = async (proposalId) => {
    const reason = window.prompt('Rejection reason (optional):') ?? '';
    setUpdating(true);
    try {
      await applicationsApi.rejectOfferStageProposal(proposalId, {
        reason: reason.trim() || undefined,
      });
      toast.success('Offer request rejected');
      await fetchOfferProposals();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to reject');
    } finally {
      setUpdating(false);
    }
  };

  const pendingProposalByAppId = useMemo(() => {
    const map = {};
    for (const p of offerProposals) {
      if (p.application_id) map[p.application_id] = p;
    }
    return map;
  }, [offerProposals]);

  const fetchPipeline = async () => {
    if (!selectedJob) return;
    try {
      const response = await applicationsApi.getPipeline(selectedJob);
      const raw = response.data && typeof response.data === 'object' ? response.data : {};
      const normalized = {};
      Object.keys(raw).forEach((k) => {
        normalized[k] = Array.isArray(raw[k]) ? raw[k] : [];
      });
      setPipeline(normalized);
    } catch {
      toast.error('Failed to fetch pipeline');
    }
  };

  const fetchAssessments = async () => {
    if (!selectedJob) return;
    setAssessmentsLoading(true);
    try {
      const res = await assessmentsApi.list({ job_id: selectedJob });
      setJobAssessments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setJobAssessments([]);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!selectedJob) return;
    try {
      const res = await assessmentsApi.listSubmissions({ job_id: selectedJob, limit: 200 });
      setJobSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setJobSubmissions([]);
    }
  };

  const submissionForApp = useCallback(
    (app) =>
      jobSubmissions.find((s) => s.application_id === app.id || s.candidate_id === app.candidate_id),
    [jobSubmissions]
  );

  const selectedJobData = jobs.find((j) => j.id === selectedJob);
  const selectValue = jobsForSelect.some((j) => j.id === selectedJob) ? selectedJob : '';

  const pipelineCandidateIds = useMemo(() => {
    const ids = new Set();
    Object.values(pipeline).forEach((apps) => {
      (apps || []).forEach((a) => {
        if (a?.candidate_id) ids.add(a.candidate_id);
      });
    });
    return [...ids];
  }, [pipeline]);

  const {
    summaries: trajSummaries,
    loading: trajLoading,
    reload: reloadTrajSummaries,
  } = useCareerTrajectorySummaries(pipelineCandidateIds);

  const sourcedApps = useMemo(() => appsForStages(pipeline, ['SOURCED']), [pipeline]);
  const screeningApps = useMemo(() => appsForStages(pipeline, ['SCREENING']), [pipeline]);
  const assessmentSentApps = useMemo(() => appsForStages(pipeline, ['ASSESSMENT_SENT']), [pipeline]);
  const clearedApps = useMemo(() => appsForStages(pipeline, ['ASSESSMENT_CLEARED']), [pipeline]);
  const interviewApps = useMemo(
    () => appsForStages(pipeline, INTERVIEW_ROUND_STAGE_IDS),
    [pipeline]
  );

  const salaryApps = useMemo(() => {
    let apps = appsForStages(pipeline, ['OFFER']);
    if (offerStatusParam) {
      apps = apps.filter((app) => (app.offer_status || 'SENT') === offerStatusParam);
    }
    return apps;
  }, [pipeline, offerStatusParam]);

  const tabCounts = useMemo(() => getAllTabCounts(pipeline), [pipeline]);

  const showMissingAssessmentAlert =
    Boolean(selectedJob) &&
    !assessmentsLoading &&
    assessmentSentApps.length > 0 &&
    activeAssessments.length === 0;

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('stage', key);
      if (key !== TAB_KEYS.SALARY) next.delete('offer_status');
      if (selectedJob) next.set('job', selectedJob);
      return next;
    });
  };

  const sendAssessmentInvite = async (app) => {
    const assessment = selectedAssessment;
    if (!assessment) {
      toast.error('Create an active assessment for this job first');
      return;
    }
    try {
      const res = await assessmentsApi.invite(assessment.id, { application_id: app.id });
      toast.success('Assessment invite sent');
      if (res.data?.take_url) {
        await copyTakeUrl(res.data.take_url, 'Invite sent — candidate link copied');
      }
      await fetchPipeline();
      await fetchSubmissions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send invite');
    }
  };

  const moveToStage = async (applicationId, nextStage, reason) => {
    if (!applicationId || !nextStage) return;
    setUpdating(true);
    try {
      await applicationsApi.updateStage(applicationId, {
        stage: nextStage,
        ...(reason ? { reason } : {}),
      });
      toast.success('Updated');
      await fetchPipeline();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update stage');
      await fetchPipeline();
    } finally {
      setUpdating(false);
    }
  };

  const updateOfferStatus = async (applicationId, offerStatus) => {
    if (!applicationId || !offerStatus) return;
    setUpdating(true);
    try {
      await applicationsApi.updateOfferStatus(applicationId, { offer_status: offerStatus });
      toast.success('Offer status updated');
      await fetchPipeline();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update offer status');
    } finally {
      setUpdating(false);
    }
  };

  const requestMarkCleared = (app) => {
    runWithClearanceCheck(app, 'ASSESSMENT_SENT', 'ASSESSMENT_CLEARED', async (reason) => {
      await moveToStage(app.id, 'ASSESSMENT_CLEARED', reason);
    });
  };

  const pageTitle = TAB_PAGE_TITLES[activeTab] || 'Hiring Pipeline';
  const pageSubtitle = TAB_SUBTITLES[activeTab] || TAB_SUBTITLES[TAB_KEYS.SOURCED];

  if (loading) {
    return (
      <div className="pl-loading-shell">
        <Loader2 className="pl-loading-icon" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <div className="hiring-dashboard-root top-operational" data-testid="pipeline-command-root">
        {perms.pipelineReadOnly ? (
          <div className="pl-readonly-banner">
            You have read-only pipeline access for your assigned jobs. Stage changes and offer updates are
            disabled.
          </div>
        ) : null}

        {perms.canApproveOfferStageProposal && offerProposals.length > 0 ? (
          <div className="pl-offer-proposals" data-testid="offer-stage-proposals-panel">
            <p className="pl-offer-proposals-title">Pending offer approvals</p>
            {offerProposals.map((p) => (
              <div key={p.id} className="pl-offer-proposal-row">
                <div>
                  <p className="pl-offer-proposal-name">{p.candidate?.full_name || p.candidate_id}</p>
                  <p className="pl-offer-proposal-meta">
                    {p.requested_by_name || 'Technical Manager'} → {p.target_stage?.replace(/_/g, ' ')}
                    {p.reason ? ` · ${p.reason}` : ''}
                  </p>
                </div>
                <div className="pl-offer-proposal-actions">
                  <button
                    type="button"
                    className="pl-btn pl-btn-success"
                    disabled={updating}
                    onClick={() => approveOfferProposal(p.id)}
                    data-testid={`approve-offer-proposal-${p.id}`}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="pl-btn"
                    disabled={updating}
                    onClick={() => rejectOfferProposal(p.id)}
                    data-testid={`reject-offer-proposal-${p.id}`}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="pl-page-head">
          <div>
            <h1 data-testid="pipeline-heading">{pageTitle}</h1>
            <p className="pl-muted">{pageSubtitle}</p>
          </div>
          <div className="pl-actions">
            <div className="pl-job-select-wrap">
              <select
                className="pl-select pl-job-select"
                value={selectValue}
                onChange={(e) => setSelectedJob(e.target.value)}
                data-testid="job-select"
                aria-label="Select job"
              >
                {jobsForSelect.length === 0 ? (
                  <option value="">No open jobs available</option>
                ) : (
                  jobsForSelect.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))
                )}
              </select>
              {scopeFiltersExcludedAllJobs ? (
                <p className="pl-scope-note">
                  Scope filters match no open jobs — showing all jobs. Clear header Scope filters to narrow
                  this list.
                </p>
              ) : null}
            </div>
            <PipelineViewJobLink jobId={selectedJob} />
            {!perms.pipelineReadOnly ? (
              <button type="button" className="pl-btn pl-btn-primary" disabled title="Select candidates in cards to move">
                Move Selected →
              </button>
            ) : null}
          </div>
        </div>

        {selectedJob && selectedJobData ? (
          <>
            {activeTab === TAB_KEYS.SOURCED ? (
              <PipelineCommandHero
                job={selectedJobData}
                pipeline={pipeline}
                activeTab={activeTab}
                screeningApps={screeningApps}
              />
            ) : null}

            {activeTab === TAB_KEYS.SCREENING ? (
              <PipelineCommandHero
                job={selectedJobData}
                pipeline={pipeline}
                activeTab={activeTab}
                screeningApps={screeningApps}
              />
            ) : null}

            {activeTab === TAB_KEYS.ASSESSMENT ? (
              <PipelineJobSummaryBar job={selectedJobData} pipeline={pipeline} activeTab={activeTab} />
            ) : null}

            {activeTab === TAB_KEYS.INTERVIEW ? (
              <PipelineSummaryInterview job={selectedJobData} pipeline={pipeline} activeTab={activeTab} />
            ) : null}

            {activeTab === TAB_KEYS.SALARY ? (
              <PipelineSummarySalary job={selectedJobData} pipeline={pipeline} activeTab={activeTab} />
            ) : null}

            <PipelineCommandTabs activeTab={activeTab} tabCounts={tabCounts} onTabChange={handleTabChange} />

            {activeTab === TAB_KEYS.SOURCED ? (
              <PipelineSourcedTab
                pipeline={pipeline}
                sourcedApps={sourcedApps}
                jobTitle={selectedJobData.title}
                jobId={selectedJob}
                trajSummaries={trajSummaries}
                trajLoading={trajLoading}
                onTrajRefresh={reloadTrajSummaries}
                canMoveToScreening={canMoveToStage(perms, 'SCREENING')}
                onMoveToScreening={(id) => moveToStage(id, 'SCREENING')}
                updating={updating}
              />
            ) : null}

            {activeTab === TAB_KEYS.SCREENING ? (
              <PipelineScreeningTab
                pipeline={pipeline}
                screeningApps={screeningApps}
                jobTitle={selectedJobData.title}
                jobId={selectedJob}
                trajSummaries={trajSummaries}
                trajLoading={trajLoading}
                onTrajRefresh={reloadTrajSummaries}
                canMoveToAssessment={canMoveToStage(perms, 'ASSESSMENT_SENT')}
                onMoveToAssessment={(id) => moveToStage(id, 'ASSESSMENT_SENT')}
                updating={updating}
              />
            ) : null}

            {activeTab === TAB_KEYS.ASSESSMENT ? (
              <PipelineAssessmentTab
                selectedJob={selectedJob}
                assessmentSentApps={assessmentSentApps}
                clearedApps={clearedApps}
                jobTitle={selectedJobData.title}
                jobId={selectedJob}
                trajSummaries={trajSummaries}
                trajLoading={trajLoading}
                onTrajRefresh={reloadTrajSummaries}
                activeAssessments={activeAssessments}
                assessmentsLoading={assessmentsLoading}
                showMissingAssessmentAlert={showMissingAssessmentAlert}
                selectedAssessment={selectedAssessment}
                jobAssessments={jobAssessments}
                selectedAssessmentId={selectedAssessmentId}
                onAssessmentSelect={setSelectedAssessmentId}
                submissions={jobSubmissions}
                submissionForApp={submissionForApp}
                canSendInvite={canSendAssessmentInvite(perms)}
                onSendInvite={sendAssessmentInvite}
                canMarkCleared={canMoveToStage(perms, 'ASSESSMENT_CLEARED')}
                onMarkCleared={requestMarkCleared}
                canMoveToInterview={canMoveToStage(perms, 'INTERVIEW_1')}
                onMoveToInterview={(id) => moveToStage(id, 'INTERVIEW_1')}
                updating={updating}
              />
            ) : null}

            {activeTab === TAB_KEYS.INTERVIEW ? (
              <PipelineInterviewTab
                interviewApps={interviewApps}
                jobTitle={selectedJobData.title}
                jobId={selectedJob}
                trajSummaries={trajSummaries}
                trajLoading={trajLoading}
                onTrajRefresh={reloadTrajSummaries}
                canMoveToOffer={canMoveToStage(perms, 'OFFER')}
                canRequestOffer={canRequestOfferStage(perms, 'OFFER')}
                onMoveToOffer={(id) => moveToStage(id, 'OFFER')}
                onRequestOffer={requestOfferApproval}
                pendingProposalByAppId={pendingProposalByAppId}
                updating={updating}
              />
            ) : null}

            {activeTab === TAB_KEYS.SALARY ? (
              <PipelineSalaryTab
                salaryApps={salaryApps}
                offerStatusParam={offerStatusParam}
                jobTitle={selectedJobData.title}
                jobId={selectedJob}
                trajSummaries={trajSummaries}
                trajLoading={trajLoading}
                onTrajRefresh={reloadTrajSummaries}
                canUpdateOffer={canUpdateOfferStatus(perms)}
                onUpdateOfferStatus={updateOfferStatus}
                canMarkJoined={canMoveToStage(perms, 'JOINED')}
                onMarkJoined={(id) => moveToStage(id, 'JOINED')}
                updating={updating}
              />
            ) : null}
          </>
        ) : (
          <div className="pl-empty-state">
            <Users className="pl-empty-icon" aria-hidden />
            <h3>Select a Job</h3>
            <p>Choose a job to view its hiring pipeline</p>
            {jobs.length === 0 ? (
              <Link to="/jobs/new" className="pl-btn pl-btn-primary">
                Create Your First Job
              </Link>
            ) : null}
          </div>
        )}

        {updating ? (
          <div className="pl-overlay" role="status" aria-live="polite" aria-label="Updating pipeline">
            <div className="pl-overlay-card">
              <Loader2 className="pl-loading-icon" aria-hidden />
              <span>Updating...</span>
            </div>
          </div>
        ) : null}
      </div>

      {clearanceDialog}
    </>
  );
};

export default PipelinePage;
