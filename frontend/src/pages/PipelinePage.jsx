import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { applicationsApi, jobsApi, assessmentsApi } from '../lib/api';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '../data/businessOrgHierarchy';
import { ApplicationScoresSection } from '../components/career-trajectory/ApplicationScoresSection';
import { useCareerTrajectorySummaries } from '../hooks/useCareerTrajectorySummaries';
import { Loader2, Users, Eye, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getCandidateCardBadge } from '../lib/candidateSource';
import CopyTakeLinkButton from '../components/assessments/CopyTakeLinkButton';
import SmartHiringPageHeader from '../components/hiring/SmartHiringPageHeader';
import { copyTakeUrl } from '../lib/assessmentLinks';
import { pickPrimaryAssessment } from '../lib/assessmentUtils';
import { useAssessmentClearance } from '../hooks/useAssessmentClearance';

const TAB_KEYS = {
  SOURCED: 'SOURCED',
  SCREENING: 'SCREENING',
  ASSESSMENT: 'ASSESSMENT',
  INTERVIEW: 'INTERVIEW',
  SALARY: 'SALARY',
};

/** Stages shown under Interview tab — only after assessment is cleared and an interview round has started */
const INTERVIEW_ROUND_STAGE_IDS = ['INTERVIEW_1', 'INTERVIEW_2', 'INTERVIEW_3', 'HR_ROUND'];

