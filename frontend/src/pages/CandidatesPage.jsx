import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeCandidateSourceParam, normalizeDisplayChannelParam } from '../lib/drillQueryParams';
import { motion } from 'framer-motion';
import { applicationsApi, candidatesApi, jobsApi } from '../lib/api';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '../data/businessOrgHierarchy';
import { FitScoreCard } from '../components/FitScore';
import { CareerTrajectorySummary } from '../components/career-trajectory/CareerTrajectorySummary';
import { useCareerTrajectorySummaries } from '../hooks/useCareerTrajectorySummaries';
import { useAssessmentClearance } from '../hooks/useAssessmentClearance';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Search, Users, Loader2, Filter, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatSourceLabel,
  getCandidateCardBadge,
  getSourceBadgeClass,
} from '../lib/candidateSource';
import SmartHiringPageHeader from '../components/hiring/SmartHiringPageHeader';

const STAGE_BADGE = {
  SOURCED: 'bg-sky-100 text-sky-800',
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

/** Next pipeline step — mirrors `PipelinePage` actions. */
const NEXT_PIPELINE_STEP = {
  SOURCED: { next: 'SCREENING', label: 'Selected for next round' },
  SCREENING: { next: 'ASSESSMENT_SENT', label: 'Selected for next round' },
  ASSESSMENT_SENT: { next: 'ASSESSMENT_CLEARED', label: 'Mark Cleared' },
  ASSESSMENT_CLEARED: { next: 'INTERVIEW_1', label: 'Start interview round' },
  INTERVIEW_1: { next: 'INTERVIEW_2', label: 'Advance to next interview' },
  INTERVIEW_2: { next: 'INTERVIEW_3', label: 'Advance to next interview' },
  INTERVIEW_3: { next: 'HR_ROUND', label: 'Advance to HR round' },
  HR_ROUND: { next: 'OFFER', label: 'Move to offer' },
  OFFER: { next: 'JOINED', label: 'Mark Joined' },
};

const DISPLAY_CHANNEL_LABELS = {
  talent_pool_ex: 'Talent Pool-Ex',
  talent_pool: 'Talent Pool',
  linkedin: 'LinkedIn',
  other: 'Other sources',
};

const CandidatesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const drillSource = normalizeCandidateSourceParam(searchParams.get('source'));
  const drillDisplayChannel = normalizeDisplayChannelParam(searchParams.get('display_channel'));
  const drillFitMin = searchParams.get('fit_min');
  const drillFitMax = searchParams.get('fit_max');
  const fitMin = drillFitMin != null && drillFitMin !== '' ? Number(drillFitMin) : null;
  const fitMax = drillFitMax != null && drillFitMax !== '' ? Number(drillFitMax) : null;
  const fileInputRef = useRef(null);
  const placement = usePlacementFilters();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [openJobs, setOpenJobs] = useState([]);
  const [contextLoading, setContextLoading] = useState(true);
  const [stageUpdatingId, setStageUpdatingId] = useState(null);
  const { runWithClearanceCheck, clearanceDialog } = useAssessmentClearance();

  // Add candidate form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: '',
    headline: '',
    total_experience_years: '',
    skills: '',
    source: 'DIRECT_UPLOAD',
    resume_text: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (drillSource && drillSource !== sourceFilter) {
      setSourceFilter(drillSource);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillSource]);

  useEffect(() => {
    fetchCandidates();
  }, [sourceFilter, page, searchQuery, drillDisplayChannel, fitMin, fitMax]);

  useEffect(() => {
    if (fitMin != null || fitMax != null) {
      setPage(1);
    }
  }, [fitMin, fitMax]);

  const clearDrillDisplayChannel = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('display_channel');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const clearDrillSource = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('source');
    setSearchParams(next, { replace: true });
    setSourceFilter('all');
    setPage(1);
  };

  const clearFitDrill = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('fit_min');
    next.delete('fit_max');
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const fitDrillActive = fitMin != null || fitMax != null;
  const fitDrillLabel =
    fitMin != null && fitMax != null
      ? `${fitMin}–${fitMax}%`
      : fitMin != null
        ? `≥ ${fitMin}%`
        : fitMax != null
          ? `≤ ${fitMax}%`
          : null;

  const onSourceFilterChange = (value) => {
    setSourceFilter(value);
    setPage(1);
    if (searchParams.get('display_channel')) {
      const next = new URLSearchParams(searchParams);
      next.delete('display_channel');
      setSearchParams(next, { replace: true });
    }
  };

  const fetchCandidates = async () => {
    try {
      const params = { page, page_size: pageSize };
      if (drillDisplayChannel) {
        params.display_channel = drillDisplayChannel;
      } else if (sourceFilter === '__display_talent_pool_ex__') {
        params.display_channel = 'talent_pool_ex';
      } else if (sourceFilter !== 'all') {
        params.source = sourceFilter;
      }
      if (searchQuery && searchQuery.trim()) params.q = searchQuery.trim();
      if (fitMin != null) params.fit_min = fitMin;
      if (fitMax != null) params.fit_max = fitMax;
      const response = await candidatesApi.listPaged(params);
      const data = response.data || {};
      setCandidates(data.items || []);
      setTotalCandidatesCount(Number(data.total || 0));
      setTotalPages(Number(data.total_pages || 1));
    } catch (error) {
      toast.error('Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const loadHiringContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([jobsApi.list('OPEN'), applicationsApi.list()]);
      setOpenJobs(jobsRes.data || []);
      setApplications(appsRes.data || []);
    } catch {
      toast.error('Failed to load pipeline data');
      setOpenJobs([]);
      setApplications([]);
    } finally {
      setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHiringContext();
  }, [loadHiringContext]);

  const placementActive = !!(
    placement.pillarId ||
    placement.departmentId ||
    placement.subDepartment ||
    placement.projectId
  );

  const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === placement.pillarId)?.label || '';
  const deptLabel =
    placement.pillarId && placement.departmentId
      ? getDepartmentsForPillar(placement.pillarId).find((d) => d.id === placement.departmentId)?.label || ''
      : '';

  const matchesPlacementJob = (job) => {
    if (pillarLabel && (job?.business_pillar || '') !== pillarLabel) return false;
    if (deptLabel && (job?.business_department || '') !== deptLabel) return false;
    if (placement.subDepartment && (job?.business_sub_department || '') !== placement.subDepartment) return false;
    if (placement.projectId && (job?.project_id || '') !== placement.projectId) return false;
    return true;
  };

  const placementOpenJobIds = useMemo(() => {
    if (!placementActive) return null;
    return new Set((openJobs || []).filter(matchesPlacementJob).map((j) => j.id));
  }, [
    placementActive,
    openJobs,
    placement.pillarId,
    placement.departmentId,
    placement.subDepartment,
    placement.projectId,
    pillarLabel,
    deptLabel,
  ]);

  const placementCandidateIds = useMemo(() => {
    if (!placementActive) return null;
    const jobSet = placementOpenJobIds;
    if (!jobSet || jobSet.size === 0) return new Set();
    const ids = new Set();
    for (const app of applications) {
      if (app?.candidate_id && jobSet.has(app.job_id)) ids.add(app.candidate_id);
    }
    return ids;
  }, [placementActive, placementOpenJobIds, applications]);

  const listCandidateIds = useMemo(
    () => (candidates || []).map((c) => c.id).filter(Boolean),
    [candidates]
  );
  const {
    summaries: trajSummaries,
    loading: trajLoading,
    reload: reloadTrajSummaries,
  } = useCareerTrajectorySummaries(listCandidateIds);

  const bestAppByCandidateId = useMemo(() => {
    const map = new Map();
    const jobFilter =
      placementActive && placementOpenJobIds && placementOpenJobIds.size > 0 ? placementOpenJobIds : null;
    if (placementActive && placementOpenJobIds && placementOpenJobIds.size === 0) return map;

    for (const app of applications) {
      if (!app?.candidate_id) continue;
      if (jobFilter && !jobFilter.has(app.job_id)) continue;
      const score = Number(app.fit_score?.final_score);
      const sc = Number.isFinite(score) ? score : -1;
      const prev = map.get(app.candidate_id);
      const prevSc = prev
        ? Number.isFinite(Number(prev.fit_score?.final_score))
          ? Number(prev.fit_score.final_score)
          : -1
        : -999;
      const prevTs = new Date(prev?.updated_at || prev?.created_at || 0).getTime();
      const ts = new Date(app.updated_at || app.created_at || 0).getTime();
      if (!prev || sc > prevSc || (sc === prevSc && ts > prevTs)) map.set(app.candidate_id, app);
    }
    return map;
  }, [applications, placementActive, placementOpenJobIds]);

  const topSkills = (candidateSkills = []) => {
    const rows = Array.isArray(candidateSkills) ? candidateSkills : [];
    const cleaned = rows
      .filter((s) => s && typeof s === 'object' && String(s.skill_name || '').trim())
      .map((s) => ({
        skill_name: String(s.skill_name || '').trim(),
        proficiency: String(s.proficiency || '').trim(),
      }));
    // Stable unique by skill name (case-insensitive).
    const map = new Map();
    for (const r of cleaned) {
      const k = r.skill_name.toLowerCase();
      if (!map.has(k)) map.set(k, r);
    }
    return [...map.values()].slice(0, 8);
  };

  const advanceApplication = async (app) => {
    const step = NEXT_PIPELINE_STEP[app?.stage];
    if (!step?.next || !app?.id) return;

    const doUpdate = async (reasonOverride) => {
      setStageUpdatingId(app.id);
      try {
        await applicationsApi.updateStage(app.id, {
          stage: step.next,
          ...(reasonOverride ? { reason: reasonOverride } : {}),
        });
        toast.success('Updated');
        await loadHiringContext();
      } catch (e) {
        toast.error(e?.response?.data?.detail || 'Failed to update stage');
      } finally {
        setStageUpdatingId(null);
      }
    };

    await runWithClearanceCheck(app, app.stage, step.next, doUpdate);
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
      const data = {
        ...formData,
        skills: skillsArray,
        total_experience_years: formData.total_experience_years ? parseFloat(formData.total_experience_years) : null
      };
      await candidatesApi.create(data);
      toast.success('Candidate added successfully');
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        location: '',
        headline: '',
        total_experience_years: '',
        skills: '',
        source: 'DIRECT_UPLOAD',
        resume_text: ''
      });
      fetchCandidates();
      loadHiringContext();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.pdf', '.docx'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!validTypes.includes(fileExt)) {
      toast.error('Only PDF and DOCX files are supported');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', 'DIRECT_UPLOAD');

      const response = await candidatesApi.uploadResume(formData);
      
      if (response.data.is_new) {
        toast.success('Resume parsed! New candidate created');
      } else {
        toast.success('Resume parsed! Existing candidate updated');
      }
      
      setShowAddModal(false);
      fetchCandidates();
      loadHiringContext();

      // Navigate to the new candidate's profile
      if (response.data.candidate_id) {
        navigate(`/candidates/${response.data.candidate_id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to parse resume');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Full candidate inventory — do not hide rows when header placement filters are set
  // (those filters apply on Pipeline / job-scoped views only).
  const displayCandidates = candidates;

  const candidatesCountLabel =
    fitDrillActive && fitDrillLabel
      ? `${totalCandidatesCount} candidates matching fit ${fitDrillLabel}`
      : `${totalCandidatesCount} total candidates`;

  const goToPage = (p) => {
    const next = Math.min(Math.max(1, p), totalPages || 1);
    setPage(next);
  };

  const pageWindow = useMemo(() => {
    const total = totalPages || 1;
    const cur = page || 1;
    const start = Math.max(1, cur - 2);
    const end = Math.min(total, cur + 2);
    return { start, end, total, cur };
  }, [page, totalPages]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {drillDisplayChannel ? (
        <motion.div variants={itemVariants} className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 flex flex-wrap items-center justify-between gap-2">
          <span>
            Drill-down from Hiring Dashboard: channel{' '}
            <strong>{DISPLAY_CHANNEL_LABELS[drillDisplayChannel] || drillDisplayChannel}</strong>
            <span className="text-indigo-800"> ({totalCandidatesCount} matching)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 bg-white">
              <Link to="/dashboard">Hiring Dashboard</Link>
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={clearDrillDisplayChannel} aria-label="Clear display channel filter">
              Clear filter
            </Button>
          </div>
        </motion.div>
      ) : null}

      {drillSource ? (
        <motion.div variants={itemVariants} className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 flex flex-wrap items-center justify-between gap-2">
          <span>
            Drill-down from Executive KPIs: source <strong>{formatSourceLabel(drillSource)}</strong>
          </span>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 bg-white">
              <Link to="/executive-kpis">Executive KPIs</Link>
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={clearDrillSource} aria-label="Clear source filter">
              Clear filter
            </Button>
          </div>
        </motion.div>
      ) : null}

      {fitDrillActive && fitDrillLabel ? (
        <motion.div variants={itemVariants} className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 flex flex-wrap items-center justify-between gap-2">
          <span>
            Drill-down from Hiring Dashboard: fit score <strong>{fitDrillLabel}</strong>
            <span className="text-indigo-800"> ({totalCandidatesCount} matching)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 bg-white">
              <Link to="/dashboard">Hiring Dashboard</Link>
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={clearFitDrill} aria-label="Clear fit score filter">
              Clear filter
            </Button>
          </div>
        </motion.div>
      ) : null}

      <motion.div variants={itemVariants}>
        <SmartHiringPageHeader
          title="Candidates"
          description={candidatesCountLabel}
          testId="candidates-heading"
          filters={
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                <Input
                  placeholder="Search candidates..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                  data-testid="search-candidates-input"
                  aria-label="Search candidates"
                />
              </div>
              <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
                <SelectTrigger className="w-full sm:w-44 shrink-0" data-testid="source-filter" aria-label="Filter by candidate source">
                  <Filter className="w-4 h-4 mr-2" aria-hidden />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(60vh,360px)]">
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="DIRECT_UPLOAD">Direct Upload</SelectItem>
                  <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                  <SelectItem value="NAUKRI">Naukri</SelectItem>
                  <SelectItem value="INDEED">Indeed</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="TALENT_POOL">Talent Pool (all)</SelectItem>
                  <SelectItem value="__display_talent_pool_ex__">Talent Pool-Ex (Excel)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          actions={
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700" data-testid="add-candidate-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit' }}>Add New Candidate</DialogTitle>
              <DialogDescription>Upload a resume or enter details manually</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="upload" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Resume</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-4">
                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload candidate resume (PDF or DOCX)"
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleResumeUpload}
                      className="hidden"
                      data-testid="resume-upload-input"
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                        <p className="text-sm text-slate-600">Parsing resume with AI...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-700">Click to upload resume</p>
                        <p className="text-xs text-slate-500 mt-1">PDF or DOCX (max 10MB)</p>
                      </>
                    )}
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm text-indigo-800">
                      <FileText className="w-4 h-4 inline mr-1" />
                      AI will automatically extract name, contact info, skills, and experience from the resume.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="manual" className="mt-4">
                <form onSubmit={handleAddCandidate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                        data-testid="candidate-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        data-testid="candidate-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        data-testid="candidate-phone-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Experience (years)</Label>
                      <Input
                        id="experience"
                        type="number"
                        step="0.5"
                        value={formData.total_experience_years}
                        onChange={(e) => setFormData({ ...formData, total_experience_years: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="headline">Headline / Current Title</Label>
                    <Input
                      id="headline"
                      placeholder="e.g., Senior Data Analyst at Tech Corp"
                      value={formData.headline}
                      onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                      data-testid="candidate-headline-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma separated)</Label>
                    <Input
                      id="skills"
                      placeholder="e.g., Python, SQL, Power BI, Excel"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      data-testid="candidate-skills-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIRECT_UPLOAD">Direct Upload</SelectItem>
                        <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                        <SelectItem value="NAUKRI">Naukri</SelectItem>
                        <SelectItem value="INDEED">Indeed</SelectItem>
                        <SelectItem value="REFERRAL">Referral</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={submitting} data-testid="submit-candidate-btn">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Candidate'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
            </DialogContent>
          </Dialog>
          }
        />
      </motion.div>

      {placementActive && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Header placement filters are active and only narrow the <strong>Pipeline</strong> view. This page
          shows the full candidate list ({totalCandidatesCount} total).
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 ml-1 text-amber-900 underline"
            onClick={() => placement.clearAll()}
            aria-label="Clear placement filters"
          >
            Clear placement filters
          </Button>
        </div>
      )}

      {/* Candidates List — card layout aligned with Pipeline / AI fit view */}
      {loading || contextLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : displayCandidates.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCandidates.map((candidate) => {
            const app = bestAppByCandidateId.get(candidate.id);
            const stage = app?.stage;
            const cardBadge = getCandidateCardBadge(candidate, stage, STAGE_BADGE);
            const step = app ? NEXT_PIPELINE_STEP[stage] : null;
            const fitScore = app?.fit_score || null;
            const skills = topSkills(candidate?.skills);

            return (
              <div key={candidate.id}>
                <Card className="card-hover h-full bg-white" data-testid={`candidate-card-${candidate.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate" style={{ fontFamily: 'Outfit' }}>
                          {candidate.full_name || 'Unnamed Candidate'}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {candidate.email || candidate.headline || ''}
                        </p>
                        {app?.job?.title && (
                          <p className="text-xs text-slate-500 mt-1 truncate">Re: {app.job.title}</p>
                        )}
                      </div>
                      <Badge className={`shrink-0 text-xs ${cardBadge.className}`}>{cardBadge.label}</Badge>
                    </div>

                    <div className="mt-4">
                      {app && fitScore ? (
                        <div className="space-y-2">
                          <FitScoreCard fitScore={fitScore} showDetails />
                        </div>
                      ) : app ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
                          <p className="text-sm text-slate-600">
                            Fit score is not available for this application yet.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-xs font-medium text-slate-600">Skills</p>
                            {candidate.source && (
                              <Badge className={`text-xs ${getSourceBadgeClass(candidate.source)}`}>
                                {formatSourceLabel(candidate.source)}
                              </Badge>
                            )}
                          </div>
                          {skills.length ? (
                            <div className="flex flex-wrap gap-2">
                              {skills.map((s) => (
                                <span
                                  key={`${candidate.id}-${s.skill_name}`}
                                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                                >
                                  <span className="font-medium">{s.skill_name}</span>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-slate-500">{s.proficiency || 'N/A'}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600">No skills added yet.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <CareerTrajectorySummary
                      candidateId={candidate.id}
                      jobId={app?.job_id}
                      summary={trajSummaries[candidate.id]}
                      loading={trajLoading}
                      onAnalyzed={reloadTrajSummaries}
                    />

                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                      <Link to={`/candidates/${candidate.id}`} className={step?.next ? 'flex-1' : 'w-full'}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Profile
                        </Button>
                      </Link>
                      {step?.next ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                          disabled={stageUpdatingId === app.id}
                          aria-label={step?.label ? `${step.label} for ${candidate.full_name || 'candidate'}` : undefined}
                          onClick={() => advanceApplication(app)}
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
              </div>
            );
            })}
          </div>

          {!loading && totalPages > 1 && (
            <nav className="flex items-center justify-center gap-1 pt-2" aria-label="Candidates pagination">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                aria-label="Previous page"
              >
                Previous
              </Button>
              {Array.from({ length: pageWindow.end - pageWindow.start + 1 }, (_, i) => pageWindow.start + i).map(
                (p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={p === page ? 'default' : 'ghost'}
                    size="sm"
                    className="min-w-9"
                    onClick={() => goToPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    aria-label={p === page ? `Current page, page ${p}` : `Go to page ${p}`}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
                aria-label="Next page"
              >
                Next
              </Button>
            </nav>
          )}
        </div>
      ) : (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Outfit' }}>
                No candidates found
              </h3>
              <p className="text-slate-500 text-center mb-4">
                {searchQuery ? 'Try a different search term' : 'Add your first candidate to get started'}
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
      {clearanceDialog}
    </motion.div>
  );
};

export default CandidatesPage;
