import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { applicationsApi, candidatesApi, jobsApi } from '../lib/api';
import { usePlacementFilters } from '../context/PlacementFiltersContext';
import { BUSINESS_ORG_PILLARS, getDepartmentsForPillar } from '../data/businessOrgHierarchy';
import { FitScoreCard } from '../components/FitScore';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';
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
  ASSESSMENT_CLEARED: { next: 'OFFER', label: 'Select for Assessment Round' },
  INTERVIEW_1: { next: 'OFFER', label: 'Select for Assessment Round' },
  INTERVIEW_2: { next: 'OFFER', label: 'Select for Assessment Round' },
  INTERVIEW_3: { next: 'OFFER', label: 'Select for Assessment Round' },
  HR_ROUND: { next: 'OFFER', label: 'Select for Assessment Round' },
  OFFER: { next: 'JOINED', label: 'Mark Joined' },
};

const CandidatesPage = () => {
  const navigate = useNavigate();
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
    fetchCandidates();
  }, [sourceFilter, page, searchQuery]);

  const fetchCandidates = async () => {
    try {
      const params = { page, page_size: pageSize };
      if (sourceFilter !== 'all') params.source = sourceFilter;
      if (searchQuery && searchQuery.trim()) params.q = searchQuery.trim();
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
    setStageUpdatingId(app.id);
    try {
      await applicationsApi.updateStage(app.id, { stage: step.next });
      toast.success('Updated');
      await loadHiringContext();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update stage');
    } finally {
      setStageUpdatingId(null);
    }
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
  const filteredCandidates = candidates || [];

  const visibleCandidatesCount = filteredCandidates.length;
  const candidatesCountLabel = `${totalCandidatesCount} total candidates`;

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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center lg:flex-nowrap gap-3">
        <div className="shrink-0">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Candidates
          </h1>
          <p className="text-slate-600 mt-1">{candidatesCountLabel}</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10"
              data-testid="search-candidates-input"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-44 shrink-0" data-testid="source-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="DIRECT_UPLOAD">Direct Upload</SelectItem>
              <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
              <SelectItem value="NAUKRI">Naukri</SelectItem>
              <SelectItem value="INDEED">Indeed</SelectItem>
              <SelectItem value="REFERRAL">Referral</SelectItem>
              <SelectItem value="TALENT_POOL">Talent Pool</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0 flex lg:justify-end">
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
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
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
                  <div className="grid grid-cols-2 gap-4">
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
        </div>
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
      ) : filteredCandidates.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map((candidate) => {
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
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page - 1);
                    }}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>

                {pageWindow.start > 1 && (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(1);
                        }}
                        isActive={page === 1}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {pageWindow.start > 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

                {Array.from({ length: pageWindow.end - pageWindow.start + 1 }, (_, i) => pageWindow.start + i).map(
                  (p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(p);
                        }}
                        isActive={p === page}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                {pageWindow.end < pageWindow.total && (
                  <>
                    {pageWindow.end < pageWindow.total - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(pageWindow.total);
                        }}
                        isActive={page === pageWindow.total}
                      >
                        {pageWindow.total}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page + 1);
                    }}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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
    </motion.div>
  );
};

export default CandidatesPage;
