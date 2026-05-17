import React, { useState, useEffect } from 'react';
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
import { FitScoreCard } from '../components/FitScore';
import { Loader2, Users, Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getCandidateCardBadge } from '../lib/candidateSource';

const TAB_KEYS = {
  SOURCED: 'SOURCED',
  SCREENING: 'SCREENING',
  ASSESSMENT: 'ASSESSMENT',
  INTERVIEW: 'INTERVIEW',
  SALARY: 'SALARY',
};

/** Stages shown under Interview tab — only after assessment is cleared and an interview round has started */
const INTERVIEW_ROUND_STAGE_IDS = ['INTERVIEW_1', 'INTERVIEW_2', 'INTERVIEW_3', 'HR_ROUND'];

const ROUND_TABS = [
  { key: TAB_KEYS.SOURCED, label: 'Sourced', stageIds: ['SOURCED'] },
  { key: TAB_KEYS.SCREENING, label: 'Screening Round', stageIds: ['SCREENING'] },
  {
    key: TAB_KEYS.ASSESSMENT,
    label: 'Assessment Round',
    stageIds: ['ASSESSMENT_SENT', 'ASSESSMENT_CLEARED'],
  },
  {
    key: TAB_KEYS.INTERVIEW,
    label: 'Interview',
    stageIds: INTERVIEW_ROUND_STAGE_IDS,
  },
  { key: TAB_KEYS.SALARY, label: 'Salary Discussion', stageIds: ['OFFER'] },
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
  const [activeTab, setActiveTab] = useState(TAB_KEYS.SOURCED);
  const [jobAssessments, setJobAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

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

  const jobsForSelect = filteredJobs.length > 0 || pillarId || departmentId || subDepartment || projectId ? filteredJobs : jobs;

  // Keep selected job in sync with (filtered) jobs (Radix Select breaks on value="" or unknown ids).
  useEffect(() => {
    if (jobsForSelect.length === 0) {
      if (selectedJob) setSelectedJob('');
      return;
    }
    const valid = jobsForSelect.some((j) => j.id === selectedJob);
    if (!selectedJob || !valid) {
      setSelectedJob(jobsForSelect[0].id);
    }
  }, [jobsForSelect, selectedJob]);

  useEffect(() => {
    if (selectedJob) {
      fetchPipeline();
      fetchAssessments();
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
      const res = await assessmentsApi.list(selectedJob);
      setJobAssessments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      // Keep the UI usable even if this fails.
      setJobAssessments([]);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const getStageCount = (stageId) => {
    return pipeline[stageId]?.length || 0;
  };

  const selectedJobData = jobs.find((j) => j.id === selectedJob);
  const selectValue = jobsForSelect.some((j) => j.id === selectedJob) ? selectedJob : undefined;

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

  const moveToStage = async (applicationId, nextStage) => {
    if (!applicationId || !nextStage) return;
    setUpdating(true);
    try {
      await applicationsApi.updateStage(applicationId, { stage: nextStage });
      toast.success('Updated');
      await fetchPipeline();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update stage');
      await fetchPipeline();
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Hiring Pipeline
          </h1>
          <p className="text-slate-600 mt-1">Manage candidates across rounds</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectValue} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-64" data-testid="job-select">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobsForSelect.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedJob && (
            <Link to={`/jobs/${selectedJob}`}>
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                View Job
              </Button>
            </Link>
          )}
        </div>
      </div>

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
              <div className="flex items-center gap-6">
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
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
              {ROUND_TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key} data-testid={`pipeline-tab-${t.key.toLowerCase()}`}>
                  {t.label}
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

                      <div className="mt-4">
                        <FitScoreCard fitScore={app.fit_score} showDetails />
                      </div>

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

                      <div className="mt-4">
                        <FitScoreCard fitScore={app.fit_score} showDetails />
                      </div>

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
                    <Badge variant="secondary">{jobAssessments.length} available</Badge>
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
                {appsForStages(['ASSESSMENT_SENT']).map((app) => (
                  <Card key={app.id} className="card-hover">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{app.candidate?.full_name || 'Candidate'}</p>
                          <p className="text-sm text-slate-500 truncate">{app.candidate?.headline || app.candidate?.email || ''}</p>
                        </div>
                        <Badge className={STAGE_BADGE.ASSESSMENT_SENT}>ASSESSMENT</Badge>
                      </div>

                      <div className="mt-4">
                        <FitScoreCard fitScore={app.fit_score} showDetails />
                      </div>

                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Link to={`/candidates/${app.candidate_id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            View Profile
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => moveToStage(app.id, 'ASSESSMENT_CLEARED')}
                        >
                          Mark Cleared
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

                          <div className="mt-4">
                            <FitScoreCard fitScore={app.fit_score} showDetails />
                          </div>

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

                      <div className="mt-4">
                        <FitScoreCard fitScore={app.fit_score} showDetails />
                      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appsForStages(['OFFER']).map((app) => (
                  <Card key={app.id} className="card-hover">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{app.candidate?.full_name || 'Candidate'}</p>
                          <p className="text-sm text-slate-500 truncate">{app.candidate?.headline || app.candidate?.email || ''}</p>
                        </div>
                        <Badge className={STAGE_BADGE.OFFER}>SALARY</Badge>
                      </div>

                      <div className="mt-4">
                        <FitScoreCard fitScore={app.fit_score} showDetails />
                      </div>

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

              {appsForStages(['OFFER']).length === 0 && (
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
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 shadow-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-slate-600">Updating...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PipelinePage;
