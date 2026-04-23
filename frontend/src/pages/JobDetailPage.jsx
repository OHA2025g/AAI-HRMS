import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsApi, applicationsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FitScoreCard } from '../components/FitScore';
import { 
  ArrowLeft,
  MapPin,
  Users,
  Sparkles,
  Play,
  Briefcase,
  Target,
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

const JOB_DETAIL_STAGE_BADGE = {
  SOURCED: 'bg-slate-100 text-slate-600',
  SCREENING: 'bg-blue-100 text-blue-700',
  ASSESSMENT_SENT: 'bg-purple-100 text-purple-700',
  ASSESSMENT_CLEARED: 'bg-violet-100 text-violet-700',
  INTERVIEW_1: 'bg-amber-100 text-amber-700',
  INTERVIEW_2: 'bg-amber-100 text-amber-700',
  INTERVIEW_3: 'bg-amber-100 text-amber-700',
  HR_ROUND: 'bg-orange-100 text-orange-700',
  OFFER: 'bg-emerald-100 text-emerald-700',
  JOINED: 'bg-slate-100 text-slate-700',
};

const NEXT_PIPELINE_STEP = {
  SOURCED: { next: 'SCREENING', label: 'Selected for next round' },
  SCREENING: { next: 'ASSESSMENT_SENT', label: 'Selected for next round' },
  ASSESSMENT_SENT: { next: 'ASSESSMENT_CLEARED', label: 'Mark Cleared' },
  ASSESSMENT_CLEARED: { next: 'OFFER', label: 'Select for Assessment Round' },
  INTERVIEW_1: { next: 'OFFER', label: 'Select for Assessment Round' },
  INTERVIEW_2: { next: 'OFFER', label: 'Select for Assessment Round' },
  INTERVIEW_3: { next: 'OFFER', label: 'Select for Assessment Round' },
  HR_ROUND: { next: 'OFFER', label: 'Select for Assessment Round' },
  OFFER: { next: 'JOINED', label: 'Mark Joined' },
};

function stageBadgeLabel(stage) {
  if (!stage) return '—';
  if (stage === 'ASSESSMENT_SENT') return 'ASSESSMENT';
  return String(stage).replace(/_/g, ' ');
}

const JobDetailPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [matchingCandidates, setMatchingCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [demoGenerating, setDemoGenerating] = useState(false);
  const [stageUpdatingId, setStageUpdatingId] = useState(null);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const [jobRes, appsRes] = await Promise.all([
        jobsApi.get(jobId),
        applicationsApi.list({ job_id: jobId })
      ]);
      setJob(jobRes.data);
      setApplications(appsRes.data);
    } catch (error) {
      toast.error('Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  const _formatApiError = (error) => {
    const d = error?.response?.data?.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d))
      return d.map((x) => (typeof x === 'object' && x?.msg ? x.msg : String(x))).join('; ');
    return error?.message || 'Request failed';
  };

  const handleFindMatches = async () => {
    setMatching(true);
    try {
      const response = await jobsApi.match(jobId);
      setMatchingCandidates(response.data.matches || []);
      toast.success(`Found ${response.data.matches?.length || 0} matching candidates`);
    } catch (error) {
      toast.error(`Failed to find matches: ${_formatApiError(error)}`);
    } finally {
      setMatching(false);
    }
  };

  const handleGenerateDemoCandidates = async () => {
    if (!job?.title || !job?.description || !(job?.skills?.length > 0)) return;
    setDemoGenerating(true);
    try {
      await jobsApi.generateDemoCandidates(jobId, 50);
      toast.success('Demo candidates generated. Finding matches...');
      await handleFindMatches();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate demo candidates');
    } finally {
      setDemoGenerating(false);
    }
  };

  const handleAddToApplication = async (candidateId) => {
    try {
      await applicationsApi.create({
        job_id: jobId,
        candidate_id: candidateId,
        stage: 'SOURCED'
      });
      toast.success('Candidate added to pipeline');
      fetchJobDetails();
      setMatchingCandidates(matchingCandidates.filter(m => m.candidate.id !== candidateId));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add candidate');
    }
  };

  const advanceApplicationStage = async (app) => {
    const step = NEXT_PIPELINE_STEP[app?.stage];
    if (!step?.next || !app?.id) return;
    setStageUpdatingId(app.id);
    try {
      await applicationsApi.updateStage(app.id, { stage: step.next });
      toast.success('Updated');
      await fetchJobDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update stage');
    } finally {
      setStageUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Job not found</p>
        <Link to="/jobs">
          <Button variant="outline" className="mt-4">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN': return 'bg-emerald-100 text-emerald-700';
      case 'PAUSED': return 'bg-amber-100 text-amber-700';
      case 'CLOSED': return 'bg-slate-100 text-slate-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const fmtOrg = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '—');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                  {job.title}
                </h1>
                <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
              </div>
              {job.normalized_title && job.normalized_title !== job.title && (
                <div className="flex items-center gap-1 text-sm text-indigo-600 mt-1">
                  <Sparkles className="w-3 h-3" />
                  AI: {job.normalized_title}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                )}
                {job.work_mode && <Badge variant="secondary">{job.work_mode}</Badge>}
                {job.seniority && <Badge variant="secondary">{job.seniority}</Badge>}
                {job.domain && <Badge variant="secondary">{job.domain}</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-3 ml-12 lg:ml-0">
          <Link to={`/pipeline?job=${job.id}`}>
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Pipeline ({applications.length})
            </Button>
          </Link>
          {matchingCandidates.length === 0 && (
            <Button
              onClick={handleGenerateDemoCandidates}
              disabled={demoGenerating || matching || !(job?.title && job?.description && job?.skills?.length > 0)}
              variant="outline"
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              data-testid="play-demo-btn"
            >
              {demoGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {demoGenerating ? 'Generating...' : 'Play Demo (Generate 50)'}
            </Button>
          )}
          <Button 
            onClick={handleFindMatches}
            disabled={matching}
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="find-matches-btn"
          >
            {matching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Target className="w-4 h-4 mr-2" />
            )}
            Find Matches
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidates ({applications.length})</TabsTrigger>
          <TabsTrigger value="matches">AI Matches ({matchingCandidates.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base" style={{ fontFamily: 'Outfit' }}>
                <Layers className="w-5 h-5 text-slate-500" />
                Organizational placement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500 font-medium mb-1">Pillar</dt>
                  <dd className="text-slate-900">{fmtOrg(job.business_pillar)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-medium mb-1">Department</dt>
                  <dd className="text-slate-900">{fmtOrg(job.business_department)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-medium mb-1">Sub-department</dt>
                  <dd className="text-slate-900">{fmtOrg(job.business_sub_department)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 font-medium mb-1">Project ID</dt>
                  <dd className="text-slate-900 font-mono text-xs sm:text-sm">{fmtOrg(job.project_id)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Description */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                  <FileText className="w-5 h-5 text-slate-500" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-line">{job.description}</p>
              </CardContent>
            </Card>

            {/* Scoring Rubric */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                  <Target className="w-5 h-5 text-slate-500" />
                  Scoring Rubric
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.scoring_rubric ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Min Skill Match</span>
                        <span className="font-medium text-slate-900">{job.scoring_rubric.min_skill_match_pct}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Min Activity Match</span>
                        <span className="font-medium text-slate-900">{job.scoring_rubric.min_activity_match_pct}%</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-slate-500 uppercase mb-2">Weights</p>
                      {Object.entries(job.scoring_rubric.weights || {}).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm py-1">
                          <span className="text-slate-600 capitalize">{key}</span>
                          <span className="font-medium text-slate-900">{(value * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-500 text-sm">Default scoring applied</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Outfit' }}>Required Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {job.skills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, i) => (
                    <Badge 
                      key={i}
                      className={`text-sm py-1 px-3 ${
                        skill.skill_type === 'MUST_HAVE' ? 'badge-must-have' : 'badge-good-to-have'
                      }`}
                    >
                      {skill.skill_name}
                      {skill.skill_type === 'MUST_HAVE' && (
                        <span className="ml-1 text-xs opacity-70">Required</span>
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No skills specified</p>
              )}
            </CardContent>
          </Card>

          {/* Activities */}
          {job.activities?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  AI-Extracted Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.activities.map((activity, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{activity.activity_text}</span>
                      {activity.priority === 'HIGH' && (
                        <Badge variant="outline" className="text-xs">High Priority</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Candidates Tab — same rich card pattern as Pipeline / AI fit (name, email, stage, full FitScoreCard, actions) */}
        <TabsContent value="candidates" className="mt-6">
          {applications.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applications.map((app) => {
                const step = NEXT_PIPELINE_STEP[app.stage];
                const stageClass =
                  JOB_DETAIL_STAGE_BADGE[app.stage] || 'bg-slate-100 text-slate-700';

                return (
                  <Card key={app.id} className="card-hover h-full bg-white border border-slate-200">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="font-semibold text-slate-900 truncate"
                            style={{ fontFamily: 'Outfit' }}
                          >
                            {app.candidate?.full_name || 'Candidate'}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
                            {app.candidate?.email || app.candidate?.headline || ''}
                          </p>
                        </div>
                        <Badge className={`shrink-0 text-xs ${stageClass}`}>
                          {stageBadgeLabel(app.stage)}
                        </Badge>
                      </div>

                      <div className="mt-4">
                        {app.fit_score ? (
                          <FitScoreCard fitScore={app.fit_score} showDetails />
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-600">
                            Fit score is not available for this application yet.
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                        <Link
                          to={`/candidates/${app.candidate_id}`}
                          className={step?.next ? 'flex-1' : 'w-full'}
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            View Profile
                          </Button>
                        </Link>
                        {step?.next ? (
                          <Button
                            size="sm"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            disabled={stageUpdatingId === app.id}
                            onClick={() => advanceApplicationStage(app)}
                          >
                            {stageUpdatingId === app.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              step.label
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">No candidates yet</h3>
                <p className="text-slate-500 text-center mb-4">
                  Find matching candidates or add referrals
                </p>
                <Button onClick={handleFindMatches} className="bg-indigo-600 hover:bg-indigo-700">
                  <Target className="w-4 h-4 mr-2" />
                  Find Matches
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Matches Tab */}
        <TabsContent value="matches" className="mt-6">
          {matchingCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchingCandidates.map((match) => (
                <Card key={match.candidate.id} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{match.candidate.full_name}</h3>
                        <p className="text-sm text-slate-500">{match.candidate.headline || match.candidate.email}</p>
                      </div>
                    </div>
                    
                    <FitScoreCard fitScore={match.fit_score} showDetails />
                    
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button 
                        onClick={() => handleAddToApplication(match.candidate.id)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add to Pipeline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="font-semibold text-slate-900 mb-2">No matches yet</h3>
                <p className="text-slate-500 text-center mb-4">
                  Click "Find Matches" to discover candidates that fit this role
                </p>
                <Button 
                  onClick={handleFindMatches}
                  disabled={matching}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {matching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Find AI Matches
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default JobDetailPage;