const OFFER_STATUS_OPTIONS = [
  { value: 'SENT', label: 'Offer sent' },
  { value: 'NEGOTIATION', label: 'In negotiation' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
];

const ROUND_TABS = [
  { key: TAB_KEYS.SOURCED, label: 'Sourced', shortLabel: 'Sourced', stageIds: ['SOURCED'] },
  { key: TAB_KEYS.SCREENING, label: 'Screening Round', shortLabel: 'Screening', stageIds: ['SCREENING'] },
  {
    key: TAB_KEYS.ASSESSMENT,
    label: 'Assessment Round',
    shortLabel: 'Assessment',
    stageIds: ['ASSESSMENT_SENT', 'ASSESSMENT_CLEARED'],
  },
  {
    key: TAB_KEYS.INTERVIEW,
    label: 'Interview',
    shortLabel: 'Interview',
    stageIds: INTERVIEW_ROUND_STAGE_IDS,
  },
  { key: TAB_KEYS.SALARY, label: 'Salary Discussion', shortLabel: 'Salary', stageIds: ['OFFER'] },
];

const STAGE_BADGE = {
  SOURCED: 'bg-slate-100 text-slate-700',
  SCREENING: 'bg-blue-100 text-blue-700',
  ASSESSMENT_SENT: 'bg-purple-100 text-purple-700',
  ASSESSMENT_CLEARED: 'bg-violet-100 text-violet-700',
  INTERVIEW_1: 'bg-amber-100 text-amber-700',
  INTERVIEW_2: 'bg-amber-100 text-amber-700',
  INTERVIEW_3: 'bg-amber-100 text-amber-700',
  HR_ROUND: 'bg-orange-100 text-orange-700',
  OFFER: 'bg-emerald-100 text-emerald-700',
};

const PipelinePage = () => {
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

  // Keep selected job in sync with (filtered) jobs (Radix Select breaks on value="" or unknown ids).
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
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('job', selectedJob);
        return next;
      });
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const response = await jobsApi.list('OPEN');
      setJobs(response.data);
    } catch (error) {
      toast.error('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      toast.error('Failed to fetch pipeline');
    }
  };

  const fetchAssessments = async () => {
    if (!selectedJob) return;
    setAssessmentsLoading(true);
    try {
      const res = await assessmentsApi.list({ job_id: selectedJob });
      setJobAssessments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      // Keep the UI usable even if this fails.
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

  const submissionForApp = (app) =>
    jobSubmissions.find((s) => s.application_id === app.id || s.candidate_id === app.candidate_id);

  const getStageCount = (stageId) => {
    return pipeline[stageId]?.length || 0;
  };

  const selectedJobData = jobs.find((j) => j.id === selectedJob);
  const selectValue = jobsForSelect.some((j) => j.id === selectedJob) ? selectedJob : undefined;

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

  const appsForStages = (stageIds) => {
    const out = [];
    (stageIds || []).forEach((sid) => {
      (pipeline[sid] || []).forEach((app) => {
        if (app && app.id) out.push(app);
      });
    });
    // Newest first when dates exist
    return out.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  };

  const salaryApps = useMemo(() => {
    let apps = appsForStages(['OFFER']);
    if (offerStatusParam) {
      apps = apps.filter((app) => (app.offer_status || 'SENT') === offerStatusParam);
    }
    return apps;
  }, [pipeline, offerStatusParam]);

  const assessmentSentApps = useMemo(() => appsForStages(['ASSESSMENT_SENT']), [pipeline]);
  const showMissingAssessmentAlert =
    Boolean(selectedJob) &&
    !assessmentsLoading &&
    assessmentSentApps.length > 0 &&
    activeAssessments.length === 0;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <SmartHiringPageHeader
        title="Hiring Pipeline"
        description="Manage candidates across rounds"
        testId="pipeline-heading"
        actions={
          <>
            <div className="flex flex-col gap-1 w-full sm:w-64">
              <Select value={selectValue} onValueChange={setSelectedJob}>
                <SelectTrigger className="w-full bg-white" data-testid="job-select">
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(60vh,360px)]">
                  {jobsForSelect.length === 0 ? (
                    <SelectItem value="__no_jobs__" disabled>
                      No open jobs available
                    </SelectItem>
                  ) : (
                    jobsForSelect.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {scopeFiltersExcludedAllJobs && (
                <p className="text-xs text-amber-700 leading-snug">
                  Scope filters match no open jobs — showing all jobs. Clear header Scope filters to narrow this list.
                </p>
              )}
            </div>
            {selectedJob ? (
              <Link to={`/jobs/${selectedJob}`}>
                <Button variant="outline" aria-label="View selected job details">
                  <Eye className="w-4 h-4 mr-2" />
                  View Job
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      {/* Pipeline Stats */}
      {selectedJobData && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedJobData.title}</p>
                  <p className="text-sm text-slate-500">{selectedJobData.candidate_count} candidates total</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-3 sm:gap-6 w-full lg:w-auto">
                {ROUND_TABS.map((t) => (
                  <div key={t.key} className="text-center">
                    <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                      {t.stageIds.reduce((acc, sid) => acc + getStageCount(sid), 0)}
                    </p>
                    <p className="text-xs text-slate-500">{t.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Round Tabs */}
      {selectedJob ? (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto gap-1 p-1">
              {ROUND_TABS.map((t) => (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  data-testid={`pipeline-tab-${t.key.toLowerCase()}`}
                  className="text-xs sm:text-sm px-2 py-2 whitespace-normal leading-tight"
                  title={t.label}
                >
                  <span className="sm:hidden">{t.shortLabel || t.label}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 1) SOURCED */}
            <TabsContent value={TAB_KEYS.SOURCED} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appsForStages(['SOURCED']).map((app) => {
                  const sourcedBadge = getCandidateCardBadge(app.candidate, 'SOURCED', STAGE_BADGE);
                  return (
                  <Card key={app.id} className="card-hover">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{app.candidate?.full_name || 'Candidate'}</p>
                          <p className="text-sm text-slate-500 truncate">{app.candidate?.headline || app.candidate?.email || ''}</p>
                        </div>
                        <Badge className={sourcedBadge.className}>{sourcedBadge.label}</Badge>
                      </div>

                      <ApplicationScoresSection
                        app={app}
                        jobId={selectedJob}
                        trajSummaries={trajSummaries}
                        trajLoading={trajLoading}
                        onTrajRefresh={reloadTrajSummaries}
                      />

                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Link to={`/candidates/${app.candidate_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => moveToStage(app.id, 'SCREENING')}
                        >
                          Selected for next round
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>

              {appsForStages(['SOURCED']).length === 0 && (
                <Card className="border-dashed mt-2">
                  <CardContent className="py-12 text-center text-slate-500">
                    No sourced candidates yet.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 2) SCREENING ROUND (AI match style details) */}
            <TabsContent value={TAB_KEYS.SCREENING} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appsForStages(['SCREENING']).map((app) => (
                  <Card key={app.id} className="card-hover">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{app.candidate?.full_name || 'Candidate'}</p>
                          <p className="text-sm text-slate-500 truncate">{app.candidate?.headline || app.candidate?.email || ''}</p>
                        </div>
                        <Badge className={STAGE_BADGE.SCREENING}>SCREENING</Badge>
                      </div>

                      <ApplicationScoresSection
                        app={app}
                        jobId={selectedJob}
                        trajSummaries={trajSummaries}
                        trajLoading={trajLoading}
                        onTrajRefresh={reloadTrajSummaries}
                      />

                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Link to={`/candidates/${app.candidate_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => moveToStage(app.id, 'ASSESSMENT_SENT')}
                          data-testid={`screening-select-${app.id}`}
                        >
                          Selected for next round
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {appsForStages(['SCREENING']).length === 0 && (
                <Card className="border-dashed mt-2">
                  <CardContent className="py-12 text-center text-slate-500">
                    No candidates in Screening Round.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 3) ASSESSMENT ROUND */}
            <TabsContent value={TAB_KEYS.ASSESSMENT} className="mt-6 space-y-4">
              {showMissingAssessmentAlert ? (
                <Card className="border-amber-300 bg-amber-50" data-testid="pipeline-missing-assessment-alert">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 flex-1"
                    >
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <motion.div>
                        <p className="font-semibold text-amber-900">No active assessment for this job</p>
                        <p className="text-sm text-amber-800 mt-1">
                          {assessmentSentApps.length} candidate{assessmentSentApps.length === 1 ? '' : 's'} in assessment
                          round cannot be invited until you publish an assessment for this job.
                        </p>
                      </motion.div>
                    </motion.div>
                    <Link to={`/assessments?tab=library&job_id=${selectedJob}`}>
                      <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white shrink-0">
                        Create assessment
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Assessment for this job</p>
                    <p className="text-sm text-slate-500">
                      Candidates in this round should take the assessment created under the Assessments module.
                    </p>
                  </div>
                  {assessmentsLoading ? (
                    <div className="text-sm text-slate-500">Loading…</div>
                  ) : jobAssessments.length > 0 ? (
                    <div className="flex flex-col items-end gap-2 min-w-[220px]">
                      {activeAssessments.length > 1 ? (
                        <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                          <SelectTrigger className="w-full" data-testid="pipeline-assessment-select">
                            <SelectValue placeholder="Select assessment" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeAssessments.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.title}{a.is_primary ? ' (primary)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{activeAssessments.length || jobAssessments.length} available</Badge>
                      )}
                      <div className="text-xs text-slate-600 text-right max-w-xs">
                        {(selectedAssessment ? [selectedAssessment] : jobAssessments.slice(0, 2)).map((a) => (
                          <div key={a.id}>{a.title}</div>
                        ))}
                      </div>
                      <Link to={`/assessments?tab=library&job_id=${selectedJob}`}>
                        <Button variant="outline" size="sm">View assessments</Button>
                      </Link>
                    </div>
                  ) : (
                    <Link to="/assessments">
                      <Button className="bg-indigo-600 hover:bg-indigo-700">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Assessment
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appsForStages(['ASSESSMENT_SENT']).map((app) => {
                  const sub = submissionForApp(app);
                  return (
                  <Card key={app.id} className="card-hover">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{app.candidate?.full_name || 'Candidate'}</p>
                          <p className="text-sm text-slate-500 truncate">{app.candidate?.headline || app.candidate?.email || ''}</p>
                        </div>
                        <Badge className={STAGE_BADGE.ASSESSMENT_SENT}>ASSESSMENT</Badge>
                      </div>

                      {sub ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">{sub.status}</Badge>
                          {sub.score_pct != null ? <Badge variant="outline">{sub.score_pct}%</Badge> : null}
                          {sub.passed != null ? (
                            <Badge className={sub.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                              {sub.passed ? 'Pass' : 'Fail'}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}

                      <ApplicationScoresSection
                        app={app}
                        jobId={selectedJob}
                        trajSummaries={trajSummaries}
                        trajLoading={trajLoading}
                        onTrajRefresh={reloadTrajSummaries}
                      />

                      <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                        {sub?.take_url ? <CopyTakeLinkButton takeUrl={sub.take_url} className="w-full" /> : null}
                        <div className="flex gap-2">
                          <Link to={`/candidates/${app.candidate_id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              View Profile
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => sendAssessmentInvite(app)}
                            disabled={!activeAssessments.length}
                          >
                            {sub ? 'Resend invite' : 'Send assessment'}
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => requestMarkCleared(app)}
                          disabled={updating}
                          data-testid={`mark-cleared-${app.id}`}
                        >
                          Mark Cleared
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>

              {appsForStages(['ASSESSMENT_CLEARED']).length > 0 && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                      Cleared assessment
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      These candidates completed the assessment round. Schedule an interview, then move them into the Interview tab (Interview 1).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appsForStages(['ASSESSMENT_CLEARED']).map((app) => (
                      <Card key={app.id} className="card-hover">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {app.candidate?.full_name || 'Candidate'}
                              </p>
                              <p className="text-sm text-slate-500 truncate">
                                {app.candidate?.headline || app.candidate?.email || ''}
                              </p>
                            </div>
                            <Badge className={STAGE_BADGE.ASSESSMENT_CLEARED}>CLEARED</Badge>
                          </div>

                          <ApplicationScoresSection
                            app={app}
                            jobId={selectedJob}
                            trajSummaries={trajSummaries}
                            trajLoading={trajLoading}
                            onTrajRefresh={reloadTrajSummaries}
                          />

                          <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                            <Link to={`/candidates/${app.candidate_id}`} className="block">
                              <Button variant="outline" size="sm" className="w-full">
                                View Profile
                              </Button>
                            </Link>
                            <Link to="/interviews">
                              <Button variant="outline" size="sm" className="w-full">
                                Schedule / Manage Interview
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              className="w-full bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => moveToStage(app.id, 'INTERVIEW_1')}
                            >
                              Start Interview Round
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {appsForStages(['ASSESSMENT_SENT']).length === 0 &&
                appsForStages(['ASSESSMENT_CLEARED']).length === 0 && (
                  <Card className="border-dashed mt-2">
                    <CardContent className="py-12 text-center text-slate-500">
                      No candidates in Assessment Round.
                    </CardContent>
                  </Card>
                )}
            </TabsContent>

            {/* 4) INTERVIEW — applications only (no auto “top match” proposals; those bypass assessment) */}
            <TabsContent value={TAB_KEYS.INTERVIEW} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appsForStages(INTERVIEW_ROUND_STAGE_IDS).map((app) => (
                  <Card key={app.id} className="card-hover">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{app.candidate?.full_name || 'Candidate'}</p>
                          <p className="text-sm text-slate-500 truncate">{app.candidate?.headline || app.candidate?.email || ''}</p>
                        </div>
                        <Badge className={STAGE_BADGE[app.stage] || 'bg-slate-100 text-slate-700'}>
                          {(app.stage || 'INTERVIEW').replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <ApplicationScoresSection
                        app={app}
                        jobId={selectedJob}
                        trajSummaries={trajSummaries}
                        trajLoading={trajLoading}
                        onTrajRefresh={reloadTrajSummaries}
                      />

                      <div className="mt-4 pt-4 border-t flex flex-col gap-2">
                        <Link to="/interviews">
                          <Button variant="outline" size="sm" className="w-full">
                            Schedule / Manage Interview
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => moveToStage(app.id, 'OFFER')}
                        >
                          Select for Assessment Round
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {appsForStages(INTERVIEW_ROUND_STAGE_IDS).length === 0 && (
                <Card className="border-dashed mt-2">
                  <CardContent className="py-12 text-center text-slate-500">
                    No candidates in interview rounds yet. They appear here after assessment is cleared and they enter
                    Interview 1 (or later). Use <span className="font-medium text-slate-700">Assessment Round → Cleared assessment</span> to move them forward.
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 5) SALARY DISCUSSION */}
            <TabsContent value={TAB_KEYS.SALARY} className="mt-6">
              {offerStatusParam ? (
                <p className="text-xs text-slate-500 mb-3">
                  Filtered by offer status: <span className="font-medium text-slate-700">{offerStatusParam.replace(/_/g, ' ')}</span>
                </p>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {salaryApps.map((app) => (
                  <Card key={app.id} className="card-hover">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{app.candidate?.full_name || 'Candidate'}</p>
                          <p className="text-sm text-slate-500 truncate">{app.candidate?.headline || app.candidate?.email || ''}</p>
                        </div>
                        <Badge className={STAGE_BADGE.OFFER}>SALARY</Badge>
                      </div>

                      <ApplicationScoresSection
                        app={app}
                        jobId={selectedJob}
                        trajSummaries={trajSummaries}
                        trajLoading={trajLoading}
                        onTrajRefresh={reloadTrajSummaries}
                      />

                      <p className="text-xs font-medium text-slate-500 mt-4 mb-1">Offer status</p>
                      <Select
                        value={app.offer_status || 'SENT'}
                        onValueChange={(value) => updateOfferStatus(app.id, value)}
                        disabled={updating}
                      >
                        <SelectTrigger className="w-full" aria-label={`Offer status for ${app.candidate?.full_name || 'candidate'}`}>
                          <SelectValue placeholder="Select offer status" />
                        </SelectTrigger>
                        <SelectContent>
                          {OFFER_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Link to={`/candidates/${app.candidate_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => moveToStage(app.id, 'JOINED')}
                        >
                          Mark Joined
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {salaryApps.length === 0 && (
                <Card className="border-dashed mt-2">
                  <CardContent className="py-12 text-center text-slate-500">
                    No candidates pending salary discussion.
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
              Select a Job
            </h3>
            <p className="text-slate-500 text-center mb-4">
              Choose a job to view its hiring pipeline
            </p>
            {jobs.length === 0 && (
              <Link to="/jobs/new">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Create Your First Job
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading Overlay */}
      {updating && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[120]" role="status" aria-live="polite" aria-label="Updating pipeline">
          <div className="bg-white rounded-xl p-4 shadow-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-slate-600">Updating...</span>
          </div>
        </div>
      )}
    </motion.div>

    {clearanceDialog}
    </>
  );
};

export default PipelinePage;
