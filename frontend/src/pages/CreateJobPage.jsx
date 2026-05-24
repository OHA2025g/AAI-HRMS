import React, { Fragment, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobsApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  X,
  Plus,
  Loader2,
  CheckCircle,
  Briefcase,
  MapPin,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BUSINESS_ORG_PILLARS,
  getDepartmentsForPillar,
  getSubDepartmentsForDepartment,
} from '../data/businessOrgHierarchy';

const JOB_CREATE_STEPS = [
  { num: 1, title: 'Basic Information' },
  { num: 2, title: 'Job/Role Details' },
  { num: 3, title: 'Skills' },
  { num: 4, title: 'Review' },
];

function resolvePillarIdFromLabel(label) {
  if (!label) return '';
  return BUSINESS_ORG_PILLARS.find((p) => p.label === label)?.id || '';
}

function resolveDepartmentIdFromLabels(pillarId, deptLabel) {
  if (!pillarId || !deptLabel) return '';
  return getDepartmentsForPillar(pillarId).find((d) => d.label === deptLabel)?.id || '';
}

const CreateJobPage = () => {
  const navigate = useNavigate();
  const { jobId: editJobId } = useParams();
  const isEdit = Boolean(editJobId);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchJobLoading, setFetchJobLoading] = useState(!!editJobId);

  // Form state
  const [pillarId, setPillarId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('hybrid');
  const [seniority, setSeniority] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState([]);
  const [mustHaveSkills, setMustHaveSkills] = useState([]);

  useEffect(() => {
    if (!editJobId) {
      setFetchJobLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setFetchJobLoading(true);
      try {
        const res = await jobsApi.get(editJobId);
        const job = res.data;
        if (cancelled) return;
        const pId = resolvePillarIdFromLabel(job.business_pillar);
        setPillarId(pId);
        setDepartmentId(resolveDepartmentIdFromLabels(pId, job.business_department));
        setSubDepartment(job.business_sub_department || '');
        setProjectId(job.project_id ? String(job.project_id) : '');
        setTitle(job.title || '');
        setDescription(job.description || '');
        setLocation(job.location || '');
        setWorkMode(job.work_mode || 'hybrid');
        setSeniority(job.seniority || '');
        const skillRows = Array.isArray(job.skills) ? job.skills : [];
        const names = [...new Set(skillRows.map((s) => s.skill_name).filter(Boolean))];
        const must = [
          ...new Set(
            skillRows.filter((s) => s.skill_type === 'MUST_HAVE').map((s) => s.skill_name).filter(Boolean)
          ),
        ];
        setSkillsNeeded(names);
        setMustHaveSkills(must);
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Failed to load job');
        navigate('/jobs');
      } finally {
        if (!cancelled) setFetchJobLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editJobId, navigate]);

  const addSkill = (isMustHave = false) => {
    if (!skillInput.trim()) return;
    const skill = skillInput.trim();
    
    if (isMustHave && !mustHaveSkills.includes(skill)) {
      setMustHaveSkills([...mustHaveSkills, skill]);
      if (!skillsNeeded.includes(skill)) {
        setSkillsNeeded([...skillsNeeded, skill]);
      }
    } else if (!skillsNeeded.includes(skill)) {
      setSkillsNeeded([...skillsNeeded, skill]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill, isMustHave = false) => {
    if (isMustHave) {
      setMustHaveSkills(mustHaveSkills.filter(s => s !== skill));
    } else {
      setSkillsNeeded(skillsNeeded.filter(s => s !== skill));
      setMustHaveSkills(mustHaveSkills.filter(s => s !== skill));
    }
  };

  const toggleMustHave = (skill) => {
    if (mustHaveSkills.includes(skill)) {
      setMustHaveSkills(mustHaveSkills.filter(s => s !== skill));
    } else {
      setMustHaveSkills([...mustHaveSkills, skill]);
    }
  };

  const handleSubmit = async () => {
    const pillarLabel = BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label;
    const deptLabel = getDepartmentsForPillar(pillarId).find((d) => d.id === departmentId)?.label;

    const skillsPayload = skillsNeeded.map((name) => ({
      skill_name: name,
      skill_type: mustHaveSkills.includes(name) ? 'MUST_HAVE' : 'GOOD_TO_HAVE',
      weight: 1.0,
    }));

    if (editJobId) {
      setLoading(true);
      try {
        await jobsApi.update(editJobId, {
          title,
          description,
          location,
          work_mode: workMode,
          seniority: seniority || null,
          business_pillar: pillarLabel || null,
          business_department: deptLabel || null,
          business_sub_department: subDepartment || null,
          project_id: projectId.trim() || null,
          skills: skillsPayload,
        });
        toast.success('Job requisition updated.');
        navigate(`/jobs/${editJobId}`);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to update job');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setAnalyzing(true);
    try {
      const jobData = {
        title,
        description,
        location,
        work_mode: workMode,
        seniority,
        skills_needed: skillsNeeded,
        must_have_skills: mustHaveSkills,
        business_pillar: pillarLabel || null,
        business_department: deptLabel || null,
        business_sub_department: subDepartment || null,
        project_id: projectId.trim() || null,
      };

      const res = await jobsApi.create(jobData);
      toast.success('Job created successfully! AI has analyzed your JD.');
      const createdId = res?.data?.id;
      navigate(createdId ? `/jobs/${createdId}` : '/jobs');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create job');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const isStep1Valid = Boolean(pillarId && departmentId && subDepartment);

  const isStep2Valid = Boolean(title.trim() && description.trim());

  const departmentOptions = pillarId ? getDepartmentsForPillar(pillarId) : [];
  const subDepartmentOptions =
    pillarId && departmentId ? getSubDepartmentsForDepartment(pillarId, departmentId) : [];
  const isStep3Valid = skillsNeeded.length > 0 && mustHaveSkills.length > 0;

  if (isEdit && fetchJobLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-600">Loading job…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-5xl mx-auto min-w-0"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')} data-testid="back-btn" aria-label="Back to jobs">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {isEdit ? 'Edit job requisition' : 'Create New Job'}
          </h1>
          <p className="text-slate-600">
            {isEdit ? 'Update details and save changes.' : 'AI will analyze your JD automatically'}
          </p>
        </div>
      </div>

      {/* Progress Steps — one row, no horizontal scroll */}
      <div className="w-full min-w-0 mb-8">
        <div className="flex w-full min-w-0 items-center py-1">
          {JOB_CREATE_STEPS.map(({ num, title: stepTitle }, idx) => (
            <Fragment key={num}>
              <div className="flex flex-1 min-w-0 flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-center sm:text-left px-0.5">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                    step >= num ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > num ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : num}
                </div>
                <span
                  className={`min-w-0 w-full sm:w-auto text-[10px] sm:text-[11px] md:text-xs leading-tight md:whitespace-nowrap line-clamp-2 sm:line-clamp-none ${
                    step >= num ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  <span className="sr-only">Step {num}: </span>
                  <span className="hidden md:inline">Step {num}: </span>
                  {stepTitle}
                </span>
              </div>
              {idx < JOB_CREATE_STEPS.length - 1 && (
                <div
                  className="w-1.5 sm:w-2 md:w-3 shrink-0 h-0.5 bg-slate-200 self-center"
                  aria-hidden
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Outfit' }}>Step 1 — Basic Information</CardTitle>
            <CardDescription>
              Classify the role by business pillar, department, and sub-department. Optional project link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                  Organizational placement
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Only departments for the selected pillar, and only sub-departments for the selected department, are shown.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Business pillar</Label>
                  <Select
                    value={pillarId || undefined}
                    onValueChange={(v) => {
                      setPillarId(v);
                      setDepartmentId('');
                      setSubDepartment('');
                    }}
                  >
                    <SelectTrigger data-testid="job-pillar-select">
                      <SelectValue placeholder="Select business pillar" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(60vh,420px)]">
                      {BUSINESS_ORG_PILLARS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department *</Label>
                  <Select
                    value={departmentId || undefined}
                    onValueChange={(v) => {
                      setDepartmentId(v);
                      setSubDepartment('');
                    }}
                    disabled={!pillarId}
                  >
                    <SelectTrigger data-testid="job-department-select">
                      <SelectValue placeholder={pillarId ? 'Select department' : 'Select a pillar first'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(60vh,420px)]">
                      {departmentOptions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sub-department *</Label>
                  <Select
                    value={subDepartment || undefined}
                    onValueChange={setSubDepartment}
                    disabled={!departmentId}
                  >
                    <SelectTrigger data-testid="job-subdepartment-select">
                      <SelectValue
                        placeholder={departmentId ? 'Select sub-department' : 'Select a department first'}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(60vh,420px)]">
                      {subDepartmentOptions.map((sub) => (
                        <SelectItem key={sub} value={sub}>
                          {sub}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-id">Project ID</Label>
                  <Input
                    id="project-id"
                    placeholder="e.g., PRJ-2026-0042"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    data-testid="job-project-id-input"
                  />
                  <p className="text-xs text-slate-500">Optional. Link this requisition to an internal project or cost code.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="next-step-btn"
              >
                Next: Job/Role Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Job/Role Details */}
      {step === 2 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Outfit' }}>Step 2 — Job/Role Details</CardTitle>
            <CardDescription>
              Title, location, work arrangement, seniority, and the full job description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Senior Data Analyst"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="job-title-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="location"
                    placeholder="e.g., New York, NY"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                    data-testid="job-location-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Work Mode</Label>
                <Select value={workMode} onValueChange={setWorkMode}>
                  <SelectTrigger data-testid="work-mode-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Seniority Level</Label>
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger data-testid="seniority-select">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Junior">Junior</SelectItem>
                  <SelectItem value="Mid">Mid-Level</SelectItem>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                placeholder="Enter the full job description. Include responsibilities, requirements, and any other relevant details. Our AI will analyze this to extract skills and activities."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                data-testid="job-description-input"
              />
              <p className="text-xs text-slate-500">
                <Sparkles className="w-3 h-3 inline mr-1" />
                AI will automatically extract skills and responsibilities from your description
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="prev-step-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!isStep2Valid}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="next-to-skills-btn"
              >
                Next: Skills
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Skills */}
      {step === 3 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Outfit' }}>Step 3 — Skills</CardTitle>
            <CardDescription>Add skills and mark must-have requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Add Skills</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Python, SQL, Power BI"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  data-testid="skill-input"
                />
                <Button variant="outline" onClick={() => addSkill()} data-testid="add-skill-btn">
                  <Plus className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => addSkill(true)}
                  className="bg-red-100 text-red-700 hover:bg-red-200"
                  data-testid="add-must-have-btn"
                >
                  Must-Have
                </Button>
              </div>
            </div>

            {skillsNeeded.length > 0 && (
              <div className="space-y-3">
                <Label>Skills List (click to toggle must-have)</Label>
                <div className="flex flex-wrap gap-2">
                  {skillsNeeded.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className={`cursor-pointer transition-colors py-1.5 px-3 ${
                        mustHaveSkills.includes(skill) 
                          ? 'badge-must-have' 
                          : 'badge-good-to-have'
                      }`}
                      onClick={() => toggleMustHave(skill)}
                    >
                      {skill}
                      {mustHaveSkills.includes(skill) && (
                        <span className="ml-1 text-xs">(Required)</span>
                      )}
                      <button
                        className="ml-2 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSkill(skill);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Must-Have Skills:</strong> Candidates will be filtered if they don't have these skills. 
                Mark at least one skill as must-have.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} data-testid="prev-step-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!isStep3Valid}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="next-review-btn"
              >
                Next: Review
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Outfit' }}>Step 4 — Review</CardTitle>
            <CardDescription>
              {isEdit ? 'Confirm changes, then save the requisition.' : 'Confirm everything looks correct, then create the job'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                    {title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                    {location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {location}
                      </span>
                    )}
                    <Badge variant="secondary">{workMode}</Badge>
                    {seniority && <Badge variant="secondary">{seniority}</Badge>}
                  </div>
                  {(pillarId || departmentId || subDepartment) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label && (
                        <Badge variant="outline" className="text-xs max-w-full whitespace-normal text-left">
                          {BUSINESS_ORG_PILLARS.find((p) => p.id === pillarId)?.label}
                        </Badge>
                      )}
                      {getDepartmentsForPillar(pillarId).find((d) => d.id === departmentId)?.label && (
                        <Badge variant="outline" className="text-xs max-w-full whitespace-normal text-left">
                          {getDepartmentsForPillar(pillarId).find((d) => d.id === departmentId)?.label}
                        </Badge>
                      )}
                      {subDepartment && (
                        <Badge variant="outline" className="text-xs max-w-full whitespace-normal text-left">
                          {subDepartment}
                        </Badge>
                      )}
                      {projectId.trim() && (
                        <Badge variant="outline" className="text-xs">
                          Project ID: {projectId.trim()}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Description</h4>
                <p className="text-sm text-slate-600 whitespace-pre-line line-clamp-4">
                  {description}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {skillsNeeded.map((skill) => (
                    <Badge
                      key={skill}
                      className={mustHaveSkills.includes(skill) ? 'badge-must-have' : 'badge-good-to-have'}
                    >
                      {skill}
                      {mustHaveSkills.includes(skill) && ' *'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {!isEdit && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-indigo-900">AI Analysis</p>
                  <p className="text-sm text-indigo-700">
                    When you create this job, our AI will analyze the description to extract additional skills,
                    responsibilities, and create a scoring rubric for candidate matching.
                  </p>
                </div>
              </div>
            )}
            {isEdit && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                Saving updates your requisition in the database. Existing AI rubric and activities are kept unless you
                change skills (updated skill list is saved).
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} data-testid="back-to-skills-btn">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="create-job-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEdit ? 'Saving…' : analyzing ? 'AI Analyzing...' : 'Creating...'}
                  </>
                ) : isEdit ? (
                  'Save changes'
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Job
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default CreateJobPage;
